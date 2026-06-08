const express = require("express");

const { protect, adminOnly } = require("../middleware/authMiddleware");
const { createRateLimiter } = require("../middleware/rateLimit");
const {
  validateObjectIdParam,
  validateBranchBody,
  validateSemesterBody,
  validateSubjectBody,
  validateModuleBody,
  validateTopicBody,
  validateQuestionBody,
  validateConceptBody,
  validateNoteBody,
  validateAdminNotificationBody,
} = require("../middleware/validation");
const {
  singleFileUpload,
  validateUploadedFile,
  cleanupUploadedFile,
} = require("../middleware/uploadMiddleware");
const Branch = require("../models/Branch");
const Semester = require("../models/Semester");
const Subject = require("../models/Subject");
const Module = require("../models/Module");
const Topic = require("../models/Topic");
const Question = require("../models/Question");
const Concept = require("../models/Concept");
const Note = require("../models/Note");
const Bookmark = require("../models/Bookmark");
const User = require("../models/User");
const Report = require("../models/Report");
const Notification = require("../models/Notification");
const { createStudentNotification } = require("../utils/notificationService");
const {
  uploadLocalFileToCloudinary,
  destroyCloudinaryAsset,
} = require("../utils/cloudinaryAssets");
const {
  getPaginationParams,
  buildPaginatedResponse,
} = require("../utils/pagination");

const router = express.Router();
const adminUploadRateLimit = createRateLimiter({
  keyPrefix: "admin-upload",
  windowMs: 15 * 60 * 1000,
  maxRequests: 20,
  message: "Too many upload attempts. Please wait before uploading again.",
  keySelector: (req) => req.user?._id?.toString() || req.ip,
});

router.use(protect, adminOnly);

const normalizeQuestionPayload = (payload) => {
  const yearAppeared = Array.isArray(payload.yearAppeared)
    ? payload.yearAppeared
        .map((item) => ({
          examName: typeof item?.examName === "string" ? item.examName.trim() : "",
          year: Number(item?.year),
        }))
        .filter(
          (item) =>
            item.examName &&
            Number.isInteger(item.year) &&
            item.year > 0
        )
    : [];

  const tags = Array.isArray(payload.tags)
    ? payload.tags
        .map((item) => (typeof item === "string" ? item.trim() : ""))
        .filter(Boolean)
    : [];

  return {
    questionText:
      typeof payload.questionText === "string" ? payload.questionText.trim() : "",
    solutionText:
      typeof payload.solutionText === "string" ? payload.solutionText.trim() : "",
    markCategory:
      typeof payload.markCategory === "string" ? payload.markCategory.trim() : "",
    images: Array.isArray(payload.images) ? payload.images.filter(Boolean) : [],
    yearAppeared,
    tags,
    topicId: payload.topicId,
    isMostRepeated: Boolean(payload.isMostRepeated),
    isTopRevision: Boolean(payload.isTopRevision),
  };
};

const normalizeConceptPayload = (payload) => ({
  title: typeof payload.title === "string" ? payload.title.trim() : "",
  explanation:
    typeof payload.explanation === "string" ? payload.explanation.trim() : "",
  images: Array.isArray(payload.images) ? payload.images.filter(Boolean) : [],
  moduleId: payload.moduleId,
});

const normalizeSubjectPayload = (payload) => ({
  name: typeof payload.name === "string" ? payload.name.trim() : "",
  semesterId: payload.semesterId,
  syllabusFileUrl:
    typeof payload.syllabusFileUrl === "string" && payload.syllabusFileUrl.trim()
      ? payload.syllabusFileUrl.trim()
      : undefined,
  syllabusFileName:
    typeof payload.syllabusFileName === "string" && payload.syllabusFileName.trim()
      ? payload.syllabusFileName.trim()
      : undefined,
  syllabusFileSize: Number.isInteger(payload.syllabusFileSize)
    ? payload.syllabusFileSize
    : undefined,
  syllabusMimeType:
    typeof payload.syllabusMimeType === "string" && payload.syllabusMimeType.trim()
      ? payload.syllabusMimeType.trim()
      : undefined,
  syllabusUploadedAt: payload.syllabusUploadedAt
    ? new Date(payload.syllabusUploadedAt)
    : undefined,
  syllabusFileCloudinaryPublicId:
    typeof payload.syllabusFileCloudinaryPublicId === "string" &&
    payload.syllabusFileCloudinaryPublicId.trim()
      ? payload.syllabusFileCloudinaryPublicId.trim()
      : undefined,
  syllabusFileCloudinaryResourceType:
    typeof payload.syllabusFileCloudinaryResourceType === "string" &&
    payload.syllabusFileCloudinaryResourceType.trim()
      ? payload.syllabusFileCloudinaryResourceType.trim()
      : undefined,
});

