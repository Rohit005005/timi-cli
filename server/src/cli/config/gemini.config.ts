import dotenv from "dotenv";
import path from "path";

const envPath = path.resolve(__dirname, "../../.env");

dotenv.config({ path: envPath });

export const config = {
  googleApiKey: process.env.GEMINI_API_KEY,
  model: process.env.AI_MODEL || "gemini-2.5-flash",
};
