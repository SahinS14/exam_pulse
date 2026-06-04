const express = require("express");

const Concept = require("../models/Concept");
const { protect } = require("../middleware/authMiddleware");
const accessCheck = require("../middleware/accessCheck");

const router = express.Router();

router.get("/:moduleId", protect, accessCheck, async (req, res) => {
  try {
    const concepts = await Concept.find({ moduleId: req.params.moduleId });
    return res.json(concepts);
  } catch (error) {
    return res.status(500).json({ message: "Failed to fetch concepts" });
  }
});

module.exports = router;
