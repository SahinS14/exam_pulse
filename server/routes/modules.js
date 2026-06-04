const express = require("express");

const Module = require("../models/Module");
const { protect } = require("../middleware/authMiddleware");
const accessCheck = require("../middleware/accessCheck");

const router = express.Router();

router.get("/:subjectId", protect, accessCheck, async (req, res) => {
  try {
    const modules = await Module.find({ subjectId: req.params.subjectId });
    return res.json(modules);
  } catch (error) {
    return res.status(500).json({ message: "Failed to fetch modules" });
  }
});

module.exports = router;
