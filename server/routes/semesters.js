const express = require("express");

const Semester = require("../models/Semester");
const Subject = require("../models/Subject");
const { protect } = require("../middleware/authMiddleware");
const accessCheck = require("../middleware/accessCheck");

const router = express.Router();

router.get("/:branchId", protect, accessCheck, async (req, res) => {
  try {
    const filter = { branchId: req.params.branchId };
    const semesters = await Semester.find(filter).sort({ number: 1 }).lean();

    if (!semesters.length) {
      return res.json([]);
    }

    const semesterIds = semesters.map((semester) => semester._id);
    const subjectCounts = await Subject.aggregate([
      {
        $match: {
          semesterId: { $in: semesterIds },
        },
      },
      {
        $group: {
          _id: "$semesterId",
          total: { $sum: 1 },
        },
      },
    ]);

    const countMap = new Map(
      subjectCounts.map((item) => [String(item._id), item.total])
    );

    return res.json(
      semesters.map((semester) => ({
        ...semester,
        subjectCount: countMap.get(String(semester._id)) || 0,
      }))
    );
  } catch (error) {
    return res.status(500).json({ message: "Failed to fetch semesters" });
  }
});

module.exports = router;
