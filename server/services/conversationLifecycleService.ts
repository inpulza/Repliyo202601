import { storage } from "../storage";
import { 
  type Conversation, 
  type ConversationStatus, 
  type ClosedBy,
  type ConversationClosingSummary,
  type MessageAnalysis
} from "@shared/schema";

export interface IConversationLifecycleService {
  markAsOpen(conversationId: string, agentId?: string): Promise<Conversation | undefined>;
  markAsPending(conversationId: string, reason?: string): Promise<Conversation | undefined>;
  markAsSolved(conversationId: string, closedBy: ClosedBy, userId?: string): Promise<Conversation | undefined>;
  markAsClosed(conversationId: string): Promise<Conversation | undefined>;
  
  reopenConversation(conversationId: string, reason?: string): Promise<Conversation | undefined>;
  
  assignToUser(conversationId: string, userId: string): Promise<Conversation | undefined>;
  unassign(conversationId: string): Promise<Conversation | undefined>;
  
  recordFirstResponse(conversationId: string): Promise<Conversation | undefined>;
  recordCustomerMessage(conversationId: string): Promise<Conversation | undefined>;
  
  closeWithSummary(
    conversationId: string, 
    summary: ConversationClosingSummary,
    closedBy: ClosedBy,
    userId?: string
  ): Promise<Conversation | undefined>;
  
  shouldReopenOnMessage(conversation: Conversation, messageAnalysis: MessageAnalysis): boolean;
  
  processAutoClose(brandId: string): Promise<{ closed: number; errors: string[] }>;
  processSolvedToClosedTransitions(brandId: string): Promise<{ transitioned: number; errors: string[] }>;
}

export class ConversationLifecycleService implements IConversationLifecycleService {
  
  private async logStatusChange(
    conversationId: string,
    previousStatus: string | null,
    newStatus: ConversationStatus,
    changedBy: ClosedBy,
    userId?: string,
    reason?: string
  ): Promise<void> {
    await storage.createConversationStatusHistory({
      conversationId,
      previousStatus,
      newStatus,
      changedBy,
      changedByUserId: userId || null,
      reason: reason || null,
    });
  }

  async markAsOpen(conversationId: string, agentId?: string): Promise<Conversation | undefined> {
    const conversation = await storage.getConversation(conversationId);
    if (!conversation) return undefined;
    
    const previousStatus = conversation.status;
    const updated = await storage.updateConversationStatus(conversationId, 'open');
    
    if (updated) {
      await this.logStatusChange(
        conversationId,
        previousStatus,
        'open',
        agentId ? 'agent' : 'bot',
        agentId,
        'Conversation opened'
      );
    }
    
    return updated;
  }

  async markAsPending(conversationId: string, reason?: string): Promise<Conversation | undefined> {
    const conversation = await storage.getConversation(conversationId);
    if (!conversation) return undefined;
    
    const previousStatus = conversation.status;
    const updated = await storage.updateConversationStatus(conversationId, 'pending');
    
    if (updated) {
      await this.logStatusChange(
        conversationId,
        previousStatus,
        'pending',
        'bot',
        undefined,
        reason || 'Awaiting customer response'
      );
    }
    
    return updated;
  }

  async markAsSolved(conversationId: string, closedBy: ClosedBy, userId?: string): Promise<Conversation | undefined> {
    const conversation = await storage.getConversation(conversationId);
    if (!conversation) return undefined;
    
    const previousStatus = conversation.status;
    const updated = await storage.updateConversationStatus(conversationId, 'solved', closedBy, userId);
    
    if (updated) {
      await this.logStatusChange(
        conversationId,
        previousStatus,
        'solved',
        closedBy,
        userId,
        `Marked as solved by ${closedBy}`
      );
    }
    
    return updated;
  }

  async markAsClosed(conversationId: string): Promise<Conversation | undefined> {
    const conversation = await storage.getConversation(conversationId);
    if (!conversation) return undefined;
    
    if (conversation.status === 'closed') {
      return conversation;
    }
    
    const previousStatus = conversation.status;
    const updated = await storage.updateConversationStatus(conversationId, 'closed', 'auto');
    
    if (updated) {
      await this.logStatusChange(
        conversationId,
        previousStatus,
        'closed',
        'auto',
        undefined,
        'Auto-closed after grace period'
      );
    }
    
    return updated;
  }

  async reopenConversation(conversationId: string, reason?: string): Promise<Conversation | undefined> {
    const conversation = await storage.getConversation(conversationId);
    if (!conversation) return undefined;
    
    if (conversation.status === 'closed') {
      console.log(`[Lifecycle] Cannot reopen closed conversation ${conversationId}`);
      return undefined;
    }
    
    const previousStatus = conversation.status;
    await storage.incrementReopenCount(conversationId);
    const updated = await storage.updateConversationStatus(conversationId, 'open');
    
    if (updated) {
      await this.logStatusChange(
        conversationId,
        previousStatus,
        'open',
        'customer',
        undefined,
        reason || 'Reopened by customer message'
      );
    }
    
    return updated;
  }

