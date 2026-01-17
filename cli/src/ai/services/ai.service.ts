import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { LanguageModel, ModelMessage, streamText } from "ai";
import chalk from "chalk";
import { config } from "../../config/gemini.config";

export class AiService {
  public model: LanguageModel;
  constructor() {
    if (!config.googleApiKey) {
      throw new Error("Gemini api key not set in env !!");
    }

    if (!config.model) {
      throw new Error("Gemini model not set in env !!");
    }

    const google = createGoogleGenerativeAI({
      apiKey: config.googleApiKey,
    });

    this.model = google(config.model);
  }

  async sendMessage(
    messages: ModelMessage[],
    onChunk: (chunk: string) => void,
    tools: any = undefined,
    onToolCall: ((toolCall: any) => void) | null = null,
  ) {
    try {
      const hasTools = tools && Object.keys(tools).length > 0;

      if (hasTools) {
        console.log(
          chalk.gray(`Tools enabled: ${Object.keys(tools).join(", ")}`),
        );
      }

      const streamConfig = {
        model: this.model,
        messages: messages,
        ...(hasTools ? { tools, maxSteps: 5 } : {}),
      };

      const result = streamText(streamConfig);

      let fullResponse = "";

      for await (const chunk of result.textStream) {
        fullResponse += chunk;
        if (onChunk) {
          onChunk(chunk);
        }
      }

      const fullResult = result;

      const toolCalls = [];
      const toolResults = [];

      if (fullResult.steps && Array.isArray(fullResult.steps)) {
        for (const step of fullResult.steps) {
          if (step.toolCalls && step.toolCalls.length > 0) {
            for (const toolCall of step.toolCalls) {
              toolCalls.push(toolCall);

              if (onToolCall) {
                onToolCall(toolCall);
              }
            }
          }

          if (step.toolResults && step.toolResults.length > 0) {
            toolResults.push(...step.toolResults);
          }
        }
      }

      return {
        content: fullResponse,
        finishResponse: fullResult.finishReason,
        usage: fullResult.usage,
        toolCalls,
        toolResults,
        steps: fullResult.steps,
      };
    } catch (error) {
      console.log(chalk.red("AI Service Error: "), error);
      throw error;
    }
  }

  async getMessage(messages: ModelMessage[], tools = undefined) {
    let fullResponse = "";
    const result = await this.sendMessage(
      messages,
      (chunk) => {
        fullResponse += chunk;
      },
      tools,
    );

    return result.content;
  }
}
