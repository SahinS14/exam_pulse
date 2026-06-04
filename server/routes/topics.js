const express = require("express");

const Topic = require("../models/Topic");
const { protect } = require("../middleware/authMiddleware");
const accessCheck = require("../middleware/accessCheck");

const router = express.Router();

router.get("/:moduleId", protect, accessCheck, async (req, res) => {
  try {
    const topics = await Topic.find({ moduleId: req.params.moduleId });
    return res.json(topics);
  } catch (error) {
    return res.status(500).json({ message: "Failed to fetch topics" });
  }
});

module.exports = router;
