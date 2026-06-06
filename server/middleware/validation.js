const mongoose = require("mongoose");

const MARK_CATEGORIES = ["1 Mark", "2 Mark", "5 Mark", "10 Mark", "Short", "Long"];
const NOTE_TYPES = [
  "Module Notes",
  "Handwritten",
  "Revision",
  "Question Bank",
  "Faculty",
];
const REPORT_REASONS = [
  "Wrong Solution",
  "Missing Diagram",
  "Incorrect Answer",
  "Broken PDF",
];
const NOTIFICATION_TYPES = ["admin", "promotion", "content", "system"];
const ALLOWED_UPLOAD_RESOURCE_TYPES = ["image", "raw", "video", "auto"];

const fieldError = (field, message, code = "invalid") => ({
  field,
  message,
  code,
});

const sendValidationError = (
  res,
  errors,
  status = 422,
  message = "Validation failed"
) =>
  res.status(status).json({
    message,
    errors,
  });

const validate = (validator) => (req, res, next) => {
  const errors = validator(req);

  if (errors.length) {
    return sendValidationError(res, errors);
  }

  return next();
};

const isValidObjectId = (value) => mongoose.Types.ObjectId.isValid(value);

const isValidHttpUrl = (value) => {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch (error) {
    return false;
  }
};

const isNonEmptyString = (value) =>
  typeof value === "string" && value.trim().length > 0;

const isBoolean = (value) => typeof value === "boolean";

const pushRequiredString = (errors, field, value, maxLength = 5000) => {
  if (!isNonEmptyString(value)) {
    errors.push(fieldError(field, `${field} is required`, "required"));
    return;
  }

  if (value.trim().length > maxLength) {
    errors.push(
      fieldError(field, `${field} must be ${maxLength} characters or fewer`)
    );
  }
};

const pushOptionalString = (errors, field, value, maxLength = 5000) => {
  if (value == null || value === "") {
    return;
  }

  if (typeof value !== "string") {
    errors.push(fieldError(field, `${field} must be a string`));
    return;
  }

  if (value.trim().length > maxLength) {
    errors.push(
      fieldError(field, `${field} must be ${maxLength} characters or fewer`)
    );
  }
};

const pushObjectId = (errors, field, value, required = true) => {
  if (!value) {
    if (required) {
      errors.push(fieldError(field, `${field} is required`, "required"));
    }
    return;
  }

  if (!isValidObjectId(value)) {
    errors.push(fieldError(field, `${field} must be a valid id`));
  }
};

const pushPositiveInteger = (errors, field, value, options = {}) => {
  const { required = true, min = 1, max = Number.MAX_SAFE_INTEGER } = options;

  if (value == null || value === "") {
    if (required) {
      errors.push(fieldError(field, `${field} is required`, "required"));
    }
    return;
  }

  if (!Number.isInteger(value) || value < min || value > max) {
    errors.push(
      fieldError(field, `${field} must be an integer between ${min} and ${max}`)
    );
  }
};

const pushStringEnum = (errors, field, value, allowedValues) => {
  if (!isNonEmptyString(value)) {
    errors.push(fieldError(field, `${field} is required`, "required"));
    return;
  }

  if (!allowedValues.includes(value.trim())) {
    errors.push(
      fieldError(
        field,
        `${field} must be one of: ${allowedValues.join(", ")}`
      )
    );
  }
};

const pushUrlArray = (errors, field, values) => {
  if (values == null) {
    return;
  }

  if (!Array.isArray(values)) {
    errors.push(fieldError(field, `${field} must be an array`));
    return;
  }

  values.forEach((value, index) => {
    if (!isNonEmptyString(value) || !isValidHttpUrl(value.trim())) {
      errors.push(
        fieldError(`${field}[${index}]`, "Each entry must be a valid URL")
      );
    }
  });
};

const pushStringArray = (errors, field, values, maxLength = 100) => {
  if (values == null) {
    return;
  }

  if (!Array.isArray(values)) {
    errors.push(fieldError(field, `${field} must be an array`));
    return;
  }

  values.forEach((value, index) => {
    if (!isNonEmptyString(value)) {
      errors.push(
        fieldError(`${field}[${index}]`, "Each entry must be a non-empty string")
      );
      return;
    }

    if (value.trim().length > maxLength) {
      errors.push(
        fieldError(
          `${field}[${index}]`,
          `Each entry must be ${maxLength} characters or fewer`
        )
      );
    }
  });
};

