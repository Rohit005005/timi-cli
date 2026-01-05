import { google } from "@ai-sdk/google";
import chalk from "chalk";

export const availableTools = [
  {
    id: "google_search",
    name: "Google Search",
    description: "Access latest information using Google Search.",
    getTool: () => google.tools.googleSearch({}),
    enabled: false,
  },
  {
    id: "code_execution",
    name: "Code Execution",
    description:
      "Generate and execute Python code to perform calculations, solve problems, or provide accurate information.",
    getTool: () => google.tools.codeExecution({}),
    enabled: false,
  },
  {
    id: "url_context",
    name: "URL Context",
    description:
      "Provide specific URLs that you want the model to analyze directly from the prompt. Supports up to 20 URLs per request.",
    getTool: () => google.tools.urlContext({}),
    enabled: false,
  },
];

export function getEnabledTools() {
  const tools: Record<string, any> = {};

  try {
    for (const toolConfig of availableTools) {
      if (toolConfig.enabled) {
        tools[toolConfig.id] = toolConfig.getTool();
      }
    }

    if (Object.keys(tools).length > 0) {
      console.log(
        chalk.gray(`Enabled tools: ${Object.keys(tools).join(", ")}`),
      );
    } else {
      console.log(chalk.yellow("Not tools enabled !!"));
    }

    return Object.keys(tools).length > 0 ? tools : undefined;
  } catch (error) {
    console.log(chalk.yellow("Failed to initialize tool"), error);
    return undefined;
  }
}

export function toggleTool(toolId: string) {
  const tool = availableTools.find((tl) => tl.id === toolId);

  if (tool) {
    tool.enabled = !tool.enabled;
    console.log(chalk.gray(`Tool ${toolId} toogled to ${tool.enabled}`));

    return tool.enabled;
  }

  console.log(chalk.red(`Tool ${toolId} not found !!`));
  return false;
}

export function enableTools(toolIds: string[]) {
  console.log(chalk.gray("enableTools called with: ", toolIds));

  availableTools.forEach((tool) => {
    const wasEnabled = tool.enabled;
    tool.enabled = toolIds.includes(tool.id);

    if (tool.enabled !== wasEnabled) {
      console.log(chalk.gray(`${tool.id}: ${wasEnabled} -> ${tool.enabled}`));
    }
  });

  const enabledCount = availableTools.filter((tl) => tl.enabled);

  console.log(
    chalk.gray(`Total tools enabled: ${enabledCount}/${availableTools.length}`),
  );
}

export function getEnabledToolNames() {
  const names = availableTools.filter((tl) => tl.enabled).map((tl) => tl.name);

  console.log(chalk.gray(`getEnabledToolNames returning: `, names));
  return names;
}

export function resetTools() {
  availableTools.forEach((tool) => {
    tool.enabled = false;
  });

  console.log(chalk.gray("All tools have been reset."));
}
