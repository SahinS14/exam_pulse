const express = require("express");

const Question = require("../models/Question");
const Note = require("../models/Note");
const { protect } = require("../middleware/authMiddleware");
const accessCheck = require("../middleware/accessCheck");

const router = express.Router();

router.get("/recent-updates", protect, accessCheck, async (req, res) => {
  try {
    const [questions, notes] = await Promise.all([
      Question.find(
        {},
        {
          questionText: 1,
          markCategory: 1,
          frequency: 1,
          tags: 1,
          createdAt: 1,
        }
      )
        .sort({ createdAt: -1 })
        .limit(3)
        .lean(),
      Note.find(
        {},
        {
          title: 1,
          fileUrl: 1,
          fileName: 1,
          mimeType: 1,
          type: 1,
          uploadedAt: 1,
        }
      )
        .sort({ uploadedAt: -1 })
        .limit(3)
        .lean(),
    ]);

    return res.json({
      questions,
      notes,
    });
  } catch (error) {
    return res.status(500).json({ message: "Failed to fetch recent updates" });
  }
});

module.exports = router;
