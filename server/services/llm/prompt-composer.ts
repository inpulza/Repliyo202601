import type { AiAgent, Message, Conversation, Brand, SocialPost } from "@shared/schema";
import { PLATFORM_CHARACTER_LIMITS, getCharacterLimit } from "./types";

interface PromptContext {
  agent: AiAgent;
  message: Message;
  conversation?: Conversation;
  brand?: Brand;
  conversationHistory?: Message[];
  socialPost?: SocialPost | null;
}

interface VariableContext {
  username: string;
  platform: string;
  comment: string;
  postContext: string;
}

/**
 * FILTRADO DINÁMICO DE HISTORIAL POR AUTOR
 * 
 * Esta función segrega el contexto de IA para evitar "contaminación" entre usuarios.
 * 
 * Problema que resuelve:
 * - Para comentarios en posts, múltiples usuarios comentan en el mismo hilo.
 * - Si la IA ve TODO el historial, puede confundir contextos (responder a Juan con info de Pedro).
 * 
 * Solución:
 * - Para DMs: Devuelve todo el historial (ya es 1:1 marca-usuario).
 * - Para Comentarios: Filtra solo mensajes del autor objetivo + respuestas de la marca a ese autor.
 * 
 * Usa `parentMessageId` para vincular respuestas de la marca al mensaje inbound que respondieron.
 * Si no hay `parentMessageId`, usa heurística de proximidad temporal.
 * 
 * @param history - Historial completo de mensajes de la conversación
 * @param targetMessage - El mensaje al que se va a responder
 * @param messageType - Tipo de mensaje: 'conversation' (DM) o 'comment'
 * @returns Array filtrado de mensajes relevantes para este usuario específico
 */
export function filterHistoryByAuthor(
  history: Message[],
  targetMessage: Message,
  messageType: string
): Message[] {
  if (!history || history.length === 0) {
    return [];
  }

  // DMs: Ya son 1:1 entre marca y un usuario único. Devolver todo.
  if (messageType === 'conversation') {
    return history.slice(-10);
  }

  // COMENTARIOS: Necesitamos segregar por autor
  const targetAuthor = targetMessage.author;
  if (!targetAuthor) {
    // Sin autor definido, devolvemos historial limitado como fallback
    return history.slice(-10);
  }

  // Paso 1: Crear un mapa de IDs de mensajes del usuario objetivo
  const targetUserMessageIds = new Set<string>();
  const targetUserMessages: Message[] = [];

  for (const msg of history) {
    if (msg.direction === 'inbound' && msg.author === targetAuthor) {
      targetUserMessageIds.add(msg.id);
      targetUserMessages.push(msg);
    }
  }

  // Paso 2: Identificar respuestas de la marca que pertenecen a este usuario
  const brandRepliesToUser: Message[] = [];

  for (const msg of history) {
    if (msg.direction === 'outbound') {
      // Estrategia 1: Usar parentMessageId (preciso)
      if (msg.parentMessageId && targetUserMessageIds.has(msg.parentMessageId)) {
        brandRepliesToUser.push(msg);
        continue;
      }

      // Estrategia 2: Heurística de proximidad temporal
      // Si el mensaje outbound no tiene parentMessageId, buscamos el mensaje inbound
      // más cercano temporalmente que sea del autor objetivo
      if (!msg.parentMessageId) {
        const msgTimestamp = new Date(msg.timestamp).getTime();
        let closestInbound: Message | null = null;
        let closestTimeDiff = Infinity;

        for (const inbound of targetUserMessages) {
          const inboundTimestamp = new Date(inbound.timestamp).getTime();
          // Solo consideramos inbound que sea ANTERIOR al outbound
          if (inboundTimestamp < msgTimestamp) {
            const timeDiff = msgTimestamp - inboundTimestamp;
            // Umbral: 1 hora (3600000ms) - respuestas típicas ocurren dentro de este rango
            if (timeDiff < 3600000 && timeDiff < closestTimeDiff) {
              closestTimeDiff = timeDiff;
              closestInbound = inbound;
            }
          }
        }

        // Si encontramos un inbound cercano del usuario objetivo, incluimos esta respuesta
        if (closestInbound) {
          brandRepliesToUser.push(msg);
        }
      }
    }
  }

  // Paso 3: Combinar y ordenar cronológicamente
  const filteredHistory = [...targetUserMessages, ...brandRepliesToUser];
  filteredHistory.sort((a, b) => 
    new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
  );

  // Limitar a los últimos 10 mensajes para el prompt
  return filteredHistory.slice(-10);
}

