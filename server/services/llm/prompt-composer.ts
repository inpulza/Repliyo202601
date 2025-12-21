import type { AiAgent, Message, Conversation, Brand, SocialPost, ConversationUserSummary } from "@shared/schema";
import { PLATFORM_CHARACTER_LIMITS, getCharacterLimit } from "./types";

/**
 * Instrucciones de longitud óptima por plataforma.
 * Define cómo la IA debe aprovechar los caracteres disponibles en cada red social.
 */
const PLATFORM_LENGTH_GUIDELINES: Record<string, { minWords: number; maxWords: number; style: string }> = {
  youtube: {
    minWords: 50,
    maxWords: 300,
    style: `YOUTUBE permite respuestas AMPLIAS y EXPLICATIVAS (hasta 10,000 caracteres).
- Aprovecha para dar respuestas completas y detalladas.
- Incluye contexto del video cuando sea relevante.
- Puedes usar múltiples párrafos si es necesario.
- Objetivo: 50-300 palabras. Sé informativo y útil.
- No tengas miedo de extenderte si la pregunta lo amerita.`
  },
  facebook: {
    minWords: 30,
    maxWords: 200,
    style: `FACEBOOK permite respuestas moderadamente extensas (hasta 8,000 caracteres para comentarios).
- Puedes dar explicaciones detalladas cuando sea necesario.
- Usa un tono conversacional y cercano.
- Objetivo: 30-200 palabras según la complejidad de la pregunta.`
  },
  instagram: {
    minWords: 20,
    maxWords: 100,
    style: `INSTAGRAM prefiere respuestas concisas pero completas (hasta 2,200 caracteres).
- Sé directo pero amable.
- Puedes usar emojis con moderación si el tono lo permite.
- Objetivo: 20-100 palabras.`
  },
  tiktok: {
    minWords: 5,
    maxWords: 30,
    style: `TIKTOK requiere respuestas MUY CORTAS (máximo 150 caracteres).
- Sé ultra conciso y directo.
- Una o dos frases máximo.
- Objetivo: 5-30 palabras. Sin rodeos.`
  },
  twitter: {
    minWords: 10,
    maxWords: 50,
    style: `TWITTER/X requiere brevedad (máximo 280 caracteres).
- Respuestas puntuales y directas.
- Objetivo: 10-50 palabras.`
  },
  linkedin: {
    minWords: 30,
    maxWords: 150,
    style: `LINKEDIN permite respuestas profesionales y detalladas.
- Tono profesional y constructivo.
- Objetivo: 30-150 palabras.`
  },
  "google-business": {
    minWords: 30,
    maxWords: 150,
    style: `GOOGLE BUSINESS permite respuestas informativas (hasta 4,000 caracteres).
- Sé profesional y útil.
- Incluye información práctica cuando sea relevante.
- Objetivo: 30-150 palabras.`
  },
  default: {
    minWords: 20,
    maxWords: 100,
    style: `Responde de manera completa pero concisa.
- Objetivo: 20-100 palabras según la complejidad.`
  }
};

function getPlatformLengthGuideline(platform: string): string {
  const normalizedPlatform = platform.toLowerCase().trim();
  const guidelines = PLATFORM_LENGTH_GUIDELINES[normalizedPlatform] || PLATFORM_LENGTH_GUIDELINES.default;
  return guidelines.style;
}

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
  isDm: boolean;
  messageType: 'dm' | 'comment';
  timeSinceLastInteraction: number;
  conversationDepth: number;
  relationshipStatus: 'new' | 'active' | 'reengagement';
}

interface SituationContext {
  shouldGreet: boolean;
  intensity: 'low' | 'medium' | 'high';
  instructions: string[];
}

