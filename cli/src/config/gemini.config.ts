import { getStoredApiConfig } from "../lib/token";

const apiConfigData = getStoredApiConfig();

export const config = {
  googleApiKey: apiConfigData.storedApiKey,
  model: apiConfigData.model,
};
