import apiClient from "./client";

const toParams = (params) => (params ? { params } : undefined);

export const getAdminBranches = async () => {
  const response = await apiClient.get("/admin/branches");
  return response.data;
};

export const createAdminBranch = async (payload) => {
  const response = await apiClient.post("/admin/branch", payload);
  return response.data;
};

export const updateAdminBranch = async (id, payload) => {
  const response = await apiClient.put(`/admin/branch/${id}`, payload);
  return response.data;
};

export const deleteAdminBranch = async (id) => {
  const response = await apiClient.delete(`/admin/branch/${id}`);
  return response.data;
};

export const getAdminSemesters = async (params) => {
  const response = await apiClient.get("/admin/semesters", toParams(params));
  return response.data;
};

export const createAdminSemester = async (payload) => {
  const response = await apiClient.post("/admin/semester", payload);
  return response.data;
};

export const updateAdminSemester = async (id, payload) => {
  const response = await apiClient.put(`/admin/semester/${id}`, payload);
  return response.data;
};

export const deleteAdminSemester = async (id) => {
  const response = await apiClient.delete(`/admin/semester/${id}`);
  return response.data;
};

export const getAdminSubjects = async (params) => {
  const response = await apiClient.get("/admin/subjects", toParams(params));
  return response.data;
};

export const createAdminSubject = async (payload) => {
  const response = await apiClient.post("/admin/subject", payload);
  return response.data;
};

export const updateAdminSubject = async (id, payload) => {
  const response = await apiClient.put(`/admin/subject/${id}`, payload);
  return response.data;
};

export const deleteAdminSubject = async (id) => {
  const response = await apiClient.delete(`/admin/subject/${id}`);
  return response.data;
};

export const getAdminModules = async (params) => {
  const response = await apiClient.get("/admin/modules", toParams(params));
  return response.data;
};

export const createAdminModule = async (payload) => {
  const response = await apiClient.post("/admin/module", payload);
  return response.data;
};

export const updateAdminModule = async (id, payload) => {
  const response = await apiClient.put(`/admin/module/${id}`, payload);
  return response.data;
};

export const deleteAdminModule = async (id) => {
  const response = await apiClient.delete(`/admin/module/${id}`);
  return response.data;
};

export const getAdminTopics = async (params) => {
  const response = await apiClient.get("/admin/topics", toParams(params));
  return response.data;
};

export const createAdminTopic = async (payload) => {
  const response = await apiClient.post("/admin/topic", payload);
  return response.data;
};

export const updateAdminTopic = async (id, payload) => {
  const response = await apiClient.put(`/admin/topic/${id}`, payload);
  return response.data;
};

export const deleteAdminTopic = async (id) => {
  const response = await apiClient.delete(`/admin/topic/${id}`);
  return response.data;
};

export const getAdminQuestions = async (params) => {
  const response = await apiClient.get("/admin/questions", toParams(params));
  return response.data;
};

export const createAdminQuestion = async (payload) => {
  const response = await apiClient.post("/admin/question", payload);
  return response.data;
};

export const updateAdminQuestion = async (id, payload) => {
  const response = await apiClient.put(`/admin/question/${id}`, payload);
  return response.data;
};

export const deleteAdminQuestion = async (id) => {
  const response = await apiClient.delete(`/admin/question/${id}`);
  return response.data;
};

export const getAdminConcepts = async (params) => {
  const response = await apiClient.get("/admin/concepts", toParams(params));
  return response.data;
};

export const createAdminConcept = async (payload) => {
  const response = await apiClient.post("/admin/concept", payload);
  return response.data;
};

export const updateAdminConcept = async (id, payload) => {
  const response = await apiClient.put(`/admin/concept/${id}`, payload);
  return response.data;
};

export const deleteAdminConcept = async (id) => {
  const response = await apiClient.delete(`/admin/concept/${id}`);
  return response.data;
};

export const getAdminNotes = async (params) => {
  const response = await apiClient.get("/admin/notes", toParams(params));
  return response.data;
};

export const deleteAdminNote = async (id) => {
  const response = await apiClient.delete(`/admin/note/${id}`);
  return response.data;
};

export const uploadAdminFile = async (asset) => {
  const formData = new FormData();
  formData.append("file", {
    uri: asset.uri,
    name: asset.name || "upload",
    type: asset.mimeType || "application/octet-stream",
  });

  const response = await apiClient.post("/admin/upload", formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });

  return response.data;
};

export const uploadAdminNote = async ({ title, type, moduleId, asset }) => {
  const formData = new FormData();
  formData.append("title", title);
  formData.append("type", type);
  formData.append("moduleId", moduleId);
  formData.append("file", {
    uri: asset.uri,
    name: asset.name || "note-upload",
    type: asset.mimeType || "application/octet-stream",
  });

  const response = await apiClient.post("/admin/note", formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });

  return response.data;
};

export const getAdminUsers = async () => {
  const response = await apiClient.get("/admin/users");
  return response.data;
};

export const blockAdminUser = async (id) => {
  const response = await apiClient.put(`/admin/users/${id}/block`);
  return response.data;
};

export const grantAdminUser = async (id) => {
  const response = await apiClient.put(`/admin/users/${id}/grant`);
  return response.data;
};

export const getAdminReports = async () => {
  const response = await apiClient.get("/admin/reports");
  return response.data;
};

export const resolveAdminReport = async (id) => {
  const response = await apiClient.put(`/admin/reports/${id}/resolve`);
  return response.data;
};

