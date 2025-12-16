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
    const recentMessages = conversationHistory.slice(-10);
    historyContext = "\n--- HISTORIAL DE CONVERSACIÓN ---\n";
    for (const msg of recentMessages) {
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
