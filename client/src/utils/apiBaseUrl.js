import Constants from "expo-constants";

const configuredBaseUrl =
  Constants.expoConfig?.extra?.apiBaseUrl || "http://10.50.243.141:5001/api";

export const API_BASE_URL = configuredBaseUrl;
