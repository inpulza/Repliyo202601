import { GoogleGenAI } from "@google/genai";
import { storage } from "../storage";
import { filterHistoryByAuthor } from "./llm/prompt-composer";
import type { Message } from "@shared/schema";

const DEFAULT_SUMMARY_THRESHOLD = 10;
const SUMMARY_MODEL = "gemini-2.5-flash";

const SUMMARY_PROMPT = `Eres un experto en resumir conversaciones de atención al cliente. Tu tarea es crear un resumen CONSOLIDADO de la conversación entre la marca y el cliente.

REGLAS DE RESUMEN:
1. PRESERVAR DATOS DUROS: Números de teléfono, fechas, montos, nombres, IDs de pedido, etc.
2. CONSOLIDAR ESTADOS: Si el cliente preguntó algo y la marca respondió, resume el resultado final (ej: "Cliente preguntó precio → Se le informó $50")
3. ELIMINAR PAJA: Saludos repetidos, "gracias", "ok", emojis solos, etc.
4. MANTENER CRONOLOGÍA: Ordena los eventos de más antiguo a más reciente
5. SER CONCISO: Máximo 300 palabras

FORMATO DE SALIDA:
- Usa viñetas para cada punto importante
- Incluye fechas si son relevantes
- Destaca información de contacto o datos importantes entre comillas

EJEMPLO:
• Cliente interesado en servicio de limpieza para oficina de 200m²
• Se cotizó servicio semanal a "$150/mes" 
• Cliente solicitó visita técnica para el "15 de enero"
• Teléfono de contacto: "555-1234"
• Estado: Pendiente confirmación de visita`;

interface SummaryGenerationResult {
  summary: string;
  messageCount: number;
  lastMessageId: string;
}

async function generateSummaryWithLLM(
  messages: Message[],
  existingSummary?: string
): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY || process.env.AI_INTEGRATIONS_GEMINI_API_KEY;
  
  if (!apiKey) {
    console.error("[SummaryService] No Gemini API key found");
    throw new Error("Gemini API key not configured");
  }

  const client = new GoogleGenAI({ apiKey });

  const formattedHistory = messages.map(msg => {
    const role = msg.direction === "inbound" ? "Cliente" : "Marca";
    const timestamp = new Date(msg.timestamp).toLocaleDateString('es-ES');
    return `[${timestamp}] ${role}: ${msg.content}`;
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
    const response = await client.models.generateContent({
      model: SUMMARY_MODEL,
      config: {
        systemInstruction: SUMMARY_PROMPT,
        temperature: 0.3,
        maxOutputTokens: 500,
      },
      contents: userPrompt,
    });

    return response.text || "";
  } catch (error) {
    console.error("[SummaryService] Error generating summary:", error);
    throw error;
  }
}

export async function generateConversationSummary(
  conversationId: string,
  targetAuthor: string,
  allMessages: Message[]
): Promise<SummaryGenerationResult> {
  const dummyMessage: Message = {
    id: "",
    brandId: "",
    conversationId,
    metricoolId: null,
    platform: "",
    type: "comment",
    direction: "inbound",
    author: targetAuthor,
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
    createdAt: new Date(),
  };

  const filteredMessages = filterHistoryByAuthor(allMessages, dummyMessage, "comment");

  if (filteredMessages.length === 0) {
    throw new Error("No messages found for this author");
  }

  const existingSummary = await storage.getConversationUserSummary(conversationId, targetAuthor);

  const summary = await generateSummaryWithLLM(
    filteredMessages,
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
  author: string
): Promise<void> {
  try {
    const allMessages = await storage.getMessagesByConversation(conversationId);
    
    if (allMessages.length === 0) {
      console.log(`[SummaryService] No messages in conversation ${conversationId}`);
      return;
    }

    const dummyMessage: Message = {
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
      createdAt: new Date(),
    };

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

    console.log(`[SummaryService] Generating summary for ${author} in conversation ${conversationId}...`);
    
    const result = await generateConversationSummary(conversationId, author, allMessages);

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
  author: string
): Promise<void> {
  setImmediate(() => {
    checkAndUpdateSummary(conversationId, author).catch(err => {
      console.error(`[SummaryService] Async summary update failed:`, err);
    });
  });
}
