import { storage } from "../storage";
import { createLLMProvider } from "./llm/factory";
import { MetricoolService } from "./metricool";
import { 
  type Conversation, 
  type ReminderRules,
  type ReminderEvent,
  type CrmContact,
  type ReminderStatus
} from "@shared/schema";

const DEFAULT_REMINDER_PROMPT = `Eres un asistente de seguimiento amigable. Tu objetivo es enviar un mensaje breve y cortés para retomar la conversación con el cliente.

Contexto de la conversación:
{conversation_context}

Información del cliente:
- Nombre: {customer_name}
- Canal: {channel}
- Último mensaje hace: {time_since_last}

Este es el recordatorio número {reminder_number} de máximo {max_reminders}.

Genera un mensaje de seguimiento que:
1. Sea breve (máximo 2-3 oraciones)
2. Sea amigable y no invasivo
3. Haga referencia sutil al tema de la conversación si es posible
4. Invite al cliente a continuar si tiene preguntas o necesita ayuda
5. NO menciones que es un recordatorio automatizado
6. Adapta el tono al canal (DM más personal, comentario más público)

Responde SOLO con el mensaje de seguimiento, sin explicaciones ni formato JSON.`;

export interface ReminderGenerationResult {
  success: boolean;
  content?: string;
  error?: string;
}

export interface ReminderProcessingResult {
  brandId: string;
  scheduled: number;
  sent: number;
  errors: string[];
}

export interface IReminderService {
  scheduleRemindersForBrand(brandId: string): Promise<{ scheduled: number; errors: string[] }>;
  
  sendScheduledReminders(brandId: string): Promise<{ sent: number; errors: string[] }>;
  
  generateReminderContent(
    conversation: Conversation,
    reminderNumber: number,
    rules: ReminderRules
  ): Promise<ReminderGenerationResult>;
  
  optOutContact(contactId: string): Promise<CrmContact | undefined>;
  optInContact(contactId: string): Promise<CrmContact | undefined>;
  
  getConversationReminderHistory(conversationId: string): Promise<ReminderEvent[]>;
  getContactReminderHistory(contactId: string): Promise<ReminderEvent[]>;
}

export class ReminderService implements IReminderService {
  private secrets = {
    openaiApiKey: process.env.OPENAI_API_KEY,
    geminiApiKey: process.env.GEMINI_API_KEY,
  };

  async scheduleRemindersForBrand(brandId: string): Promise<{ scheduled: number; errors: string[] }> {
    const result = { scheduled: 0, errors: [] as string[] };

    try {
      const rules = await storage.getReminderRules(brandId);
      
      if (!rules || !rules.enabled) {
        console.log(`[ReminderService] Reminders disabled for brand ${brandId}`);
        return result;
      }

      const dailyCount = await storage.countRemindersScheduledAndSentToday(brandId);
      const dailyCap = rules.dailyBrandCap || 50;
      if (dailyCount >= dailyCap) {
        console.log(`[ReminderService] Daily limit reached for brand ${brandId}: ${dailyCount}/${dailyCap}`);
        return result;
      }

      const types = this.getEnabledTypes(rules);
      if (types.length === 0) {
        console.log(`[ReminderService] No conversation types enabled for brand ${brandId}`);
        return result;
      }

      let remainingQuota = dailyCap - dailyCount;
      const maxReminders = rules.maxReminders || 2;

      // Process each reminder level with its specific delay
      for (let reminderNum = 1; reminderNum <= maxReminders && remainingQuota > 0; reminderNum++) {
        const delayHours = this.getDelayForReminderNumber(rules, reminderNum);
        
        const eligibleConversations = await storage.getConversationsEligibleForReminder(
          brandId,
          delayHours,
          maxReminders,
          types,
          reminderNum // Pass specific reminder number
        );

        console.log(`[ReminderService] Found ${eligibleConversations.length} conversations eligible for reminder #${reminderNum} (delay: ${delayHours}h)`);

        const toProcess = eligibleConversations.slice(0, remainingQuota);

        for (const conversation of toProcess) {
          try {
            const scheduleResult = await this.scheduleReminder(conversation, rules);
            if (scheduleResult.scheduled) {
              result.scheduled++;
              remainingQuota--;
            }
          } catch (error) {
            const errMsg = `Failed to schedule reminder for conversation ${conversation.id}: ${error}`;
            console.error(`[ReminderService] ${errMsg}`);
            result.errors.push(errMsg);
          }
        }
      }

      console.log(`[ReminderService] Total scheduled for brand ${brandId}: ${result.scheduled}`);

    } catch (error) {
      const errMsg = `Error scheduling reminders for brand ${brandId}: ${error}`;
      console.error(`[ReminderService] ${errMsg}`);
      result.errors.push(errMsg);
    }

    return result;
  }

