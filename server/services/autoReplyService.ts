import { storage } from "../storage";
import { MetricoolService } from "./metricool";
import { websocketService } from "./websocketService";
import { createLLMProvider } from "./llm/factory";
import { getCharacterLimit, splitMessageForDelivery, type MessageChunk } from "./llm/types";
import { triggerSummaryUpdateAsync } from "./summaryService";
import { log } from "../app";
import type { Message, Conversation, Brand, AiAgent } from "@shared/schema";
import { randomUUID } from "crypto";

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
      const historyForLLM = conversationHistory.slice(-10);
      log(`${logPrefix} Conversation history: ${conversationHistory.length} total messages, sending ${historyForLLM.length} to LLM`, "sync");
      
      // Log the history content for debugging
      if (historyForLLM.length > 0) {
        const historyPreview = historyForLLM.map(m => 
          `${m.direction === 'inbound' ? 'Cliente' : 'Marca'}: ${(m.content || '').substring(0, 50)}...`
        ).join(' | ');
        log(`${logPrefix} History preview: ${historyPreview}`, "sync");
      }
      
      // PHASE 2: Get persistent summary for this user (long-term memory)
      let userSummary = null;
      if (message.author) {
        userSummary = await storage.getConversationUserSummary(conversation.id, message.author);
        if (userSummary) {
          log(`${logPrefix} Found persistent summary for user ${message.author}`, "sync");
        }
      }
      
      const llmProvider = createLLMProvider(agent, this.secrets);
      const llmResponse = await llmProvider.generateReply({
        agent,
        message,
        conversation,
        brand,
        conversationHistory: historyForLLM,
        userSummary,
      });

      log(`${logPrefix} Generated reply (${llmResponse.characterCount} chars)`, "sync");

      const metricoolService = new MetricoolService({
        userToken: brand.metricoolToken,
        userId: brand.metricoolUserId,
      });

      // Get the hard limit for this platform+type and split if necessary
      const { hardLimit } = getCharacterLimit(message.platform, message.type);
      const chunks = splitMessageForDelivery(llmResponse.text, hardLimit);
      
      log(`${logPrefix} Message split into ${chunks.length} chunk(s) (hardLimit: ${hardLimit})`, "sync");

      // Prepare common data for sending
      const rawData = message.rawData as any;
      let threadExternalId: string | undefined;
      let recipient: string | undefined;
      let objectId: string | undefined;

      if (message.type === "conversation") {
        threadExternalId = conversation.threadExternalId || rawData?.conversation?.id;
        
        const convRawData = rawData?.conversation?.rawData || rawData?.conversation || {};
        const selfAccountId = convRawData?.self;
        const participants = convRawData?.participants || rawData?.conversation?.participants || [];
        
        if (message.direction === 'inbound') {
          recipient = rawData?.message?.from || rawData?.from;
        }
        if (!recipient && selfAccountId && participants.length > 0) {
          const otherParticipant = participants.find((p: any) => p.id !== selfAccountId);
          recipient = otherParticipant?.id;
        }
        if (!recipient) {
          recipient = rawData?.from?.id || conversation.customerId;
        }
        
        log(`${logPrefix} DM recipient: ${recipient} (self: ${selfAccountId})`, "sync");

        if (!threadExternalId || !recipient) {
          log(`${logPrefix} Missing conversation data for DM reply`, "sync");
          return { success: false, error: "Missing conversation/recipient data" };
        }
      } else {
        objectId = rawData?.id || rawData?.root?.id || message.metricoolId?.split("_")[0];

        if (!objectId) {
          log(`${logPrefix} Missing objectId for comment reply`, "sync");
          return { success: false, error: "Missing comment objectId" };
        }
      }

      // Generate a unique group ID for multi-part messages
      const replyGroupId = chunks.length > 1 ? randomUUID() : null;
      const sentMessages: Message[] = [];
      const CHUNK_DELAY_MS = 2000; // 2 seconds between chunks
      let failedChunkIndex: number | null = null;
      let failedChunkError: string | null = null;

      // Send each chunk sequentially
      for (const chunk of chunks) {
        let sendResult;
        
        if (message.type === "conversation") {
          sendResult = await metricoolService.replyToConversation({
            provider: message.platform,
            conversationId: threadExternalId!,
            recipient: recipient!,
            text: chunk.content,
            blogId: brand.metricoolBlogId,
          });
        } else {
          sendResult = await metricoolService.replyToComment({
            provider: message.platform,
            objectId: objectId!,
            text: chunk.content,
            blogId: brand.metricoolBlogId,
            mentionUsername: chunk.partIndex === 1 ? message.author : undefined, // Only mention on first chunk
          });
        }

        if (!sendResult.success) {
          log(`${logPrefix} Failed to send chunk ${chunk.partIndex}/${chunk.totalParts}: ${sendResult.error}`, "sync");
          failedChunkIndex = chunk.partIndex;
          failedChunkError = sendResult.error || 'Unknown error';
          
          // If first chunk fails, mark as failed and stop immediately
          if (chunk.partIndex === 1) {
            await storage.updateMessage(message.id, { aiReplyStatus: 'failed' });
            
            await this.logAuditEntry(agent.id, message, conversation, {
              action: "auto_reply",
              status: "failed",
              inputContent: message.content,
              outputContent: llmResponse.text,
              errorReason: `Chunk ${chunk.partIndex}/${chunk.totalParts} failed: ${sendResult.error}`,
              promptTokens: llmResponse.usage.promptTokens,
              completionTokens: llmResponse.usage.completionTokens,
              platform: message.platform,
              characterCount: llmResponse.characterCount,
              wasCharacterLimited: llmResponse.wasCharacterLimited,
            });

            return { success: false, error: sendResult.error };
          }
          
          // If a later chunk fails, stop sending but handle as partial failure below
          break;
        }

        // Save each chunk as a separate message
        const replyMessage = await storage.createMessage({
          brandId: brand.id,
          conversationId: conversation.id,
          platform: message.platform,
          type: message.type as "conversation" | "comment",
          direction: "outbound",
          author: brand.name,
          authorAvatar: brand.avatar,
          content: chunk.content,
          timestamp: new Date(),
          status: "read",
          source: "repliyo_auto",
          internalOrigin: "ai",
          parentMessageId: chunk.partIndex === 1 ? message.id : null,
          aiAgentId: agent.id,
          aiSuggestedReply: chunk.partIndex === 1 ? llmResponse.text : null,
          aiReplyStatus: "sent",
          replyGroupId,
          partIndex: chunk.totalParts > 1 ? chunk.partIndex : null,
          totalParts: chunk.totalParts > 1 ? chunk.totalParts : null,
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

        sentMessages.push(replyMessage);
        log(`${logPrefix} Chunk ${chunk.partIndex}/${chunk.totalParts} sent (msg ${replyMessage.id})`, "sync");

        // Add delay between chunks to appear more human-like
        if (chunk.partIndex < chunk.totalParts) {
          await new Promise(resolve => setTimeout(resolve, CHUNK_DELAY_MS));
        }
      } // End of chunk loop

      // Check for partial failure (some but not all chunks sent)
      const isPartialFailure = failedChunkIndex !== null && sentMessages.length > 0;
      const allChunksSent = sentMessages.length === chunks.length;
      
      if (isPartialFailure) {
        log(`${logPrefix} Partial failure: ${sentMessages.length}/${chunks.length} chunks sent`, "sync");
        
        await storage.updateMessage(message.id, { aiReplyStatus: 'partial' });
        
        await this.logAuditEntry(agent.id, message, conversation, {
          action: "auto_reply",
          status: "partial",
          inputContent: message.content,
          outputContent: llmResponse.text,
          errorReason: `Partial delivery: ${sentMessages.length}/${chunks.length} chunks sent. Chunk ${failedChunkIndex} failed: ${failedChunkError}`,
          promptTokens: llmResponse.usage.promptTokens,
          completionTokens: llmResponse.usage.completionTokens,
          platform: message.platform,
          characterCount: llmResponse.characterCount,
          wasCharacterLimited: llmResponse.wasCharacterLimited,
        });

        // Still update conversation preview with what was sent
        const sentContent = sentMessages.map(m => m.content).join(' ');
        await storage.updateConversation(conversation.id, {
          lastMessageAt: new Date(),
          lastMessagePreview: sentContent.substring(0, 100),
        });

        return {
          success: false,
          messageId: sentMessages[0].id,
          reply: sentContent,
          error: `Partial delivery: only ${sentMessages.length}/${chunks.length} parts sent`,
        };
      }

      // Update original message status
      await storage.updateMessage(message.id, { aiReplyStatus: 'sent' });

      // Update agent's last reply time
      await storage.updateAiAgent(agent.id, {
        lastAutoReplyAt: new Date(),
      });

      // Update conversation preview with full response
      await storage.updateConversation(conversation.id, {
        lastMessageAt: new Date(),
        lastMessagePreview: llmResponse.text.substring(0, 100),
      });

      // Log audit entry for the complete operation
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

      // Notify websocket for real-time update (use first message ID)
      const firstMessage = sentMessages[0];
      websocketService.notifyAgentReply(brand.id, {
        messageId: firstMessage.id,
        conversationId: conversation.id,
        originalMessageId: message.id,
        reply: llmResponse.text,
        platform: message.platform,
        isAutoReply: true,
      });

      log(`${logPrefix} Auto-reply sent successfully (${sentMessages.length} part(s))`, "sync");

      // Trigger async summary update for this user (Phase 2: Persistent Memory)
      if (message.conversationId && message.author) {
        triggerSummaryUpdateAsync(message.conversationId, message.author);
      }

      return {
        success: true,
        messageId: firstMessage.id,
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
