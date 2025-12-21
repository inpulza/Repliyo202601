import { log } from "../app";
import type { Message, Conversation, Brand } from "@shared/schema";

interface BufferedMessage {
  message: Message;
  conversation: Conversation;
  brand: Brand;
  receivedAt: number;
}

interface BufferEntry {
  messages: BufferedMessage[];
  timer: NodeJS.Timeout | null;
  processingCallback: (messages: BufferedMessage[]) => Promise<void>;
}

class DmBufferService {
  private buffers: Map<string, BufferEntry> = new Map();
  private defaultDelayMs: number = 15000;

  private getBufferKey(conversationId: string): string {
    return conversationId;
  }

  async bufferMessage(
    message: Message,
    conversation: Conversation,
    brand: Brand,
    processCallback: (messages: BufferedMessage[]) => Promise<void>,
    delayMs?: number
  ): Promise<void> {
    const key = this.getBufferKey(conversation.id);
    const delay = delayMs || this.defaultDelayMs;

    log(`[DmBuffer] Buffering DM from ${message.author} in conversation ${conversation.id}`, "sync");

    const existingEntry = this.buffers.get(key);

    if (existingEntry) {
      if (existingEntry.timer) {
        clearTimeout(existingEntry.timer);
        log(`[DmBuffer] Timer reset for conversation ${conversation.id}`, "sync");
      }

      existingEntry.messages.push({
        message,
        conversation,
        brand,
        receivedAt: Date.now(),
      });

      existingEntry.timer = setTimeout(() => {
        this.flushBuffer(key);
      }, delay);
    } else {
      const newEntry: BufferEntry = {
        messages: [{
          message,
          conversation,
          brand,
          receivedAt: Date.now(),
        }],
        timer: setTimeout(() => {
          this.flushBuffer(key);
        }, delay),
        processingCallback: processCallback,
      };

      this.buffers.set(key, newEntry);
      log(`[DmBuffer] New buffer created for conversation ${conversation.id}, waiting ${delay}ms`, "sync");
    }
  }

  private async flushBuffer(key: string): Promise<void> {
    const entry = this.buffers.get(key);
    
    if (!entry) {
      log(`[DmBuffer] No buffer found for key ${key}`, "sync");
      return;
    }

    if (entry.messages.length === 0) {
      this.buffers.delete(key);
      return;
    }

    log(`[DmBuffer] Flushing ${entry.messages.length} messages for conversation ${key}`, "sync");

    const messages = [...entry.messages];
    const callback = entry.processingCallback;

    this.buffers.delete(key);

    try {
      await callback(messages);
    } catch (error) {
      log(`[DmBuffer] Error processing buffered messages: ${error}`, "sync");
    }
  }

  cancelBuffer(conversationId: string): void {
    const key = this.getBufferKey(conversationId);
    const entry = this.buffers.get(key);

    if (entry) {
      if (entry.timer) {
        clearTimeout(entry.timer);
      }
      this.buffers.delete(key);
      log(`[DmBuffer] Buffer cancelled for conversation ${conversationId}`, "sync");
    }
  }

  getBufferStatus(conversationId: string): { 
    isBuffering: boolean; 
    messageCount: number; 
    oldestMessageAge?: number 
  } {
    const key = this.getBufferKey(conversationId);
    const entry = this.buffers.get(key);

    if (!entry) {
      return { isBuffering: false, messageCount: 0 };
    }

    const oldestMessage = entry.messages[0];
    const oldestMessageAge = oldestMessage 
      ? Math.floor((Date.now() - oldestMessage.receivedAt) / 1000)
      : undefined;

    return {
      isBuffering: true,
      messageCount: entry.messages.length,
      oldestMessageAge,
    };
  }

  clearAllBuffers(): void {
    this.buffers.forEach((entry) => {
      if (entry.timer) {
        clearTimeout(entry.timer);
      }
    });
    this.buffers.clear();
    log(`[DmBuffer] All buffers cleared`, "sync");
  }
}

export const dmBufferService = new DmBufferService();
export type { BufferedMessage };
