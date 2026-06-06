import Constants from "expo-constants";

const configuredBaseUrl = Constants.expoConfig?.extra?.apiBaseUrl;

const hostUri =
  Constants.expoConfig?.hostUri ||
  Constants.manifest2?.extra?.expoClient?.hostUri;

const derivedBaseUrl = hostUri
  ? `http://${hostUri.split(":")[0]}:5001/api`
  : null;

export const API_BASE_URL =
  configuredBaseUrl || derivedBaseUrl || "http://10.191.133.141:5001/api";
