import fs from "fs/promises";
import { CONFIG_DIR, TOKEN_FILE } from "../cli/commands/auth/login";
import chalk from "chalk";

export interface AuthToken {
  access_token: string;
  refresh_token?: string;
  token_type?: string;
  scope?: string;
  expires_in?: number;
}

export const getStoredToken = async () => {
  try {
    const data = await fs.readFile(TOKEN_FILE, "utf-8");
    const token = JSON.parse(data);
    return token;
  } catch (error) {
    return false;
  }
};

export const storeToken = async (token: AuthToken) => {
  try {
    await fs.mkdir(CONFIG_DIR, { recursive: true });

    const tokenData = {
      access_token: token.access_token,
      refresh_token: token.refresh_token,
      token_type: token.token_type || "Bearer",
      scope: token.scope,
      expires_in: token.expires_in
        ? new Date(Date.now() + token.expires_in * 1000).toISOString()
        : null,
      created_at: new Date().toISOString(),
    };

    await fs.writeFile(TOKEN_FILE, JSON.stringify(tokenData, null, 2), "utf-8");

    return true;
  } catch (error) {
    console.log(chalk.red("Failed to store token: "), error);
  }
};

export const clearStoredToken = async () => {
  try {
    await fs.unlink(TOKEN_FILE);
    return true;
  } catch (error) {
    return false;
  }
};

export const isTokenExpired = async () => {
  const token = await getStoredToken();
  if (!token || !token.expires_in) {
    return true;
  }

  const expiresIn = new Date(token.expires_in);
  const now = new Date();

  return expiresIn.getTime() - now.getTime() < 5 * 60 * 1000;
};

export const requireAuth = async () => {
  const token = await getStoredToken();

  if (!token) {
    console.log(
      chalk.yellow("Not authenticated, Please run 'ai-cli login' first."),
    );

    process.exit(1);
  }

  if (await isTokenExpired()) {
    console.log(chalk.yellow("Your token has expired. Please login again."));

    console.log(chalk.gray("Run: 'ai-cli login'"));

    process.exit(1);
  }

  return token;
};
