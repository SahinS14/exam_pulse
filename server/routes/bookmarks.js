const express = require("express");

const Bookmark = require("../models/Bookmark");
const Question = require("../models/Question");
const { protect } = require("../middleware/authMiddleware");
const accessCheck = require("../middleware/accessCheck");
const {
  getPaginationParams,
  buildPaginatedResponse,
} = require("../utils/pagination");

const router = express.Router();

router.post("/add", protect, accessCheck, async (req, res) => {
  try {
    const { questionId } = req.body;
    const question = await Question.findById(questionId).select("_id");

    if (!question) {
      return res.status(404).json({ message: "Question not found" });
    }

    const existingBookmark = await Bookmark.findOne({
      userId: req.user._id,
      questionId,
    });

    if (existingBookmark) {
      return res.json(existingBookmark);
    }

    const bookmark = await Bookmark.create({
      userId: req.user._id,
      questionId,
    });

    return res.status(201).json(bookmark);
  } catch (error) {
    if (error?.code === 11000) {
      const existingBookmark = await Bookmark.findOne({
        userId: req.user._id,
        questionId: req.body.questionId,
      });

      if (existingBookmark) {
        return res.json(existingBookmark);
      }
    }

    return res.status(500).json({ message: "Failed to add bookmark" });
  }
});

router.delete("/remove", protect, accessCheck, async (req, res) => {
  try {
    const { questionId } = req.body;

    await Bookmark.deleteOne({
      userId: req.user._id,
      questionId,
    });

    return res.json({ message: "Bookmark removed" });
  } catch (error) {
    return res.status(500).json({ message: "Failed to remove bookmark" });
  }
});

router.get("/", protect, accessCheck, async (req, res) => {
  try {
    const filter = { userId: req.user._id };
    const pagination = getPaginationParams(req.query);
    const query = Bookmark.find(filter).populate({
      path: "questionId",
      populate: {
        path: "topicId",
        populate: {
          path: "moduleId",
          populate: {
            path: "subjectId",
          },
        },
      },
    });

    if (!pagination) {
      const bookmarks = await query;
      return res.json(bookmarks);
    }

    const { page, limit, skip } = pagination;
    const [bookmarks, total] = await Promise.all([
      query.skip(skip).limit(limit),
      Bookmark.countDocuments(filter),
    ]);

    return res.json(
      buildPaginatedResponse({ items: bookmarks, total, page, limit })
    );
  } catch (error) {
    return res.status(500).json({ message: "Failed to fetch bookmarks" });
  }
});

module.exports = router;