function calculateSituationContext(context: VariableContext): SituationContext {
  const instructions: string[] = [];
  
  const shouldGreet = context.timeSinceLastInteraction > 60 || context.conversationDepth <= 1;
  
  let intensity: 'low' | 'medium' | 'high' = 'low';
  if (context.timeSinceLastInteraction < 5) {
    intensity = 'high';
  } else if (context.timeSinceLastInteraction < 30) {
    intensity = 'medium';
  }
  
  if (!shouldGreet) {
    instructions.push('Conversación ACTIVA. PROHIBIDO saludar (nada de "Hola", "Buenas", etc.). Ve directo al punto.');
  }
  
  if (context.isDm) {
    instructions.push('Esto es un DM privado. Usa tono conversacional de WhatsApp (relajado, cercano).');
  } else {
    instructions.push('Esto es un COMENTARIO público. Sé breve, directo, y cierra con CTA si aplica.');
  }
  
  if (intensity === 'high') {
    instructions.push('El usuario está escribiendo rápido. Responde de forma concisa y directa.');
  }
  
  if (context.relationshipStatus === 'reengagement') {
    instructions.push('Usuario que vuelve después de tiempo. Puedes hacer una breve referencia a la conversación anterior si es relevante.');
  }
  
  return { shouldGreet, intensity, instructions };
}

