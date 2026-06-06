const express = require("express");

const { protect } = require("../middleware/authMiddleware");
const { validateObjectIdParam } = require("../middleware/validation");
const PushToken = require("../models/PushToken");
const UserNotification = require("../models/UserNotification");

const router = express.Router();

router.post("/register-token", protect, async (req, res) => {
  try {
    const { token, platform } = req.body;

    if (!token) {
      return res.status(400).json({ message: "Push token is required" });
    }

    const existingToken = await PushToken.findOne({ token });

    if (existingToken) {
      existingToken.userId = req.user._id;
      existingToken.platform = platform;
      existingToken.updatedAt = new Date();
      await existingToken.save();
      return res.json({ success: true });
    }

    await PushToken.create({
      userId: req.user._id,
      token,
      platform,
    });

    return res.status(201).json({ success: true });
  } catch (error) {
    return res.status(500).json({ message: "Failed to register push token" });
  }
});

router.get("/inbox", protect, async (req, res) => {
  try {
    const notifications = await UserNotification.find({ userId: req.user._id })
      .populate("notificationId")
      .sort({ createdAt: -1 })
      .limit(50)
      .lean();

    const items = notifications
      .filter((item) => item.notificationId)
      .map((item) => ({
        _id: item._id,
        notificationId: item.notificationId._id,
        title: item.notificationId.title,
        body: item.notificationId.body,
        type: item.notificationId.type,
        data: item.notificationId.data || {},
        isRead: item.isRead,
        readAt: item.readAt,
        createdAt: item.createdAt,
        sentAt: item.notificationId.sentAt || item.notificationId.createdAt,
      }));

    return res.json(items);
  } catch (error) {
    return res.status(500).json({ message: "Failed to fetch notifications" });
  }
});

router.get("/unread-count", protect, async (req, res) => {
  try {
    const unreadCount = await UserNotification.countDocuments({
      userId: req.user._id,
      isRead: false,
    });

    return res.json({ unreadCount });
  } catch (error) {
    return res.status(500).json({ message: "Failed to fetch unread count" });
  }
});

router.put("/:id/read", protect, validateObjectIdParam("id"), async (req, res) => {
  try {
    const userNotification = await UserNotification.findOne({
      _id: req.params.id,
      userId: req.user._id,
    });

    if (!userNotification) {
      return res.status(404).json({ message: "Notification not found" });
    }

    if (!userNotification.isRead) {
      userNotification.isRead = true;
      userNotification.readAt = new Date();
      await userNotification.save();
    }

    return res.json({ success: true });
  } catch (error) {
    return res.status(500).json({ message: "Failed to update notification" });
  }
});

router.put("/read-all", protect, async (req, res) => {
  try {
    await UserNotification.updateMany(
      {
        userId: req.user._id,
        isRead: false,
      },
      {
        $set: {
          isRead: true,
          readAt: new Date(),
        },
      }
    );

    return res.json({ success: true });
  } catch (error) {
    return res.status(500).json({ message: "Failed to mark notifications as read" });
  }
});

module.exports = router;
