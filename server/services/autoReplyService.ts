import { storage } from "../storage";
import { MetricoolService } from "./metricool";
import { websocketService } from "./websocketService";
import { createLLMProvider } from "./llm/factory";
import { log } from "../app";
import type { Message, Conversation, Brand, AiAgent } from "@shared/schema";

interface AutoReplyResult {
  success: boolean;
  messageId?: string;
  reply?: string;
  error?: string;
  skippedReason?: string;
}

interface AgentSecrets {
  openaiApiKey?: string;
  geminiApiKey?: string;
}

class AutoReplyService {
  private secrets: AgentSecrets = {
    openaiApiKey: process.env.OPENAI_API_KEY,
    geminiApiKey: process.env.GEMINI_API_KEY,
  };

  async processNewMessage(
    message: Message,
    conversation: Conversation,
    brand: Brand
  ): Promise<AutoReplyResult> {
    const logPrefix = `[AutoReply] Brand ${brand.name}:`;

    try {
      const agent = await storage.getAiAgentByBrand(brand.id);

      if (!agent) {
        log(`${logPrefix} No AI agent configured, skipping auto-reply`, "sync");
        return { success: false, skippedReason: "no_agent" };
      }

      if (!agent.isActive) {
        log(`${logPrefix} AI agent is inactive, skipping auto-reply`, "sync");
        return { success: false, skippedReason: "agent_inactive" };
      }

      if (agent.autoReplyMode !== "auto") {
        log(`${logPrefix} Auto-reply mode is ${agent.autoReplyMode}, not 'auto'. Skipping.`, "sync");
        return { success: false, skippedReason: `mode_${agent.autoReplyMode}` };
      }

      if (!this.checkCooldown(agent)) {
        log(`${logPrefix} Still in cooldown period, skipping auto-reply`, "sync");
        return { success: false, skippedReason: "cooldown" };
      }

      if (!brand.metricoolToken || !brand.metricoolBlogId || !brand.metricoolUserId) {
        log(`${logPrefix} Missing Metricool credentials, skipping auto-reply`, "sync");
        return { success: false, skippedReason: "missing_credentials" };
      }

      if (message.aiReplyStatus && message.aiReplyStatus !== 'none') {
        log(`${logPrefix} Message already processed (status: ${message.aiReplyStatus}), skipping`, "sync");
        return { success: false, skippedReason: "already_processed" };
      }

      // CRITICAL: Never reply to outbound messages (messages sent BY the brand)
      if (message.direction === 'outbound') {
        log(`${logPrefix} Skipping outbound message (sent by brand), not replying to self`, "sync");
        return { success: false, skippedReason: "outbound_message" };
      }

      await storage.updateMessage(message.id, { aiReplyStatus: 'processing' });

      log(`${logPrefix} Generating AI response for message ${message.id}`, "sync");
      const conversationHistory = await storage.getMessagesByConversation(conversation.id);
      const llmProvider = createLLMProvider(agent, this.secrets);
      const llmResponse = await llmProvider.generateReply({
        agent,
        message,
        conversation,
        brand,
        conversationHistory: conversationHistory.slice(-5),
      });

      log(`${logPrefix} Generated reply (${llmResponse.characterCount} chars)`, "sync");

      const metricoolService = new MetricoolService({
        userToken: brand.metricoolToken,
        userId: brand.metricoolUserId,
      });

      let sendResult;
      if (message.type === "conversation") {
        const rawData = message.rawData as any;
        const threadExternalId = conversation.threadExternalId || rawData?.conversation?.id;
        
        // Get recipient - must be the OTHER participant (not self/brand account)
        // The 'from' field of an inbound message is the customer who wrote to us
        const convRawData = rawData?.conversation?.rawData || rawData?.conversation || {};
        const selfAccountId = convRawData?.self;
        const participants = convRawData?.participants || rawData?.conversation?.participants || [];
        
        let recipient: string | undefined;
        if (message.direction === 'inbound') {
          // For inbound messages, the sender (from) is who we want to reply to
          recipient = rawData?.message?.from || rawData?.from;
        }
        // Fallback: find participant that isn't self
        if (!recipient && selfAccountId && participants.length > 0) {
          const otherParticipant = participants.find((p: any) => p.id !== selfAccountId);
          recipient = otherParticipant?.id;
        }
        // Final fallback
        if (!recipient) {
          recipient = rawData?.from?.id || conversation.customerId;
        }
        
        log(`${logPrefix} DM recipient: ${recipient} (self: ${selfAccountId})`, "sync");

        if (!threadExternalId || !recipient) {
          log(`${logPrefix} Missing conversation data for DM reply`, "sync");
          return { success: false, error: "Missing conversation/recipient data" };
        }

        sendResult = await metricoolService.replyToConversation({
          provider: message.platform,
          conversationId: threadExternalId,
          recipient,
          text: llmResponse.text,
          blogId: brand.metricoolBlogId,
        });
      } else {
        const rawData = message.rawData as any;
        const objectId = rawData?.id || rawData?.root?.id || message.metricoolId?.split("_")[0];

        if (!objectId) {
          log(`${logPrefix} Missing objectId for comment reply`, "sync");
          return { success: false, error: "Missing comment objectId" };
        }

        sendResult = await metricoolService.replyToComment({
          provider: message.platform,
          objectId,
          text: llmResponse.text,
          blogId: brand.metricoolBlogId,
          mentionUsername: message.author,
        });
      }

      if (!sendResult.success) {
        log(`${logPrefix} Failed to send reply: ${sendResult.error}`, "sync");
        
        await storage.updateMessage(message.id, { aiReplyStatus: 'failed' });
        
        await this.logAuditEntry(agent.id, message, conversation, {
          action: "auto_reply",
          status: "failed",
          inputContent: message.content,
          outputContent: llmResponse.text,
          errorReason: sendResult.error,
          promptTokens: llmResponse.usage.promptTokens,
          completionTokens: llmResponse.usage.completionTokens,
          platform: message.platform,
          characterCount: llmResponse.characterCount,
          wasCharacterLimited: llmResponse.wasCharacterLimited,
        });

        return { success: false, error: sendResult.error };
      }

      const replyMessage = await storage.createMessage({
        brandId: brand.id,
        conversationId: conversation.id,
        platform: message.platform,
        type: message.type as "conversation" | "comment",
        direction: "outbound",
        author: brand.name,
        authorAvatar: brand.avatar,
        content: llmResponse.text,
        timestamp: new Date(),
        status: "read",
        source: "repliyo_auto",
        parentMessageId: message.id,
        aiAgentId: agent.id,
        aiSuggestedReply: llmResponse.text,
        aiReplyStatus: "sent",
        urgency: null,
        intent: null,
        sentiment: null,
        aiSummary: null,
        draftResponse: null,
        sourceUrl: null,
        contextType: null,
        crmData: null,
        metricoolId: null,
        rawData: { autoReply: true, metricoolResponse: sendResult.rawResponse },
        threadId: conversation.threadExternalId,
      });

      await storage.updateMessage(message.id, { aiReplyStatus: 'sent' });

      await storage.updateAiAgent(agent.id, {
        lastAutoReplyAt: new Date(),
      });

      await storage.updateConversation(conversation.id, {
        lastMessageAt: new Date(),
        lastMessagePreview: llmResponse.text.substring(0, 100),
      });

      await this.logAuditEntry(agent.id, message, conversation, {
        action: "auto_reply",
        status: "success",
        inputContent: message.content,
        outputContent: llmResponse.text,
        promptTokens: llmResponse.usage.promptTokens,
        completionTokens: llmResponse.usage.completionTokens,
        platform: message.platform,
        characterCount: llmResponse.characterCount,
        wasCharacterLimited: llmResponse.wasCharacterLimited,
      });

      websocketService.notifyAgentReply(brand.id, {
        messageId: replyMessage.id,
        conversationId: conversation.id,
        originalMessageId: message.id,
        reply: llmResponse.text,
        platform: message.platform,
        isAutoReply: true,
      });

      log(`${logPrefix} Auto-reply sent successfully (msg ${replyMessage.id})`, "sync");

      return {
        success: true,
        messageId: replyMessage.id,
        reply: llmResponse.text,
      };
    } catch (error: any) {
      log(`${logPrefix} Error in auto-reply: ${error.message}`, "sync");
      
      try {
        await storage.updateMessage(message.id, { aiReplyStatus: 'failed' });
      } catch (updateError) {
        log(`${logPrefix} Failed to update message status: ${updateError}`, "sync");
      }
      
      return { success: false, error: error.message };
    }
  }

