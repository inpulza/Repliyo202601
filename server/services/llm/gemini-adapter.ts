import { GoogleGenAI } from "@google/genai";
import type { LLMProvider, LLMGenerateRequest, LLMResponse, LLMErrorCode, RawCompletionOptions, RawCompletionResponse } from "./types";
import { LLMError } from "./types";
import { composePrompt, truncateResponse } from "./prompt-composer";
import type { CharacterLimitStrategy } from "@shared/schema";

export class GeminiAdapter implements LLMProvider {
  private client: GoogleGenAI;
  private apiKey: string;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
    // DON'T DELETE THIS COMMENT
    // Note that the newest Gemini model series is "gemini-2.5-flash" or "gemini-2.5-pro"
    // do not change this unless explicitly requested by the user
    this.client = new GoogleGenAI({ apiKey });
  }

  getProviderName(): "gemini" {
    return "gemini";
  }

  async validateConfig(): Promise<boolean> {
    try {
      const response = await this.client.models.generateContent({
        model: "gemini-2.5-flash",
        contents: "Hello",
      });
      return !!response.text;
    } catch {
      return false;
    }
  }

  async generateReply(request: LLMGenerateRequest): Promise<LLMResponse> {
    const { agent, message, conversation, brand, conversationHistory, userSummary, socialPost } = request;
    const model = agent.model || "gemini-2.5-flash";

    const { systemPrompt, userPrompt, characterLimit } = composePrompt({
      agent,
      message,
      conversation,
      brand,
      conversationHistory,
      userSummary,
      socialPost,
    });

    try {
      const config: Record<string, unknown> = {
        systemInstruction: systemPrompt,
      };

      if (agent.temperature !== null && agent.temperature !== undefined) {
        config.temperature = agent.temperature;
      }

      const isThinkingModel = model.includes('gemini-2.5');
      
      if (agent.maxTokens) {
        config.maxOutputTokens = agent.maxTokens * 4;
      }
      
      if (isThinkingModel) {
        config.thinkingConfig = {
          thinkingBudget: agent.maxTokens ? Math.max(1024, agent.maxTokens) : 2048,
        };
      }

      console.log(`[Gemini] Generating reply with model=${model}, maxOutputTokens=${config.maxOutputTokens || 'default'}, thinkingBudget=${isThinkingModel ? (config.thinkingConfig as any)?.thinkingBudget : 'N/A'}`);
      
      const response = await this.client.models.generateContent({
        model,
        config,
        contents: userPrompt,
      });

      const rawText = response.text || "";
      const usage = response.usageMetadata || {};
      const finishReason = (response as any).candidates?.[0]?.finishReason;
      
      console.log(`[Gemini] Response: ${rawText.length} chars, ${usage.candidatesTokenCount || 0} tokens, finishReason=${finishReason || 'unknown'}`);
      
      const strategy = (agent.characterLimitStrategy || "truncate") as CharacterLimitStrategy;
      
      const { text, wasLimited } = truncateResponse(rawText, characterLimit, strategy);
      
      if (wasLimited) {
        console.log(`[Gemini] Response was ${strategy}d from ${rawText.length} to ${text.length} chars`);
      }

      return {
        text,
        usage: {
          promptTokens: usage.promptTokenCount || 0,
          completionTokens: usage.candidatesTokenCount || 0,
          totalTokens: usage.totalTokenCount || 0,
        },
        model,
        provider: "gemini",
        characterCount: text.length,
        wasCharacterLimited: wasLimited,
        raw: response,
      };
    } catch (error) {
      throw this.normalizeError(error);
    }
  }

  async generateRawCompletion(
    systemPrompt: string,
    userPrompt: string,
    options?: RawCompletionOptions
  ): Promise<RawCompletionResponse> {
    try {
      const model = options?.model || "gemini-2.5-flash";
      
      const response = await this.client.models.generateContent({
        model,
        config: {
          systemInstruction: systemPrompt,
          temperature: options?.temperature ?? 0.7,
          maxOutputTokens: options?.maxTokens || 500,
        },
        contents: userPrompt,
      });

      const usage = response.usageMetadata || {};

      return {
        text: response.text || "",
        usage: {
          promptTokens: usage.promptTokenCount || 0,
          completionTokens: usage.candidatesTokenCount || 0,
          totalTokens: usage.totalTokenCount || 0,
        },
      };
    } catch (error) {
      throw this.normalizeError(error);
    }
  }

  private normalizeError(error: unknown): LLMError {
    if (error instanceof Error) {
      let code: LLMErrorCode = "UNKNOWN";
      let retryable = false;
      let status: number | undefined;

      const message = error.message.toLowerCase();

      if (message.includes("api key") || message.includes("authentication") || message.includes("401")) {
        code = "AUTH_ERROR";
        status = 401;
      } else if (message.includes("quota") || message.includes("rate") || message.includes("429")) {
        code = "RATE_LIMIT";
        status = 429;
        retryable = true;
      } else if (message.includes("model") && message.includes("not found")) {
        code = "MODEL_UNSUPPORTED";
        status = 400;
      } else if (message.includes("token") && message.includes("limit")) {
        code = "CONTEXT_TOO_LONG";
      } else if (message.includes("safety") || message.includes("blocked")) {
        code = "CONTENT_FILTERED";
      } else if (message.includes("fetch") || message.includes("network")) {
        code = "NETWORK_ERROR";
        retryable = true;
      }

      return new LLMError(error.message, code, "gemini", { status, retryable });
    }

    return new LLMError("Unknown error", "UNKNOWN", "gemini");
  }
}
