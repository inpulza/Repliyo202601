import { storage } from "../storage";
import { createLLMProvider } from "./llm/factory";
import { composeReminderPrompt, filterHistoryByAuthor } from "./llm/prompt-composer";
import { MetricoolService } from "./metricool";
import { 
  type Conversation, 
  type ReminderRules,
  type ReminderEvent,
  type CrmContact,
  type ReminderStatus,
  type Message
} from "@shared/schema";

type ThreadSelectionMethod = 'parentMessageId' | 'legacy_single_author' | 'ineligible_ambiguous' | 'ineligible_no_metadata' | 'ineligible_delay_not_met' | 'dm';

interface ReminderContext {
  customerName: string;
  channel: string;
  timeSinceLastMessage: string;
  recentMessages: string;
  conversationSummary: string | null;
  closingIntent: string | null;
  crmProfile: {
    lifecycleStage: string | null;
    status: string | null;
    serviceInterest: string | null;
    intent: string | null;
    budget: string | null;
    qualifiers: string | null;
    preferredChannel: string | null;
  } | null;
  otherConversationsSummary: string | null;
  lastInboundMessage: {
    id: string;
    metricoolId: string | null;
    author: string;
    content: string | null;
    timestamp: Date | null;
    rawData: Record<string, any> | null;
  } | null;
  selectedOutboundMessage: {
    id: string;
    timestamp: Date | null;
  } | null;
  threadSelectionMethod: ThreadSelectionMethod;
}

