import chalk from "chalk";
import boxen from "boxen";
import { marked, Renderer, Tokens } from "marked";
import { intro, outro, isCancel, text } from "@clack/prompts";
import yoctoSpinner from "yocto-spinner";
import { AiService } from "../services/ai.service";
import {
  addMessageType,
  ChatService,
  messagesType,
} from "../services/chat.service";
import { getStoredToken } from "../../lib/token";
import { ModelMessage } from "ai";
import { editor } from "@inquirer/prompts";
import { URL } from "../../commands/auth/login";

export type startChatType = {
  mode: string;
  conversationId?: string | null;
};

export type initConversationType = {
  mode: string;
  conversationId: string | null;
};

export type updateConversationTitleType = {
  conversationId: string;
  userInput: string;
  messageCount: number;
};

export type conversationType = {
  id: string;
  title: string | null;
  mode: string;
  createdAt: Date;
  updatedAt: Date;
};

function unescapeHtml(str: string) {
  return str
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#x27;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&");
}

class CustomTerminalRenderer extends Renderer {
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

  paragraph(token: Tokens.Paragraph): string {
    return this.parser.parseInline(token.tokens) + "\n";
  }

  text(token: Tokens.Text | Tokens.Escape): string {
    return unescapeHtml(token.text);
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
  mode = "chat",
}: initConversationType) {
  const spinner = yoctoSpinner({ text: "Loading conversation..." }).start();

  const conversation = await chatService.getOrCreateConversation({
    conversationId,
    mode,
  });

  spinner.success("Conversation Loaded !!");

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
    text: "Ai is thinking...",
    color: "cyan",
  }).start();

  const messages = await chatService.getMessages({ conversationId });

  const aiMessages = chatService.formatMessagesForAi(messages);

  let fullResponse = "";

  let isFirstChunk = true;

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
    );

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
  const helpBox = boxen(
    `${chalk.white("Type your message and press enter")}\n\n${chalk.white("Markdown formatting is supported in responses")}\n${chalk.white("Type 'exit' to end conversation")}\n${chalk.white("Press ctrl+c to quit anytime")}\n${chalk.white("Type '/edit' to open external editor (for multi-line)")}`,
    {
      padding: 1,
      margin: { bottom: 1 },
      borderColor: "white",
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
      const exitBox = boxen(chalk.black("Chat session ended !!"), {
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
      const exitBox = boxen(chalk.black("Chat session ended !!"), {
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
      content: finalContent,
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

export async function startChat({
  mode = "chat",
  conversationId = null,
}: startChatType) {
  try {
    aiService = new AiService();
    intro(
      boxen(chalk.cyanBright.bold("Timi Cli Chat"), {
        padding: 1,
        margin: 1,
        borderStyle: "round",
        borderColor: "cyan",
      }),
    );

    const conversation = await initConversation({
      conversationId,
      mode,
    });
    await chatLoop(conversation);

    outro(chalk.green("Thanks for Chatting"));
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
