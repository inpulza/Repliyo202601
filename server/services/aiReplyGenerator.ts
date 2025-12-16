import { storage } from "../storage";
import { createLLMProvider } from "./llm/factory";
import { log } from "../app";
import type { Message, Conversation, AiAgent } from "@shared/schema";

interface AgentSecrets {
  openaiApiKey?: string;
  geminiApiKey?: string;
}

interface GenerateReplyResult {
  success: boolean;
  reply?: string;
  characterCount?: number;
  provider?: string;
  model?: string;
  error?: string;
}

const secrets: AgentSecrets = {
  openaiApiKey: process.env.OPENAI_API_KEY,
  geminiApiKey: process.env.GEMINI_API_KEY,
};

export async function generateReplyForMessage(
  agent: AiAgent,
  message: Message,
  conversation: Conversation,
  platform: string | null
): Promise<GenerateReplyResult> {
  const logPrefix = `[DraftGenerator]`;

  try {
    const brand = await storage.getBrand(agent.brandId);
    if (!brand) {
      return { success: false, error: "Brand not found" };
    }

    const conversationHistory = await storage.getMessagesByConversation(conversation.id);
    const historyForLLM = conversationHistory.slice(-10);

    log(`${logPrefix} Generating draft for message ${message.id}`, "sync");

    let socialPost = null;
    if (conversation.socialPostId) {
      socialPost = await storage.getSocialPost(conversation.socialPostId);
    }

    let userSummary = null;
    if (message.author) {
      userSummary = await storage.getConversationUserSummary(conversation.id, message.author);
    }

    const llmProvider = createLLMProvider(agent, secrets);
    const llmResponse = await llmProvider.generateReply({
      agent,
      message,
      conversation,
      brand,
      conversationHistory: historyForLLM,
      userSummary,
      socialPost,
    });

    log(`${logPrefix} Generated draft (${llmResponse.characterCount} chars) using ${llmResponse.provider}/${llmResponse.model}`, "sync");

    return {
      success: true,
      reply: llmResponse.text,
      characterCount: llmResponse.characterCount,
      provider: llmResponse.provider,
      model: llmResponse.model,
    };
  } catch (error: any) {
    log(`${logPrefix} Error generating draft: ${error.message}`, "sync");
    return {
      success: false,
      error: error.message || "Failed to generate reply",
    };
  }
}
