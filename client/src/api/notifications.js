import apiClient from "./client";

export const registerPushToken = async ({ token, platform }) => {
  const response = await apiClient.post("/notifications/register-token", {
    token,
    platform,
  });

  return response.data;
};

