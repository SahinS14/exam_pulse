const express = require("express");

const Note = require("../models/Note");
const { protect } = require("../middleware/authMiddleware");
const accessCheck = require("../middleware/accessCheck");

const router = express.Router();

router.get("/:moduleId", protect, accessCheck, async (req, res) => {
  try {
    const notes = await Note.find({ moduleId: req.params.moduleId });
    return res.json(notes);
  } catch (error) {
    return res.status(500).json({ message: "Failed to fetch notes" });
  }
});

module.exports = router;
