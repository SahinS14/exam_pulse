const express = require("express");

const { createRateLimiter } = require("../middleware/rateLimit");
const Question = require("../models/Question");
const Report = require("../models/Report");
const { protect } = require("../middleware/authMiddleware");
const accessCheck = require("../middleware/accessCheck");
const { validateReportBody } = require("../middleware/validation");

const router = express.Router();
const reportRateLimit = createRateLimiter({
  keyPrefix: "report",
  windowMs: 15 * 60 * 1000,
  maxRequests: 20,
  message: "Too many report submissions. Please try again later.",
  keySelector: (req) => req.user?._id?.toString() || req.ip,
});

router.post(
  "/add",
  protect,
  accessCheck,
  reportRateLimit,
  validateReportBody,
  async (req, res) => {
    try {
      const { questionId, reason } = req.body;
      const question = await Question.findById(questionId).select("_id");

      if (!question) {
        return res.status(404).json({
          message: "Question not found",
        });
      }

      const existingReport = await Report.findOne({
        userId: req.user._id,
        questionId,
      });

      if (existingReport) {
        return res.status(409).json({
          message: "You already reported this question.",
        });
      }

      const report = await Report.create({
        userId: req.user._id,
        questionId,
        reason,
      });

      return res.status(201).json(report);
    } catch (error) {
      if (error?.code === 11000) {
        return res.status(409).json({
          message: "You already reported this question.",
        });
      }

      return res.status(500).json({ message: "Failed to submit report" });
    }
  }
);

module.exports = router;
