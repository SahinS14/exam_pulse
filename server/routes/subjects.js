const express = require("express");

const Subject = require("../models/Subject");
const { protect } = require("../middleware/authMiddleware");
const accessCheck = require("../middleware/accessCheck");

const router = express.Router();

router.get("/:subjectId/syllabus", protect, accessCheck, async (req, res) => {
  try {
    const subject = await Subject.findById(req.params.subjectId);

    if (!subject) {
      return res.status(404).json({ message: "Subject not found" });
    }

    return res.json({
      syllabusFileUrl: subject.syllabusFileUrl,
      syllabusFileName: subject.syllabusFileName,
      syllabusFileSize: subject.syllabusFileSize,
      syllabusMimeType: subject.syllabusMimeType,
      syllabusUploadedAt: subject.syllabusUploadedAt,
    });
  } catch (error) {
    return res.status(500).json({ message: "Failed to fetch syllabus" });
  }
});

router.get("/:semesterId", protect, accessCheck, async (req, res) => {
  try {
    const subjects = await Subject.find({ semesterId: req.params.semesterId });
    return res.json(subjects);
  } catch (error) {
    return res.status(500).json({ message: "Failed to fetch subjects" });
  }
});

module.exports = router;
