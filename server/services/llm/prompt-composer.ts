import type { AiAgent, Message, Conversation, Brand, SocialPost, ConversationUserSummary } from "@shared/schema";
import { PLATFORM_CHARACTER_LIMITS, getCharacterLimit } from "./types";

interface PromptContext {
  agent: AiAgent;
  message: Message;
  conversation?: Conversation;
  brand?: Brand;
  conversationHistory?: Message[];
  socialPost?: SocialPost | null;
  userSummary?: ConversationUserSummary | null;
}

interface VariableContext {
  username: string;
  platform: string;
  comment: string;
  postContext: string;
  businessName: string;
  dynamicLimit: number;
  agentPersona: string;
  userGuardrails: string;
  knowledgeBase: string;
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
  socialPost?: SocialPost | null,
  brand?: Brand,
  agent?: AiAgent,
  dynamicLimit?: number
): VariableContext {
  const platform = (message.platform || 'default').toLowerCase().trim();
  const username = formatUsername(message.author || 'Usuario', platform);
  const comment = message.content || '';
  
  let postContext = '';
  if (socialPost?.caption) {
    postContext = socialPost.caption;
  } else if (message.type === 'conversation' && !socialPost) {
    postContext = 'Este es un mensaje directo privado.';
  } else if (message.type === 'comment' && !socialPost?.caption) {
    postContext = '[Comentario en publicación - caption no disponible. Responde basándote solo en el mensaje del usuario]';
  }
  
  const businessName = brand?.name || 'la marca';
  const limit = dynamicLimit || 2000;
  
  const baseContext: VariableContext = {
    username,
    platform,
    comment,
    postContext,
    businessName,
    dynamicLimit: limit,
    agentPersona: '',
    userGuardrails: '',
    knowledgeBase: '',
  };
  
  const rawAgentPersona = agent?.systemPrompt || 'Responde de manera profesional y amable.';
  const rawUserGuardrails = agent?.guardrailPrompt || '';
  const rawKnowledgeBase = agent?.knowledgeBase || '';
  
  baseContext.agentPersona = replaceVariablesBasic(rawAgentPersona, baseContext);
  baseContext.userGuardrails = replaceVariablesBasic(rawUserGuardrails, baseContext);
  baseContext.knowledgeBase = replaceVariablesBasic(rawKnowledgeBase, baseContext);
  
  return baseContext;
}

function replaceVariablesBasic(text: string, context: VariableContext): string {
  let result = text;
  
  result = result.replace(/\{\{\s*username\s*\}\}/g, context.username);
  result = result.replace(/\{\{\s*platform\s*\}\}/g, context.platform);
  result = result.replace(/\{\{\s*comment\s*\}\}/g, context.comment);
  result = result.replace(/\{\{\s*post_context\s*\}\}/g, context.postContext);
  result = result.replace(/\{\{\s*business_name\s*\}\}/g, context.businessName);
  result = result.replace(/\{\{\s*dynamic_limit\s*\}\}/g, String(context.dynamicLimit));
  
  return result;
}

export function replaceVariables(text: string, context: VariableContext): string {
  let result = text;
  
  result = result.replace(/\{\{\s*username\s*\}\}/g, context.username);
  result = result.replace(/\{\{\s*platform\s*\}\}/g, context.platform);
  result = result.replace(/\{\{\s*comment\s*\}\}/g, context.comment);
  result = result.replace(/\{\{\s*post_context\s*\}\}/g, context.postContext);
  result = result.replace(/\{\{\s*business_name\s*\}\}/g, context.businessName);
  result = result.replace(/\{\{\s*dynamic_limit\s*\}\}/g, String(context.dynamicLimit));
  result = result.replace(/\{\{\s*agent_persona\s*\}\}/g, context.agentPersona);
  result = result.replace(/\{\{\s*user_guardrails\s*\}\}/g, context.userGuardrails);
  result = result.replace(/\{\{\s*knowledge_base\s*\}\}/g, context.knowledgeBase);
  
  return result;
}