const buildUploadedFileMetadata = (reqFile, uploadedFile) => ({
  url: uploadedFile.secure_url,
  fileName:
    reqFile.originalname ||
    uploadedFile.original_filename ||
    uploadedFile.display_name ||
    "upload",
  fileSize: reqFile.size || uploadedFile.bytes || 0,
  mimeType: reqFile.mimetype || "",
  uploadedAt: uploadedFile.created_at || new Date().toISOString(),
  cloudinaryPublicId: uploadedFile.public_id,
  cloudinaryResourceType: uploadedFile.resource_type || "image",
});

const cleanupTrackedAsset = async (publicId, resourceType) => {
  if (!publicId) {
    return;
  }

  try {
    await destroyCloudinaryAsset(publicId, resourceType || "image");
  } catch (error) {
    console.error("Cloudinary cleanup failed", error.message);
  }
};

const escapeRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const findCaseInsensitiveDuplicate = async ({
  Model,
  field,
  value,
  scope = {},
  excludeId,
}) => {
  if (typeof value !== "string" || !value.trim()) {
    return null;
  }

  const duplicate = await Model.findOne({
    ...scope,
    [field]: new RegExp(`^${escapeRegex(value.trim())}$`, "i"),
  }).select("_id");

  if (!duplicate) {
    return null;
  }

  if (excludeId && String(duplicate._id) === String(excludeId)) {
    return null;
  }

  return duplicate;
};

const sendConflict = (res, message) =>
  res.status(409).json({
    message,
  });

const sendNotFound = (res, message) =>
  res.status(404).json({
    message,
  });

const ensureEntityExists = async (Model, id) => Model.findById(id).select("_id");
const buildNotificationUrl = (path, query = {}) => {
  const params = new URLSearchParams(
    Object.entries(query).filter(([, value]) => value !== undefined && value !== null && value !== "")
  );
  const search = params.toString();
  return `exampulse://${path}${search ? `?${search}` : ""}`;
};

router.get("/branches", async (req, res) => {
  try {
    const pagination = getPaginationParams(req.query);
    const query = Branch.find().sort({ name: 1 });

    if (!pagination) {
      const branches = await query;
      return res.json(branches);
    }

    const { page, limit, skip } = pagination;
    const [branches, total] = await Promise.all([
      query.skip(skip).limit(limit),
      Branch.countDocuments(),
    ]);

    return res.json(
      buildPaginatedResponse({ items: branches, total, page, limit })
    );
  } catch (error) {
    return res.status(500).json({ message: "Failed to fetch branches" });
  }
});

router.get("/notifications", async (req, res) => {
  try {
    const filter = { audience: { $in: ["students", "paid-students"] } };
    const pagination = getPaginationParams(req.query);
    const query = Notification.find(filter)
      .sort({ createdAt: -1 })
      .populate("createdBy", "name email")
      .lean();

    if (!pagination) {
      const notifications = await query.limit(50);
      return res.json(notifications);
    }

    const { page, limit, skip } = pagination;
    const [notifications, total] = await Promise.all([
      query.skip(skip).limit(limit),
      Notification.countDocuments(filter),
    ]);

    return res.json(
      buildPaginatedResponse({ items: notifications, total, page, limit })
    );
  } catch (error) {
    return res.status(500).json({ message: "Failed to fetch notifications" });
  }
});

router.post("/notifications", validateAdminNotificationBody, async (req, res) => {
  try {
    const result = await createStudentNotification({
      title: req.body.title.trim(),
      body: req.body.body.trim(),
      type: req.body.type,
      data: {
        type: req.body.type,
        source: "admin-manual",
        url: buildNotificationUrl("notifications"),
      },
      createdBy: req.user._id,
      premiumOnly: false,
    });

    return res.status(201).json({
      ...result.notification.toObject(),
      recipients: result.recipients,
    });
  } catch (error) {
    return res.status(500).json({ message: "Failed to send notification" });
  }
});

router.post("/branch", validateBranchBody, async (req, res) => {
  try {
    const duplicate = await findCaseInsensitiveDuplicate({
      Model: Branch,
      field: "name",
      value: req.body.name,
    });

    if (duplicate) {
      return sendConflict(res, "A branch with this name already exists.");
    }

    const branch = await Branch.create({
      name: req.body.name.trim(),
    });

    return res.status(201).json(branch);
  } catch (error) {
    if (error?.code === 11000) {
      return sendConflict(res, "A branch with this name already exists.");
    }

    return res.status(500).json({ message: "Failed to create branch" });
  }
});

