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
  
  // Lock mechanism to prevent race conditions when multiple messages arrive simultaneously
  private locks: Map<string, Promise<void>> = new Map();

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
    
    // Use lock to prevent race conditions when multiple messages arrive simultaneously
    const existingLock = this.locks.get(key);
    if (existingLock) {
      log(`[DmBuffer] 🔒 WAITING_FOR_LOCK - msgId: ${message.id}, convId: ${conversation.id}`, "sync");
      await existingLock;
    }
    
    // Create a new lock for this operation
    let unlockResolve: () => void;
    const lockPromise = new Promise<void>(resolve => {
      unlockResolve = resolve;
    });
    this.locks.set(key, lockPromise);
    
    try {
      const delay = delayMs || this.defaultDelayMs;
      const activeBufferCount = this.buffers.size;

      log(`[DmBuffer] 🟡 BUFFER_ENTRY - author: ${message.author}, msgId: ${message.id}, convId: ${conversation.id}, delay: ${delay}ms, activeBuffers: ${activeBufferCount}`, "sync");

      const existingEntry = this.buffers.get(key);

      if (existingEntry) {
        if (existingEntry.timer) {
          clearTimeout(existingEntry.timer);
        }

        existingEntry.messages.push({
          message,
          conversation,
          brand,
          receivedAt: Date.now(),
        });

        log(`[DmBuffer] 🔵 ADDED_TO_EXISTING - convId: ${conversation.id}, totalMsgs: ${existingEntry.messages.length}, resetting timer to ${delay}ms`, "sync");

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
        log(`[DmBuffer] 🟢 NEW_BUFFER - convId: ${conversation.id}, waiting ${delay}ms before processing`, "sync");
      }
    } finally {
      // Release the lock
      this.locks.delete(key);
      unlockResolve!();
    }
  }

  private async flushBuffer(key: string): Promise<void> {
    const entry = this.buffers.get(key);
    
    if (!entry) {
      log(`[DmBuffer] ❌ FLUSH_SKIP - No buffer found for key ${key}`, "sync");
      return;
    }

    if (entry.messages.length === 0) {
      this.buffers.delete(key);
      log(`[DmBuffer] ❌ FLUSH_SKIP - Empty buffer for key ${key}`, "sync");
      return;
    }

    const authors = entry.messages.map(m => m.message.author).join(', ');
    log(`[DmBuffer] 🚀 FLUSH_START - convId: ${key}, msgCount: ${entry.messages.length}, authors: ${authors}`, "sync");

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
