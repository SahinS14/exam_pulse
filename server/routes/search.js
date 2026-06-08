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
const {
  getPaginationParams,
} = require("../utils/pagination");

const router = express.Router();

const escapeRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

router.get("/", protect, accessCheck, async (req, res) => {
  try {
    const { q, branchId, semesterId } = req.query;
    const pagination = getPaginationParams(req.query);

    if (!q) {
      return res.status(400).json({
        message: "q is required",
      });
    }

    let moduleIds = null;
    let topicIds = null;

    if (branchId && semesterId) {
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
      moduleIds = modules.map((module) => module._id);
      const topics = await Topic.find({ moduleId: { $in: moduleIds } });
      topicIds = topics.map((topic) => topic._id);
    }

    const searchRegex = new RegExp(escapeRegex(q), "i");
    const scopedModuleFilter = moduleIds ? { $in: moduleIds } : { $exists: true };
    const scopedTopicFilter = topicIds ? { $in: topicIds } : { $exists: true };

    const questionFilter = {
      topicId: scopedTopicFilter,
      $or: [
        { questionText: searchRegex },
        { solutionText: searchRegex },
        { tags: searchRegex },
      ],
    };
    const conceptFilter = {
      moduleId: scopedModuleFilter,
      $or: [{ title: searchRegex }, { explanation: searchRegex }],
    };
    const noteFilter = {
      moduleId: scopedModuleFilter,
      $or: [{ title: searchRegex }, { type: searchRegex }],
    };

    const buildQuestionQuery = () =>
      Question.find(questionFilter).populate({
        path: "topicId",
        populate: {
          path: "moduleId",
          populate: {
            path: "subjectId",
          },
        },
      });
    const buildConceptQuery = () =>
      Concept.find(conceptFilter).populate({
        path: "moduleId",
        populate: {
          path: "subjectId",
        },
      });
    const buildNoteQuery = () =>
      Note.find(noteFilter).populate({
        path: "moduleId",
        populate: {
          path: "subjectId",
        },
      });

    let questions;
    let concepts;
    let notes;
    let totals = null;

    if (pagination) {
      const { skip, limit } = pagination;
      [questions, concepts, notes, totals] = await Promise.all([
        buildQuestionQuery().skip(skip).limit(limit),
        buildConceptQuery().skip(skip).limit(limit),
        buildNoteQuery().skip(skip).limit(limit),
        Promise.all([
          Question.countDocuments(questionFilter),
          Concept.countDocuments(conceptFilter),
          Note.countDocuments(noteFilter),
        ]),
      ]);
    } else {
      [questions, concepts, notes] = await Promise.all([
        buildQuestionQuery(),
        buildConceptQuery(),
        buildNoteQuery(),
      ]);
    }

    const response = {
      questions: questions.map((question) => ({
        ...question.toObject(),
        topicName: question.topicId?.name || null,
        moduleTitle: question.topicId?.moduleId?.title || null,
        subjectName: question.topicId?.moduleId?.subjectId?.name || null,
      })),
      concepts: concepts.map((concept) => ({
        ...concept.toObject(),
        moduleTitle: concept.moduleId?.title || null,
        subjectName: concept.moduleId?.subjectId?.name || null,
      })),
      notes: notes.map((note) => ({
        ...note.toObject(),
        moduleTitle: note.moduleId?.title || null,
        subjectName: note.moduleId?.subjectId?.name || null,
      })),
    };

    if (!pagination) {
      return res.json(response);
    }

    const [questionTotal, conceptTotal, noteTotal] = totals;

    return res.json({
      ...response,
      pagination: {
        page: pagination.page,
        limit: pagination.limit,
        totals: {
          questions: questionTotal,
          concepts: conceptTotal,
          notes: noteTotal,
        },
        totalPages: {
          questions: Math.max(1, Math.ceil(questionTotal / pagination.limit)),
          concepts: Math.max(1, Math.ceil(conceptTotal / pagination.limit)),
          notes: Math.max(1, Math.ceil(noteTotal / pagination.limit)),
        },
      },
    });
  } catch (error) {
    return res.status(500).json({ message: "Search failed" });
  }
});

module.exports = router;