// NOTA: El prompt de reminders ahora se genera con composeReminderPrompt() en prompt-composer.ts
// Las instrucciones vienen del systemPrompt/guardrails configurados por el admin
// Variables disponibles: {{interaction_mode}}, {{reminder_number}}, {{max_reminders}}, {{time_since_last_message}}

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
            const scheduleResult = await this.scheduleReminder(conversation, rules, delayHours);
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
      console.log(`[ReminderService] Looking for agent for brand ${conversation.brandId}, found: ${agent?.id || 'null'}`);
      if (!agent) {
        console.log(`[ReminderService] No agent found for brand ${conversation.brandId}, templateText available: ${!!rules.templateText}`);
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

      const brand = await storage.getBrand(conversation.brandId);
      
      // ========== FASE A: CONTEXTO ENRIQUECIDO ==========
      
      // A2: Aumentar historial de 8→20 mensajes para DMs
      const allMessages = await storage.getMessagesByConversation(conversation.id);
      const isDm = conversation.type === 'conversation' || conversation.type === 'dm';
      
      // Usar 20 mensajes para DMs, 10 para comentarios (filtrados por autor)
      let conversationHistory: Message[];
      if (isDm) {
        conversationHistory = allMessages.slice(-20);
      } else {
        // Para comentarios, filtrar por autor del último mensaje inbound
        const lastInbound = [...allMessages].reverse().find(m => m.direction === 'inbound');
        if (lastInbound) {
          conversationHistory = filterHistoryByAuthor(allMessages, lastInbound, 'comment');
        } else {
          conversationHistory = allMessages.slice(-10);
        }
      }
      
      // A4: Obtener resumen persistente (userSummary) para DMs
      let userSummary = null;
      if (isDm) {
        const lastInbound = [...allMessages].reverse().find(m => m.direction === 'inbound');
        if (lastInbound?.author) {
          userSummary = await storage.getConversationUserSummary(conversation.id, lastInbound.author);
          if (userSummary) {
            console.log(`[ReminderService] Found persistent summary for user ${lastInbound.author}`);
          }
        }
      }
      
      // A5: Obtener contexto del video/post para comentarios
      let socialPost = null;
      if (!isDm && conversation.socialPostId) {
        socialPost = await storage.getSocialPost(conversation.socialPostId);
        if (socialPost?.caption) {
          console.log(`[ReminderService] Found post context: "${socialPost.caption.substring(0, 80)}..."`);
        }
      }
      
      // Obtener contexto adicional del cliente
      const context = await this.assembleReminderContext(conversation);
      
      // ========== A1/A3: USAR composeReminderPrompt ==========
      // Incluye agent.systemPrompt, agent.guardrailPrompt, agent.knowledgeBase
      
      const { systemPrompt, userPrompt } = composeReminderPrompt({
        agent,
        brand: brand || undefined,
        conversation,
        conversationHistory,
        userSummary,
        socialPost,
        reminderNumber,
        maxReminders: rules.maxReminders || 2,
        customerName: context.customerName,
        timeSinceLastMessage: context.timeSinceLastMessage,
        crmProfile: context.crmProfile ? {
          lifecycleStage: context.crmProfile.lifecycleStage,
          status: context.crmProfile.status,
          serviceInterest: context.crmProfile.serviceInterest,
          intent: context.crmProfile.intent,
          preferredChannel: context.crmProfile.preferredChannel,
        } : null,
      });

      const provider = createLLMProvider(agent, this.secrets);
      const response = await provider.generateRawCompletion(
        systemPrompt,
        userPrompt,
        { temperature: 0.7, maxTokens: 150 }
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

  private async assembleReminderContext(conversation: Conversation, delayHours?: number): Promise<ReminderContext> {
    const messages = await storage.getMessagesByConversation(conversation.id);
    const recentMessages = messages.slice(-8);
    
    const recentMessagesText = recentMessages
      .map(m => {
        const role = m.direction === 'inbound' ? 'Cliente' : 'Agente';
        const content = m.content?.substring(0, 150) || '[sin contenido]';
        return `${role}: ${content}${m.content && m.content.length > 150 ? '...' : ''}`;
      })
      .join('\n');

    // Calcular el cutoff time basado en delayHours (si se proporciona)
    const cutoffTime = delayHours 
      ? new Date(Date.now() - delayHours * 60 * 60 * 1000).getTime()
      : 0; // Si no hay delayHours, cualquier outbound es válido

    // IMPORTANTE: Para comentarios, necesitamos encontrar el hilo CORRECTO al que responder
    // El recordatorio debe ir al hilo donde: la marca respondió Y el cliente NO ha respondido después
    // Usamos parentMessageId para tracking PRECISO y DETERMINÍSTICO del hilo
    // Si no hay metadata determinística o hay ambigüedad, retornamos null para marcar como inelegible
    let lastInbound: Message | undefined;
    let selectedOutbound: Message | undefined;
    let threadSelectionMethod: 'parentMessageId' | 'legacy_single_author' | 'ineligible_ambiguous' | 'ineligible_no_metadata' | 'ineligible_delay_not_met' | 'dm' = 'dm';
    
    if (conversation.type === 'comment') {
      // Ordenar mensajes por timestamp
      const sortedMessages = [...messages].sort((a, b) => 
        new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
      );
      
      // Crear mapa de mensajes por ID para búsqueda rápida
      const messageById = new Map(messages.map(m => [m.id, m]));
      
      // ESTRATEGIA ÚNICA: Usar parentMessageId (DETERMINÍSTICA)
      // Solo procesamos si hay tracking preciso del hilo
      // IMPORTANTE: Ordenamos por timestamp ASCENDENTE para priorizar el hilo
      // que lleva MÁS TIEMPO sin respuesta (el que más necesita recordatorio)
      const outboundsWithParent = [...sortedMessages]
        .filter(m => m.direction === 'outbound' && m.parentMessageId);
        // Ya está ordenado ascendente por sortedMessages, NO invertimos
      
      if (outboundsWithParent.length > 0) {
        // Encontrar el outbound MÁS ANTIGUO que:
        // 1. Pasó el threshold de delay (cutoffTime)
        // 2. Su autor NO ha respondido después
        // Este es el que lleva más tiempo esperando y debería recibir el recordatorio primero
        for (const outbound of outboundsWithParent) {
          const parentInbound = messageById.get(outbound.parentMessageId!);
          if (!parentInbound || parentInbound.direction !== 'inbound') continue;
          
          const outboundTime = new Date(outbound.timestamp).getTime();
          const parentAuthor = parentInbound.author;
          
          // NUEVO: Validar que el outbound haya pasado el threshold de delay
          // El outbound debe ser más viejo que el cutoffTime
          if (cutoffTime > 0 && outboundTime > cutoffTime) {
            console.log(`[ReminderService] Skipping outbound ${outbound.id}: hasn't met delay threshold yet (outbound: ${new Date(outboundTime).toISOString()}, cutoff: ${new Date(cutoffTime).toISOString()})`);
            continue; // Este outbound aún no ha pasado el delay requerido
          }
          
          // Verificar si este autor ha respondido después de nuestro outbound
          const authorRepliedAfter = sortedMessages.some(m => 
            m.direction === 'inbound' && 
            m.author === parentAuthor &&
            new Date(m.timestamp).getTime() > outboundTime
          );
          
          if (!authorRepliedAfter) {
            // Este es el hilo correcto: respondimos a este usuario, pasó el delay, y no ha contestado
            lastInbound = parentInbound;
            selectedOutbound = outbound;
            threadSelectionMethod = 'parentMessageId';
            console.log(`[ReminderService] Comment thread (via parentMessageId): Target "${lastInbound.author}" from outbound at ${outbound.timestamp} (delay threshold met)`);
            break;
          }
        }
        
        // Si todos los outbounds no pasaron el delay, marcar como ineligible
        if (!lastInbound && outboundsWithParent.length > 0) {
          threadSelectionMethod = 'ineligible_delay_not_met';
          console.log(`[ReminderService] Comment thread INELIGIBLE: No outbound has met the delay threshold yet`);
        }
      } else {
        // Caso legacy: no hay outbounds con parentMessageId
        // Solo procesar si hay UN SOLO autor (determinístico)
        const lastOutbound = [...sortedMessages].reverse().find(m => m.direction === 'outbound');
        
        if (lastOutbound) {
          const outboundTime = new Date(lastOutbound.timestamp).getTime();
          
          // Buscar todos los inbounds antes del outbound
          const inboundsBefore = sortedMessages.filter(m => 
            m.direction === 'inbound' && 
            new Date(m.timestamp).getTime() < outboundTime
          );
          
          // Obtener autores únicos
          const uniqueAuthors = new Set(inboundsBefore.map(m => m.author));
          
          if (uniqueAuthors.size === 1 && inboundsBefore.length > 0) {
            // Solo un autor = determinístico
            lastInbound = inboundsBefore[inboundsBefore.length - 1];
            threadSelectionMethod = 'legacy_single_author';
            console.log(`[ReminderService] Comment thread (legacy single-author): Target "${lastInbound.author}"`);
          } else if (uniqueAuthors.size > 1) {
            // AMBIGÜEDAD: múltiples autores sin parentMessageId = INELEGIBLE
            threadSelectionMethod = 'ineligible_ambiguous';
            console.log(`[ReminderService] Comment thread INELIGIBLE: ${uniqueAuthors.size} authors without parentMessageId tracking. Authors: ${Array.from(uniqueAuthors).join(', ')}`);
          } else {
            threadSelectionMethod = 'ineligible_no_metadata';
            console.log(`[ReminderService] Comment thread INELIGIBLE: No inbound messages found before outbound`);
          }
        } else {
          threadSelectionMethod = 'ineligible_no_metadata';
          console.log(`[ReminderService] Comment thread INELIGIBLE: No outbound messages found`);
        }
      }
    } else {
      // Para DMs: usar el último inbound (comportamiento original)
      lastInbound = [...messages].reverse().find(m => m.direction === 'inbound');
      threadSelectionMethod = 'dm';
    }
    
    const lastInboundMessage: ReminderContext['lastInboundMessage'] = lastInbound ? {
      id: lastInbound.id,
      metricoolId: lastInbound.metricoolId || null,
      author: lastInbound.author || '',
      content: lastInbound.content || null,
      timestamp: lastInbound.timestamp || null,
      rawData: (lastInbound.rawData as Record<string, any>) || null,
    } : null;

    // IMPORTANTE: Para comentarios, el nombre del cliente DEBE venir del mismo mensaje
    // al que vamos a responder (lastInbound), NO del CRM ni de conversation.customerName
    // Esto asegura que el nombre y el hilo estén sincronizados
    const trimmedConversationName = (conversation.customerName || '').trim();
    const trimmedAuthor = (lastInbound?.author || '').trim();
    
    let customerName = '';
    
    // Para comentarios, SIEMPRE usar el autor del mensaje target (lastInbound)
    // para asegurar que el nombre coincida con el hilo al que responderemos
    if (conversation.type === 'comment' && trimmedAuthor) {
      customerName = trimmedAuthor;
      console.log(`[ReminderService] Comment reminder: Using author from target message: "${customerName}"`);
    } else if (trimmedConversationName) {
      customerName = trimmedConversationName;
    } else if (trimmedAuthor) {
      customerName = trimmedAuthor;
    }
    
    let crmProfile: ReminderContext['crmProfile'] = null;
    let otherConversationsSummary: string | null = null;

    if (conversation.contactId) {
      const contact = await storage.getCrmContact(conversation.contactId);
      if (contact) {
        // Para comentarios: NO sobrescribir el nombre del autor del mensaje target
        // El nombre debe coincidir con el hilo al que responderemos
        if (conversation.type !== 'comment') {
          customerName = contact.displayName || contact.firstName || customerName;
        }
        
        const customFields = (contact.customFields || {}) as Record<string, any>;
        
        crmProfile = {
          lifecycleStage: contact.lifecycleStage || null,
          status: contact.status || null,
          serviceInterest: customFields.serviceInterest || null,
          intent: customFields.intent || null,
          budget: customFields.budget || null,
          qualifiers: customFields.qualifiers ? JSON.stringify(customFields.qualifiers) : null,
          preferredChannel: customFields.preferredChannel || null,
        };

        const otherConversations = await storage.getCrmContactConversations(contact.id);
        const otherConvs = otherConversations.filter(c => c.id !== conversation.id);
        
        if (otherConvs.length > 0) {
          const summaries = otherConvs
            .slice(0, 2)
            .map(c => {
              const summary = c.closingSummary || c.closingIntent || `${c.type} en ${c.platform}`;
              return summary.substring(0, 100);
            })
            .filter(Boolean);
          
          if (summaries.length > 0) {
            otherConversationsSummary = `${otherConvs.length} conversación(es) previa(s): ${summaries.join('; ')}`;
          }
        }
      }
    }

    const lastMessageAt = conversation.lastCustomerMessageAt || conversation.lastMessageAt;

    // Fallback final si no se encontró ningún nombre
    const finalCustomerName = customerName || 'Cliente';

    const selectedOutboundMessage = selectedOutbound ? {
      id: selectedOutbound.id,
      timestamp: selectedOutbound.timestamp || null,
    } : null;

    return {
      customerName: finalCustomerName,
      channel: conversation.type || 'dm',
      timeSinceLastMessage: this.formatTimeSince(lastMessageAt),
      recentMessages: recentMessagesText,
      conversationSummary: conversation.closingSummary || null,
      closingIntent: conversation.closingIntent || null,
      crmProfile,
      otherConversationsSummary,
      lastInboundMessage,
      selectedOutboundMessage,
      threadSelectionMethod,
    };
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
    rules: ReminderRules,
    delayHours?: number
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
                         precheck.reason === 'closed' ||
                         precheck.reason === 'not_replied';
      console.log(`[ReminderService] Conversation ${conversation.id} not eligible for reminder: ${precheck.reason}`);
      return { scheduled: false, terminal: isTerminal };
    }

    const nextReminderNumber = (precheck.currentReminderCount || 0) + 1;
    
    // IMPORTANTE: Pasar delayHours a assembleReminderContext para que valide
    // que el outbound seleccionado haya pasado el threshold de tiempo
    const context = await this.assembleReminderContext(conversation, delayHours);

    // Para comentarios: verificar que tenemos un target determinístico
    // Si hay ambigüedad o falta metadata, NO programar el recordatorio
    if (context.threadSelectionMethod.startsWith('ineligible_')) {
      console.log(`[ReminderService] Conversation ${conversation.id} ineligible for comment reminder: ${context.threadSelectionMethod}`);
      return { scheduled: false, terminal: false };
    }

    const generation = await this.generateReminderContent(
      conversation,
      nextReminderNumber,
      rules
    );

    if (!generation.success || !generation.content) {
      console.error(`[ReminderService] Failed to generate content for ${conversation.id}: ${generation.error}`);
      return { scheduled: false, terminal: false };
    }

    const trimmedContent = generation.content.trim();
    if (!trimmedContent || trimmedContent.length < 10) {
      console.error(`[ReminderService] Generated content too short or empty for ${conversation.id}: "${trimmedContent}"`);
      return { scheduled: false, terminal: false };
    }

    const scheduledAt = new Date();
    
    const rawData = context.lastInboundMessage?.rawData as Record<string, any> | null;
    
    const contextSnapshot = {
      targetMessageId: context.lastInboundMessage?.id || null,
      targetMetricoolId: context.lastInboundMessage?.metricoolId || null,
      targetAuthor: context.lastInboundMessage?.author || null,
      targetParentId: rawData?.parentId || null,
      targetOutboundId: context.selectedOutboundMessage?.id || null,
      targetOutboundTimestamp: context.selectedOutboundMessage?.timestamp || null,
      customerName: context.customerName,
      conversationSummary: context.conversationSummary || null,
      closingIntent: context.closingIntent || null,
      postId: rawData?.postId || 
              rawData?.permalink?.split('/')?.slice(-2, -1)?.[0] || null,
      threadSelectionMethod: context.threadSelectionMethod,
    };
    
    console.log(`[ReminderService] Context snapshot for ${conversation.id}:`, JSON.stringify({
      targetMetricoolId: contextSnapshot.targetMetricoolId,
      targetParentId: contextSnapshot.targetParentId,
      targetAuthor: contextSnapshot.targetAuthor,
      customerName: contextSnapshot.customerName,
    }));

    const eventData = {
      brandId: conversation.brandId,
      conversationId: conversation.id,
      contactId: conversation.contactId || null,
      status: 'scheduled' as const,
      scheduledAt,
      content: trimmedContent,
      contentSource: rules.useAiContent !== false ? 'ai' : 'template',
      reminderNumber: nextReminderNumber,
      deliveryChannel: conversation.type || 'dm',
      contextSnapshot: contextSnapshot,
    };

    console.log(`[ReminderService] DEBUG - eventData.contextSnapshot:`, JSON.stringify(eventData.contextSnapshot));
    console.log(`[ReminderService] DEBUG - eventData keys:`, Object.keys(eventData));

    const result = await storage.scheduleReminderAtomic(
      conversation.id,
      eventData,
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
          
          await this.handleReminderFailure(
            reminder.id,
            reminder.conversationId,
            String(error)
          );
        }
      }
    } catch (error) {
      result.errors.push(`Error fetching scheduled reminders: ${error}`);
    }

    return result;
  }

  private async handleReminderFailure(
    reminderId: string,
    conversationId: string | null,
    error: string,
    status: 'failed' | 'cancelled' = 'failed',
    preserveConversationStatus: boolean = false
  ): Promise<void> {
    await storage.updateReminderEventStatus(reminderId, status, undefined, error);
    
    if (conversationId && !preserveConversationStatus) {
      try {
        await storage.updateConversationReminderStatus(conversationId, 'none' as ReminderStatus);
        console.log(`[ReminderService] Reset conversation ${conversationId} reminder_status to 'none' after ${status}`);
      } catch (resetError) {
        console.error(`[ReminderService] Failed to reset conversation reminder_status:`, resetError);
      }
    }
  }

  private async sendReminder(reminder: ReminderEvent): Promise<{ success: boolean; error?: string }> {
    if (!reminder.conversationId || !reminder.content) {
      const error = 'Invalid reminder data';
      console.error(`[ReminderService] ${error} for ${reminder.id}`);
      return { success: false, error };
    }

    const trimmedContent = reminder.content.trim();
    if (!trimmedContent || trimmedContent.length < 10) {
      const error = 'Reminder content is empty or too short';
      console.error(`[ReminderService] ${error} for ${reminder.id}: "${trimmedContent}"`);
      await this.handleReminderFailure(reminder.id, reminder.conversationId, error);
      return { success: false, error };
    }

    const conversation = await storage.getConversation(reminder.conversationId);
    if (!conversation) {
      const error = 'Conversation not found';
      console.error(`[ReminderService] Conversation ${reminder.conversationId} not found`);
      await this.handleReminderFailure(reminder.id, reminder.conversationId, error);
      return { success: false, error };
    }

    if (conversation.status === 'closed') {
      const error = 'Conversation closed';
      console.log(`[ReminderService] Conversation ${conversation.id} is closed, cancelling reminder`);
      await this.handleReminderFailure(reminder.id, conversation.id, error, 'cancelled', true);
      return { success: false, error };
    }

    if (conversation.reminderStatus === 'opted_out') {
      const error = 'Contact opted out';
      console.log(`[ReminderService] Conversation ${conversation.id} is opted out, cancelling reminder`);
      await this.handleReminderFailure(reminder.id, conversation.id, error, 'cancelled', true);
      return { success: false, error };
    }

    const brand = await storage.getBrand(conversation.brandId);
    if (!brand) {
      const error = 'Brand not found';
      console.error(`[ReminderService] Brand ${conversation.brandId} not found`);
      await this.handleReminderFailure(reminder.id, conversation.id, error);
      return { success: false, error };
    }

    const deliveryChannel = reminder.deliveryChannel || conversation.type || 'dm';
    const snapshot = (reminder.contextSnapshot as Record<string, any>) || {};

    // VALIDACIÓN: Para comentarios, verificar que el autor del hilo target no haya respondido
    // desde que se programó el recordatorio (previene enviar a hilos ya activos)
    if (deliveryChannel === 'comment' && snapshot.targetOutboundId && snapshot.targetAuthor) {
      const messages = await storage.getMessagesByConversation(conversation.id);
      const outboundTime = snapshot.targetOutboundTimestamp 
        ? new Date(snapshot.targetOutboundTimestamp).getTime()
        : new Date(reminder.scheduledAt || reminder.createdAt || 0).getTime();
      
      // Verificar si el autor target ha respondido después del outbound guardado
      const targetAuthorReplied = messages.some(m => 
        m.direction === 'inbound' && 
        m.author === snapshot.targetAuthor &&
        new Date(m.timestamp).getTime() > outboundTime
      );
      
      if (targetAuthorReplied) {
        const error = `Target author "${snapshot.targetAuthor}" has replied since scheduling - reminder no longer needed`;
        console.log(`[ReminderService] ${error} for ${reminder.id}`);
        await this.handleReminderFailure(reminder.id, conversation.id, error, 'cancelled', true);
        return { success: false, error };
      }
      
      console.log(`[ReminderService] Validated: ${snapshot.targetAuthor} has NOT replied since outbound at ${new Date(outboundTime).toISOString()}`);
    }

    if ((deliveryChannel === 'dm' || deliveryChannel === 'conversation') && 
        (!conversation.threadExternalId || !conversation.customerId)) {
      const error = 'Missing DM identifiers';
      console.error(`[ReminderService] ${error} for ${reminder.id}`);
      await this.handleReminderFailure(reminder.id, conversation.id, error);
      return { success: false, error };
    }
    
    let commentObjectId: string | null = null;
    let isNestedComment = false;
    
    if (deliveryChannel === 'comment') {
      const platform = conversation.platform?.toLowerCase();
      
      // For ALL platforms with nested comments: use parentId if available
      // This applies to YouTube, TikTok, Instagram, and Facebook
      if (snapshot.targetParentId) {
        commentObjectId = snapshot.targetParentId;
        isNestedComment = true;
        console.log(`[ReminderService] ${platform} nested comment detected (from snapshot), using parentId: ${commentObjectId}`);
      } else if (snapshot.targetMetricoolId) {
        commentObjectId = snapshot.targetMetricoolId;
        console.log(`[ReminderService] Using targetMetricoolId from snapshot: ${commentObjectId}`);
      }
      
      if (!commentObjectId && snapshot.targetMessageId) {
        const targetMessage = await storage.getMessage(snapshot.targetMessageId);
        if (targetMessage) {
          const msgRawData = targetMessage.rawData as Record<string, any> | null;
          // Use parentId for nested comments on any platform
          if (msgRawData?.parentId) {
            commentObjectId = msgRawData.parentId;
            isNestedComment = true;
            console.log(`[ReminderService] ${platform} nested comment (from target message ${targetMessage.id}), using parentId: ${commentObjectId}`);
          } else {
            // Fallback: use rawData.id, rawData.root.id, or metricoolId (same logic as auto-reply)
            commentObjectId = msgRawData?.id || msgRawData?.root?.id || targetMessage.metricoolId || null;
            console.log(`[ReminderService] Using objectId from target message: ${commentObjectId}`);
          }
        } else {
          console.warn(`[ReminderService] Target message ${snapshot.targetMessageId} not found in database`);
        }
      }
      
      // If we still don't have an objectId and there was a targetMessageId, abort - don't fall back to latest inbound
      // This prevents sending reminders to the wrong user if the target message was deleted
      if (!commentObjectId && snapshot.targetMessageId) {
        const error = `Target message ${snapshot.targetMessageId} not found or has no valid objectId - aborting to prevent misthreading`;
        console.error(`[ReminderService] ${error}`);
        await this.handleReminderFailure(reminder.id, conversation.id, error);
        return { success: false, error };
      }
      
      // Only use fallback for legacy reminders without targetMessageId (backwards compatibility)
      if (!commentObjectId && !snapshot.targetMessageId) {
        console.log(`[ReminderService] Legacy reminder without targetMessageId, falling back to latest inbound`);
        const messages = await storage.getMessagesByConversation(conversation.id);
        const latestInbound = messages
          .filter(m => m.direction === 'inbound')
          .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())[0];
        
        if (latestInbound) {
          const msgRawData = latestInbound.rawData as Record<string, any> | null;
          if (msgRawData?.parentId) {
            commentObjectId = msgRawData.parentId;
            isNestedComment = true;
            console.log(`[ReminderService] ${platform} nested comment (legacy fallback), using parentId: ${commentObjectId}`);
          } else {
            commentObjectId = msgRawData?.id || msgRawData?.root?.id || latestInbound.metricoolId || null;
            console.log(`[ReminderService] Using objectId from latest inbound (legacy fallback): ${commentObjectId}`);
          }
        }
      }
      
      if (!commentObjectId) {
        const error = 'Missing comment identifiers - cannot determine target comment';
        console.error(`[ReminderService] ${error} for ${reminder.id}`);
        await this.handleReminderFailure(reminder.id, conversation.id, error);
        return { success: false, error };
      }
      
      console.log(`[ReminderService] Will reply to comment ${commentObjectId} (target author: ${snapshot.targetAuthor || 'unknown'}, nested: ${isNestedComment})`);
    }

    // Get agent settings for mention functionality
    const agent = await storage.getAiAgentByBrand(conversation.brandId);
    const shouldMentionUser = agent?.autoMentionEnabled && deliveryChannel === 'comment' && snapshot.targetAuthor;
    
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
          mentionUsername: shouldMentionUser ? snapshot.targetAuthor : undefined,
        });
        
        if (shouldMentionUser) {
          console.log(`[ReminderService] Mentioning user @${snapshot.targetAuthor} in reminder`);
        }
      } else {
        const error = `Unsupported channel: ${deliveryChannel}`;
        console.error(`[ReminderService] ${error}`);
        await this.handleReminderFailure(reminder.id, conversation.id, error);
        return { success: false, error };
      }
      
      if (!sendResult.success) {
        const error = sendResult.error || 'Metricool send failed';
        console.error(`[ReminderService] Metricool send failed: ${error}`);
        await this.handleReminderFailure(reminder.id, conversation.id, error);
        return { success: false, error };
      }
    } catch (error) {
      const errorMsg = String(error);
      console.error(`[ReminderService] Error sending via Metricool:`, error);
      await this.handleReminderFailure(reminder.id, conversation.id, errorMsg);
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
        parentMessageId: deliveryChannel === 'comment' ? (snapshot.targetMessageId || null) : null,
        rawData: {
          isReminder: true,
          reminderNumber: reminder.reminderNumber,
          reminderEventId: reminder.id,
          isNestedComment: isNestedComment || false,
          replyToObjectId: commentObjectId || null,
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

  async regenerateScheduledRemindersWithGenericName(brandId: string): Promise<{ regenerated: number; errors: string[] }> {
    const result = { regenerated: 0, errors: [] as string[] };
    
    try {
      const events = await storage.getReminderEventsByBrand(brandId, { status: 'scheduled' });
      const rules = await storage.getReminderRules(brandId);
      
      if (!rules) {
        result.errors.push('No reminder rules found for brand');
        return result;
      }

      for (const event of events) {
        if (!event.content?.includes('Cliente')) {
          continue;
        }

        try {
          const conversation = await storage.getConversation(event.conversationId);
          if (!conversation) {
            result.errors.push(`Conversation ${event.conversationId} not found`);
            continue;
          }

          console.log(`[ReminderService] Regenerating content for event ${event.id}`);
          
          const generation = await this.generateReminderContent(
            conversation,
            event.reminderNumber,
            rules
          );

          if (generation.success && generation.content) {
            await storage.updateReminderEventContent(event.id, generation.content);
            result.regenerated++;
            console.log(`[ReminderService] Regenerated event ${event.id} with new content`);
          } else {
            result.errors.push(`Failed to generate content for event ${event.id}: ${generation.error}`);
          }
        } catch (error) {
          result.errors.push(`Error processing event ${event.id}: ${error}`);
        }
      }
    } catch (error) {
      result.errors.push(`Error fetching events: ${error}`);
    }

    return result;
  }
}

export const reminderService = new ReminderService();