router.put("/branch/:id", validateObjectIdParam("id"), validateBranchBody, async (req, res) => {
  try {
    const duplicate = await findCaseInsensitiveDuplicate({
      Model: Branch,
      field: "name",
      value: req.body.name,
      excludeId: req.params.id,
    });

    if (duplicate) {
      return sendConflict(res, "A branch with this name already exists.");
    }

    const branch = await Branch.findByIdAndUpdate(
      req.params.id,
      { name: req.body.name.trim() },
      { returnDocument: "after" }
    );

    if (!branch) {
      return res.status(404).json({ message: "Branch not found" });
    }

    return res.json(branch);
  } catch (error) {
    if (error?.code === 11000) {
      return sendConflict(res, "A branch with this name already exists.");
    }

    return res.status(500).json({ message: "Failed to update branch" });
  }
});

router.delete("/branch/:id", validateObjectIdParam("id"), async (req, res) => {
  try {
    const hasSemesters = await Semester.exists({ branchId: req.params.id });

    if (hasSemesters) {
      return sendConflict(
        res,
        "Cannot delete this branch while semesters still belong to it."
      );
    }

    const branch = await Branch.findByIdAndDelete(req.params.id);

    if (!branch) {
      return res.status(404).json({ message: "Branch not found" });
    }

    return res.json({ message: "Branch deleted" });
  } catch (error) {
    return res.status(500).json({ message: "Failed to delete branch" });
  }
});

router.get("/semesters", async (req, res) => {
  try {
    const filter = req.query.branchId ? { branchId: req.query.branchId } : {};
    const pagination = getPaginationParams(req.query);
    const query = Semester.find(filter).sort({ number: 1 });

    if (!pagination) {
      const semesters = await query;
      return res.json(semesters);
    }

    const { page, limit, skip } = pagination;
    const [semesters, total] = await Promise.all([
      query.skip(skip).limit(limit),
      Semester.countDocuments(filter),
    ]);

    return res.json(
      buildPaginatedResponse({ items: semesters, total, page, limit })
    );
  } catch (error) {
    return res.status(500).json({ message: "Failed to fetch semesters" });
  }
});

router.post("/semester", validateSemesterBody, async (req, res) => {
  try {
    const branch = await ensureEntityExists(Branch, req.body.branchId);

    if (!branch) {
      return sendNotFound(res, "Branch not found");
    }

    const existingSemester = await Semester.findOne({
      branchId: req.body.branchId,
      number: req.body.number,
    }).select("_id");

    if (existingSemester) {
      return sendConflict(
        res,
        "This semester number already exists for the selected branch."
      );
    }

    const semester = await Semester.create({
      number: req.body.number,
      branchId: req.body.branchId,
    });

    return res.status(201).json(semester);
  } catch (error) {
    if (error?.code === 11000) {
      return sendConflict(
        res,
        "This semester number already exists for the selected branch."
      );
    }

    return res.status(500).json({ message: "Failed to create semester" });
  }
});

router.put(
  "/semester/:id",
  validateObjectIdParam("id"),
  validateSemesterBody,
  async (req, res) => {
    try {
      const branch = await ensureEntityExists(Branch, req.body.branchId);

      if (!branch) {
        return sendNotFound(res, "Branch not found");
      }

      const existingSemester = await Semester.findOne({
        branchId: req.body.branchId,
        number: req.body.number,
        _id: { $ne: req.params.id },
      }).select("_id");

      if (existingSemester) {
        return sendConflict(
          res,
          "This semester number already exists for the selected branch."
        );
      }

      const semester = await Semester.findByIdAndUpdate(
        req.params.id,
        {
          number: req.body.number,
          branchId: req.body.branchId,
        },
        { returnDocument: "after" }
      );

      if (!semester) {
        return res.status(404).json({ message: "Semester not found" });
      }

      return res.json(semester);
    } catch (error) {
      if (error?.code === 11000) {
        return sendConflict(
          res,
          "This semester number already exists for the selected branch."
        );
      }

      return res.status(500).json({ message: "Failed to update semester" });
    }
  }
);

router.delete("/semester/:id", validateObjectIdParam("id"), async (req, res) => {
  try {
    const hasSubjects = await Subject.exists({ semesterId: req.params.id });

    if (hasSubjects) {
      return sendConflict(
        res,
        "Cannot delete this semester while subjects still belong to it."
      );
    }

    const semester = await Semester.findByIdAndDelete(req.params.id);

    if (!semester) {
      return res.status(404).json({ message: "Semester not found" });
    }

    return res.json({ message: "Semester deleted" });
  } catch (error) {
    return res.status(500).json({ message: "Failed to delete semester" });
  }
});

