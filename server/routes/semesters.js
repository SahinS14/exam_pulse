const express = require("express");

const Semester = require("../models/Semester");
const { protect } = require("../middleware/authMiddleware");
const accessCheck = require("../middleware/accessCheck");

const router = express.Router();

router.get("/:branchId", protect, accessCheck, async (req, res) => {
  try {
    const semesters = await Semester.find({ branchId: req.params.branchId });
    return res.json(semesters);
  } catch (error) {
    return res.status(500).json({ message: "Failed to fetch semesters" });
  }
});

module.exports = router;
