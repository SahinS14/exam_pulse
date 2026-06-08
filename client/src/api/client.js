import axios from "axios";
import * as SecureStore from "expo-secure-store";

import { resetToRoute } from "../navigation/navigationRef";
import { useAuthStore } from "../store/authStore";
import { API_BASE_URL } from "../utils/apiBaseUrl";

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 15000,
});

apiClient.interceptors.request.use(async (config) => {
  const token = await SecureStore.getItemAsync("authToken");

  if (token) {
    config.headers = config.headers || {};
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const status = error?.response?.status;
    const responseMessage = error?.response?.data?.message;
    const requestUrl = error?.config?.url || "";
    const isAuthRequest =
      requestUrl.includes("/auth/login") || requestUrl.includes("/auth/register");

    if (status === 401 && !isAuthRequest) {
      await useAuthStore.getState().logout();
      resetToRoute("Login");
      return Promise.reject(error);
    }

    if (
      status === 403 &&
      (responseMessage === "Access expired" ||
        responseMessage === "Access not purchased")
    ) {
      await useAuthStore.getState().handleAccessExpired();
      resetToRoute("Paywall");
    }

    return Promise.reject(error);
  }
);

export default apiClient;