router.get("/subjects", async (req, res) => {
  try {
    const filter = req.query.semesterId
      ? { semesterId: req.query.semesterId }
      : {};
    const pagination = getPaginationParams(req.query);
    const query = Subject.find(filter).sort({ name: 1 });

    if (!pagination) {
      const subjects = await query;
      return res.json(subjects);
    }

    const { page, limit, skip } = pagination;
    const [subjects, total] = await Promise.all([
      query.skip(skip).limit(limit),
      Subject.countDocuments(filter),
    ]);

    return res.json(
      buildPaginatedResponse({ items: subjects, total, page, limit })
    );
  } catch (error) {
    return res.status(500).json({ message: "Failed to fetch subjects" });
  }
});

router.post("/subject", validateSubjectBody, async (req, res) => {
  try {
    const semester = await ensureEntityExists(Semester, req.body.semesterId);

    if (!semester) {
      return sendNotFound(res, "Semester not found");
    }

    const duplicate = await findCaseInsensitiveDuplicate({
      Model: Subject,
      field: "name",
      value: req.body.name,
      scope: { semesterId: req.body.semesterId },
    });

    if (duplicate) {
      return sendConflict(
        res,
        "A subject with this name already exists in the selected semester."
      );
    }

    const subject = await Subject.create(normalizeSubjectPayload(req.body));
    return res.status(201).json(subject);
  } catch (error) {
    if (error?.code === 11000) {
      return sendConflict(
        res,
        "A subject with this name already exists in the selected semester."
      );
    }

    return res.status(500).json({ message: "Failed to create subject" });
  }
});

router.put(
  "/subject/:id",
  validateObjectIdParam("id"),
  validateSubjectBody,
  async (req, res) => {
    try {
      const semester = await ensureEntityExists(Semester, req.body.semesterId);

      if (!semester) {
        return sendNotFound(res, "Semester not found");
      }

      const duplicate = await findCaseInsensitiveDuplicate({
        Model: Subject,
        field: "name",
        value: req.body.name,
        scope: { semesterId: req.body.semesterId },
        excludeId: req.params.id,
      });

      if (duplicate) {
        return sendConflict(
          res,
          "A subject with this name already exists in the selected semester."
        );
      }

      const subject = await Subject.findById(req.params.id);

      if (!subject) {
        return res.status(404).json({ message: "Subject not found" });
      }

      const nextPayload = normalizeSubjectPayload(req.body);
      const previousSyllabusPublicId = subject.syllabusFileCloudinaryPublicId;
      const previousSyllabusResourceType =
        subject.syllabusFileCloudinaryResourceType;
      const shouldCleanupExistingAsset =
        previousSyllabusPublicId &&
        previousSyllabusPublicId !== nextPayload.syllabusFileCloudinaryPublicId;

      Object.assign(subject, nextPayload);
      await subject.save();

      if (shouldCleanupExistingAsset) {
        await cleanupTrackedAsset(
          previousSyllabusPublicId,
          previousSyllabusResourceType
        );
      }

      return res.json(subject);
    } catch (error) {
      if (error?.code === 11000) {
        return sendConflict(
          res,
          "A subject with this name already exists in the selected semester."
        );
      }

      return res.status(500).json({ message: "Failed to update subject" });
    }
  }
);

router.delete("/subject/:id", validateObjectIdParam("id"), async (req, res) => {
  try {
    const hasModules = await Module.exists({ subjectId: req.params.id });

    if (hasModules) {
      return sendConflict(
        res,
        "Cannot delete this subject while modules still belong to it."
      );
    }

    const subject = await Subject.findByIdAndDelete(req.params.id);

    if (!subject) {
      return res.status(404).json({ message: "Subject not found" });
    }

    await cleanupTrackedAsset(
      subject.syllabusFileCloudinaryPublicId,
      subject.syllabusFileCloudinaryResourceType
    );

    return res.json({ message: "Subject deleted" });
  } catch (error) {
    return res.status(500).json({ message: "Failed to delete subject" });
  }
});

