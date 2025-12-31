import { storage } from "../storage";
import { createLLMProvider } from "./llm/factory";
import { type ConversationClosingSummary, type ClosingSentiment } from "@shared/schema";

const CLOSING_SUMMARY_PROMPT = `Analiza la siguiente conversación y genera un resumen ejecutivo.

CONVERSACIÓN:
{conversation_history}

GENERA UN JSON con este formato exacto:
{
  "summary": "Resumen de 2-3 oraciones sobre qué pidió el cliente y cómo se resolvió",
  "sentiment": "positive" | "neutral" | "negative",
  "intent": "Intención principal del cliente (ej: Consulta precios ITIN)",
  "resolution": "Cómo se resolvió (ej: Redirigido a WhatsApp para cotización)",
  "topics": ["tema1", "tema2"],
  "actionItems": ["si quedó algo pendiente"]
}

REGLAS:
- El resumen debe ser útil para un agente que retome esta conversación
- Sentiment basado en el tono general del cliente
- Intent es lo que el cliente QUERÍA lograr
- Resolution es lo que EFECTIVAMENTE se hizo
- Responde SOLO con el JSON, sin texto adicional`;

const MAX_MESSAGES_FOR_SUMMARY = 100;

export class ClosingSummaryService {
  
  async generateSummary(conversationId: string): Promise<ConversationClosingSummary | null> {
    const conversation = await storage.getConversation(conversationId);
    if (!conversation) {
      console.log(`[ClosingSummary] Conversation ${conversationId} not found`);
      return null;
    }

    if (conversation.type !== 'dm') {
      console.log(`[ClosingSummary] Skipping summary for non-DM conversation ${conversationId} (type: ${conversation.type})`);
      return null;
    }

    const brand = await storage.getBrand(conversation.brandId);
    if (!brand) {
      console.log(`[ClosingSummary] Brand ${conversation.brandId} not found`);
      return null;
    }

    const agent = await storage.getAiAgentByBrand(conversation.brandId);
    if (!agent) {
      console.log(`[ClosingSummary] No AI agent configured for brand ${conversation.brandId}`);
      return this.generateFallbackSummary(conversation);
    }

    const messages = await storage.getMessagesByConversation(conversationId);
    const recentMessages = messages.slice(-MAX_MESSAGES_FOR_SUMMARY);

    if (recentMessages.length === 0) {
      return this.generateFallbackSummary(conversation);
    }

    const conversationHistory = recentMessages
      .map(m => {
        const role = m.direction === 'inbound' ? 'Cliente' : 'Agente';
        const time = new Date(m.timestamp).toLocaleString('es-ES');
        return `[${time}] ${role}: ${m.content}`;
      })
      .join('\n');

    const prompt = CLOSING_SUMMARY_PROMPT.replace('{conversation_history}', conversationHistory);

    try {
      const secrets = {
        openaiApiKey: process.env.OPENAI_API_KEY,
        geminiApiKey: process.env.GEMINI_API_KEY,
      };
      const provider = createLLMProvider(agent, secrets);
      const response = await provider.generateRawCompletion(
        'Eres un asistente que analiza conversaciones y genera resúmenes estructurados en formato JSON.',
        prompt,
        { temperature: 0.3, maxTokens: 500 }
      );

      const summary = this.parseJsonResponse(response.text);
      
      if (summary) {
        console.log(`[ClosingSummary] Generated summary for conversation ${conversationId}`);
        return summary;
      } else {
        console.log(`[ClosingSummary] Failed to parse AI response, using fallback`);
        return this.generateFallbackSummary(conversation);
      }
    } catch (error) {
      console.error(`[ClosingSummary] Error generating summary: ${error}`);
      return this.generateFallbackSummary(conversation);
    }
  }

  private parseJsonResponse(text: string): ConversationClosingSummary | null {
    try {
      let jsonStr = text.trim();
      
      if (jsonStr.startsWith('```json')) {
        jsonStr = jsonStr.replace(/^```json\s*/, '').replace(/```\s*$/, '');
      } else if (jsonStr.startsWith('```')) {
        jsonStr = jsonStr.replace(/^```\s*/, '').replace(/```\s*$/, '');
      }
      
      const parsed = JSON.parse(jsonStr);
      
      const validSentiments: ClosingSentiment[] = ['positive', 'neutral', 'negative'];
      if (!validSentiments.includes(parsed.sentiment)) {
        parsed.sentiment = 'neutral';
      }
      
      return {
        summary: parsed.summary || 'Sin resumen disponible',
        sentiment: parsed.sentiment,
        intent: parsed.intent || 'No identificado',
        resolution: parsed.resolution || 'No especificada',
        topics: Array.isArray(parsed.topics) ? parsed.topics : [],
        actionItems: Array.isArray(parsed.actionItems) ? parsed.actionItems : [],
      };
    } catch (error) {
      console.error(`[ClosingSummary] JSON parse error: ${error}`);
      return null;
    }
  }

  private async generateFallbackSummary(conversation: any): Promise<ConversationClosingSummary> {
    const messages = await storage.getMessagesByConversation(conversation.id);
    const customerMessages = messages.filter(m => m.direction === 'inbound');
    
    const firstMessage = customerMessages[0]?.content || 'Sin mensaje inicial';
    const lastMessage = customerMessages[customerMessages.length - 1]?.content || '';
    
    return {
      summary: `Conversación de ${conversation.platform} con ${conversation.customerName || 'cliente'}. ${customerMessages.length} mensajes del cliente.`,
      sentiment: 'neutral',
      intent: firstMessage.substring(0, 100) + (firstMessage.length > 100 ? '...' : ''),
      resolution: 'Cerrada manualmente',
      topics: [conversation.platform, conversation.type],
      actionItems: [],
    };
  }

  async saveSummary(
    conversationId: string,
    summary: ConversationClosingSummary
  ): Promise<void> {
    await storage.updateClosingSummary(
      conversationId,
      summary.summary,
      summary.sentiment,
      summary.intent,
      summary.resolution
    );
  }
}

export const closingSummaryService = new ClosingSummaryService();
