import apiClient from "./client";

export const getRecentUpdates = async () => {
  const response = await apiClient.get("/home/recent-updates");
  return response.data;
};

export const getBranches = async () => {
  const response = await apiClient.get("/branches");
  return response.data;
};

export const getSemesters = async (branchId) => {
  const response = await apiClient.get(`/semesters/${branchId}`);
  return response.data;
};

export const getSubjects = async (semesterId) => {
  const response = await apiClient.get(`/subjects/${semesterId}`);
  return response.data;
};

export const getModules = async (subjectId) => {
  const response = await apiClient.get(`/modules/${subjectId}`);
  return response.data;
};

export const getTopics = async (moduleId) => {
  const response = await apiClient.get(`/topics/${moduleId}`);
  return response.data;
};

export const getQuestionsByTopic = async (topicId) => {
  const response = await apiClient.get(`/questions/topic/${topicId}`);
  return response.data;
};

export const getMostRepeatedQuestions = async (moduleId) => {
  const response = await apiClient.get(`/questions/most-repeated/${moduleId}`);
  return response.data;
};

export const getTopRevisionQuestions = async (moduleId) => {
  const response = await apiClient.get(`/questions/top-revision/${moduleId}`);
  return response.data;
};

export const getConcepts = async (moduleId) => {
  const response = await apiClient.get(`/concepts/${moduleId}`);
  return response.data;
};

export const getNotes = async (moduleId) => {
  const response = await apiClient.get(`/notes/${moduleId}`);
  return response.data;
};

export const getSyllabus = async (subjectId) => {
  const response = await apiClient.get(`/subjects/${subjectId}/syllabus`);
  return response.data;
};

export const addBookmark = async (questionId) => {
  const response = await apiClient.post("/bookmarks/add", { questionId });
  return response.data;
};

export const removeBookmark = async (questionId) => {
  const response = await apiClient.delete("/bookmarks/remove", {
    data: { questionId },
  });
  return response.data;
};

export const getBookmarks = async () => {
  const response = await apiClient.get("/bookmarks");
  return response.data;
};

export const submitReport = async ({ questionId, reason }) => {
  const response = await apiClient.post("/reports/add", { questionId, reason });
  return response.data;
};

export const searchContent = async ({ q, branchId, semesterId }) => {
  const response = await apiClient.get("/search", {
    params: { q, branchId, semesterId },
  });
  return response.data;
};