router.get("/modules", async (req, res) => {
  try {
    const filter = req.query.subjectId ? { subjectId: req.query.subjectId } : {};
    const pagination = getPaginationParams(req.query);
    const query = Module.find(filter).sort({ number: 1 });

    if (!pagination) {
      const modules = await query;
      return res.json(modules);
    }

    const { page, limit, skip } = pagination;
    const [modules, total] = await Promise.all([
      query.skip(skip).limit(limit),
      Module.countDocuments(filter),
    ]);

    return res.json(
      buildPaginatedResponse({ items: modules, total, page, limit })
    );
  } catch (error) {
    return res.status(500).json({ message: "Failed to fetch modules" });
  }
});

router.post("/module", validateModuleBody, async (req, res) => {
  try {
    const subject = await ensureEntityExists(Subject, req.body.subjectId);

    if (!subject) {
      return sendNotFound(res, "Subject not found");
    }

    const existingModule = await Module.findOne({
      subjectId: req.body.subjectId,
      number: req.body.number,
    }).select("_id");

    if (existingModule) {
      return sendConflict(
        res,
        "This module number already exists for the selected subject."
      );
    }

    const moduleDoc = await Module.create({
      number: req.body.number,
      title: req.body.title.trim(),
      subjectId: req.body.subjectId,
    });

    return res.status(201).json(moduleDoc);
  } catch (error) {
    if (error?.code === 11000) {
      return sendConflict(
        res,
        "This module number already exists for the selected subject."
      );
    }

    return res.status(500).json({ message: "Failed to create module" });
  }
});

router.put(
  "/module/:id",
  validateObjectIdParam("id"),
  validateModuleBody,
  async (req, res) => {
    try {
      const subject = await ensureEntityExists(Subject, req.body.subjectId);

      if (!subject) {
        return sendNotFound(res, "Subject not found");
      }

      const existingModule = await Module.findOne({
        subjectId: req.body.subjectId,
        number: req.body.number,
        _id: { $ne: req.params.id },
      }).select("_id");

      if (existingModule) {
        return sendConflict(
          res,
          "This module number already exists for the selected subject."
        );
      }

      const moduleDoc = await Module.findByIdAndUpdate(
        req.params.id,
        {
          number: req.body.number,
          title: req.body.title.trim(),
          subjectId: req.body.subjectId,
        },
        { returnDocument: "after" }
      );

      if (!moduleDoc) {
        return res.status(404).json({ message: "Module not found" });
      }

      return res.json(moduleDoc);
    } catch (error) {
      if (error?.code === 11000) {
        return sendConflict(
          res,
          "This module number already exists for the selected subject."
        );
      }

      return res.status(500).json({ message: "Failed to update module" });
    }
  }
);

router.delete("/module/:id", validateObjectIdParam("id"), async (req, res) => {
  try {
    const [hasTopics, hasConcepts, hasNotes] = await Promise.all([
      Topic.exists({ moduleId: req.params.id }),
      Concept.exists({ moduleId: req.params.id }),
      Note.exists({ moduleId: req.params.id }),
    ]);

    if (hasTopics || hasConcepts || hasNotes) {
      return sendConflict(
        res,
        "Cannot delete this module while topics, concepts, or notes still belong to it."
      );
    }

    const moduleDoc = await Module.findByIdAndDelete(req.params.id);

    if (!moduleDoc) {
      return res.status(404).json({ message: "Module not found" });
    }

    return res.json({ message: "Module deleted" });
  } catch (error) {
    return res.status(500).json({ message: "Failed to delete module" });
  }
});

router.get("/topics", async (req, res) => {
  try {
    const filter = req.query.moduleId ? { moduleId: req.query.moduleId } : {};
    const pagination = getPaginationParams(req.query);
    const query = Topic.find(filter).sort({ name: 1 });

    if (!pagination) {
      const topics = await query;
      return res.json(topics);
    }

    const { page, limit, skip } = pagination;
    const [topics, total] = await Promise.all([
      query.skip(skip).limit(limit),
      Topic.countDocuments(filter),
    ]);

    return res.json(
      buildPaginatedResponse({ items: topics, total, page, limit })
    );
  } catch (error) {
    return res.status(500).json({ message: "Failed to fetch topics" });
  }
});

router.post("/topic", validateTopicBody, async (req, res) => {
  try {
    const moduleDoc = await ensureEntityExists(Module, req.body.moduleId);

    if (!moduleDoc) {
      return sendNotFound(res, "Module not found");
    }

    const duplicate = await findCaseInsensitiveDuplicate({
      Model: Topic,
      field: "name",
      value: req.body.name,
      scope: { moduleId: req.body.moduleId },
    });

    if (duplicate) {
      return sendConflict(
        res,
        "A topic with this name already exists in the selected module."
      );
    }

    const topic = await Topic.create({
      name: req.body.name.trim(),
      moduleId: req.body.moduleId,
    });

    return res.status(201).json(topic);
  } catch (error) {
    if (error?.code === 11000) {
      return sendConflict(
        res,
        "A topic with this name already exists in the selected module."
      );
    }

    return res.status(500).json({ message: "Failed to create topic" });
  }
});

