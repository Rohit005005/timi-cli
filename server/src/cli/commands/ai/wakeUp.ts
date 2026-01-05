import { select } from "@clack/prompts";
import chalk from "chalk";
import { Command } from "commander";
import yoctoSpinner from "yocto-spinner";
import { prisma } from "../../../lib/prisma";
import { getStoredToken } from "../../../lib/token";
import { startChat } from "../../ai/chat/chat";
import { startToolChat } from "../../ai/chat/tool";
import { startAgentChat } from "../../ai/chat/agent";

export const wakeUpAction = async () => {
  const token = await getStoredToken();

  if (!token) {
    console.log(chalk.red("Not authenticated, Please login !!"));
    process.exit(0);
  }

  const spinner = yoctoSpinner({ text: "Fetching user information..." });

  spinner.start();

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

  spinner.stop();

  if (!user) {
    console.log(chalk.red("User not found."));
    process.exit(0);
  }

  console.log(chalk.green(`Welcome back ${user.name} !! \n`));

  const choice = await select({
    message: "Select an optin: ",
    options: [
      {
        value: "chat",
        label: "Chat",
        hint: "Simple chat with AI",
      },
      {
        value: "tool",
        label: "Tools",
        hint: "Chat with tools (Google search, Code execution)",
      },
      {
        value: "agent",
        label: "Agent",
        hint: "Advanced ai agent",
      },
    ],
  });

  switch (choice) {
    case "chat":
      await startChat({
        mode: "chat",
      });
      break;
    case "tool":
      await startToolChat();
      break;
    case "agent":
      await startAgentChat();
      break;
  }
};

export const wakeUp = new Command("wakeup")
  .description("Wake up the ai")
  .action(wakeUpAction);