  private checkCooldown(agent: AiAgent): boolean {
    if (!agent.cooldownSeconds || agent.cooldownSeconds === 0) {
      return true;
    }

    if (!agent.lastAutoReplyAt) {
      return true;
    }

    const now = new Date();
    const lastReply = new Date(agent.lastAutoReplyAt);
    const diffMs = now.getTime() - lastReply.getTime();
    const cooldownMs = agent.cooldownSeconds * 1000;

    return diffMs >= cooldownMs;
  }

  private async logAuditEntry(
    agentId: string,
    message: Message,
    conversation: Conversation,
    data: {
      action: string;
      status: string;
      inputContent: string;
      outputContent: string;
      errorReason?: string;
      promptTokens?: number;
      completionTokens?: number;
      platform: string;
      characterCount: number;
      wasCharacterLimited: boolean;
    }
  ): Promise<void> {
    try {
      await storage.createAuditLog({
        agentId,
        messageId: message.id,
        conversationId: conversation.id,
        action: data.action,
        inputContent: data.inputContent,
        outputContent: data.outputContent,
        status: data.status,
        errorReason: data.errorReason || null,
        promptTokens: data.promptTokens || null,
        completionTokens: data.completionTokens || null,
        platform: data.platform,
        characterCount: data.characterCount,
        wasCharacterLimited: data.wasCharacterLimited,
      });
    } catch (error: any) {
      log(`[AutoReply] Failed to log audit entry: ${error.message}`, "sync");
    }
  }
}

export const autoReplyService = new AutoReplyService();
