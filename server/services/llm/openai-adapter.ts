import OpenAI from "openai";
import type { LLMProvider, LLMGenerateRequest, LLMResponse, LLMErrorCode } from "./types";
import { LLMError } from "./types";
import { composePrompt, truncateResponse } from "./prompt-composer";
import type { CharacterLimitStrategy } from "@shared/schema";

export class OpenAIAdapter implements LLMProvider {
  private client: OpenAI;
  private apiKey: string;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
    this.client = new OpenAI({ apiKey });
  }

  getProviderName(): "openai" {
    return "openai";
  }

  async validateConfig(): Promise<boolean> {
    try {
      await this.client.models.list();
      return true;
    } catch {
      return false;
    }
  }

  async generateReply(request: LLMGenerateRequest): Promise<LLMResponse> {
    const { agent, message, conversation, brand, conversationHistory, userSummary } = request;
    const model = agent.model || "gpt-4o-mini";
    const isGpt5 = model.startsWith("gpt-5");
    
    const { systemPrompt, userPrompt, characterLimit } = composePrompt({
      agent,
      message,
      conversation,
      brand,
      conversationHistory,
      userSummary,
    });

    try {
      const requestParams: OpenAI.Chat.ChatCompletionCreateParamsNonStreaming = {
        model,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
      };

      // gpt-5 doesn't support temperature parameter
      // the newest OpenAI model is "gpt-5" which was released August 7, 2025. do not change this unless explicitly requested by the user
      if (!isGpt5 && agent.temperature !== null && agent.temperature !== undefined) {
        requestParams.temperature = agent.temperature;
      }

      // Use max_completion_tokens for gpt-5, max_tokens for older models
      if (agent.maxTokens) {
        if (isGpt5) {
          requestParams.max_completion_tokens = agent.maxTokens;
        } else {
          requestParams.max_tokens = agent.maxTokens;
        }
      }

      const response = await this.client.chat.completions.create(requestParams);

      const rawText = response.choices[0]?.message?.content || "";
      const strategy = (agent.characterLimitStrategy || "truncate") as CharacterLimitStrategy;
      
      const { text, wasLimited } = truncateResponse(rawText, characterLimit, strategy);

      return {
        text,
        usage: {
          promptTokens: response.usage?.prompt_tokens || 0,
          completionTokens: response.usage?.completion_tokens || 0,
          totalTokens: response.usage?.total_tokens || 0,
        },
        model,
        provider: "openai",
        characterCount: text.length,
        wasCharacterLimited: wasLimited,
        raw: response,
      };
    } catch (error) {
      throw this.normalizeError(error);
    }
  }

  private normalizeError(error: unknown): LLMError {
    if (error instanceof OpenAI.APIError) {
      let code: LLMErrorCode = "UNKNOWN";
      let retryable = false;

      if (error.status === 401) {
        code = "AUTH_ERROR";
      } else if (error.status === 429) {
        code = "RATE_LIMIT";
        retryable = true;
      } else if (error.status === 400 && error.message.includes("model")) {
        code = "MODEL_UNSUPPORTED";
      } else if (error.message.includes("context_length")) {
        code = "CONTEXT_TOO_LONG";
      } else if (error.message.includes("content_filter")) {
        code = "CONTENT_FILTERED";
      }

      return new LLMError(error.message, code, "openai", {
        status: error.status,
        retryable,
      });
    }

    if (error instanceof Error) {
      const isNetwork = error.message.includes("fetch") || error.message.includes("network");
      return new LLMError(
        error.message,
        isNetwork ? "NETWORK_ERROR" : "UNKNOWN",
        "openai",
        { retryable: isNetwork }
      );
    }

    return new LLMError("Unknown error", "UNKNOWN", "openai");
  }
}
