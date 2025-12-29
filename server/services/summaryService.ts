import { storage } from "../storage";
import { filterHistoryByAuthor } from "./llm/prompt-composer";
import { createLLMProvider } from "./llm/factory";
import type { AgentSecrets } from "./llm/types";
import type { Message, AiAgent, Conversation } from "@shared/schema";

const DEFAULT_SUMMARY_THRESHOLD = 10;
const MIN_SUMMARY_LENGTH = 100; // Resúmenes deben tener al menos 100 caracteres

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

function createDummyMessage(conversationId: string, author: string, type: string = "comment"): Message {
  return {
    id: "",
    brandId: "",
    conversationId,
    metricoolId: null,
    platform: "",
    type: type as "dm" | "comment",
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
  brandId: string,
  conversationType: string = "comment"
): Promise<SummaryGenerationResult> {
  const agent = await storage.getAiAgentByBrand(brandId);
  
  if (!agent) {
    throw new Error(`No AI agent configured for brand ${brandId}`);
  }

  // Usar el tipo de conversación correcto: 'conversation' para DMs, 'comment' para comentarios
  const messageType = conversationType === 'dm' ? 'conversation' : 'comment';
  const dummyMessage = createDummyMessage(conversationId, targetAuthor, conversationType);
  const filteredMessages = filterHistoryByAuthor(allMessages, dummyMessage, messageType);

  console.log(`[SummaryService] Filtering messages: type=${messageType}, total=${allMessages.length}, filtered=${filteredMessages.length}`);

  if (filteredMessages.length === 0) {
    throw new Error("No messages found for this author");
  }

  const existingSummary = await storage.getConversationUserSummary(conversationId, targetAuthor);

  const summary = await generateSummaryWithLLM(
    filteredMessages,
    agent,
    existingSummary?.summary || undefined
  );

  // Validar que el resumen no esté truncado o vacío
  if (!summary || summary.length < MIN_SUMMARY_LENGTH) {
    console.error(`[SummaryService] Generated summary too short (${summary?.length || 0} chars), discarding`);
    throw new Error(`Summary too short: ${summary?.length || 0} characters`);
  }

  console.log(`[SummaryService] Summary generated successfully: ${summary.length} chars`);

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
    // Obtener la conversación para saber el tipo (DM vs comentario)
    const conversation = await storage.getConversation(conversationId);
    if (!conversation) {
      console.log(`[SummaryService] Conversation ${conversationId} not found`);
      return;
    }

    const conversationType = conversation.type || 'comment';
    console.log(`[SummaryService] Processing conversation ${conversationId}, type=${conversationType}, author=${author}`);

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

    // Usar tipo correcto: 'conversation' para DMs, 'comment' para comentarios
    const messageType = conversationType === 'dm' ? 'conversation' : 'comment';
    const dummyMessage = createDummyMessage(conversationId, author, conversationType);
    const filteredMessages = filterHistoryByAuthor(allMessages, dummyMessage, messageType);
    
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

    console.log(`[SummaryService] Conversation ${conversationId}, Author: ${author}, Type: ${conversationType}, New messages since last summary: ${newMessagesCount}`);

    if (newMessagesCount < DEFAULT_SUMMARY_THRESHOLD) {
      console.log(`[SummaryService] Below threshold (${DEFAULT_SUMMARY_THRESHOLD}), skipping summary generation`);
      return;
    }

    console.log(`[SummaryService] Generating summary for ${author} in conversation ${conversationId} using ${agent.provider}/${agent.model}...`);
    
    const result = await generateConversationSummary(conversationId, author, allMessages, brandId, conversationType);

    await storage.upsertConversationUserSummary({
      conversationId,
      author,
      summary: result.summary,
      lastMessageId: result.lastMessageId,
      messageCount: result.messageCount,
    });

    console.log(`[SummaryService] Summary saved successfully for ${author} (${result.summary.length} chars)`);
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
