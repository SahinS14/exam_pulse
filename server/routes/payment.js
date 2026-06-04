const crypto = require("crypto");
const express = require("express");
const Razorpay = require("razorpay");

const { createRateLimiter } = require("../middleware/rateLimit");
const PaymentOrder = require("../models/PaymentOrder");
const User = require("../models/User");
const { protect } = require("../middleware/authMiddleware");
const {
  fieldError,
  sendValidationError,
  validatePaymentVerifyRequest,
} = require("../middleware/validation");

const ACCESS_DURATION_MS = 365 * 24 * 60 * 60 * 1000;
const PAYMENT_AMOUNT = 5000;
const PAYMENT_CURRENCY = "INR";

const router = express.Router();
const paymentRateLimit = createRateLimiter({
  keyPrefix: "payment",
  windowMs: 15 * 60 * 1000,
  maxRequests: 30,
  message: "Too many payment requests. Please wait before trying again.",
  keySelector: (req) => req.user?._id?.toString() || req.ip,
});

const buildRazorpayClient = () =>
  new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET,
  });

const appendAuditEntry = (paymentOrder, event, message, payload) => {
  paymentOrder.auditTrail.push({
    event,
    message,
    payload,
  });
};

const getNextAccessExpiry = (currentExpiry) => {
  const now = Date.now();
  const baseTime = currentExpiry && new Date(currentExpiry).getTime() > now
    ? new Date(currentExpiry).getTime()
    : now;

  return new Date(baseTime + ACCESS_DURATION_MS);
};

const grantAccessIfNeeded = async (paymentOrder) => {
  if (paymentOrder.isAccessGranted) {
    return false;
  }

  const user = await User.findById(paymentOrder.userId);

  if (!user) {
    throw new Error("User not found for payment order");
  }

  user.isPaid = true;
  user.accessExpiry = getNextAccessExpiry(user.accessExpiry);
  await user.save();

  paymentOrder.isAccessGranted = true;
  paymentOrder.accessGrantedAt = new Date();
  appendAuditEntry(
    paymentOrder,
    "access_granted",
    "Student premium access granted from payment order",
    {
      userId: String(user._id),
      accessExpiry: user.accessExpiry,
    }
  );

  return true;
};

const verifyWebhookSignature = (rawBody, signature) => {
  const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;

  if (!webhookSecret) {
    return false;
  }

  const expectedSignature = crypto
    .createHmac("sha256", webhookSecret)
    .update(rawBody)
    .digest("hex");

  return expectedSignature === signature;
};

router.post("/create-order", protect, paymentRateLimit, async (req, res) => {
  try {
    if (req.user.role !== "student") {
      return res.status(403).json({ message: "Student access required" });
    }

    const razorpay = buildRazorpayClient();
    const receipt = `receipt_${req.user._id}_${Date.now()}`;
    const order = await razorpay.orders.create({
      amount: PAYMENT_AMOUNT,
      currency: PAYMENT_CURRENCY,
      receipt,
    });

    const paymentOrder = await PaymentOrder.create({
      userId: req.user._id,
      razorpayOrderId: order.id,
      receipt,
      amount: order.amount,
      currency: order.currency,
      auditTrail: [
        {
          event: "order_created",
          message: "Razorpay order created and stored before checkout",
          payload: {
            orderId: order.id,
            amount: order.amount,
            currency: order.currency,
            receipt,
          },
        },
      ],
    });

    return res.json({
      orderId: paymentOrder.razorpayOrderId,
      amount: paymentOrder.amount,
      currency: paymentOrder.currency,
      razorpayKeyId: process.env.RAZORPAY_KEY_ID,
    });
  } catch (error) {
    return res.status(500).json({ message: "Order creation failed" });
  }
});

router.post(
  "/verify",
  protect,
  paymentRateLimit,
  validatePaymentVerifyRequest,
  async (req, res) => {
  try {
    if (req.user.role !== "student") {
      return res.status(403).json({ message: "Student access required" });
    }

    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
    } = req.body;

    const paymentOrder = await PaymentOrder.findOne({
      razorpayOrderId: razorpay_order_id,
      userId: req.user._id,
    });

    if (!paymentOrder) {
      return res.status(404).json({
        success: false,
        message: "Payment order not found for this user",
      });
    }

    if (paymentOrder.verificationStatus === "verified") {
      if (
        paymentOrder.razorpayPaymentId &&
        paymentOrder.razorpayPaymentId !== razorpay_payment_id
      ) {
        return res.status(409).json({
          success: false,
          message: "Payment order already verified with a different payment",
        });
      }

      return res.json({
        success: true,
        message: "Payment already verified",
        accessExpiry: req.user.accessExpiry || null,
      });
    }

    const expectedSignature = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
      .update(`${razorpay_order_id}|${razorpay_payment_id}`)
      .digest("hex");

    if (expectedSignature !== razorpay_signature) {
      paymentOrder.verificationStatus = "failed";
      paymentOrder.razorpayPaymentId = razorpay_payment_id;
      paymentOrder.razorpaySignature = razorpay_signature;
      appendAuditEntry(
        paymentOrder,
        "verification_failed",
        "Payment verification failed because the signature did not match",
        { razorpay_order_id, razorpay_payment_id }
      );
      await paymentOrder.save();

      return res
        .status(400)
        .json({ success: false, message: "Payment verification failed" });
    }

    const razorpay = buildRazorpayClient();
    const payment = await razorpay.payments.fetch(razorpay_payment_id);

    if (!payment || payment.order_id !== razorpay_order_id) {
      appendAuditEntry(
        paymentOrder,
        "verification_failed",
        "Fetched payment did not belong to the provided order",
        { razorpay_order_id, razorpay_payment_id }
      );
      paymentOrder.verificationStatus = "failed";
      await paymentOrder.save();

      return res
        .status(400)
        .json({ success: false, message: "Payment verification failed" });
    }

    if (
      payment.amount !== paymentOrder.amount ||
      payment.currency !== paymentOrder.currency
    ) {
      appendAuditEntry(
        paymentOrder,
        "verification_failed",
        "Fetched payment amount or currency did not match the stored order",
        {
          expectedAmount: paymentOrder.amount,
          actualAmount: payment.amount,
          expectedCurrency: paymentOrder.currency,
          actualCurrency: payment.currency,
        }
      );
      paymentOrder.verificationStatus = "failed";
      await paymentOrder.save();

      return res
        .status(400)
        .json({ success: false, message: "Payment verification failed" });
    }

    paymentOrder.razorpayPaymentId = razorpay_payment_id;
    paymentOrder.razorpaySignature = razorpay_signature;
    paymentOrder.verificationStatus = "verified";
    paymentOrder.verifiedAt = new Date();
    paymentOrder.orderStatus =
      payment.status === "captured" ? "payment_captured" : paymentOrder.orderStatus;

    if (payment.status === "captured" && !paymentOrder.capturedAt) {
      paymentOrder.capturedAt = new Date();
    }

    appendAuditEntry(
      paymentOrder,
      "verification_succeeded",
      "Payment signature and payment metadata verified successfully",
      {
        razorpay_order_id,
        razorpay_payment_id,
        paymentStatus: payment.status,
      }
    );

    await grantAccessIfNeeded(paymentOrder);
    await paymentOrder.save();

    const user = await User.findById(req.user._id).select("accessExpiry");

    return res.json({
      success: true,
      message: "Access granted",
      accessExpiry: user?.accessExpiry || null,
    });
  } catch (error) {
    return res
      .status(500)
      .json({ success: false, message: "Payment verification failed" });
  }
  }
);

