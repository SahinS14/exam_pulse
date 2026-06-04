const express = require("express");

const { protect } = require("../middleware/authMiddleware");
const PushToken = require("../models/PushToken");

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

module.exports = router;