router.put(
  "/topic/:id",
  validateObjectIdParam("id"),
  validateTopicBody,
  async (req, res) => {
    try {
      const moduleDoc = await Module.findById(req.body.moduleId).select(
        "_id number title"
      );

      if (!moduleDoc) {
        return sendNotFound(res, "Module not found");
      }

      const duplicate = await findCaseInsensitiveDuplicate({
        Model: Topic,
        field: "name",
        value: req.body.name,
        scope: { moduleId: req.body.moduleId },
        excludeId: req.params.id,
      });

      if (duplicate) {
        return sendConflict(
          res,
          "A topic with this name already exists in the selected module."
        );
      }

      const topic = await Topic.findByIdAndUpdate(
        req.params.id,
        {
          name: req.body.name.trim(),
          moduleId: req.body.moduleId,
        },
        { returnDocument: "after" }
      );

      if (!topic) {
        return res.status(404).json({ message: "Topic not found" });
      }

      return res.json(topic);
    } catch (error) {
      if (error?.code === 11000) {
        return sendConflict(
          res,
          "A topic with this name already exists in the selected module."
        );
      }

      return res.status(500).json({ message: "Failed to update topic" });
    }
  }
);

router.delete("/topic/:id", validateObjectIdParam("id"), async (req, res) => {
  try {
    const hasQuestions = await Question.exists({ topicId: req.params.id });

    if (hasQuestions) {
      return sendConflict(
        res,
        "Cannot delete this topic while questions still belong to it."
      );
    }

    const topic = await Topic.findByIdAndDelete(req.params.id);

    if (!topic) {
      return res.status(404).json({ message: "Topic not found" });
    }

    return res.json({ message: "Topic deleted" });
  } catch (error) {
    return res.status(500).json({ message: "Failed to delete topic" });
  }
});

router.get("/questions", async (req, res) => {
  try {
    const filter = req.query.topicId ? { topicId: req.query.topicId } : {};
    const pagination = getPaginationParams(req.query);
    const query = Question.find(filter).sort({ createdAt: -1 });

    if (!pagination) {
      const questions = await query;
      return res.json(questions);
    }

    const { page, limit, skip } = pagination;
    const [questions, total] = await Promise.all([
      query.skip(skip).limit(limit),
      Question.countDocuments(filter),
    ]);

    return res.json(
      buildPaginatedResponse({ items: questions, total, page, limit })
    );
  } catch (error) {
    return res.status(500).json({ message: "Failed to fetch questions" });
  }
});

router.post("/question", validateQuestionBody, async (req, res) => {
  try {
    const questionPayload = normalizeQuestionPayload(req.body);
    const topic = await Topic.findById(questionPayload.topicId).select("_id name");

    if (!topic) {
      return sendNotFound(res, "Topic not found");
    }

    const question = await Question.create(questionPayload);

    await createStudentNotification({
      title: "New question added",
      body: questionPayload.markCategory
        ? `${questionPayload.markCategory} question added to your library`
        : "A new question was added to your library",
      type: "content",
      data: {
        type: "question",
        questionId: String(question._id),
        topicId: String(question.topicId),
        url: buildNotificationUrl(`questions/${topic._id}`, {
          topicName: topic.name || "Question Bank",
        }),
      },
      createdBy: req.user._id,
      premiumOnly: true,
    });

    return res.status(201).json(question);
  } catch (error) {
    return res.status(500).json({ message: "Failed to create question" });
  }
});

router.put(
  "/question/:id",
  validateObjectIdParam("id"),
  validateQuestionBody,
  async (req, res) => {
    try {
      const question = await Question.findById(req.params.id);
      const questionPayload = normalizeQuestionPayload(req.body);
      const topic = await ensureEntityExists(Topic, questionPayload.topicId);

      if (!question) {
        return res.status(404).json({ message: "Question not found" });
      }

      if (!topic) {
        return sendNotFound(res, "Topic not found");
      }

      Object.assign(question, questionPayload);
      await question.save();

      return res.json(question);
    } catch (error) {
      return res.status(500).json({ message: "Failed to update question" });
    }
  }
);

