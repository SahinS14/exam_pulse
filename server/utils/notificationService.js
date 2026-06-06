const Notification = require("../models/Notification");
const User = require("../models/User");
const UserNotification = require("../models/UserNotification");
const { sendExpoPushNotifications } = require("./expoPush");

async function getTargetStudentIds({ premiumOnly = false } = {}) {
  const filter = premiumOnly
    ? {
        role: "student",
        isPaid: true,
        accessExpiry: { $gt: new Date() },
      }
    : {
        role: "student",
      };

  const users = await User.find(filter).select("_id");
  return users.map((item) => item._id);
}

async function createStudentNotification({
  title,
  body,
  type = "admin",
  data = {},
  createdBy,
  premiumOnly = false,
}) {
  const targetUserIds = await getTargetStudentIds({ premiumOnly });

  const notification = await Notification.create({
    title,
    body,
    type,
    audience: premiumOnly ? "paid-students" : "students",
    data,
    createdBy,
    sentAt: new Date(),
  });

  if (targetUserIds.length) {
    await UserNotification.insertMany(
      targetUserIds.map((userId) => ({
        userId,
        notificationId: notification._id,
      })),
      { ordered: false }
    ).catch(() => {});

    try {
      await sendExpoPushNotifications({
        title,
        body,
        data: {
          ...data,
          notificationId: String(notification._id),
          type,
        },
        userIds: targetUserIds,
        premiumOnly,
      });
    } catch (error) {
      console.error("Push notification send failed", error.message);
    }
  }

  return {
    notification,
    recipients: targetUserIds.length,
  };
}

module.exports = {
  createStudentNotification,
};
