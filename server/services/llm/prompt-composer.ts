import type { AiAgent, Message, Conversation, Brand, SocialPost } from "@shared/schema";
import { PLATFORM_CHARACTER_LIMITS } from "./types";

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
  const needsAtSymbol = platform === 'instagram' || platform === 'tiktok';
  
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
  const platform = message.platform || 'default';
  const username = formatUsername(message.author || 'Usuario', platform);
  const comment = message.content || '';
  
  let postContext = '';
  if (socialPost?.caption) {
    postContext = socialPost.caption;
  } else if (message.type === 'conversation') {
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
  
  result = result.replace(/\{\{username\}\}/g, context.username);
  result = result.replace(/\{\{platform\}\}/g, context.platform);
  result = result.replace(/\{\{comment\}\}/g, context.comment);
  result = result.replace(/\{\{post_context\}\}/g, context.postContext);
  
  return result;
}

export function composePrompt(context: PromptContext): {
  systemPrompt: string;
  userPrompt: string;
  characterLimit: number;
} {
  const { agent, message, conversation, brand, conversationHistory, socialPost } = context;
  
  const platform = message.platform || "default";
  const characterLimit = PLATFORM_CHARACTER_LIMITS[platform] || PLATFORM_CHARACTER_LIMITS.default;

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

  let historyContext = "";
  if (conversationHistory && conversationHistory.length > 0) {
    const recentMessages = conversationHistory.slice(-5);
    historyContext = "\n--- HISTORIAL DE CONVERSACIÓN ---\n";
    for (const msg of recentMessages) {
      const role = msg.direction === "inbound" ? "Cliente" : "Marca";
      historyContext += `${role}: ${msg.content.substring(0, 200)}\n`;
    }
  }

  const userPromptParts: string[] = [];

  if (historyContext) {
    userPromptParts.push(historyContext);
  }

  userPromptParts.push(`--- MENSAJE A RESPONDER ---
Plataforma: ${platform}
Tipo: ${message.type === "conversation" ? "Mensaje Directo" : "Comentario"}
Autor: ${message.author || "Usuario"}
Contenido: ${message.content}

Por favor, genera una respuesta apropiada para este mensaje.`);

  return {
    systemPrompt: systemParts.join("\n"),
    userPrompt: userPromptParts.join("\n"),
    characterLimit,
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
