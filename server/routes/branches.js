const express = require("express");

const Branch = require("../models/Branch");
const Semester = require("../models/Semester");
const { protect } = require("../middleware/authMiddleware");
const accessCheck = require("../middleware/accessCheck");

const router = express.Router();

router.get("/", protect, accessCheck, async (req, res) => {
  try {
    const [branches, semesterCounts] = await Promise.all([
      Branch.find().sort({ name: 1 }).lean(),
      Semester.aggregate([
        {
          $group: {
            _id: "$branchId",
            total: { $sum: 1 },
          },
        },
      ]),
    ]);

    const countMap = new Map(
      semesterCounts.map((item) => [String(item._id), item.total])
    );

    return res.json(
      branches.map((branch) => ({
        ...branch,
        semesterCount: countMap.get(String(branch._id)) || 0,
      }))
    );
  } catch (error) {
    return res.status(500).json({ message: "Failed to fetch branches" });
  }
});

module.exports = router;