const pushYearAppeared = (errors, values) => {
  if (values == null) {
    return;
  }

  if (!Array.isArray(values)) {
    errors.push(fieldError("yearAppeared", "yearAppeared must be an array"));
    return;
  }

  values.forEach((item, index) => {
    if (!item || typeof item !== "object") {
      errors.push(
        fieldError(`yearAppeared[${index}]`, "Each year entry must be an object")
      );
      return;
    }

    if (!isNonEmptyString(item.examName) || item.examName.trim().length > 100) {
      errors.push(
        fieldError(
          `yearAppeared[${index}].examName`,
          "examName is required and must be 100 characters or fewer"
        )
      );
    }

    if (
      !Number.isInteger(item.year) ||
      item.year < 1900 ||
      item.year > 2100
    ) {
      errors.push(
        fieldError(
          `yearAppeared[${index}].year`,
          "year must be a valid integer between 1900 and 2100"
        )
      );
    }
  });
};

const pushOptionalFileMetadata = (errors, prefix, payload) => {
  const urlKey = `${prefix}Url`;
  const fileNameKey = `${prefix}Name`;
  const fileSizeKey = `${prefix}Size`;
  const mimeTypeKey = `${prefix}MimeType`;
  const uploadedAtKey = `${prefix}UploadedAt`;
  const publicIdKey = `${prefix}CloudinaryPublicId`;
  const resourceTypeKey = `${prefix}CloudinaryResourceType`;
  const url = payload[urlKey];

  if (url == null || url === "") {
    [
      fileNameKey,
      fileSizeKey,
      mimeTypeKey,
      uploadedAtKey,
      publicIdKey,
      resourceTypeKey,
    ].forEach((field) => {
      if (payload[field] != null && payload[field] !== "") {
        errors.push(
          fieldError(field, `${field} cannot be provided without ${urlKey}`)
        );
      }
    });
    return;
  }

  if (!isValidHttpUrl(url)) {
    errors.push(fieldError(urlKey, `${urlKey} must be a valid URL`));
  }

  pushOptionalString(errors, fileNameKey, payload[fileNameKey], 255);

  if (
    payload[fileSizeKey] != null &&
    (!Number.isInteger(payload[fileSizeKey]) || payload[fileSizeKey] <= 0)
  ) {
    errors.push(
      fieldError(fileSizeKey, `${fileSizeKey} must be a positive integer`)
    );
  }

  if (
    payload[mimeTypeKey] != null &&
    payload[mimeTypeKey] !== "" &&
    !isNonEmptyString(payload[mimeTypeKey])
  ) {
    errors.push(fieldError(mimeTypeKey, `${mimeTypeKey} must be a string`));
  }

  if (
    payload[publicIdKey] != null &&
    payload[publicIdKey] !== "" &&
    !isNonEmptyString(payload[publicIdKey])
  ) {
    errors.push(fieldError(publicIdKey, `${publicIdKey} must be a string`));
  }

  if (
    payload[resourceTypeKey] != null &&
    payload[resourceTypeKey] !== "" &&
    (!isNonEmptyString(payload[resourceTypeKey]) ||
      !ALLOWED_UPLOAD_RESOURCE_TYPES.includes(payload[resourceTypeKey]))
  ) {
    errors.push(
      fieldError(
        resourceTypeKey,
        `${resourceTypeKey} must be one of: ${ALLOWED_UPLOAD_RESOURCE_TYPES.join(", ")}`
      )
    );
  }

  if (
    payload[uploadedAtKey] != null &&
    payload[uploadedAtKey] !== "" &&
    Number.isNaN(new Date(payload[uploadedAtKey]).getTime())
  ) {
    errors.push(fieldError(uploadedAtKey, `${uploadedAtKey} must be a valid date`));
  }
};

const validateRegisterRequest = validate((req) => {
  const errors = [];
  const { name, email, phone, password } = req.body;

  pushRequiredString(errors, "name", name, 120);

  if (!isNonEmptyString(email)) {
    errors.push(fieldError("email", "email is required", "required"));
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
    errors.push(fieldError("email", "email must be a valid email address"));
  }

  if (!isNonEmptyString(phone)) {
    errors.push(fieldError("phone", "phone is required", "required"));
  } else if (!/^\d{10,15}$/.test(phone.trim())) {
    errors.push(fieldError("phone", "phone must contain 10 to 15 digits"));
  }

  if (!isNonEmptyString(password)) {
    errors.push(fieldError("password", "password is required", "required"));
  } else if (password.trim().length < 6) {
    errors.push(fieldError("password", "password must be at least 6 characters"));
  }

  return errors;
});

const validateLoginRequest = validate((req) => {
  const errors = [];
  const { email, password } = req.body;

  if (!isNonEmptyString(email)) {
    errors.push(fieldError("email", "email is required", "required"));
  }

  if (!isNonEmptyString(password)) {
    errors.push(fieldError("password", "password is required", "required"));
  }

  return errors;
});

