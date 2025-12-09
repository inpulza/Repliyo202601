import type { AiAgent, Message, Conversation, Brand } from "@shared/schema";

export interface LLMGenerateRequest {
  agent: AiAgent;
  message: Message;
  conversation?: Conversation;
  brand?: Brand;
  conversationHistory?: Message[];
}

export interface LLMResponse {
  text: string;
  usage: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  model: string;
  provider: "openai" | "gemini";
  characterCount: number;
  wasCharacterLimited: boolean;
  raw?: unknown;
}

export type LLMErrorCode = 
  | "AUTH_ERROR" 
  | "RATE_LIMIT" 
  | "MODEL_UNSUPPORTED" 
  | "CONTEXT_TOO_LONG" 
  | "CONTENT_FILTERED"
  | "NETWORK_ERROR"
  | "UNKNOWN";

export class LLMError extends Error {
  code: LLMErrorCode;
  status?: number;
  retryable: boolean;
  provider: "openai" | "gemini";

  constructor(
    message: string, 
    code: LLMErrorCode, 
    provider: "openai" | "gemini",
    options?: { status?: number; retryable?: boolean }
  ) {
    super(message);
    this.name = "LLMError";
    this.code = code;
    this.provider = provider;
    this.status = options?.status;
    this.retryable = options?.retryable ?? false;
  }
}

export interface LLMProvider {
  generateReply(request: LLMGenerateRequest): Promise<LLMResponse>;
  validateConfig(): Promise<boolean>;
  getProviderName(): "openai" | "gemini";
}

export interface AgentSecrets {
  openaiApiKey?: string;
  geminiApiKey?: string;
}

export const PLATFORM_CHARACTER_LIMITS: Record<string, number> = {
  twitter: 280,
  instagram: 2200,
  facebook: 63206,
  linkedin: 3000,
  tiktok: 150,
  youtube: 10000,
  "google-business": 4000,
  default: 2000,
};

export const OPENAI_MODELS = [
  "gpt-5",
  "gpt-4o",
  "gpt-4o-mini",
  "gpt-4-turbo",
] as const;

export const GEMINI_MODELS = [
  "gemini-2.5-flash",
  "gemini-2.5-pro",
  "gemini-1.5-flash",
  "gemini-1.5-pro",
] as const;

export type OpenAIModel = typeof OPENAI_MODELS[number];
export type GeminiModel = typeof GEMINI_MODELS[number];