export function composePrompt(context: PromptContext): {
  systemPrompt: string;
  userPrompt: string;
  characterLimit: number;
  hardLimit: number;
  useJsonMode: boolean;
} {
  const { agent, message, conversation, brand, conversationHistory, socialPost, userSummary } = context;
  
  const platform = message.platform || "default";
  const messageType = message.type || "comment";
  
  const { safeLimit, hardLimit } = getCharacterLimit(platform, messageType);
  const characterLimit = safeLimit;

  const variableContext = buildVariableContext(message, conversation, socialPost, brand, agent, characterLimit);

  const useJsonMode = agent.provider === 'openai';

  const systemPrompt = buildSystemPromptV53(variableContext, brand, useJsonMode);

  let summaryContext = "";
  if (userSummary && userSummary.summary) {
    summaryContext = `\n--- RESUMEN DE CONVERSACIÓN ANTERIOR ---
(Este es un resumen consolidado de interacciones previas con ${message.author || 'este usuario'})
${userSummary.summary}
--- FIN DEL RESUMEN ---\n`;
  }

  let historyContext = "";
  if (conversationHistory && conversationHistory.length > 0) {
    const filteredMessages = filterHistoryByAuthor(conversationHistory, message, messageType);
    
    if (filteredMessages.length > 0) {
      historyContext = "\n--- HISTORIAL RECIENTE DE CONVERSACIÓN ---\n";
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

  if (summaryContext) {
    userPromptParts.push(summaryContext);
  }

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
    systemPrompt,
    userPrompt: userPromptParts.join("\n"),
    characterLimit,
    hardLimit,
    useJsonMode,
  };
}

function buildSystemPromptV53(context: VariableContext, brand?: Brand, useJsonMode: boolean = false): string {
  const parts: string[] = [];

  if (useJsonMode) {
    parts.push(`<system_core>
  <meta_instructions>
    Modo: Strict JSON.
    Output: Machine-parsable object.
  </meta_instructions>

  <agent_identity>
    ${context.agentPersona}
    (Role: Social Media Manager para ${context.businessName})
  </agent_identity>

  <context_layer>
    Plataforma: ${context.platform}
    Usuario: ${context.username}
    Contexto Post: ${context.postContext}
    LÍMITE TÉCNICO: ${context.dynamicLimit} caracteres.
  </context_layer>

  <knowledge_base>
    ${context.knowledgeBase || 'Sin base de conocimiento configurada.'}
  </knowledge_base>

  <thinking_protocol>
    1. CHECK LÍMITE: Tu respuesta < ${context.dynamicLimit} caracteres.
    2. CHECK CONTEXTO: Si falta info del post, sé genérico.
    3. REDACCIÓN: Escribe y valida longitud.
  </thinking_protocol>

  <output_schema>
    Responde SOLO con este formato JSON:
    {
      "thought": "Análisis de plataforma y longitud realizado...",
      "reply": "Texto final de la respuesta aquí"
    }
  </output_schema>

  <safety_lock>
    ${context.userGuardrails || 'Responde de manera profesional y respetuosa.'}
    - CRÍTICO: Si te pasas de ${context.dynamicLimit} caracteres, corta o resume.
    - IDIOMA: Responde EXACTAMENTE en el mismo idioma que el mensaje del usuario.
  </safety_lock>

  <memory_rules>
    ⚠️ PROHIBIDO decir "No tengo acceso a mensajes anteriores" o similar.
    ✅ TIENES ACCESO COMPLETO al historial proporcionado abajo.
    - Usa el historial para responder con contexto.
    - Si el cliente pregunta sobre algo previo, responde basándote en el historial.
  </memory_rules>
</system_core>`);
  } else {
    parts.push(context.agentPersona);
    parts.push(`\nEres el Social Media Manager para ${context.businessName}.`);

    if (context.userGuardrails) {
      parts.push(`\n--- REGLAS IMPORTANTES ---\n${context.userGuardrails}`);
    }

    if (context.knowledgeBase) {
      parts.push(`\n--- BASE DE CONOCIMIENTO ---\n${context.knowledgeBase}`);
    }

    if (brand?.tone) {
      parts.push(`\n--- TONO DE COMUNICACIÓN ---\nUsa un tono ${brand.tone}.`);
    }

    if (brand?.businessContext) {
      parts.push(`\n--- CONTEXTO DEL NEGOCIO ---\n${brand.businessContext}`);
    }

    parts.push(`\n--- LÍMITES TÉCNICOS ---
- El límite de caracteres para ${context.platform} es ${context.dynamicLimit} caracteres.
- Tu respuesta DEBE ser menor a ${context.dynamicLimit} caracteres.
- Mantén el idioma del mensaje original.
- IMPORTANTE: Completa siempre tus oraciones. No dejes frases a medias.`);

    parts.push(`\n--- REGLA CRÍTICA: MEMORIA DE CONVERSACIÓN ---
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
  }

  return parts.join("\n");
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