const validatePaymentVerifyRequest = validate((req) => {
  const errors = [];
  const {
    razorpay_order_id: orderId,
    razorpay_payment_id: paymentId,
    razorpay_signature: signature,
  } = req.body;

  pushRequiredString(errors, "razorpay_order_id", orderId, 255);
  pushRequiredString(errors, "razorpay_payment_id", paymentId, 255);
  pushRequiredString(errors, "razorpay_signature", signature, 255);

  return errors;
});

const validateObjectIdParam = (paramName = "id") =>
  validate((req) => {
    const errors = [];
    pushObjectId(errors, paramName, req.params[paramName]);
    return errors;
  });

const validateBranchBody = validate((req) => {
  const errors = [];
  pushRequiredString(errors, "name", req.body.name, 120);
  return errors;
});

const validateSemesterBody = validate((req) => {
  const errors = [];
  pushPositiveInteger(errors, "number", req.body.number, { min: 1, max: 8 });
  pushObjectId(errors, "branchId", req.body.branchId);
  return errors;
});

const validateSubjectBody = validate((req) => {
  const errors = [];
  pushRequiredString(errors, "name", req.body.name, 160);
  pushObjectId(errors, "semesterId", req.body.semesterId);
  pushOptionalFileMetadata(errors, "syllabusFile", req.body);
  return errors;
});

const validateModuleBody = validate((req) => {
  const errors = [];
  pushPositiveInteger(errors, "number", req.body.number);
  pushRequiredString(errors, "title", req.body.title, 200);
  pushObjectId(errors, "subjectId", req.body.subjectId);
  return errors;
});

const validateTopicBody = validate((req) => {
  const errors = [];
  pushRequiredString(errors, "name", req.body.name, 200);
  pushObjectId(errors, "moduleId", req.body.moduleId);
  return errors;
});

const validateQuestionBody = validate((req) => {
  const errors = [];
  const body = req.body;

  pushRequiredString(errors, "questionText", body.questionText, 10000);
  pushRequiredString(errors, "solutionText", body.solutionText, 20000);
  pushStringEnum(errors, "markCategory", body.markCategory, MARK_CATEGORIES);
  pushUrlArray(errors, "images", body.images);
  pushYearAppeared(errors, body.yearAppeared);
  pushStringArray(errors, "tags", body.tags, 80);
  pushObjectId(errors, "topicId", body.topicId);

  if (body.isMostRepeated != null && !isBoolean(body.isMostRepeated)) {
    errors.push(
      fieldError("isMostRepeated", "isMostRepeated must be a boolean")
    );
  }

  if (body.isTopRevision != null && !isBoolean(body.isTopRevision)) {
    errors.push(fieldError("isTopRevision", "isTopRevision must be a boolean"));
  }

  return errors;
});

const validateConceptBody = validate((req) => {
  const errors = [];
  const body = req.body;

  pushRequiredString(errors, "title", body.title, 200);
  pushRequiredString(errors, "explanation", body.explanation, 20000);
  pushUrlArray(errors, "images", body.images);
  pushObjectId(errors, "moduleId", body.moduleId);

  return errors;
});

const validateNoteBody = validate((req) => {
  const errors = [];
  pushRequiredString(errors, "title", req.body.title, 200);
  pushStringEnum(errors, "type", req.body.type, NOTE_TYPES);
  pushObjectId(errors, "moduleId", req.body.moduleId);
  return errors;
});

const validateReportBody = validate((req) => {
  const errors = [];
  pushObjectId(errors, "questionId", req.body.questionId);
  pushStringEnum(errors, "reason", req.body.reason, REPORT_REASONS);
  return errors;
});

const validateAdminNotificationBody = validate((req) => {
  const errors = [];
  pushRequiredString(errors, "title", req.body.title, 120);
  pushRequiredString(errors, "body", req.body.body, 300);
  pushStringEnum(errors, "type", req.body.type, NOTIFICATION_TYPES);
  return errors;
});

module.exports = {
  NOTE_TYPES,
  MARK_CATEGORIES,
  REPORT_REASONS,
  NOTIFICATION_TYPES,
  fieldError,
  sendValidationError,
  validate,
  validateRegisterRequest,
  validateLoginRequest,
  validatePaymentVerifyRequest,
  validateObjectIdParam,
  validateBranchBody,
  validateSemesterBody,
  validateSubjectBody,
  validateModuleBody,
  validateTopicBody,
  validateQuestionBody,
  validateConceptBody,
  validateNoteBody,
  validateReportBody,
  validateAdminNotificationBody,
};
