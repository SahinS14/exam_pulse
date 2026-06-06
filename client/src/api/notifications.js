import apiClient from "./client";

export const registerPushToken = async ({ token, platform }) => {
  const response = await apiClient.post("/notifications/register-token", {
    token,
    platform,
  });

  return response.data;
};

export const getNotificationsInbox = async () => {
  const response = await apiClient.get("/notifications/inbox");
  return response.data;
};

export const getNotificationsUnreadCount = async () => {
  const response = await apiClient.get("/notifications/unread-count");
  return response.data;
};

export const markNotificationRead = async (id) => {
  const response = await apiClient.put(`/notifications/${id}/read`);
  return response.data;
};

export const markAllNotificationsRead = async () => {
  const response = await apiClient.put("/notifications/read-all");
  return response.data;
};
