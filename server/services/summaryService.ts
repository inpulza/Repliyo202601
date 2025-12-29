import { storage } from "../storage";
import { filterHistoryByAuthor } from "./llm/prompt-composer";
import { createLLMProvider } from "./llm/factory";
import type { AgentSecrets } from "./llm/types";
import type { Message, AiAgent } from "@shared/schema";

const DEFAULT_SUMMARY_THRESHOLD = 10;

const SUMMARY_PROMPT = `Eres un experto en resumir conversaciones de atención al cliente. Tu tarea es crear un resumen CONSOLIDADO de la conversación entre la marca y el cliente.

REGLAS DE RESUMEN:
1. PRESERVAR DATOS DUROS: Números de teléfono, fechas, montos, nombres, IDs de pedido, etc.
2. CONSOLIDAR ESTADOS: Si el cliente preguntó algo y la marca respondió, resume el resultado final (ej: "Cliente preguntó precio → Se le informó $50")
3. ELIMINAR PAJA: Saludos repetidos, "gracias", "ok", emojis solos, etc.
4. MANTENER CRONOLOGÍA: Ordena los eventos de más antiguo a más reciente
5. SER CONCISO: Máximo 300 palabras
6. ACCIONES EXTERNAS: Si el cliente menciona que envió algo por WhatsApp/email/otro canal, indicarlo como "Cliente indica que envió [X] por [canal] - NO VERIFICABLE POR NOSOTROS"

FORMATO DE SALIDA:
- Usa viñetas para cada punto importante
- Incluye fechas si son relevantes
- Destaca información de contacto o datos importantes entre comillas

EJEMPLO:
• Cliente interesado en servicio de limpieza para oficina de 200m²
• Se cotizó servicio semanal a "$150/mes" 
• Cliente indica que envió fotos por WhatsApp - NO VERIFICABLE POR NOSOTROS
• Teléfono de contacto: "555-1234"
• Estado: Pendiente confirmación`;

interface SummaryGenerationResult {
  summary: string;
  messageCount: number;
  lastMessageId: string;
}

function getGlobalSecrets(): AgentSecrets {
  return {
    openaiApiKey: process.env.OPENAI_API_KEY || process.env.AI_INTEGRATIONS_OPENAI_API_KEY,
    geminiApiKey: process.env.GEMINI_API_KEY || process.env.AI_INTEGRATIONS_GEMINI_API_KEY,
  };
}

async function generateSummaryWithLLM(
  messages: Message[],
  agent: AiAgent,
  existingSummary?: string
): Promise<string> {
  const formattedHistory = messages.map(msg => {
    const role = msg.direction === "inbound" ? "Cliente" : "Marca";
    const timestamp = new Date(msg.timestamp).toLocaleDateString('es-ES');
    const source = msg.source === 'repliyo_auto' ? ' (IA)' : '';
    return `[${timestamp}] ${role}${source}: ${msg.content}`;
  }).join("\n");

  let userPrompt = "";
  if (existingSummary) {
    userPrompt = `RESUMEN PREVIO:
${existingSummary}

NUEVOS MENSAJES A INTEGRAR:
${formattedHistory}

Genera un resumen CONSOLIDADO que integre el resumen previo con los nuevos mensajes. Elimina redundancias.`;
  } else {
    userPrompt = `CONVERSACIÓN A RESUMIR:
${formattedHistory}

Genera un resumen consolidado siguiendo las reglas establecidas.`;
  }

  try {
    const secrets = getGlobalSecrets();
    const llmProvider = createLLMProvider(agent, secrets);
    
    console.log(`[SummaryService] Using ${agent.provider}/${agent.model} for summary generation via createLLMProvider`);
    
    const response = await llmProvider.generateRawCompletion(
      SUMMARY_PROMPT,
      userPrompt,
      { temperature: 0.3, maxTokens: 500, model: agent.model || undefined }
    );

    return response.text || "";
  } catch (error) {
    console.error("[SummaryService] Error generating summary:", error);
    throw error;
  }
}

