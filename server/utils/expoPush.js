const PushToken = require("../models/PushToken");
const User = require("../models/User");

const EXPO_PUSH_URL = "https://exp.host/--/api/v2/push/send";
const EXPO_PUSH_BATCH_SIZE = 100;

const chunk = (items, size) => {
  const chunks = [];

  for (let index = 0; index < items.length; index += size) {
    chunks.push(items.slice(index, index + size));
  }

  return chunks;
};

async function getActiveStudentPushTokens() {
  const activeStudents = await User.find({
    role: "student",
    isPaid: true,
    accessExpiry: { $gt: new Date() },
  }).select("_id");

  const activeUserIds = activeStudents.map((item) => item._id);

  if (!activeUserIds.length) {
    return [];
  }

  const tokens = await PushToken.find({
    userId: { $in: activeUserIds },
    token: /^ExponentPushToken/,
  }).select("token");

  return tokens.map((item) => item.token);
}

async function sendExpoPushNotifications({ title, body, data }) {
  const tokens = await getActiveStudentPushTokens();

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
  }

  return { sent: messages.length };
}

module.exports = {
  sendExpoPushNotifications,
};

