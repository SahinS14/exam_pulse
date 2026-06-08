const PushToken = require("../models/PushToken");
const User = require("../models/User");

const EXPO_PUSH_URL = "https://exp.host/--/api/v2/push/send";
const EXPO_PUSH_RECEIPTS_URL = "https://exp.host/--/api/v2/push/getReceipts";
const EXPO_PUSH_BATCH_SIZE = 100;
const EXPO_RECEIPT_BATCH_SIZE = 300;

const chunk = (items, size) => {
  const chunks = [];

  for (let index = 0; index < items.length; index += size) {
    chunks.push(items.slice(index, index + size));
  }

  return chunks;
};

async function getStudentPushTokens({ userIds, premiumOnly = true } = {}) {
  let targetUserIds = userIds;

  if (!targetUserIds) {
    const filter = premiumOnly
      ? {
          role: "student",
          isPaid: true,
          accessExpiry: { $gt: new Date() },
        }
      : {
          role: "student",
        };

    const students = await User.find(filter).select("_id");
    targetUserIds = students.map((item) => item._id);
  }

  if (!targetUserIds.length) {
    return [];
  }

  const tokens = await PushToken.find({
    userId: { $in: targetUserIds },
    token: /^ExponentPushToken/,
  }).select("token");

  return tokens.map((item) => item.token);
}

async function cleanupDeadPushTokens(tokens) {
  const uniqueTokens = [...new Set(tokens.filter(Boolean))];

  if (!uniqueTokens.length) {
    return 0;
  }

  const result = await PushToken.deleteMany({
    token: { $in: uniqueTokens },
  });

  return result.deletedCount || 0;
}

function isDeadTokenError(errorCode) {
  return errorCode === "DeviceNotRegistered";
}

async function sendExpoPushNotifications({ title, body, data, userIds, premiumOnly = true }) {
  const tokens = await getStudentPushTokens({ userIds, premiumOnly });

  if (!tokens.length) {
    return { sent: 0 };
  }

  const messages = tokens.map((token) => ({
    to: token,
    title,
    body,
    data,
    sound: "default",
  }));

  const batches = chunk(messages, EXPO_PUSH_BATCH_SIZE);
  const invalidTokens = new Set();
  const receiptTokenMap = new Map();

  for (const batch of batches) {
    const response = await fetch(EXPO_PUSH_URL, {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Accept-encoding": "gzip, deflate",
        "Content-Type": "application/json",
      },
      body: JSON.stringify(batch),
    });

    if (!response.ok) {
      throw new Error(`Expo push request failed with status ${response.status}`);
    }

    const payload = await response.json();
    const ticketData = Array.isArray(payload?.data) ? payload.data : [];

    ticketData.forEach((ticket, index) => {
      const token = batch[index]?.to;

      if (!token || !ticket) {
        return;
      }

      if (ticket.status === "ok" && ticket.id) {
        receiptTokenMap.set(ticket.id, token);
        return;
      }

      if (ticket.status === "error" && isDeadTokenError(ticket?.details?.error)) {
        invalidTokens.add(token);
      }
    });
  }

  const receiptIds = [...receiptTokenMap.keys()];
  const receiptBatches = chunk(receiptIds, EXPO_RECEIPT_BATCH_SIZE);

  for (const receiptBatch of receiptBatches) {
    const response = await fetch(EXPO_PUSH_RECEIPTS_URL, {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Accept-encoding": "gzip, deflate",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ ids: receiptBatch }),
    });

    if (!response.ok) {
      throw new Error(
        `Expo push receipt request failed with status ${response.status}`
      );
    }

    const payload = await response.json();
    const receipts = payload?.data || {};

    receiptBatch.forEach((receiptId) => {
      const receipt = receipts[receiptId];

      if (
        receipt?.status === "error" &&
        isDeadTokenError(receipt?.details?.error)
      ) {
        invalidTokens.add(receiptTokenMap.get(receiptId));
      }
    });
  }

  const invalidTokensRemoved = await cleanupDeadPushTokens([...invalidTokens]);

  return {
    sent: messages.length,
    invalidTokensRemoved,
  };
}

module.exports = {
  sendExpoPushNotifications,
  getStudentPushTokens,
};