router.delete("/question/:id", validateObjectIdParam("id"), async (req, res) => {
  try {
    const [hasBookmarks, hasReports] = await Promise.all([
      Bookmark.exists({ questionId: req.params.id }),
      Report.exists({ questionId: req.params.id }),
    ]);

    if (hasBookmarks || hasReports) {
      return sendConflict(
        res,
        "Cannot delete this question while bookmarks or reports still refer to it."
      );
    }

    const question = await Question.findByIdAndDelete(req.params.id);

    if (!question) {
      return res.status(404).json({ message: "Question not found" });
    }

    return res.json({ message: "Question deleted" });
  } catch (error) {
    return res.status(500).json({ message: "Failed to delete question" });
  }
});

router.get("/concepts", async (req, res) => {
  try {
    const filter = req.query.moduleId ? { moduleId: req.query.moduleId } : {};
    const pagination = getPaginationParams(req.query);
    const query = Concept.find(filter).sort({ title: 1 });

    if (!pagination) {
      const concepts = await query;
      return res.json(concepts);
    }

    const { page, limit, skip } = pagination;
    const [concepts, total] = await Promise.all([
      query.skip(skip).limit(limit),
      Concept.countDocuments(filter),
    ]);

    return res.json(
      buildPaginatedResponse({ items: concepts, total, page, limit })
    );
  } catch (error) {
    return res.status(500).json({ message: "Failed to fetch concepts" });
  }
});

router.post("/concept", validateConceptBody, async (req, res) => {
  try {
    const conceptPayload = normalizeConceptPayload(req.body);
    const moduleDoc = await Module.findById(conceptPayload.moduleId).select(
      "_id number title"
    );

    if (!moduleDoc) {
      return sendNotFound(res, "Module not found");
    }

    const concept = await Concept.create(conceptPayload);

    await createStudentNotification({
      title: "New concept added",
      body: concept.title || "A new important concept was added",
      type: "content",
      data: {
        type: "concept",
        conceptId: String(concept._id),
        moduleId: String(concept.moduleId),
        url: buildNotificationUrl(`concepts/${moduleDoc._id}`, {
          moduleNumber: moduleDoc.number,
          moduleTitle: moduleDoc.title || "Module",
        }),
      },
      createdBy: req.user._id,
      premiumOnly: true,
    });

    return res.status(201).json(concept);
  } catch (error) {
    return res.status(500).json({ message: "Failed to create concept" });
  }
});

router.put(
  "/concept/:id",
  validateObjectIdParam("id"),
  validateConceptBody,
  async (req, res) => {
    try {
      const conceptPayload = normalizeConceptPayload(req.body);
      const moduleDoc = await ensureEntityExists(Module, conceptPayload.moduleId);

      if (!moduleDoc) {
        return sendNotFound(res, "Module not found");
      }

      const concept = await Concept.findByIdAndUpdate(
        req.params.id,
        conceptPayload,
        { returnDocument: "after" }
      );

      if (!concept) {
        return res.status(404).json({ message: "Concept not found" });
      }

      return res.json(concept);
    } catch (error) {
      return res.status(500).json({ message: "Failed to update concept" });
    }
  }
);

router.delete("/concept/:id", validateObjectIdParam("id"), async (req, res) => {
  try {
    const concept = await Concept.findByIdAndDelete(req.params.id);

    if (!concept) {
      return res.status(404).json({ message: "Concept not found" });
    }

    return res.json({ message: "Concept deleted" });
  } catch (error) {
    return res.status(500).json({ message: "Failed to delete concept" });
  }
});

router.get("/notes", async (req, res) => {
  try {
    const filter = req.query.moduleId ? { moduleId: req.query.moduleId } : {};
    const pagination = getPaginationParams(req.query);
    const query = Note.find(filter).sort({ _id: -1 });

    if (!pagination) {
      const notes = await query;
      return res.json(notes);
    }

    const { page, limit, skip } = pagination;
    const [notes, total] = await Promise.all([
      query.skip(skip).limit(limit),
      Note.countDocuments(filter),
    ]);

    return res.json(
      buildPaginatedResponse({ items: notes, total, page, limit })
    );
  } catch (error) {
    return res.status(500).json({ message: "Failed to fetch notes" });
  }
});

router.post(
  "/upload",
  adminUploadRateLimit,
  singleFileUpload,
  validateUploadedFile,
  async (req, res) => {
    try {
      const uploadedFile = await uploadLocalFileToCloudinary(req.file.path);
      return res.status(201).json(buildUploadedFileMetadata(req.file, uploadedFile));
    } catch (error) {
      return res.status(500).json({ message: "Failed to upload file" });
    } finally {
      await cleanupUploadedFile(req.file);
    }
  }
);