router.post("/webhook", async (req, res) => {
  try {
    if (!process.env.RAZORPAY_WEBHOOK_SECRET) {
      return res.status(500).json({ message: "Webhook secret not configured" });
    }

    const signature = req.headers["x-razorpay-signature"];

    if (!signature) {
      return sendValidationError(
        res,
        [
          fieldError(
            "x-razorpay-signature",
            "Webhook signature header is required",
            "required"
          ),
        ],
        400,
        "Validation failed"
      );
    }

    if (!Buffer.isBuffer(req.body) || !verifyWebhookSignature(req.body, signature)) {
      return sendValidationError(
        res,
        [
          fieldError(
            "x-razorpay-signature",
            "Invalid webhook signature",
            "invalid_signature"
          ),
        ],
        400,
        "Validation failed"
      );
    }

    const eventPayload = JSON.parse(req.body.toString("utf8"));
    const eventType = eventPayload.event;
    const paymentEntity = eventPayload.payload?.payment?.entity;
    const orderId = paymentEntity?.order_id;

    if (!orderId) {
      return sendValidationError(
        res,
        [fieldError("payload.payment.entity.order_id", "Webhook order ID missing")],
        400,
        "Validation failed"
      );
    }

    const paymentOrder = await PaymentOrder.findOne({ razorpayOrderId: orderId });

    if (!paymentOrder) {
      return res.status(404).json({ message: "Payment order not found" });
    }

    paymentOrder.razorpayPaymentId =
      paymentEntity.id || paymentOrder.razorpayPaymentId;

    if (eventType === "payment.captured") {
      paymentOrder.orderStatus = "payment_captured";
      paymentOrder.capturedAt = paymentOrder.capturedAt || new Date();
      appendAuditEntry(
        paymentOrder,
        "webhook_payment_captured",
        "Razorpay webhook reported payment.captured",
        {
          paymentId: paymentEntity.id,
          amount: paymentEntity.amount,
          currency: paymentEntity.currency,
        }
      );
      await grantAccessIfNeeded(paymentOrder);
    } else if (eventType === "payment.failed") {
      paymentOrder.orderStatus = "payment_failed";
      paymentOrder.verificationStatus =
        paymentOrder.verificationStatus === "verified"
          ? paymentOrder.verificationStatus
          : "failed";
      paymentOrder.failedAt = new Date();
      paymentOrder.paymentFailureReason =
        paymentEntity.error_description ||
        paymentEntity.error_reason ||
        paymentOrder.paymentFailureReason;
      paymentOrder.paymentFailureCode =
        paymentEntity.error_code || paymentOrder.paymentFailureCode;
      appendAuditEntry(
        paymentOrder,
        "webhook_payment_failed",
        "Razorpay webhook reported payment.failed",
        {
          paymentId: paymentEntity.id,
          errorCode: paymentEntity.error_code,
          errorDescription: paymentEntity.error_description,
        }
      );
    } else {
      appendAuditEntry(
        paymentOrder,
        "webhook_ignored",
        "Received a Razorpay webhook event that is not processed",
        { eventType }
      );
    }

    await paymentOrder.save();

    return res.json({ success: true });
  } catch (error) {
    return res.status(500).json({ message: "Webhook processing failed" });
  }
});

router.get("/history", protect, async (req, res) => {
  try {
    const paymentOrders = await PaymentOrder.find({ userId: req.user._id })
      .sort({ createdAt: -1 })
      .select(
        "razorpayOrderId razorpayPaymentId amount currency orderStatus verificationStatus paymentFailureReason paymentFailureCode isAccessGranted accessGrantedAt verifiedAt capturedAt failedAt createdAt updatedAt"
      );

    return res.json(paymentOrders);
  } catch (error) {
    return res.status(500).json({ message: "Failed to fetch payment history" });
  }
});

module.exports = router;