function formatUsername(author: string, platform: string): string {
  const normalizedPlatform = (platform || '').toLowerCase().trim();
  const needsAtSymbol = normalizedPlatform === 'instagram' || normalizedPlatform === 'tiktok';
  
  if (needsAtSymbol) {
    return author.startsWith('@') ? author : `@${author}`;
  }
  
  return author;
}

function buildVariableContext(
  message: Message,
  conversation?: Conversation,
  socialPost?: SocialPost | null
): VariableContext {
  const platform = (message.platform || 'default').toLowerCase().trim();
  const username = formatUsername(message.author || 'Usuario', platform);
  const comment = message.content || '';
  
  let postContext = '';
  if (socialPost?.caption) {
    postContext = socialPost.caption;
  } else if (message.type === 'conversation' && !socialPost) {
    postContext = 'Este es un mensaje directo privado.';
  }
  
  return {
    username,
    platform,
    comment,
    postContext,
  };
}

export function replaceVariables(text: string, context: VariableContext): string {
  let result = text;
  
  result = result.replace(/\{\{\s*username\s*\}\}/g, context.username);
  result = result.replace(/\{\{\s*platform\s*\}\}/g, context.platform);
  result = result.replace(/\{\{\s*comment\s*\}\}/g, context.comment);
  result = result.replace(/\{\{\s*post_context\s*\}\}/g, context.postContext);
  
  return result;
}

