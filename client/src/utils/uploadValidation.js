export const MAX_PDF_BYTES = 20 * 1024 * 1024;
export const MAX_IMAGE_BYTES = 10 * 1024 * 1024;

const IMAGE_EXTENSIONS = [".jpg", ".jpeg", ".png", ".webp", ".gif", ".bmp", ".heic", ".heif"];

const getFileExtension = (name = "") => {
  const lowerName = String(name).toLowerCase();
  const lastDotIndex = lowerName.lastIndexOf(".");
  return lastDotIndex >= 0 ? lowerName.slice(lastDotIndex) : "";
};

export const detectUploadKind = (asset = {}) => {
  const mimeType = String(asset.mimeType || asset.type || "").toLowerCase();
  const extension = getFileExtension(asset.name || asset.fileName || "");

  if (mimeType === "application/pdf" || extension === ".pdf") {
    return "pdf";
  }

  if (mimeType.startsWith("image/") || IMAGE_EXTENSIONS.includes(extension)) {
    return "image";
  }

  return null;
};

const formatBytes = (bytes) => {
  if (!Number.isFinite(bytes) || bytes <= 0) {
    return "0 MB";
  }

  const mb = bytes / (1024 * 1024);
  return `${mb.toFixed(mb >= 10 ? 0 : 1)} MB`;
};

export const validateUploadAsset = (
  asset,
  { allowPdf = false, allowImage = false } = {}
) => {
  if (!asset) {
    return "File is required.";
  }

  const kind = detectUploadKind(asset);

  if (!kind) {
    return "Only PDF and image files are supported.";
  }

  if (kind === "pdf" && !allowPdf) {
    return "This upload only accepts image files.";
  }

  if (kind === "image" && !allowImage) {
    return "This upload only accepts PDF files.";
  }

  if (typeof asset.size !== "number") {
    return null;
  }

  if (kind === "pdf" && asset.size > MAX_PDF_BYTES) {
    return `PDF files must be 20 MB or smaller. Selected file is ${formatBytes(asset.size)}.`;
  }

  if (kind === "image" && asset.size > MAX_IMAGE_BYTES) {
    return `Image files must be 10 MB or smaller. Selected file is ${formatBytes(asset.size)}.`;
  }

  return null;
};
