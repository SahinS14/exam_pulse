import axios from "axios";
import * as SecureStore from "expo-secure-store";

import { resetToRoute } from "../navigation/navigationRef";
import { useAuthStore } from "../store/authStore";
import { API_BASE_URL } from "../utils/apiBaseUrl";

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 15000,
});

const GET_RETRY_DELAY_MS = 1200;

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const shouldRetryGetRequest = (error) => {
  const method = (error?.config?.method || "").toLowerCase();

  if (method !== "get") {
    return false;
  }

  if (error?.response) {
    return false;
  }

  const retryCount = Number(error?.config?.__retryCount || 0);

  if (retryCount >= 1) {
    return false;
  }

  return (
    error?.code === "ECONNABORTED" ||
    error?.message === "Network Error" ||
    Boolean(error?.request)
  );
};

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
    if (shouldRetryGetRequest(error)) {
      const config = {
        ...error.config,
        __retryCount: Number(error?.config?.__retryCount || 0) + 1,
      };

      await wait(GET_RETRY_DELAY_MS);
      return apiClient(config);
    }

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
