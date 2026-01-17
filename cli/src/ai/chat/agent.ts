import yoctoSpinner from "yocto-spinner";
import { getStoredToken } from "../../lib/token";
import { AiService } from "../services/ai.service";
import { addMessageType, ChatService } from "../services/chat.service";
import boxen from "boxen";
import chalk from "chalk";
import { cancel, confirm, intro, isCancel, outro, text } from "@clack/prompts";
import { conversationType } from "./chat";
import { generateApplication } from "../../config/agent.config";
import { editor } from "@inquirer/prompts";
import { URL } from "../../commands/auth/login";

type initConversationType = {
  conversationId: string | null;
};

let aiService: AiService;
const chatService = new ChatService();

async function getUserFromToken() {
  const token = await getStoredToken();
  if (!token) {
    throw new Error("Not authenticated. Please run 'ai-cli login' first.");
  }
  const spinner = yoctoSpinner({ text: "Authenticating..." }).start();

  const response = await fetch(`${URL}/api/user`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token.access_token}`,
    },
  });

  if (!response.ok) {
    spinner.error("Enable to fetch user");
    throw new Error("Enable to fetch user. Try agian.");
  }

  const user = await response.json();

  if (!user) {
    spinner.error("User not found");
    throw new Error("User not found. Please logi again.");
  }

  spinner.success(`Welcome back, ${user.name}`);

  return user;
}

async function initConversation({
  conversationId = null,
}: initConversationType) {
  const spinner = yoctoSpinner({ text: "Loading conversation..." }).start();

  const conversation = await chatService.getOrCreateConversation({
    conversationId,
    mode: "agent",
  });

  spinner.success("Conversation Loaded !!");

  const conversationInfoBox = boxen(
    `${chalk.bold("Conversation: " + conversation.title)}\n ${chalk.gray("ID: " + conversation.id)}\n ${chalk.gray("Mode: " + conversation.mode)} \n ${chalk.cyan("Working Directory: " + process.cwd())}`,
    {
      padding: 1,
      borderColor: "magenta",
      margin: { top: 1, bottom: 1 },
      borderStyle: "round",
      title: "Agent Mode",
      titleAlignment: "center",
    },
  );

  console.log(conversationInfoBox);

  return conversation;
}

async function saveMessage({ conversationId, content, role }: addMessageType) {
  return await chatService.addMessage({ conversationId, role, content });
}

async function agentLoop(conversation: conversationType) {
  const helpBox = boxen(
    `${chalk.cyan.bold("What can the agent do?")}\n` +
      `${chalk.white("Generate complete applications from descriptions")}\n` +
      `${chalk.white("Create all necessary files and folders")}\n` +
      `${chalk.white("Include setup instructions and commands")}\n` +
      `${chalk.white("Generate production-ready code")} \n\n` +
      `${chalk.yellow.bold("Examples:")} \n` +
      `${chalk.white("Build a todo app with React and Tailwind")}\n` +
      `${chalk.white("Create a REST API with Express and MongoDB")}\n` +
      `${chalk.white("Make a weather app using OpenWeatherMap API")}\n\n` +
      `${chalk.white("Type 'exit' to end the session")}\n` +
      `${chalk.white("Type '/edit' to open external editor (for multi-line)")}`,
    {
      padding: 1,
      margin: { bottom: 1 },
      borderColor: "cyan",
      borderStyle: "round",
      title: "Agent Instructions",
    },
  );

  console.log(helpBox);

  while (true) {
    const userInput = await text({
      message: chalk.magenta("What would you like to build ?"),
      placeholder: "Describe your application...",
      validate(value) {
        if (!value || value.trim().length === 0) {
          return "Description can't be empty";
        }
        if (value.trim() === "/edit" || value.trim() === "exit") {
          return;
        }
        if (value.trim().length < 10) {
          return "Please provide more details (atleast 10 characters)";
        }
      },
    });
    if (isCancel(userInput)) {
      const exitBox = boxen(chalk.black("Agent session ended !!"), {
        padding: 1,
        margin: 1,
        borderStyle: "round",
        backgroundColor: "yellow",
      });

      console.log(exitBox);
      process.exit(0);
    }

    let finalContent = userInput.toString();

    if (finalContent.trim() === "/edit") {
      finalContent = await editor({
        message: "Type your message below (Save and close file to submit)",
        postfix: ".md",
      });
    }

    if (finalContent.toLowerCase().trim() === "exit") {
      const exitBox = boxen(chalk.black("Agent session ended !!"), {
        padding: 1,
        margin: 1,
        borderStyle: "round",
        backgroundColor: "yellow",
      });

      console.log(exitBox);
      break;
    }

    const userBox = boxen(chalk.white(finalContent), {
      padding: 1,
      borderColor: "blue",
      borderStyle: "round",
      margin: { top: 1, bottom: 1 },
      title: "Your request",
      textAlignment: "left",
    });

    console.log(userBox);

    await saveMessage({
      conversationId: conversation.id,
      content: finalContent,
      role: "user",
    });

    try {
      const result = await generateApplication(
        finalContent,
        aiService,
        process.cwd(),
      );

      if (result && result.success) {
        const responseMessage =
          `Generated application: ${result.folderName}\n` +
          `Files created: ${result.files.length}\n` +
          `Location: ${result.appDir}\n` +
          `Setup Commands: ${result.commands.join("\n")}`;

        await saveMessage({
          conversationId: conversation.id,
          content: responseMessage,
          role: "assistant",
        });

        const continuePrompt = await confirm({
          message: "Would you like to generate another application ?",
          initialValue: true,
        });

        if (isCancel(continuePrompt) || !continuePrompt) {
          console.log(chalk.yellow("Greate! Check your new application.\n"));
          break;
        }
      }
    } catch (error) {
      console.log(chalk.red(`Error: ${error}`));

      await saveMessage({
        conversationId: conversation.id,
        content: `Error: ${error}`,
        role: "assistant",
      });

      const retryPrompt = await confirm({
        message: "Would you like to retry ?",
        initialValue: true,
      });

      if (isCancel(retryPrompt) || !retryPrompt) {
        break;
      }
    }
  }
}

export async function startAgentChat(conversationId: string | null = null) {
  try {
    aiService = new AiService();
    intro(
      boxen(
        chalk.cyanBright.bold("Timi Cli Agent Mode\n") +
          chalk.cyan("Autonomous Application Generator"),
        {
          padding: 1,
          margin: 1,
          borderColor: "cyan",
          borderStyle: "round",
        },
      ),
    );

    const shouldContinue = await confirm({
      message:
        "The agent will create files and folders in the current directory. Continue ?",
      initialValue: true,
    });

    if (isCancel(shouldContinue) || !shouldContinue) {
      cancel(chalk.yellow("Agent mode cancelled"));
      process.exit(0);
    }

    const conversation = await initConversation({
      conversationId: conversationId,
    });

    await agentLoop(conversation);

    outro(chalk.green.bold("\n Thanks for using Agent Mode"));
  } catch (error) {
    const errorBox = boxen(chalk.red(`Error: ${error}`), {
      padding: 1,
      borderStyle: "round",
      borderColor: "red",
    });

    console.log(errorBox);
    process.exit(1);
  }
}
