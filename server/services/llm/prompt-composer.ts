import type { AiAgent, Message, Conversation, Brand } from "@shared/schema";
import { PLATFORM_CHARACTER_LIMITS } from "./types";

interface PromptContext {
  agent: AiAgent;
  message: Message;
  conversation?: Conversation;
  brand?: Brand;
  conversationHistory?: Message[];
}

export function composePrompt(context: PromptContext): {
  systemPrompt: string;
  userPrompt: string;
  characterLimit: number;
} {
  const { agent, message, conversation, brand, conversationHistory } = context;
  
  const platform = message.platform || "default";
  const characterLimit = PLATFORM_CHARACTER_LIMITS[platform] || PLATFORM_CHARACTER_LIMITS.default;

  const systemParts: string[] = [];

  if (agent.systemPrompt) {
    systemParts.push(agent.systemPrompt);
  } else {
    systemParts.push(`Eres un asistente de atención al cliente para ${brand?.name || "la marca"}.`);
  }

  if (agent.guardrailPrompt) {
    systemParts.push(`\n--- REGLAS IMPORTANTES ---\n${agent.guardrailPrompt}`);
  }

  if (agent.knowledgeBase) {
    systemParts.push(`\n--- BASE DE CONOCIMIENTO ---\n${agent.knowledgeBase}`);
  }

  if (brand?.tone) {
    systemParts.push(`\n--- TONO DE COMUNICACIÓN ---\nUsa un tono ${brand.tone}.`);
  }

  if (brand?.businessContext) {
    systemParts.push(`\n--- CONTEXTO DEL NEGOCIO ---\n${brand.businessContext}`);
  }

  systemParts.push(`\n--- INSTRUCCIONES DE RESPUESTA ---
- Genera una respuesta completa y útil. Puedes extenderte si es necesario para responder adecuadamente.
- El límite de caracteres para ${platform} es ${characterLimit} caracteres.
- Tu respuesta DEBE ser menor a ${characterLimit} caracteres.
- No incluyas saludos formales innecesarios si el mensaje es casual.
- Mantén el idioma del mensaje original.
- NO uses hashtags ni emojis excesivos a menos que sea apropiado para el contexto.
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