function buildDynamicPersonalityRules(context: VariableContext, batchedMessageCount?: number): string {
  const rules: string[] = [];
  
  const batchInfo = batchedMessageCount && batchedMessageCount > 1 
    ? `\nMensajes en ráfaga: ${batchedMessageCount} (el usuario envió varios mensajes seguidos)` 
    : '';
  
  rules.push(`[CONTEXTO DE INTERACCIÓN]
Tipo: ${context.messageType === 'dm' ? 'DM (Mensaje Directo Privado)' : 'Comentario Público'}
Tiempo desde última respuesta nuestra: ${context.timeSinceLastInteraction} minutos
Profundidad de conversación: ${context.conversationDepth} mensajes
Estado de relación: ${context.relationshipStatus}${batchInfo}`);

  if (context.isDm) {
    rules.push(`
[MODO CHAT PRIVADO ACTIVADO]
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
    
    if (context.timeSinceLastInteraction < 60 && context.conversationDepth > 1) {
      rules.push(`⚠️ CONVERSACIÓN ACTIVA (hace ${context.timeSinceLastInteraction} min)
   ❌ PROHIBIDO SALUDAR: No uses "Hola", "Hey", "Buenas", ni ningún saludo.
   ✅ Ve directo al grano. Continúa la conversación naturalmente.
   ✅ Puedes usar minúsculas iniciales si encaja con el tono rápido.
   ✅ Ejemplo bueno: "claro, pásame los datos" 
   ❌ Ejemplo malo: "¡Hola! Claro que sí, con mucho gusto..."`);
    } else if (context.relationshipStatus === 'reengagement') {
      rules.push(`👋 REENGAGEMENT (usuario que vuelve)
   ✅ Puedes saludar brevemente: "Hola de nuevo", "Qué tal"
   ✅ No es necesario un saludo elaborado.
   ✅ Puedes hacer referencia breve a conversación anterior si aplica.`);
    } else {
      rules.push(`🆕 CONVERSACIÓN NUEVA
   ✅ Saludo breve permitido: "Hola", "Qué tal"
   ✅ Presentación corta si aplica.`);
    }
    
    rules.push(`
📱 TONO DE DM:
   - Conversacional tipo WhatsApp: cercano, relajado, natural.
   - Está bien usar "oye", "mira", "claro" si el tono lo permite.
   - Respuestas más detalladas están OK si la pregunta lo amerita.
   - NUNCA uses un tono corporativo o rígido en DMs.`);

    // Show batched messages rules if: 
    // 1) batchedMessageCount > 1 (messages were combined in buffer), OR
    // 2) conversationDepth > 1 (there's prior conversation history)
    if (batchedMessageCount && batchedMessageCount > 1) {
      rules.push(`
📦 MENSAJES EN RÁFAGA (${batchedMessageCount} mensajes):
   ⚠️ El usuario envió ${batchedMessageCount} mensajes seguidos antes de que respondieras.
   - Los mensajes vienen etiquetados como [Mensaje 1 de ${batchedMessageCount}], [Mensaje 2 de ${batchedMessageCount}], etc.
   - Lee TODOS los mensajes y comprende la IDEA COMPLETA.
   - NO respondas a cada mensaje por separado.
   - Genera UNA SOLA respuesta coherente que aborde todos los puntos mencionados.
   - Prioriza responder a las preguntas o solicitudes concretas.`);
    } else if (context.conversationDepth > 1) {
      rules.push(`
📦 CONTEXTO DE CONVERSACIÓN:
   - Hay historial previo con este usuario.
   - Lee el contexto completo antes de responder.
   - Mantén continuidad con la conversación anterior.`);
    }
    
  } else {
    rules.push(`
[MODO COMENTARIO PÚBLICO ACTIVADO]
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📢 REGLAS PARA COMENTARIOS:
   - Sé BREVE y DIRECTO (máximo 2-3 líneas).
   - Tono profesional pero accesible.
   - Incluye un CTA cuando aplique: "Escríbenos al DM 📩", "Más info en bio".
   - Emojis permitidos con moderación (1-2 máximo).
   - Evita respuestas largas o conversacionales en público.`);
  }

  return rules.join('\n');
}

function buildSituationCard(context: VariableContext): string {
  const situation = calculateSituationContext(context);
  
  return `
[FICHA_DE_SITUACIÓN]
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Tipo: ${context.messageType}
Estado: ${context.relationshipStatus}
Profundidad: ${context.conversationDepth} mensajes
Última respuesta nuestra: hace ${context.timeSinceLastInteraction} minutos
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

[INSTRUCCIONES_AUTOMÁTICAS]
${situation.instructions.map(i => `• ${i}`).join('\n')}
`;
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
  dynamicLimit?: number,
  conversationHistory?: Message[]
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
  
  const isDm = message.type === 'conversation';
  const messageType: 'dm' | 'comment' = isDm ? 'dm' : 'comment';
  
  let timeSinceLastInteraction = 999;
  let conversationDepth = 1;
  
  if (conversationHistory && conversationHistory.length > 0) {
    conversationDepth = conversationHistory.length + 1;
    
    const lastOutbound = [...conversationHistory]
      .reverse()
      .find(m => m.direction === 'outbound');
    
    if (lastOutbound?.timestamp) {
      const lastOutboundTime = new Date(lastOutbound.timestamp).getTime();
      const now = Date.now();
      timeSinceLastInteraction = Math.floor((now - lastOutboundTime) / 60000);
    }
  }
  
  let relationshipStatus: 'new' | 'active' | 'reengagement' = 'new';
  if (conversationDepth > 1) {
    if (timeSinceLastInteraction <= 60) {
      relationshipStatus = 'active';
    } else {
      relationshipStatus = 'reengagement';
    }
  }
  
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
    isDm,
    messageType,
    timeSinceLastInteraction,
    conversationDepth,
    relationshipStatus,
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
  result = result.replace(/\{\{\s*is_dm\s*\}\}/g, String(context.isDm));
  result = result.replace(/\{\{\s*message_type\s*\}\}/g, context.messageType);
  result = result.replace(/\{\{\s*time_since_last_interaction\s*\}\}/g, String(context.timeSinceLastInteraction));
  result = result.replace(/\{\{\s*conversation_depth\s*\}\}/g, String(context.conversationDepth));
  result = result.replace(/\{\{\s*relationship_status\s*\}\}/g, context.relationshipStatus);
  
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
  result = result.replace(/\{\{\s*is_dm\s*\}\}/g, String(context.isDm));
  result = result.replace(/\{\{\s*message_type\s*\}\}/g, context.messageType);
  result = result.replace(/\{\{\s*time_since_last_interaction\s*\}\}/g, String(context.timeSinceLastInteraction));
  result = result.replace(/\{\{\s*conversation_depth\s*\}\}/g, String(context.conversationDepth));
  result = result.replace(/\{\{\s*relationship_status\s*\}\}/g, context.relationshipStatus);
  
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

  const variableContext = buildVariableContext(message, conversation, socialPost, brand, agent, characterLimit, conversationHistory);

  const useJsonMode = agent.provider === 'openai';
  
  // Extract batched message count if present (set by autoReplyService when combining buffered DMs)
  const batchedMessageCount = (message as any).batchedMessageCount as number | undefined;

  const systemPrompt = buildSystemPromptV53(variableContext, brand, useJsonMode, batchedMessageCount);
  
  const situationCard = buildSituationCard(variableContext);
  
  const batchInfo = batchedMessageCount && batchedMessageCount > 1 
    ? `\nMensajes agrupados: ${batchedMessageCount}` 
    : '';
  
  console.log(`[PromptComposer] 📋 FICHA DE SITUACIÓN generada para ${message.author || 'usuario'}:
━━━━━━━━━━━━━━━━━━━━━━━━
Tipo: ${variableContext.messageType}
Estado: ${variableContext.relationshipStatus}
Profundidad: ${variableContext.conversationDepth} mensajes
Última respuesta: hace ${variableContext.timeSinceLastInteraction} min
isDM: ${variableContext.isDm}${batchInfo}
━━━━━━━━━━━━━━━━━━━━━━━━`);

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

  userPromptParts.push(situationCard);

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

function buildSystemPromptV53(context: VariableContext, brand?: Brand, useJsonMode: boolean = false, batchedMessageCount?: number): string {
  const parts: string[] = [];
  const platformGuideline = getPlatformLengthGuideline(context.platform);
  const dynamicRules = buildDynamicPersonalityRules(context, batchedMessageCount);

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

  <dynamic_personality_rules>
    ${dynamicRules}
  </dynamic_personality_rules>

  <platform_length_guidelines>
    ${platformGuideline}
  </platform_length_guidelines>

  <knowledge_base>
    ${context.knowledgeBase || 'Sin base de conocimiento configurada.'}
  </knowledge_base>

  <thinking_protocol>
    1. CHECK TIPO MENSAJE: ¿Es DM o Comentario? Aplica las reglas dinámicas arriba.
    2. CHECK SALUDO: ¿Debo saludar? Revisa el contexto de interacción.
    3. CHECK PLATAFORMA: Ajusta la longitud según las guías de ${context.platform}.
    4. CHECK LÍMITE: Tu respuesta < ${context.dynamicLimit} caracteres.
    5. REDACCIÓN: Escribe aprovechando el espacio disponible según la plataforma.
  </thinking_protocol>

  <output_schema>
    Responde SOLO con este formato JSON:
    {
      "thought": "Análisis: tipo=${context.messageType}, tiempo=${context.timeSinceLastInteraction}min, debo_saludar=...",
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

    parts.push(`\n${dynamicRules}`);

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

    parts.push(`\n--- GUÍA DE LONGITUD PARA ${context.platform.toUpperCase()} ---
${platformGuideline}`);

    parts.push(`\n--- LÍMITES TÉCNICOS ---
- El límite máximo de caracteres para ${context.platform} es ${context.dynamicLimit} caracteres.
- Tu respuesta DEBE ser menor a ${context.dynamicLimit} caracteres.
- APROVECHA el espacio disponible según las guías de la plataforma.
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
  strategy: "reject" | "summarize"
): { text: string; wasLimited: boolean } {
  if (text.length <= characterLimit) {
    return { text, wasLimited: false };
  }

  switch (strategy) {
    case "reject":
      throw new Error(`La respuesta excede el límite de ${characterLimit} caracteres (${text.length} caracteres generados). Ajusta el prompt o reduce maxTokens.`);
    
    case "summarize":
    default:
      // Estrategia inteligente: cortar en punto o espacio natural
      const maxLen = characterLimit - 3;
      
      // Intentar cortar en un punto final de oración
      const lastPeriod = text.lastIndexOf(".", maxLen);
      const lastQuestion = text.lastIndexOf("?", maxLen);
      const lastExclamation = text.lastIndexOf("!", maxLen);
      const lastSentenceEnd = Math.max(lastPeriod, lastQuestion, lastExclamation);
      
      // Si hay un fin de oración en el último 60% del texto, cortar ahí
      if (lastSentenceEnd > maxLen * 0.6) {
        return { text: text.substring(0, lastSentenceEnd + 1), wasLimited: true };
      }
      
      // Si no, cortar en el último espacio
      const lastSpace = text.lastIndexOf(" ", maxLen);
      if (lastSpace > maxLen * 0.7) {
        return { text: text.substring(0, lastSpace) + "...", wasLimited: true };
      }
      
      // Último recurso: cortar directamente
      return { text: text.substring(0, maxLen) + "...", wasLimited: true };
  }
}

export function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}
