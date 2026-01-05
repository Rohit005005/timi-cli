import {
  cancel,
  intro,
  isCancel,
  multiselect,
  outro,
  text,
} from "@clack/prompts";
import boxen from "boxen";
import chalk from "chalk";
import { marked, Renderer, Tokens } from "marked";
import yoctoSpinner from "yocto-spinner";
import {
  availableTools,
  enableTools,
  getEnabledToolNames,
  getEnabledTools,
  resetTools,
} from "../../config/tool.config";
import { ModelMessage } from "ai";
import { prisma } from "../../../lib/prisma";
import { getStoredToken } from "../../../lib/token";
import { AiService } from "../services/ai.service";
import {
  addMessageType,
  ChatService,
  messagesType,
} from "../services/chat.service";
import {
  conversationType,
  initConversationType,
  updateConversationTitleType,
} from "./chat";

class CustomTerminalRenderer extends Renderer {
  // FIX: 'code' now receives a single object containing the properties
  code({
    text,
    lang,
    escaped,
  }: {
    text: string;
    lang?: string;
    escaped?: boolean;
  }): string {
    return "\n" + chalk.cyan(text) + "\n";
  }

  blockquote({ text }: { text: string }): string {
    return chalk.gray.italic(text);
  }

  heading({ text, depth }: { text: string; depth: number }): string {
    const style = depth === 1 ? chalk.magenta.underline.bold : chalk.green.bold;
    return "\n" + style(text) + "\n";
  }

  hr(): string {
    return chalk.gray("----------------------------------------\n");
  }

  list(token: Tokens.List): string {
    const body = token.items.map((item) => this.listitem(item)).join("");
    return body + "\n";
  }

  listitem(item: Tokens.ListItem): string {
    const content = marked.parseInline(item.text, { renderer: this }) as string;
    return `  • ${content}\n`;
  }

  paragraph({ text }: { text: string }): string {
    return text + "\n";
  }

  strong({ text }: { text: string }): string {
    return chalk.bold(text);
  }

  em({ text }: { text: string }): string {
    return chalk.italic(text);
  }

  codespan({ text }: { text: string }): string {
    return chalk.yellow.bgBlack(` ${text} `);
  }

  del({ text }: { text: string }): string {
    return chalk.dim.gray.strikethrough(text);
  }

  link({
    href,
    title,
    text,
  }: {
    href: string;
    title?: string | null;
    text: string;
  }): string {
    return chalk.blue.underline(text);
  }
}

const terminalRenderer = new CustomTerminalRenderer();

const aiService = new AiService();
const chatService = new ChatService();

async function getUserFromToken() {
  const token = await getStoredToken();
  if (!token) {
    throw new Error("Not authenticated. Please run 'ai-cli login' first.");
  }
  const spinner = yoctoSpinner({ text: "Authenticating..." }).start();

  const user = await prisma.user.findFirst({
    where: {
      sessions: {
        some: { token: token.access_token },
      },
    },
  });

  if (!user) {
    spinner.error("User not found");
    throw new Error("User not found. Please logi again.");
  }

  spinner.success(`Welcome back, ${user.name}`);

  return user;
}

async function selectTools() {
  const toolOptions = availableTools.map((tool) => ({
    value: tool.id,
    label: tool.name,
    hint: tool.description,
  }));

  const selectedTools = await multiselect({
    message: chalk.cyan(
      "Select tools to enable (Space to select, Enter to confirm): ",
    ),
    options: toolOptions,
    required: false,
  });

  if (isCancel(selectedTools)) {
    cancel(chalk.yellow("Tool selection cancelled"));
    process.exit(0);
  }

  if (selectedTools.length === 0) {
    console.log(chalk.yellow("No tools selected. AI will work without tools."));
  } else {
    enableTools(selectedTools);

    const toolsBox = boxen(
      chalk.green(
        `Enabled tools: \n ${selectedTools
          .map((id) => {
            const tool = availableTools.find((tl) => tl.id === id);
            return ` - ${tool?.name}`;
          })
          .join("\n")}`,
      ),
    );

    console.log(toolsBox);
  }

  return selectedTools.length > 0;
}

