import dotenv from "dotenv";
import path from "path";
import { getStoredApiConfig } from "../lib/token";

const envPath = path.resolve(__dirname, "../../.env");

dotenv.config({ path: envPath });

const apiConfigData = getStoredApiConfig();

export const config = {
  googleApiKey: apiConfigData.storedApiKey,
  model: apiConfigData.model,
};
