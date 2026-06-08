import * as Linking from "expo-linking";
import * as FileSystem from "expo-file-system/legacy";
import * as Sharing from "expo-sharing";

const PDF_MIME = "application/pdf";

const sanitizeFileName = (value) =>
  (value || "study-material")
    .replace(/[^\w.\-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");

const getFileNameFromUrl = (url) => {
  if (!url) {
    return "study-material";
  }

  const lastSegment = url.split("?")[0].split("/").pop();
  return lastSegment || "study-material";
};

export const getFallbackObjectIdDate = (id) => {
  if (!id || typeof id !== "string" || id.length < 8) {
    return null;
  }

  const timestamp = Number.parseInt(id.slice(0, 8), 16);

  if (!Number.isFinite(timestamp)) {
    return null;
  }

  return new Date(timestamp * 1000);
};

export const isPdfFile = ({ url, mimeType, fileName }) => {
  const normalizedMime = (mimeType || "").toLowerCase();
  const normalizedFileName = (fileName || "").toLowerCase();
  const normalizedUrl = (url || "").toLowerCase();

  return (
    normalizedMime.includes("pdf") ||
    normalizedFileName.endsWith(".pdf") ||
    normalizedUrl.includes(".pdf")
  );
};

export const formatFileSize = (bytes) => {
  if (!Number.isFinite(bytes) || bytes <= 0) {
    return "Size unavailable";
  }

  const units = ["B", "KB", "MB", "GB"];
  let value = bytes;
  let unitIndex = 0;

  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024;
    unitIndex += 1;
  }

  return `${value >= 10 || unitIndex === 0 ? value.toFixed(0) : value.toFixed(1)} ${units[unitIndex]}`;
};

export const formatFileDate = (value, fallbackId) => {
  const dateValue = value ? new Date(value) : getFallbackObjectIdDate(fallbackId);

  if (!dateValue || Number.isNaN(dateValue.getTime())) {
    return "Date unavailable";
  }

  return dateValue.toLocaleDateString();
};

const openDownloadedFile = async (uri, mimeType) => {
  try {
    await Linking.openURL(uri);
  } catch (error) {
    if (await Sharing.isAvailableAsync()) {
      await Sharing.shareAsync(uri, mimeType ? { mimeType, UTI: mimeType } : {});
      return;
    }

    throw error;
  }
};

export const openPdfExternally = async (url) => {
  await Linking.openURL(url);
};

export const openStudyResource = async ({
  navigation,
  title,
  subtitle,
  url,
  fileName,
  mimeType,
}) => {
  if (isPdfFile({ url, mimeType, fileName })) {
    await openPdfExternally(url);
    return;
  }

  navigation.navigate("WebViewer", {
    title,
    subtitle,
    url,
  });
};

export const downloadAndOpenFile = async ({
  url,
  fileName,
  mimeType,
  onProgress,
}) => {
  if (!url) {
    throw new Error("File URL is missing");
  }

  if (!FileSystem.documentDirectory) {
    throw new Error("Local file storage is not available");
  }

  const fallbackName = fileName || getFileNameFromUrl(url);
  const safeFileName = sanitizeFileName(fallbackName);
  const shouldAppendPdfExtension =
    mimeType === PDF_MIME && !safeFileName.toLowerCase().endsWith(".pdf");
  const targetUri = `${FileSystem.documentDirectory}${Date.now()}-${
    shouldAppendPdfExtension ? `${safeFileName}.pdf` : safeFileName
  }`;

  const downloadResumable = FileSystem.createDownloadResumable(
    url,
    targetUri,
    {},
    (progressEvent) => {
      const totalBytes = progressEvent.totalBytesExpectedToWrite || 0;
      const writtenBytes = progressEvent.totalBytesWritten || 0;

      if (!totalBytes) {
        onProgress?.(0);
        return;
      }

      onProgress?.(writtenBytes / totalBytes);
    }
  );

  const result = await downloadResumable.downloadAsync();

  if (!result?.uri) {
    throw new Error("Download failed");
  }

  onProgress?.(1);
  await openDownloadedFile(result.uri, mimeType);

  return result.uri;
};

export const getFileBadgeLabel = ({ url, mimeType, fileName }) =>
  isPdfFile({ url, mimeType, fileName }) ? "PDF" : "IMG";
