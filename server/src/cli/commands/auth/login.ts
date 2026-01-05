import { intro, outro, cancel, isCancel, confirm } from "@clack/prompts";

import { logger } from "better-auth";

import { createAuthClient } from "better-auth/client";

import { deviceAuthorizationClient } from "better-auth/client/plugins";

import chalk from "chalk";
import { Command } from "commander";
import open from "open";
import os from "os";
import path from "path";
import yoctoSpinner from "yocto-spinner";
import * as z from "zod/v4";
import dotenv from "dotenv";
import { prisma } from "../../../lib/prisma";
import {
  AuthToken,
  clearStoredToken,
  getStoredToken,
  isTokenExpired,
  requireAuth,
  storeToken,
} from "../../../lib/token";

dotenv.config();

type AuthClient = ReturnType<
  typeof createAuthClient<{
    plugins: [ReturnType<typeof deviceAuthorizationClient>];
  }>
>;

const URL = "http://localhost:8000";
const CLIENT_ID = process.env.GITHUB_CLIENT_ID;
export const CONFIG_DIR = path.join(os.homedir(), ".better-auth");
export const TOKEN_FILE = path.join(CONFIG_DIR, "token.json");

export async function loginAction(opts: any) {
  const optsSchema = z.object({
    serverUrl: z.string().optional(),
    clientId: z.string().optional(),
  });

  const options = optsSchema.parse(opts || {});

  const serverUrl = options.serverUrl || URL;
  const clientId = options.clientId || CLIENT_ID;

  intro(chalk.bold("Auth CLI Login !!"));

  const existingToken = await getStoredToken();
  const expired = await isTokenExpired();

  if (existingToken && !expired) {
    const shouldReAuth = await confirm({
      message: "You are already logged in. Do you want to login again ??",
      initialValue: false,
    });

    if (isCancel(shouldReAuth) || !shouldReAuth) {
      cancel("Login cancelled !!");
      process.exit(0);
    }
  }

  const authClient = createAuthClient({
    baseURL: serverUrl,
    plugins: [deviceAuthorizationClient()],
  });

  const spinner = yoctoSpinner({ text: "Requesting device authorization..." });
  spinner.start();

  try {
    const { data, error } = await authClient.device.code({
      client_id: clientId as string,
      scope: "openid profile email",
    });

    spinner.stop();

    if (error) {
      logger.error(
        `Failed to request device authorization: ${error.error_description}`,
      );

      process.exit(1);
    }

    if (!data) {
      console.log(chalk.red("No data recieved !!"));

      process.exit(1);
    }

    const {
      device_code,
      user_code,
      verification_uri,
      verification_uri_complete,
      expires_in,
      interval = 5,
    } = data;

    console.log(chalk.cyan("Device authorization required"));

    console.log(
      `Please visit ${chalk.underline.blue(verification_uri || verification_uri_complete)}`,
    );

    console.log(`Enter code: ${chalk.bold.green(user_code)}`);

    const shoudlOpen = await confirm({
      message: "Open browser automatically",
      initialValue: true,
    });

    if (!isCancel(shoudlOpen) && shoudlOpen) {
      const urlOpen = verification_uri_complete || verification_uri;
      await open(urlOpen);
    }

    console.log(
      chalk.gray(
        `Waiting for authorization (expires in ${Math.floor(
          expires_in / 60,
        )})...minutes`,
      ),
    );

    const token = await pollForToken(
      authClient,
      device_code,
      clientId as string,
      interval,
    );

    if (token) {
      const saved = await storeToken(token);

      if (!saved) {
        console.log(
          chalk.yellow("\n Warning: Could not save authentication token."),
        );

        console.log(chalk.yellow("You may need to login again on next use."));
      }
    }

    outro(chalk.green("Login successfully !!"));

    console.log(chalk.gray(`\n Token saved to: ${TOKEN_FILE}`));

    console.log(
      chalk.gray("You can now use AI commands without logging in again. \n"),
    );

    //user db stuff later
  } catch (error) {
    spinner.stop();
    console.log(chalk.red("\n Login failed:"), error);
    process.exit(1);
  }
}

async function pollForToken(
  authClient: AuthClient,
  device_code: string,
  clientId: string,
  initialInterval: number,
): Promise<AuthToken> {
  let pollingInterval = initialInterval;
  const spinner = yoctoSpinner({ text: "", color: "cyan" });
  let dots = 0;

  return new Promise((resolve, reject) => {
    const poll = async () => {
      dots = (dots + 1) % 4;
      spinner.text = chalk.gray(
        `Polling for authrization${".".repeat(dots)}${" ".repeat(3 - dots)}`,
      );

      if (!spinner.isSpinning) spinner.start();

      try {
        const { data, error } = await authClient.device.token({
          grant_type: "urn:ietf:params:oauth:grant-type:device_code",
          device_code,
          client_id: clientId,
          fetchOptions: {
            headers: {
              "user-agent": `My CLI`,
            },
          },
        });

        if (data?.access_token) {
          console.log(
            chalk.bold.yellow(`Your access token : ${data.access_token}`),
          );

          spinner.stop();
          resolve(data as AuthToken);
          return;
        } else if (error) {
          switch (error.error) {
            case "authorization_pending":
              // Continue polling
              break;
            case "slow_down":
              pollingInterval += 5;
              break;
            case "access_denied":
              console.error("Access was denied by the user.");
              process.exit(1);
            case "expired_token":
              console.error("The device code has expired. Please try again.");
              process.exit(1);
            default:
              spinner.stop();
              logger.error(`Error: ${error.error_description}`);
              process.exit(1);
          }
        }
      } catch (error) {
        spinner.stop();
        logger.error(`Netwrok error: ${error}`);
        process.exit(1);
      }
      setTimeout(poll, pollingInterval * 1000);
    };
    setTimeout(poll, pollingInterval * 1000);
  });
}

export async function logoutAction() {
  intro(chalk.bold("Logout"));

  const token = await getStoredToken();

  if (!token) {
    console.log(chalk.yellow("You are not logged in !!"));
    process.exit(0);
  }

  const shoudlLogout = await confirm({
    message: "Are you sure you want to logout ??",
    initialValue: false,
  });

  if (isCancel(shoudlLogout) || !shoudlLogout) {
    cancel("Logout Cancelled !!");
    process.exit(0);
  }

  const cleared = await clearStoredToken();

  if (cleared) {
    outro(chalk.green("Successfully logged out !!"));
  } else {
    console.log(chalk.yellow("Could not clear token file."));
  }
}

export async function whoamiAction() {
  const token = await requireAuth();

  if (!token.access_token) {
    console.log("No access token found. Please login !!");
    process.exit(1);
  }

  const user = await prisma.user.findFirst({
    where: {
      sessions: {
        some: {
          token: token.access_token,
        },
      },
    },
    select: {
      name: true,
      email: true,
      image: true,
    },
  });

  console.log(
    chalk.bold.greenBright(`\n User: ${user?.name}
    Email: ${user?.email}`),
  );
}

//commander setup

export const login = new Command("login")
  .description("Login in to Better Auth")
  .option("--server-url <url>", "The Better Auth server URL", URL)
  .option("--client-id <id>", "The OAuth client ID", CLIENT_ID)
  .action(loginAction);

export const logout = new Command("logout")
  .description("Logout and clear stored credentials")
  .option("--server-url <url>", "THe Better Auth server URL", URL)
  .action(logoutAction);

export const whoami = new Command("whoami")
  .description("Show current authenticated user")
  .option("--server-url <url>", "THe Better Auth server URL", URL)
  .action(whoamiAction);