async function initConversation({
  userId,
  conversationId,
  mode,
}: initConversationType) {
  const spinner = yoctoSpinner({ text: "Loading conversation..." }).start();

  const conversation = await chatService.getOrCreateConversation({
    userId,
    conversationId,
    mode,
  });

  spinner.success("Conversation Loaded !!");

  const enabledToolsNames = getEnabledToolNames();
  const toolsDisplay =
    enabledToolsNames.length > 0
      ? `\n ${chalk.gray("Active tools: ")} ${enabledToolsNames.join(", ")}`
      : ` \n ${chalk.gray("No tools enabled")}`;

  const conversationInfoBox = boxen(
    `${chalk.bold("Conversation: " + conversation.title)}\n ${chalk.gray("ID: " + conversation.id)}\n ${chalk.gray("Mode: " + conversation.mode)}`,
    {
      padding: 1,
      borderColor: "cyan",
      margin: { top: 1, bottom: 1 },
      borderStyle: "round",
      title: "Chat session",
      titleAlignment: "center",
    },
  );

  console.log(conversationInfoBox);

  if (conversation.messages.length > 0) {
    console.log(chalk.yellow("Previous messages: "));
    displayMessages(conversation.messages);
  }

  return conversation;
}

async function displayMessages(messages: messagesType[]) {
  for (const msg of messages) {
    if (msg.role === "user") {
      const userBox = boxen(chalk.white(msg.content), {
        padding: 1,
        margin: { left: 2, bottom: 1 },
        borderStyle: "round",
        borderColor: "blue",
        title: "You",
        titleAlignment: "left",
      });
      console.log(userBox);
    } else {
      const renderedContent = await marked.parse(msg.content, {
        renderer: terminalRenderer as any,
      });
      const assistantBox = boxen(renderedContent.trim(), {
        padding: 1,
        margin: { left: 2, bottom: 1 },
        borderColor: "green",
        borderStyle: "round",
        title: "Assistant",
        titleAlignment: "left",
      });
      console.log(assistantBox);
    }
  }
}

async function saveMessage({ conversationId, content, role }: addMessageType) {
  return await chatService.addMessage({ conversationId, role, content });
}

async function updateConversationTitle({
  conversationId,
  messageCount,
  userInput,
}: updateConversationTitleType) {
  if (messageCount === 1) {
    const title = userInput.slice(0, 50) + (userInput.length > 50 ? "..." : "");
    await chatService.updateTitle({ conversationId, title });
  }
}

async function getAiResponse(conversationId: string) {
  const spinner = yoctoSpinner({
    text: "AI is thinking...",
    color: "cyan",
  }).start();

  const messages = await chatService.getMessages({ conversationId });

  const aiMessages = chatService.formatMessagesForAi(messages);

  const tools = getEnabledTools();

  let fullResponse = "";

  let isFirstChunk = true;

  const toolCallsDetected: any[] = [];

  try {
    const result = await aiService.sendMessage(
      aiMessages as ModelMessage[],
      (chunk) => {
        if (isFirstChunk) {
          spinner.stop();
          console.log("\n");
          console.log(chalk.green.bold("Assistant: "));
          console.log(chalk.gray("-".repeat(60)));
          isFirstChunk = false;
        }
        fullResponse += chunk;
      },
      tools,
      (toolCall) => {
        toolCallsDetected.push(toolCall);
      },
    );

    if (toolCallsDetected.length > 0) {
      console.log("\n");
      const toolCallBox = boxen(
        toolCallsDetected
          .map(
            (tc) =>
              `${chalk.cyan("Tool: ")} ${tc.toolName}\n ${chalk.gray("Args: ")} ${JSON.stringify(tc.args, null, 2)}`,
          )
          .join("\n\n"),
        {
          padding: 1,
          margin: 1,
          borderColor: "cyan",
          borderStyle: "round",
          title: "Tool Calls",
        },
      );
      console.log(toolCallBox);
    }

    if (result.toolResults.length > 0) {
      console.log("\n");
      const toolResultsBox = boxen(
        result.toolResults
          .map(
            (tr) =>
              `${chalk.cyan("Tool: ")} ${tr.toolName}\n ${chalk.gray("Result: ")} ${JSON.stringify(tr.result, null, 2).slice(0, 200)}...`,
          )
          .join("\n\n"),
        {
          padding: 1,
          margin: 1,
          borderColor: "cyan",
          borderStyle: "round",
          title: "Tool Results",
        },
      );
      console.log(toolResultsBox);
    }

    console.log("\n");
    const renderedMarkdown = marked.parse(fullResponse, {
      renderer: terminalRenderer as any,
    });
    console.log(renderedMarkdown);
    console.log(chalk.gray("-".repeat(60)));
    console.log("\n");

    return result?.content;
  } catch (error) {
    spinner.error("Failed to get AI Response !!");
    throw error;
  }
}