function createDummyMessage(conversationId: string, author: string): Message {
  return {
    id: "",
    brandId: "",
    conversationId,
    metricoolId: null,
    platform: "",
    type: "comment",
    direction: "inbound",
    author,
    authorAvatar: null,
    content: "",
    timestamp: new Date(),
    status: "read",
    draftResponse: null,
    urgency: null,
    intent: null,
    sentiment: null,
    aiSummary: null,
    sourceUrl: null,
    contextType: null,
    crmData: null,
    rawData: null,
    threadId: null,
    parentMessageId: null,
    source: null,
    replyGroupId: null,
    partIndex: null,
    totalParts: null,
    aiSuggestedReply: null,
    aiReplyStatus: "none",
    aiAgentId: null,
    internalOrigin: null,
    mediaType: null,
    mediaUrl: null,
    mediaTranscription: null,
    draftWasEdited: null,
    createdAt: new Date(),
  };
}

export async function generateConversationSummary(
  conversationId: string,
  targetAuthor: string,
  allMessages: Message[],
  brandId: string
): Promise<SummaryGenerationResult> {
  const agent = await storage.getAiAgentByBrand(brandId);
  
  if (!agent) {
    throw new Error(`No AI agent configured for brand ${brandId}`);
  }

  const dummyMessage = createDummyMessage(conversationId, targetAuthor);
  const filteredMessages = filterHistoryByAuthor(allMessages, dummyMessage, "comment");

  if (filteredMessages.length === 0) {
    throw new Error("No messages found for this author");
  }

  const existingSummary = await storage.getConversationUserSummary(conversationId, targetAuthor);

  const summary = await generateSummaryWithLLM(
    filteredMessages,
    agent,
    existingSummary?.summary || undefined
  );

  const lastMessage = filteredMessages[filteredMessages.length - 1];

  return {
    summary,
    messageCount: filteredMessages.length,
    lastMessageId: lastMessage.id,
  };
}

export async function checkAndUpdateSummary(
  conversationId: string,
  author: string,
  brandId: string
): Promise<void> {
  try {
    const allMessages = await storage.getMessagesByConversation(conversationId);
    
    if (allMessages.length === 0) {
      console.log(`[SummaryService] No messages in conversation ${conversationId}`);
      return;
    }

    const agent = await storage.getAiAgentByBrand(brandId);
    
    if (!agent) {
      console.log(`[SummaryService] No AI agent for brand ${brandId}, skipping summary`);
      return;
    }

    const dummyMessage = createDummyMessage(conversationId, author);
    const filteredMessages = filterHistoryByAuthor(allMessages, dummyMessage, "comment");
    
    const existingSummary = await storage.getConversationUserSummary(conversationId, author);
    
    let newMessagesCount = filteredMessages.length;
    
    if (existingSummary?.lastMessageId) {
      const lastSummarizedIndex = filteredMessages.findIndex(
        msg => msg.id === existingSummary.lastMessageId
      );
      
      if (lastSummarizedIndex !== -1) {
        newMessagesCount = filteredMessages.length - lastSummarizedIndex - 1;
      }
    }

    console.log(`[SummaryService] Conversation ${conversationId}, Author: ${author}, New messages since last summary: ${newMessagesCount}`);

    if (newMessagesCount < DEFAULT_SUMMARY_THRESHOLD) {
      console.log(`[SummaryService] Below threshold (${DEFAULT_SUMMARY_THRESHOLD}), skipping summary generation`);
      return;
    }

    console.log(`[SummaryService] Generating summary for ${author} in conversation ${conversationId} using ${agent.provider}/${agent.model}...`);
    
    const result = await generateConversationSummary(conversationId, author, allMessages, brandId);

    await storage.upsertConversationUserSummary({
      conversationId,
      author,
      summary: result.summary,
      lastMessageId: result.lastMessageId,
      messageCount: result.messageCount,
    });

    console.log(`[SummaryService] Summary saved successfully for ${author}`);
  } catch (error) {
    console.error(`[SummaryService] Error updating summary:`, error);
  }
}

export async function triggerSummaryUpdateAsync(
  conversationId: string,
  author: string,
  brandId: string
): Promise<void> {
  setImmediate(() => {
    checkAndUpdateSummary(conversationId, author, brandId).catch(err => {
      console.error(`[SummaryService] Async summary update failed:`, err);
    });
  });
}
