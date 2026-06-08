const express = require("express");

const Topic = require("../models/Topic");
const Question = require("../models/Question");
const { protect } = require("../middleware/authMiddleware");
const accessCheck = require("../middleware/accessCheck");
const {
  getPaginationParams,
  buildPaginatedResponse,
} = require("../utils/pagination");

const router = express.Router();

router.get("/topic/:topicId", protect, accessCheck, async (req, res) => {
  try {
    const query = { topicId: req.params.topicId };
    const pagination = getPaginationParams(req.query);

    if (!pagination) {
      const questions = await Question.find(query).lean();
      return res.json(questions);
    }

    const [questions, totalItems] = await Promise.all([
      Question.find(query)
        .skip(pagination.skip)
        .limit(pagination.limit)
        .lean(),
      Question.countDocuments(query),
    ]);

    return res.json(
      buildPaginatedResponse({
        items: questions,
        total: totalItems,
        page: pagination.page,
        limit: pagination.limit,
      })
    );
  } catch (error) {
    return res.status(500).json({ message: "Failed to fetch questions" });
  }
});

router.get(
  "/most-repeated/:moduleId",
  protect,
  accessCheck,
  async (req, res) => {
    try {
      const topics = await Topic.find({ moduleId: req.params.moduleId }).select(
        "_id"
      );
      const topicIds = topics.map((topic) => topic._id);
      const questions = await Question.find({
        topicId: { $in: topicIds },
        isMostRepeated: true,
      });
      return res.json(questions);
    } catch (error) {
      return res
        .status(500)
        .json({ message: "Failed to fetch most repeated questions" });
    }
  }
);

router.get(
  "/top-revision/:moduleId",
  protect,
  accessCheck,
  async (req, res) => {
    try {
      const topics = await Topic.find({ moduleId: req.params.moduleId }).select(
        "_id"
      );
      const topicIds = topics.map((topic) => topic._id);
      const questions = await Question.find({
        topicId: { $in: topicIds },
        isTopRevision: true,
      });
      return res.json(questions);
    } catch (error) {
      return res
        .status(500)
        .json({ message: "Failed to fetch top revision questions" });
    }
  }
);

module.exports = router;
