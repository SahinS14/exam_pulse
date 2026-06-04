const mongoose = require("mongoose");

const paymentAuditEntrySchema = new mongoose.Schema(
  {
    event: {
      type: String,
      required: true,
    },
    message: String,
    payload: mongoose.Schema.Types.Mixed,
    createdAt: {
      type: Date,
      default: Date.now,
    },
  },
  { _id: false }
);

const paymentOrderSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    razorpayOrderId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    razorpayPaymentId: {
      type: String,
      index: true,
    },
    receipt: {
      type: String,
      required: true,
      index: true,
    },
    amount: {
      type: Number,
      required: true,
    },
    currency: {
      type: String,
      required: true,
    },
    orderStatus: {
      type: String,
      enum: ["created", "payment_captured", "payment_failed"],
      default: "created",
      index: true,
    },
    verificationStatus: {
      type: String,
      enum: ["pending", "verified", "failed"],
      default: "pending",
      index: true,
    },
    razorpaySignature: String,
    paymentFailureReason: String,
    paymentFailureCode: String,
    isAccessGranted: {
      type: Boolean,
      default: false,
    },
    verifiedAt: Date,
    capturedAt: Date,
    failedAt: Date,
    accessGrantedAt: Date,
    auditTrail: [paymentAuditEntrySchema],
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("PaymentOrder", paymentOrderSchema);