async function chatLoop(conversation: conversationType) {
  const enabledToolsNames = getEnabledToolNames();
  const helpBox = boxen(
    `${chalk.gray("Type your message and press enter")}\n ${chalk.gray("AI has access to: ")}\n chalk.gray(${enabledToolsNames.length > 0 ? enabledToolsNames.join(", ") : "No tools"})\n ${chalk.gray("Press ctrl+c to quit anytime")}`,
    {
      padding: 1,
      margin: { bottom: 1 },
      borderColor: "gray",
      borderStyle: "round",
      dimBorder: true,
    },
  );

  console.log(helpBox);

  while (true) {
    const userInput = await text({
      message: chalk.blue("Your message"),
      placeholder: "Type your message...",
      validate(value) {
        if (!value || value.trim().length === 0) {
          return "Message can't be empty";
        }
      },
    });

    if (isCancel(userInput)) {
      const exitBox = boxen(chalk.yellow("Chat session ended !!"), {
        padding: 1,
        margin: 1,
        borderStyle: "round",
        backgroundColor: "yellow",
      });

      console.log(exitBox);
      process.exit(0);
    }

    if (userInput.toLowerCase() === "exit") {
      const exitBox = boxen(chalk.yellow("Chat session ended !!"), {
        padding: 1,
        margin: 1,
        borderStyle: "round",
        backgroundColor: "yellow",
      });

      console.log(exitBox);
      break;
    }

    await saveMessage({
      conversationId: conversation.id,
      content: userInput,
      role: "user",
    });

    const messages = await chatService.getMessages({
      conversationId: conversation.id,
    });

    const aiResponse = await getAiResponse(conversation.id);

    if (!aiResponse) {
      console.log(chalk.red("Failed to get AI response !!"));
      break;
    }

    await saveMessage({
      conversationId: conversation.id,
      content: aiResponse,
      role: "assistant",
    });

    await updateConversationTitle({
      conversationId: conversation.id,
      messageCount: messages.length,
      userInput: userInput,
    });
  }
}

export async function startToolChat(conversationId: string | null = null) {
  try {
    intro(
      boxen(chalk.cyan("Tool calling mode !!"), {
        padding: 1,
        borderColor: "cyan",
        borderStyle: "round",
      }),
    );

    const user = await getUserFromToken();

    await selectTools();

    const conversation = await initConversation({
      userId: user.id,
      conversationId: conversationId,
      mode: "tool",
    });

    await chatLoop(conversation);

    outro(chalk.green("Thank you for using tools !!"));
  } catch (error) {
    const errorBox = boxen(chalk.red(`Error: ${error}`), {
      padding: 1,
      margin: 1,
      borderColor: "red",
      borderStyle: "round",
    });

    console.log(errorBox);
    resetTools();
    process.exit(1);
  }
}
