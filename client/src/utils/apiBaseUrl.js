import Constants from "expo-constants";

const configuredBaseUrl = Constants.expoConfig?.extra?.apiBaseUrl;

export const API_BASE_URL =
  configuredBaseUrl || "https://exampulse-api.onrender.com/api";