export function composePrompt(context: PromptContext): {
  systemPrompt: string;
  userPrompt: string;
  characterLimit: number;
  hardLimit: number;
} {
  const { agent, message, conversation, brand, conversationHistory, socialPost } = context;
  
  const platform = message.platform || "default";
  const messageType = message.type || "comment";
  
  // Use the new intelligent limit system that differentiates DMs from comments
  const { safeLimit, hardLimit } = getCharacterLimit(platform, messageType);
  const characterLimit = safeLimit; // Use safe limit (90%) for AI generation

  const variableContext = buildVariableContext(message, conversation, socialPost);

  const systemParts: string[] = [];

  if (agent.systemPrompt) {
    systemParts.push(replaceVariables(agent.systemPrompt, variableContext));
  } else {
    systemParts.push(`Eres un asistente de atención al cliente para ${brand?.name || "la marca"}.`);
  }

  if (agent.guardrailPrompt) {
    systemParts.push(`\n--- REGLAS IMPORTANTES ---\n${replaceVariables(agent.guardrailPrompt, variableContext)}`);
  }

  if (agent.knowledgeBase) {
    systemParts.push(`\n--- BASE DE CONOCIMIENTO ---\n${replaceVariables(agent.knowledgeBase, variableContext)}`);
  }

  if (brand?.tone) {
    systemParts.push(`\n--- TONO DE COMUNICACIÓN ---\nUsa un tono ${brand.tone}.`);
  }

  if (brand?.businessContext) {
    systemParts.push(`\n--- CONTEXTO DEL NEGOCIO ---\n${brand.businessContext}`);
  }

  systemParts.push(`\n--- LÍMITES TÉCNICOS ---
- El límite de caracteres para ${platform} es ${characterLimit} caracteres.
- Tu respuesta DEBE ser menor a ${characterLimit} caracteres.
- Mantén el idioma del mensaje original.
- IMPORTANTE: Completa siempre tus oraciones. No dejes frases a medias.`);

  // Add conversation memory instructions - CRITICAL: Must be very explicit
  systemParts.push(`\n--- REGLA CRÍTICA: MEMORIA DE CONVERSACIÓN ---
⚠️ PROHIBIDO ABSOLUTAMENTE decir cualquiera de estas frases:
- "No tengo acceso a mensajes anteriores"
- "No puedo acceder a conversaciones previas"
- "No tengo acceso a la base de datos"
- "Lamentablemente no puedo ver mensajes anteriores"

✅ REALIDAD: TIENES ACCESO COMPLETO al historial de esta conversación.
- El historial completo se te proporciona abajo como "HISTORIAL DE CONVERSACIÓN".
- DEBES usar este historial para responder con contexto.
- Si el cliente pregunta qué se habló antes, RESUME lo que ves en el historial.
- Si el cliente pregunta sobre algo mencionado previamente, RESPONDE basándote en el historial.
- Actúa como si recordaras toda la conversación, porque SÍ la tienes disponible.`);

  let historyContext = "";
  if (conversationHistory && conversationHistory.length > 0) {
    // FILTRADO DINÁMICO: Para comentarios, solo incluir contexto del usuario objetivo
    const filteredMessages = filterHistoryByAuthor(conversationHistory, message, messageType);
    
    if (filteredMessages.length > 0) {
      historyContext = "\n--- HISTORIAL DE CONVERSACIÓN ---\n";
      // Para comentarios, añadir nota de contexto segregado
      if (messageType !== 'conversation') {
        historyContext += `(Contexto exclusivo con ${message.author || 'este usuario'})\n`;
      }
    }
    
    for (const msg of filteredMessages) {
      const role = msg.direction === "inbound" ? "Cliente" : "Marca";
      let messageContent = msg.content.substring(0, 200);
      
      if ((msg as any).mediaType === 'audio') {
        const transcription = (msg as any).mediaTranscription;
        if (transcription && transcription !== '[Audio no reconocible]' && transcription !== '[Transcripción no disponible]') {
          messageContent = `[Audio transcrito]: ${transcription.substring(0, 200)}`;
        } else {
          messageContent = '[Mensaje de audio - transcripción pendiente]';
        }
      } else if ((msg as any).mediaType === 'image') {
        messageContent = msg.content || '[Imagen enviada por el cliente]';
      } else if ((msg as any).mediaType === 'video') {
        messageContent = msg.content || '[Video enviado por el cliente]';
      }
      
      historyContext += `${role}: ${messageContent}\n`;
    }
  }

  const userPromptParts: string[] = [];

  if (historyContext) {
    userPromptParts.push(historyContext);
  }

  let currentMessageContent = message.content;
  if ((message as any).mediaType === 'audio') {
    const transcription = (message as any).mediaTranscription;
    if (transcription && transcription !== '[Audio no reconocible]' && transcription !== '[Transcripción no disponible]') {
      currentMessageContent = `[Audio transcrito]: ${transcription}`;
    } else {
      currentMessageContent = '[Mensaje de audio sin transcripción disponible]';
    }
  } else if ((message as any).mediaType === 'image') {
    currentMessageContent = message.content || '[El cliente envió una imagen]';
  } else if ((message as any).mediaType === 'video') {
    currentMessageContent = message.content || '[El cliente envió un video]';
  }

  userPromptParts.push(`--- MENSAJE A RESPONDER ---
Plataforma: ${platform}
Tipo: ${message.type === "conversation" ? "Mensaje Directo" : "Comentario"}
Autor: ${message.author || "Usuario"}
Contenido: ${currentMessageContent}

Por favor, genera una respuesta apropiada para este mensaje.`);

  return {
    systemPrompt: systemParts.join("\n"),
    userPrompt: userPromptParts.join("\n"),
    characterLimit,
    hardLimit,
  };
}

export function truncateResponse(
  text: string,
  characterLimit: number,
  strategy: "truncate" | "reject" | "summarize"
): { text: string; wasLimited: boolean } {
  if (text.length <= characterLimit) {
    return { text, wasLimited: false };
  }

  switch (strategy) {
    case "reject":
      throw new Error(`La respuesta excede el límite de ${characterLimit} caracteres`);
    
    case "summarize":
      const truncated = text.substring(0, characterLimit - 3) + "...";
      return { text: truncated, wasLimited: true };
    
    case "truncate":
    default:
      const lastSpace = text.lastIndexOf(" ", characterLimit - 3);
      const cutPoint = lastSpace > characterLimit * 0.7 ? lastSpace : characterLimit - 3;
      return { text: text.substring(0, cutPoint) + "...", wasLimited: true };
  }
}

export function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}