router.post(
  "/note",
  adminUploadRateLimit,
  singleFileUpload,
  validateUploadedFile,
  validateNoteBody,
  async (req, res) => {
    let uploadedFile;

    try {
      const moduleDoc = await ensureEntityExists(Module, req.body.moduleId);

      if (!moduleDoc) {
        return sendNotFound(res, "Module not found");
      }

      uploadedFile = await uploadLocalFileToCloudinary(req.file.path);
      const fileMetadata = buildUploadedFileMetadata(req.file, uploadedFile);

      const note = await Note.create({
        title: req.body.title.trim(),
        fileUrl: fileMetadata.url,
        fileName: fileMetadata.fileName,
        fileSize: fileMetadata.fileSize,
        mimeType: fileMetadata.mimeType,
        cloudinaryPublicId: fileMetadata.cloudinaryPublicId,
        cloudinaryResourceType: fileMetadata.cloudinaryResourceType,
        type: req.body.type,
        moduleId: req.body.moduleId,
        uploadedAt: fileMetadata.uploadedAt,
      });

      await createStudentNotification({
        title: "New note uploaded",
        body: req.body.title.trim() || "Fresh study material is now available",
        type: "content",
        data: {
          type: "note",
          noteId: String(note._id),
          moduleId: String(note.moduleId),
          url: buildNotificationUrl(`notes/${note.moduleId}`, {
            moduleNumber: moduleDoc.number,
            moduleTitle: moduleDoc.title || "Module",
          }),
        },
        createdBy: req.user._id,
        premiumOnly: true,
      });

      return res.status(201).json(note);
    } catch (error) {
      if (uploadedFile?.public_id) {
        await cleanupTrackedAsset(uploadedFile.public_id, uploadedFile.resource_type);
      }

      return res.status(500).json({ message: "Failed to upload note" });
    } finally {
      await cleanupUploadedFile(req.file);
    }
  }
);

router.delete("/note/:id", validateObjectIdParam("id"), async (req, res) => {
  try {
    const note = await Note.findByIdAndDelete(req.params.id);

    if (!note) {
      return res.status(404).json({ message: "Note not found" });
    }

    await cleanupTrackedAsset(
      note.cloudinaryPublicId,
      note.cloudinaryResourceType
    );

    return res.json({ message: "Note deleted" });
  } catch (error) {
    return res.status(500).json({ message: "Failed to delete note" });
  }
});

router.get("/users", async (req, res) => {
  try {
    const pagination = getPaginationParams(req.query);
    const query = User.find().select("-passwordHash");

    if (!pagination) {
      const users = await query;
      return res.json(users);
    }

    const { page, limit, skip } = pagination;
    const [users, total] = await Promise.all([
      query.skip(skip).limit(limit),
      User.countDocuments(),
    ]);

    return res.json(
      buildPaginatedResponse({ items: users, total, page, limit })
    );
  } catch (error) {
    return res.status(500).json({ message: "Failed to fetch users" });
  }
});

router.put("/users/:id/block", validateObjectIdParam("id"), async (req, res) => {
  try {
    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    user.isPaid = false;
    user.accessExpiry = undefined;
    await user.save();

    return res.json(user);
  } catch (error) {
    return res.status(500).json({ message: "Failed to block user" });
  }
});

router.put("/users/:id/grant", validateObjectIdParam("id"), async (req, res) => {
  try {
    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    user.isPaid = true;
    user.accessExpiry = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000);
    await user.save();

    return res.json(user);
  } catch (error) {
    return res.status(500).json({ message: "Failed to grant access" });
  }
});

router.get("/reports", async (req, res) => {
  try {
    const filter = { status: "pending" };
    const pagination = getPaginationParams(req.query);
    const query = Report.find(filter)
      .populate("userId", "name email")
      .populate("questionId", "questionText");

    if (!pagination) {
      const reports = await query;
      return res.json(reports);
    }

    const { page, limit, skip } = pagination;
    const [reports, total] = await Promise.all([
      query.skip(skip).limit(limit),
      Report.countDocuments(filter),
    ]);

    return res.json(
      buildPaginatedResponse({ items: reports, total, page, limit })
    );
  } catch (error) {
    return res.status(500).json({ message: "Failed to fetch reports" });
  }
});

router.put(
  "/reports/:id/resolve",
  validateObjectIdParam("id"),
  async (req, res) => {
    try {
      const report = await Report.findById(req.params.id);

      if (!report) {
        return res.status(404).json({ message: "Report not found" });
      }

      report.status = "resolved";
      await report.save();

      return res.json(report);
    } catch (error) {
      return res.status(500).json({ message: "Failed to resolve report" });
    }
  }
);

module.exports = router;
