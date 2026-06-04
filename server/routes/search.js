const express = require("express");

const Semester = require("../models/Semester");
const Subject = require("../models/Subject");
const Module = require("../models/Module");
const Topic = require("../models/Topic");
const Question = require("../models/Question");
const Concept = require("../models/Concept");
const Note = require("../models/Note");
const { protect } = require("../middleware/authMiddleware");
const accessCheck = require("../middleware/accessCheck");

const router = express.Router();

const escapeRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

router.get("/", protect, accessCheck, async (req, res) => {
  try {
    const { q, branchId, semesterId } = req.query;

    if (!q || !branchId || !semesterId) {
      return res.status(400).json({
        message: "q, branchId, and semesterId are required",
      });
    }

    const semester = await Semester.findOne({
      _id: semesterId,
      branchId,
    });

    if (!semester) {
      return res
        .status(404)
        .json({ message: "Semester not found for this branch" });
    }

    const subjects = await Subject.find({ semesterId });
    const subjectIds = subjects.map((subject) => subject._id);
    const modules = await Module.find({ subjectId: { $in: subjectIds } });
    const moduleIds = modules.map((module) => module._id);
    const topics = await Topic.find({ moduleId: { $in: moduleIds } });
    const topicIds = topics.map((topic) => topic._id);
    const searchRegex = new RegExp(escapeRegex(q), "i");

    const [questions, concepts, notes] = await Promise.all([
      Question.find({
        topicId: { $in: topicIds },
        $or: [
          { questionText: searchRegex },
          { solutionText: searchRegex },
          { tags: searchRegex },
        ],
      }),
      Concept.find({
        moduleId: { $in: moduleIds },
        $or: [{ title: searchRegex }, { explanation: searchRegex }],
      }),
      Note.find({
        moduleId: { $in: moduleIds },
        $or: [{ title: searchRegex }, { type: searchRegex }],
      }),
    ]);

    return res.json({
      questions,
      concepts,
      notes,
    });
  } catch (error) {
    return res.status(500).json({ message: "Search failed" });
  }
});

module.exports = router;