  async assignToUser(conversationId: string, userId: string): Promise<Conversation | undefined> {
    const conversation = await storage.getConversation(conversationId);
    if (!conversation) return undefined;
    
    await storage.updateConversationAssignment(conversationId, userId);
    
    await storage.updateConversationAiActive(conversationId, false);
    console.log(`[Lifecycle] AI disabled for conversation ${conversationId} - assigned to human agent ${userId}`);
    
    const updated = await storage.getConversation(conversationId);
    
    if (updated) {
      await this.logStatusChange(
        conversationId,
        conversation.status,
        conversation.status as ConversationStatus,
        'agent',
        userId,
        `Assigned to agent ${userId} - AI assistance disabled`
      );
    }
    
    return updated;
  }

  async unassign(conversationId: string): Promise<Conversation | undefined> {
    const conversation = await storage.getConversation(conversationId);
    if (!conversation) return undefined;
    
    await storage.updateConversationAssignment(conversationId, null);
    
    await storage.updateConversationAiActive(conversationId, true);
    console.log(`[Lifecycle] AI re-enabled for conversation ${conversationId} - unassigned from human agent`);
    
    const updated = await storage.getConversation(conversationId);
    
    if (updated) {
      await this.logStatusChange(
        conversationId,
        conversation.status,
        conversation.status as ConversationStatus,
        'agent',
        undefined,
        'Unassigned from agent - AI assistance re-enabled'
      );
    }
    
    return updated;
  }

  async recordFirstResponse(conversationId: string): Promise<Conversation | undefined> {
    return await storage.setFirstResponseAt(conversationId);
  }

  async recordCustomerMessage(conversationId: string): Promise<Conversation | undefined> {
    return await storage.updateLastCustomerMessageAt(conversationId);
  }

  async closeWithSummary(
    conversationId: string,
    summary: ConversationClosingSummary,
    closedBy: ClosedBy,
    userId?: string
  ): Promise<Conversation | undefined> {
    const conversation = await storage.getConversation(conversationId);
    if (!conversation) return undefined;
    
    await storage.updateClosingSummary(
      conversationId,
      summary.summary,
      summary.sentiment,
      summary.intent,
      summary.resolution
    );
    
    return await this.markAsSolved(conversationId, closedBy, userId);
  }

  shouldReopenOnMessage(conversation: Conversation, messageAnalysis: MessageAnalysis): boolean {
    if (conversation.status === 'closed') {
      return false;
    }
    
    if (conversation.status !== 'solved') {
      return false;
    }
    
    if (messageAnalysis.hasQuestion || messageAnalysis.hasNewRequest) {
      return true;
    }
    
    if (messageAnalysis.isThankYou && messageAnalysis.confidence >= 0.8) {
      return false;
    }
    
    return true;
  }

  async processAutoClose(brandId: string): Promise<{ closed: number; errors: string[] }> {
    const settings = await storage.getBrandLifecycleSettings(brandId);
    const inactivityHours = settings?.autoCloseInactivityHours || 72;
    
    const inactiveConversations = await storage.getInactiveConversationsForAutoClose(brandId, inactivityHours);
    
    let closed = 0;
    const errors: string[] = [];
    
    for (const conversation of inactiveConversations) {
      try {
        await this.markAsSolved(conversation.id, 'auto');
        closed++;
      } catch (error) {
        errors.push(`Failed to auto-close conversation ${conversation.id}: ${error}`);
      }
    }
    
    console.log(`[Lifecycle] Auto-close for brand ${brandId}: ${closed} conversations marked as solved`);
    return { closed, errors };
  }

  async processSolvedToClosedTransitions(brandId: string): Promise<{ transitioned: number; errors: string[] }> {
    const settings = await storage.getBrandLifecycleSettings(brandId);
    const graceHours = settings?.solvedToClosedHours || 24;
    
    const solvedConversations = await storage.getSolvedConversationsReadyForClose(brandId, graceHours);
    
    let transitioned = 0;
    const errors: string[] = [];
    
    for (const conversation of solvedConversations) {
      try {
        await this.markAsClosed(conversation.id);
        transitioned++;
      } catch (error) {
        errors.push(`Failed to close conversation ${conversation.id}: ${error}`);
      }
    }
    
    console.log(`[Lifecycle] Solved→Closed for brand ${brandId}: ${transitioned} conversations closed`);
    return { transitioned, errors };
  }
}

export const conversationLifecycleService = new ConversationLifecycleService();
