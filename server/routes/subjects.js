const express = require("express");

const Subject = require("../models/Subject");
const Module = require("../models/Module");
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
    const filter = { semesterId: req.params.semesterId };
    const subjects = await Subject.find(filter).sort({ name: 1 }).lean();

    if (!subjects.length) {
      return res.json([]);
    }

    const subjectIds = subjects.map((subject) => subject._id);
    const moduleCounts = await Module.aggregate([
      {
        $match: {
          subjectId: { $in: subjectIds },
        },
      },
      {
        $group: {
          _id: "$subjectId",
          total: { $sum: 1 },
        },
      },
    ]);
    const countMap = new Map(
      moduleCounts.map((item) => [String(item._id), item.total])
    );

    return res.json(
      subjects.map((subject) => ({
        ...subject,
        moduleCount: countMap.get(String(subject._id)) || 0,
      }))
    );
  } catch (error) {
    return res.status(500).json({ message: "Failed to fetch subjects" });
  }
});

module.exports = router;
