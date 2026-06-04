const express = require("express");

const Bookmark = require("../models/Bookmark");
const { protect } = require("../middleware/authMiddleware");
const accessCheck = require("../middleware/accessCheck");

const router = express.Router();

router.post("/add", protect, accessCheck, async (req, res) => {
  try {
    const { questionId } = req.body;

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
    const bookmarks = await Bookmark.find({ userId: req.user._id }).populate(
      "questionId"
    );
    return res.json(bookmarks);
  } catch (error) {
    return res.status(500).json({ message: "Failed to fetch bookmarks" });
  }
});

module.exports = router;
