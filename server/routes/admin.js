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
const User = require("../models/User");
const Report = require("../models/Report");
const Notification = require("../models/Notification");
const { createStudentNotification } = require("../utils/notificationService");
const {
  uploadLocalFileToCloudinary,
  destroyCloudinaryAsset,
} = require("../utils/cloudinaryAssets");

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

router.get("/branches", async (req, res) => {
  try {
    const branches = await Branch.find().sort({ name: 1 });
    return res.json(branches);
  } catch (error) {
    return res.status(500).json({ message: "Failed to fetch branches" });
  }
});

router.get("/notifications", async (req, res) => {
  try {
    const notifications = await Notification.find({ audience: { $in: ["students", "paid-students"] } })
      .sort({ createdAt: -1 })
      .limit(50)
      .populate("createdBy", "name email")
      .lean();

    return res.json(notifications);
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
    const branch = await Branch.create({
      name: req.body.name.trim(),
    });

    return res.status(201).json(branch);
  } catch (error) {
    return res.status(500).json({ message: "Failed to create branch" });
  }
});

router.put("/branch/:id", validateObjectIdParam("id"), validateBranchBody, async (req, res) => {
  try {
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
    return res.status(500).json({ message: "Failed to update branch" });
  }
});

router.delete("/branch/:id", validateObjectIdParam("id"), async (req, res) => {
  try {
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
    const semesters = await Semester.find(filter).sort({ number: 1 });
    return res.json(semesters);
  } catch (error) {
    return res.status(500).json({ message: "Failed to fetch semesters" });
  }
});

router.post("/semester", validateSemesterBody, async (req, res) => {
  try {
    const semester = await Semester.create({
      number: req.body.number,
      branchId: req.body.branchId,
    });

    return res.status(201).json(semester);
  } catch (error) {
    return res.status(500).json({ message: "Failed to create semester" });
  }
});

router.put(
  "/semester/:id",
  validateObjectIdParam("id"),
  validateSemesterBody,
  async (req, res) => {
    try {
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
      return res.status(500).json({ message: "Failed to update semester" });
    }
  }
);

router.delete("/semester/:id", validateObjectIdParam("id"), async (req, res) => {
  try {
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
    const subjects = await Subject.find(filter).sort({ name: 1 });
    return res.json(subjects);
  } catch (error) {
    return res.status(500).json({ message: "Failed to fetch subjects" });
  }
});

router.post("/subject", validateSubjectBody, async (req, res) => {
  try {
    const subject = await Subject.create(normalizeSubjectPayload(req.body));
    return res.status(201).json(subject);
  } catch (error) {
    return res.status(500).json({ message: "Failed to create subject" });
  }
});

router.put(
  "/subject/:id",
  validateObjectIdParam("id"),
  validateSubjectBody,
  async (req, res) => {
    try {
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
      return res.status(500).json({ message: "Failed to update subject" });
    }
  }
);

router.delete("/subject/:id", validateObjectIdParam("id"), async (req, res) => {
  try {
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
    const modules = await Module.find(filter).sort({ number: 1 });
    return res.json(modules);
  } catch (error) {
    return res.status(500).json({ message: "Failed to fetch modules" });
  }
});

router.post("/module", validateModuleBody, async (req, res) => {
  try {
    const moduleDoc = await Module.create({
      number: req.body.number,
      title: req.body.title.trim(),
      subjectId: req.body.subjectId,
    });

    return res.status(201).json(moduleDoc);
  } catch (error) {
    return res.status(500).json({ message: "Failed to create module" });
  }
});

router.put(
  "/module/:id",
  validateObjectIdParam("id"),
  validateModuleBody,
  async (req, res) => {
    try {
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
      return res.status(500).json({ message: "Failed to update module" });
    }
  }
);

router.delete("/module/:id", validateObjectIdParam("id"), async (req, res) => {
  try {
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
    const topics = await Topic.find(filter).sort({ name: 1 });
    return res.json(topics);
  } catch (error) {
    return res.status(500).json({ message: "Failed to fetch topics" });
  }
});

router.post("/topic", validateTopicBody, async (req, res) => {
  try {
    const topic = await Topic.create({
      name: req.body.name.trim(),
      moduleId: req.body.moduleId,
    });

    return res.status(201).json(topic);
  } catch (error) {
    return res.status(500).json({ message: "Failed to create topic" });
  }
});

router.put(
  "/topic/:id",
  validateObjectIdParam("id"),
  validateTopicBody,
  async (req, res) => {
    try {
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
      return res.status(500).json({ message: "Failed to update topic" });
    }
  }
);

router.delete("/topic/:id", validateObjectIdParam("id"), async (req, res) => {
  try {
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
    const questions = await Question.find(filter).sort({ createdAt: -1 });
    return res.json(questions);
  } catch (error) {
    return res.status(500).json({ message: "Failed to fetch questions" });
  }
});

router.post("/question", validateQuestionBody, async (req, res) => {
  try {
    const questionPayload = normalizeQuestionPayload(req.body);
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

      if (!question) {
        return res.status(404).json({ message: "Question not found" });
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
    const concepts = await Concept.find(filter).sort({ title: 1 });
    return res.json(concepts);
  } catch (error) {
    return res.status(500).json({ message: "Failed to fetch concepts" });
  }
});

router.post("/concept", validateConceptBody, async (req, res) => {
  try {
    const concept = await Concept.create(normalizeConceptPayload(req.body));

    await createStudentNotification({
      title: "New concept added",
      body: concept.title || "A new important concept was added",
      type: "content",
      data: {
        type: "concept",
        conceptId: String(concept._id),
        moduleId: String(concept.moduleId),
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
      const concept = await Concept.findByIdAndUpdate(
        req.params.id,
        normalizeConceptPayload(req.body),
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
    const notes = await Note.find(filter).sort({ _id: -1 });
    return res.json(notes);
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
    const users = await User.find().select("-passwordHash");
    return res.json(users);
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
    const reports = await Report.find({ status: "pending" })
      .populate("userId", "name email")
      .populate("questionId", "questionText");

    return res.json(reports);
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
