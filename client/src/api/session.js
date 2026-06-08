import axios from "axios";
import * as SecureStore from "expo-secure-store";

import { API_BASE_URL } from "../utils/apiBaseUrl";

const AUTH_TOKEN_KEY = "authToken";
const SESSION_TIMEOUT_MS = 15000;
const SESSION_RETRY_DELAY_MS = 1200;

const sessionClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: SESSION_TIMEOUT_MS,
});

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function isInfrastructureFailure(error) {
  const method = (error?.config?.method || "").toLowerCase();

  if (method && method !== "get") {
    return false;
  }

  if (error?.response) {
    return false;
  }

  return (
    error?.code === "ECONNABORTED" ||
    error?.message === "Network Error" ||
    Boolean(error?.request)
  );
}

async function getAuthorizationHeader() {
  const token = await SecureStore.getItemAsync(AUTH_TOKEN_KEY);

  if (!token) {
    return null;
  }

  return `Bearer ${token}`;
}

export async function validateSessionRequest() {
  const authorization = await getAuthorizationHeader();

  const executeRequest = async () =>
    sessionClient.get("/auth/session", {
      headers: authorization
        ? {
            Authorization: authorization,
          }
        : undefined,
    });

  try {
    const response = await executeRequest();
    return response.data;
  } catch (error) {
    if (!isInfrastructureFailure(error)) {
      throw error;
    }

    await wait(SESSION_RETRY_DELAY_MS);
    const response = await executeRequest();
    return response.data;
  }
}