  private getEnabledTypes(rules: ReminderRules): string[] {
    const types: string[] = [];
    if (rules.applyToDms !== false) types.push('dm');
    if (rules.applyToComments) types.push('comment');
    return types;
  }

  private getDelayForReminderNumber(rules: ReminderRules, reminderNumber: number): number {
    if (reminderNumber === 1) {
      return rules.delayHours1 || 24;
    }
    return rules.delayHours2 || 48;
  }

  async generateReminderContent(
    conversation: Conversation,
    reminderNumber: number,
    rules: ReminderRules
  ): Promise<ReminderGenerationResult> {
    try {
      if (!rules.useAiContent && rules.templateText) {
        return {
          success: true,
          content: this.applyTemplate(rules.templateText, conversation),
        };
      }

      const agent = await storage.getAiAgentByBrand(conversation.brandId);
      if (!agent) {
        if (rules.templateText) {
          return {
            success: true,
            content: this.applyTemplate(rules.templateText, conversation),
          };
        }
        return { 
          success: false, 
          error: 'No AI agent configured and no template available' 
        };
      }

      const messages = await storage.getMessagesByConversation(conversation.id);
      const recentMessages = messages.slice(-10);
      
      const conversationContext = recentMessages
        .map(m => {
          const role = m.direction === 'inbound' ? 'Cliente' : 'Agente';
          return `${role}: ${m.content}`;
        })
        .join('\n');

      let customerName = 'Cliente';
      if (conversation.contactId) {
        const contact = await storage.getCrmContact(conversation.contactId);
        if (contact) {
          customerName = contact.displayName || contact.firstName || 'Cliente';
        }
      }

      const lastMessageAt = conversation.lastCustomerMessageAt || conversation.lastMessageAt;
      const timeSince = this.formatTimeSince(lastMessageAt);

      const prompt = DEFAULT_REMINDER_PROMPT
        .replace('{conversation_context}', conversationContext || 'Sin contexto previo')
        .replace('{customer_name}', customerName)
        .replace('{channel}', conversation.type || 'dm')
        .replace('{time_since_last}', timeSince)
        .replace('{reminder_number}', String(reminderNumber))
        .replace('{max_reminders}', String(rules.maxReminders || 2));

      const provider = createLLMProvider(agent, this.secrets);
      const response = await provider.generateRawCompletion(
        'Eres un asistente de servicio al cliente que genera mensajes de seguimiento personalizados.',
        prompt,
        { temperature: 0.7, maxTokens: 200 }
      );

      return {
        success: true,
        content: response.text.trim(),
      };
    } catch (error) {
      console.error(`[ReminderService] Error generating reminder content: ${error}`);
      return {
        success: false,
        error: String(error),
      };
    }
  }

  private applyTemplate(template: string, conversation: Conversation): string {
    return template
      .replace('{name}', conversation.customerName || 'Cliente')
      .replace('{lastTopic}', conversation.closingIntent || 'tu consulta')
      .replace('{serviceInterest}', 'nuestros servicios');
  }

