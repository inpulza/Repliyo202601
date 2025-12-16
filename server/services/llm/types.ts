import type { AiAgent, Message, Conversation, Brand } from "@shared/schema";

export interface LLMGenerateRequest {
  agent: AiAgent;
  message: Message;
  conversation?: Conversation;
  brand?: Brand;
  conversationHistory?: Message[];
  conversationSummary?: string | null;
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

// Legacy limits (for comments) - keeping for backward compatibility
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

// Real API limits by platform AND message type
export const CHANNEL_CHARACTER_LIMITS: Record<string, Record<string, number>> = {
  instagram: {
    dm: 1000,
    conversation: 1000,
    comment: 2200,
  },
  facebook: {
    dm: 2000,
    conversation: 2000,
    comment: 8000,
  },
  twitter: {
    dm: 10000,
    conversation: 10000,
    comment: 280,
  },
  linkedin: {
    dm: 3000,
    conversation: 3000,
    comment: 1250,
  },
  tiktok: {
    dm: 500,
    conversation: 500,
    comment: 150,
  },
  youtube: {
    dm: 10000,
    conversation: 10000,
    comment: 10000,
  },
  "google-business": {
    dm: 4000,
    conversation: 4000,
    comment: 4000,
  },
  default: {
    dm: 2000,
    conversation: 2000,
    comment: 2000,
  },
};

// Safe margin (90%) to reduce probability of needing to split
const SAFE_MARGIN = 0.9;

// Get character limit based on platform and message type, with safe margin applied
export function getCharacterLimit(platform: string, messageType: string): { 
  safeLimit: number; 
  hardLimit: number; 
} {
  const normalizedPlatform = platform?.toLowerCase().trim() || 'default';
  const normalizedType = messageType?.toLowerCase().trim() || 'comment';
  
  // Map message types to our categories
  const typeMapping: Record<string, string> = {
    'dm': 'dm',
    'conversation': 'conversation',
    'comment': 'comment',
    'review': 'comment',
  };
  const mappedType = typeMapping[normalizedType] || 'comment';
  
  const platformLimits = CHANNEL_CHARACTER_LIMITS[normalizedPlatform] || CHANNEL_CHARACTER_LIMITS.default;
  const hardLimit = platformLimits[mappedType] || platformLimits.comment || 2000;
  const safeLimit = Math.floor(hardLimit * SAFE_MARGIN);
  
  return { safeLimit, hardLimit };
}

// Split a long message into multiple parts for delivery
export interface MessageChunk {
  content: string;
  partIndex: number;
  totalParts: number;
  isLast: boolean;
}

export function splitMessageForDelivery(text: string, hardLimit: number): MessageChunk[] {
  // If message fits in limit, return as single chunk
  if (text.length <= hardLimit) {
    return [{
      content: text,
      partIndex: 1,
      totalParts: 1,
      isLast: true,
    }];
  }
  
  const chunks: string[] = [];
  let remaining = text.trim();
  
  // Reserve space for indicators like " (1/3) 👇" (about 12 chars)
  const indicatorSpace = 15;
  const effectiveLimit = hardLimit - indicatorSpace;
  
  while (remaining.length > 0) {
    if (remaining.length <= effectiveLimit) {
      // Last chunk - no need for continuation indicator
      chunks.push(remaining);
      break;
    }
    
    // Try to find a good breaking point
    let cutPoint = effectiveLimit;
    
    // Priority 1: Break at paragraph (double newline)
    const paragraphBreak = remaining.lastIndexOf('\n\n', effectiveLimit);
    if (paragraphBreak > effectiveLimit * 0.5) {
      cutPoint = paragraphBreak;
    } else {
      // Priority 2: Break at single newline
      const newlineBreak = remaining.lastIndexOf('\n', effectiveLimit);
      if (newlineBreak > effectiveLimit * 0.5) {
        cutPoint = newlineBreak;
      } else {
        // Priority 3: Break at sentence end (. ! ?)
        const sentenceBreak = Math.max(
          remaining.lastIndexOf('. ', effectiveLimit),
          remaining.lastIndexOf('! ', effectiveLimit),
          remaining.lastIndexOf('? ', effectiveLimit)
        );
        if (sentenceBreak > effectiveLimit * 0.5) {
          cutPoint = sentenceBreak + 1; // Include the punctuation
        } else {
          // Priority 4: Break at space (never cut a word)
          const spaceBreak = remaining.lastIndexOf(' ', effectiveLimit);
          if (spaceBreak > effectiveLimit * 0.3) {
            cutPoint = spaceBreak;
          }
          // If no good break found, cut at limit (rare edge case)
        }
      }
    }
    
    const chunk = remaining.substring(0, cutPoint).trim();
    chunks.push(chunk);
    remaining = remaining.substring(cutPoint).trim();
  }
  
  // Add indicators to chunks
  const totalParts = chunks.length;
  return chunks.map((content, index) => {
    const partIndex = index + 1;
    const isLast = partIndex === totalParts;
    
    // Add visual indicators
    let formattedContent = content;
    if (totalParts > 1) {
      if (!isLast) {
        // Not the last part: add continuation indicator
        formattedContent = `${content}... (${partIndex}/${totalParts}) 👇`;
      } else {
        // Last part: add part number at beginning
        formattedContent = `(${partIndex}/${totalParts}) ${content}`;
      }
    }
    
    return {
      content: formattedContent,
      partIndex,
      totalParts,
      isLast,
    };
  });
}

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
