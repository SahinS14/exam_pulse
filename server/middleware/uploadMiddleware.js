const fs = require("fs");
const os = require("os");
const path = require("path");

const multer = require("multer");

const { fieldError, sendValidationError } = require("./validation");

const MAX_PDF_BYTES = 20 * 1024 * 1024;
const MAX_IMAGE_BYTES = 10 * 1024 * 1024;
const MAX_UPLOAD_BYTES = MAX_PDF_BYTES;
const TEMP_UPLOAD_DIR = path.join(os.tmpdir(), "exampulse-uploads");
const IMAGE_EXTENSIONS = new Set([
  ".jpg",
  ".jpeg",
  ".png",
  ".webp",
  ".gif",
  ".bmp",
  ".heic",
  ".heif",
]);

fs.mkdirSync(TEMP_UPLOAD_DIR, { recursive: true });

const detectFileKind = ({ mimetype = "", originalname = "" }) => {
  const normalizedMime = String(mimetype).toLowerCase();
  const extension = path.extname(String(originalname).toLowerCase());

  if (normalizedMime === "application/pdf" || extension === ".pdf") {
    return "pdf";
  }

  if (normalizedMime.startsWith("image/") || IMAGE_EXTENSIONS.has(extension)) {
    return "image";
  }

  return null;
};

const upload = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => cb(null, TEMP_UPLOAD_DIR),
    filename: (req, file, cb) => {
      const extension = path.extname(file.originalname || "");
      const safeBaseName = path
        .basename(file.originalname || "upload", extension)
        .replace(/[^a-zA-Z0-9-_]/g, "_")
        .slice(0, 80);

      cb(null, `${Date.now()}-${safeBaseName || "upload"}${extension}`);
    },
  }),
  limits: {
    fileSize: MAX_UPLOAD_BYTES,
    files: 1,
  },
  fileFilter: (req, file, cb) => {
    const kind = detectFileKind(file);

    if (!kind) {
      const error = new Error("Only PDF and image uploads are supported");
      error.code = "INVALID_FILE_TYPE";
      return cb(error);
    }

    return cb(null, true);
  },
});

const cleanupUploadedFile = async (fileOrPath) => {
  const filePath =
    typeof fileOrPath === "string" ? fileOrPath : fileOrPath?.path;

  if (!filePath) {
    return;
  }

  try {
    await fs.promises.unlink(filePath);
  } catch (error) {
    if (error.code !== "ENOENT") {
      console.error("Failed to clean up temp upload", error.message);
    }
  }
};

const singleFileUpload = (req, res, next) => {
  upload.single("file")(req, res, (error) => {
    if (!error) {
      return next();
    }

    if (error instanceof multer.MulterError && error.code === "LIMIT_FILE_SIZE") {
      return sendValidationError(
        res,
        [
          fieldError(
            "file",
            "File exceeds the maximum allowed size of 20 MB",
            "file_too_large"
          ),
        ]
      );
    }

    if (error.code === "INVALID_FILE_TYPE") {
      return sendValidationError(
        res,
        [fieldError("file", error.message, "invalid_mime_type")]
      );
    }

    return next(error);
  });
};

const validateUploadedFile = async (req, res, next) => {
  if (!req.file) {
    return sendValidationError(
      res,
      [fieldError("file", "file is required", "required")]
    );
  }

  const kind = detectFileKind(req.file);

  if (!kind) {
    await cleanupUploadedFile(req.file);
    return sendValidationError(
      res,
      [fieldError("file", "Only PDF and image uploads are supported", "invalid_mime_type")]
    );
  }

  if (kind === "pdf" && req.file.size > MAX_PDF_BYTES) {
    await cleanupUploadedFile(req.file);
    return sendValidationError(
      res,
      [fieldError("file", "PDF files must be 20 MB or smaller", "file_too_large")]
    );
  }

  if (kind === "image" && req.file.size > MAX_IMAGE_BYTES) {
    await cleanupUploadedFile(req.file);
    return sendValidationError(
      res,
      [fieldError("file", "Image files must be 10 MB or smaller", "file_too_large")]
    );
  }

  req.uploadedFileKind = kind;
  return next();
};

module.exports = {
  MAX_PDF_BYTES,
  MAX_IMAGE_BYTES,
  singleFileUpload,
  validateUploadedFile,
  cleanupUploadedFile,
};