  private formatTimeSince(date: Date | null): string {
    if (!date) return 'tiempo desconocido';
    
    const now = new Date();
    const diffMs = now.getTime() - new Date(date).getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffHours / 24);
    
    if (diffDays > 0) {
      return `${diffDays} día${diffDays > 1 ? 's' : ''}`;
    }
    return `${diffHours} hora${diffHours !== 1 ? 's' : ''}`;
  }

  private async scheduleReminder(
    conversation: Conversation,
    rules: ReminderRules
  ): Promise<{ scheduled: boolean; terminal: boolean }> {
    const maxReminders = rules.maxReminders || 2;

    const precheck = await storage.checkConversationEligibleForReminder(
      conversation.id,
      maxReminders
    );

    if (!precheck.eligible) {
      const isTerminal = precheck.reason === 'max_reached' || 
                         precheck.reason === 'opted_out' || 
                         precheck.reason === 'not_found' || 
                         precheck.reason === 'closed';
      console.log(`[ReminderService] Conversation ${conversation.id} not eligible for reminder: ${precheck.reason}`);
      return { scheduled: false, terminal: isTerminal };
    }

    const nextReminderNumber = (precheck.currentReminderCount || 0) + 1;

    const generation = await this.generateReminderContent(
      conversation,
      nextReminderNumber,
      rules
    );

    if (!generation.success || !generation.content) {
      console.error(`[ReminderService] Failed to generate content for ${conversation.id}: ${generation.error}`);
      return { scheduled: false, terminal: false };
    }

    const delayHours = this.getDelayForReminderNumber(rules, nextReminderNumber);
    const baseTime = conversation.lastReminderAt || conversation.lastCustomerMessageAt || conversation.lastMessageAt || new Date();
    const scheduledAt = new Date(new Date(baseTime).getTime() + delayHours * 60 * 60 * 1000);

    const result = await storage.scheduleReminderAtomic(
      conversation.id,
      {
        brandId: conversation.brandId,
        conversationId: conversation.id,
        contactId: conversation.contactId || null,
        status: 'scheduled',
        scheduledAt,
        content: generation.content,
        contentSource: rules.useAiContent !== false ? 'ai' : 'template',
        reminderNumber: nextReminderNumber,
        deliveryChannel: conversation.type || 'dm',
      },
      'scheduled' as ReminderStatus,
      maxReminders
    );

    switch (result.status) {
      case 'scheduled':
        console.log(`[ReminderService] Scheduled reminder ${result.event?.reminderNumber} for conversation ${conversation.id}, will send at ${scheduledAt.toISOString()}`);
        return { scheduled: true, terminal: false };
      
      case 'max_reached':
        console.log(`[ReminderService] Max reminders reached for conversation ${conversation.id}`);
        return { scheduled: false, terminal: true };
      
      case 'already_scheduled':
      case 'duplicate':
        console.log(`[ReminderService] Reminder already scheduled for conversation ${conversation.id}, skipping`);
        return { scheduled: false, terminal: false };
      
      case 'opted_out':
        console.log(`[ReminderService] Conversation ${conversation.id} is opted out`);
        return { scheduled: false, terminal: true };
      
      case 'not_found':
        console.error(`[ReminderService] Conversation ${conversation.id} not found`);
        return { scheduled: false, terminal: true };
      
      default:
        return { scheduled: false, terminal: false };
    }
  }

  async sendScheduledReminders(brandId: string): Promise<{ sent: number; errors: string[] }> {
    const result = { sent: 0, errors: [] as string[] };

    try {
      const readyReminders = await storage.getScheduledRemindersReady(brandId);
      console.log(`[ReminderService] Found ${readyReminders.length} reminders ready to send for brand ${brandId}`);

      for (const reminder of readyReminders) {
        try {
          const sendResult = await this.sendReminder(reminder);
          if (sendResult.success) {
            result.sent++;
          } else if (sendResult.error) {
            result.errors.push(`Reminder ${reminder.id}: ${sendResult.error}`);
          }
        } catch (error) {
          const errMsg = `Failed to send reminder ${reminder.id}: ${error}`;
          console.error(`[ReminderService] ${errMsg}`);
          result.errors.push(errMsg);
          
          await storage.updateReminderEventStatus(
            reminder.id,
            'failed',
            undefined,
            String(error)
          );
        }
      }
    } catch (error) {
      result.errors.push(`Error fetching scheduled reminders: ${error}`);
    }

    return result;
  }

  private async sendReminder(reminder: ReminderEvent): Promise<{ success: boolean; error?: string }> {
    if (!reminder.conversationId || !reminder.content) {
      const error = 'Invalid reminder data';
      console.error(`[ReminderService] ${error} for ${reminder.id}`);
      return { success: false, error };
    }

    const conversation = await storage.getConversation(reminder.conversationId);
    if (!conversation) {
      const error = 'Conversation not found';
      console.error(`[ReminderService] Conversation ${reminder.conversationId} not found`);
      await storage.updateReminderEventStatus(reminder.id, 'failed', undefined, error);
      return { success: false, error };
    }

    if (conversation.status === 'closed') {
      const error = 'Conversation closed';
      console.log(`[ReminderService] Conversation ${conversation.id} is closed, cancelling reminder`);
      await storage.updateReminderEventStatus(reminder.id, 'cancelled', undefined, error);
      return { success: false, error };
    }

    if (conversation.reminderStatus === 'opted_out') {
      const error = 'Contact opted out';
      console.log(`[ReminderService] Conversation ${conversation.id} is opted out, cancelling reminder`);
      await storage.updateReminderEventStatus(reminder.id, 'cancelled', undefined, error);
      return { success: false, error };
    }

    const brand = await storage.getBrand(conversation.brandId);
    if (!brand) {
      const error = 'Brand not found';
      console.error(`[ReminderService] Brand ${conversation.brandId} not found`);
      await storage.updateReminderEventStatus(reminder.id, 'failed', undefined, error);
      return { success: false, error };
    }

    const deliveryChannel = reminder.deliveryChannel || conversation.type || 'dm';

    // Validate required identifiers before attempting Metricool send
    if ((deliveryChannel === 'dm' || deliveryChannel === 'conversation') && 
        (!conversation.threadExternalId || !conversation.customerId)) {
      const error = 'Missing DM identifiers';
      console.error(`[ReminderService] ${error} for ${reminder.id}`);
      await storage.updateReminderEventStatus(reminder.id, 'failed', undefined, error);
      return { success: false, error };
    }
    
    // For comments, get the comment ID from the latest inbound message
    let commentObjectId: string | null = null;
    if (deliveryChannel === 'comment') {
      const messages = await storage.getMessagesByConversation(conversation.id);
      const latestInbound = messages
        .filter(m => m.direction === 'inbound')
        .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())[0];
      
      commentObjectId = latestInbound?.metricoolId || null;
      
      if (!commentObjectId) {
        const error = 'Missing comment identifiers (no metricoolId in messages)';
        console.error(`[ReminderService] ${error} for ${reminder.id}`);
        await storage.updateReminderEventStatus(reminder.id, 'failed', undefined, error);
        return { success: false, error };
      }
    }

    // Send via Metricool
    let sendResult: { success: boolean; messageId?: string; error?: string; rawResponse?: any };
    
    try {
      const metricoolService = new MetricoolService({
        userToken: brand.metricoolToken,
        userId: brand.metricoolUserId,
      });
      
      if (deliveryChannel === 'dm' || deliveryChannel === 'conversation') {
        sendResult = await metricoolService.replyToConversation({
          provider: conversation.platform,
          conversationId: conversation.threadExternalId!,
          recipient: conversation.customerId!,
          text: reminder.content,
          blogId: brand.metricoolBlogId || '',
        });
      } else if (deliveryChannel === 'comment') {
        sendResult = await metricoolService.replyToComment({
          provider: conversation.platform,
          objectId: commentObjectId!,
          text: reminder.content,
          blogId: brand.metricoolBlogId || '',
        });
      } else {
        const error = `Unsupported channel: ${deliveryChannel}`;
        console.error(`[ReminderService] ${error}`);
        await storage.updateReminderEventStatus(reminder.id, 'failed', undefined, error);
        return { success: false, error };
      }
      
      if (!sendResult.success) {
        const error = sendResult.error || 'Metricool send failed';
        console.error(`[ReminderService] Metricool send failed: ${error}`);
        await storage.updateReminderEventStatus(reminder.id, 'failed', undefined, error);
        return { success: false, error };
      }
    } catch (error) {
      const errorMsg = String(error);
      console.error(`[ReminderService] Error sending via Metricool:`, error);
      await storage.updateReminderEventStatus(reminder.id, 'failed', undefined, errorMsg);
      return { success: false, error: errorMsg };
    }

    // Message sent successfully via Metricool - persist to database
    // If this fails, we log but still report success since message was delivered
    try {
      const sendTime = new Date();
      
      await storage.createMessage({
        conversationId: conversation.id,
        brandId: conversation.brandId,
        platform: conversation.platform,
        type: deliveryChannel,
        direction: 'outbound',
        author: brand.name,
        authorAvatar: null,
        content: reminder.content,
        timestamp: sendTime,
        status: 'sent',
        source: 'reminder_service',
        internalOrigin: 'reminder',
        metricoolId: sendResult.messageId || null,
        rawData: {
          isReminder: true,
          reminderNumber: reminder.reminderNumber,
          reminderEventId: reminder.id,
          metricoolResponse: sendResult.rawResponse,
        },
      });

      await storage.updateReminderEventStatus(reminder.id, 'sent', sendTime);

      await storage.updateConversation(conversation.id, {
        lastMessageAt: sendTime,
        lastReminderAt: sendTime,
        reminderStatus: 'sent' as ReminderStatus,
      });

      if (conversation.contactId) {
        await storage.updateContactReminderCount(conversation.contactId);
      }
    } catch (dbError) {
      // Message was sent via Metricool but DB update failed
      // Log the issue but don't return failure since customer received the message
      console.error(`[ReminderService] DB update failed after Metricool send for ${reminder.id}:`, dbError);
      // Still try to mark the reminder as sent to prevent duplicate sends
      try {
        await storage.updateReminderEventStatus(reminder.id, 'sent', new Date(), `DB error: ${dbError}`);
      } catch (e) {
        console.error(`[ReminderService] Failed to update reminder status after DB error:`, e);
      }
    }

    console.log(`[ReminderService] Sent reminder ${reminder.reminderNumber} for conversation ${conversation.id} via Metricool`);
    return { success: true };
  }

  async optOutContact(contactId: string): Promise<CrmContact | undefined> {
    const contact = await storage.updateContactOptOutReminders(contactId, true);
    
    if (contact) {
      const convos = await storage.getCrmContactConversations(contactId);
      for (const convo of convos) {
        await storage.updateConversationReminderStatus(
          convo.id,
          'opted_out' as ReminderStatus
        );
      }
    }
    
    return contact;
  }

  async optInContact(contactId: string): Promise<CrmContact | undefined> {
    const contact = await storage.updateContactOptOutReminders(contactId, false);
    
    if (contact) {
      const convos = await storage.getCrmContactConversations(contactId);
      for (const convo of convos) {
        if (convo.reminderStatus === 'opted_out') {
          await storage.updateConversationReminderStatus(
            convo.id,
            'none' as ReminderStatus
          );
        }
      }
    }
    
    return contact;
  }

  async getConversationReminderHistory(conversationId: string): Promise<ReminderEvent[]> {
    return storage.getReminderEventsByConversation(conversationId);
  }

  async getContactReminderHistory(contactId: string): Promise<ReminderEvent[]> {
    return storage.getReminderEventsByContact(contactId);
  }
}

export const reminderService = new ReminderService();
