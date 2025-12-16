import { storage } from "../storage";
import { log } from "../app";
import type { AiAgent, Message, Conversation } from "@shared/schema";
import OpenAI from "openai";
import { GoogleGenAI } from "@google/genai";

const SUMMARY_TRIGGER_THRESHOLD = 15;
const SUMMARY_MAX_CHARS = 2000;

interface SummaryResult {
  success: boolean;
  summary?: string;
  skippedReason?: string;
  error?: string;
}

interface AgentSecrets {
  openaiApiKey?: string;
  geminiApiKey?: string;
}

const SUMMARIZER_SYSTEM_PROMPT = `Eres un gestor de expedientes de clientes. Tu tarea es ACTUALIZAR el resumen existente con la nueva información.

REGLAS ABSOLUTAS:
1. PRESERVA SIEMPRE: Nombres, teléfonos, correos, fechas, precios, productos específicos
2. CONSOLIDA: Si un tema se resolvió, actualiza el estado (ej. "buscaba zapatos" → "compró zapatos talla 42")
3. ELIMINA: Solo la "paja" conversacional (saludos, agradecimientos repetidos)
4. ESTILO: Telegráfico, denso en datos. Usa viñetas o puntos.
5. EN DUDA: Conserva. Mejor largo que perder datos.
6. IDIOMA: Mantén el idioma del cliente.
7. LONGITUD: Máximo 500 tokens (~2000 caracteres). Sé conciso.

Output: Resumen actualizado y consolidado.`;

class ConversationSummaryService {
  private secrets: AgentSecrets = {
    openaiApiKey: process.env.OPENAI_API_KEY,
    geminiApiKey: process.env.GEMINI_API_KEY,
  };

  async checkAndGenerateSummary(conversationId: string): Promise<SummaryResult> {
    const logPrefix = `[SummaryService] Conv ${conversationId}:`;

    try {
      const conversation = await storage.getConversation(conversationId);
      if (!conversation) {
        log(`${logPrefix} Conversation not found`, "sync");
        return { success: false, error: "Conversation not found" };
      }

      const agent = await storage.getAiAgentByBrand(conversation.brandId);
      if (!agent) {
        log(`${logPrefix} No AI agent configured, skipping summary`, "sync");
        return { success: false, skippedReason: "no_agent" };
      }

      const newMessagesCount = await storage.countMessagesAfterMessageId(
        conversationId,
        conversation.summaryLastMessageId
      );

      log(`${logPrefix} ${newMessagesCount} new messages since last summary`, "sync");

      if (newMessagesCount < SUMMARY_TRIGGER_THRESHOLD) {
        log(`${logPrefix} Not enough messages (${newMessagesCount}/${SUMMARY_TRIGGER_THRESHOLD}), skipping`, "sync");
        return { success: false, skippedReason: `threshold_not_met_${newMessagesCount}` };
      }

      log(`${logPrefix} Generating summary (${newMessagesCount} new messages)...`, "sync");
      const result = await this.generateSummary(conversation, agent);

      if (result.success && result.summary) {
        log(`${logPrefix} Summary generated successfully (${result.summary.length} chars)`, "sync");
      }

      return result;
    } catch (error: any) {
      log(`${logPrefix} Error: ${error.message}`, "sync");
      return { success: false, error: error.message };
    }
  }

  private async generateSummary(conversation: Conversation, agent: AiAgent): Promise<SummaryResult> {
    const logPrefix = `[SummaryService] Conv ${conversation.id}:`;

    const newMessages = await storage.getMessagesAfterMessageId(
      conversation.id,
      conversation.summaryLastMessageId
    );

    if (newMessages.length === 0) {
      return { success: false, skippedReason: "no_new_messages" };
    }

    const currentSummary = conversation.conversationSummary || "";
    const formattedMessages = this.formatMessagesForSummary(newMessages);
    const userPrompt = this.buildSummaryPrompt(currentSummary, formattedMessages);

    try {
      const provider = agent.provider || "openai";
      let summaryText: string;

      if (provider === "gemini") {
        summaryText = await this.callGeminiForSummary(userPrompt, agent);
      } else {
        summaryText = await this.callOpenAIForSummary(userPrompt, agent);
      }

      const trimmedSummary = this.trimSummary(summaryText);
      const lastMessage = newMessages[newMessages.length - 1];

      await storage.updateConversationSummary(
        conversation.id,
        trimmedSummary,
        lastMessage.id
      );

      log(`${logPrefix} Summary saved (${trimmedSummary.length} chars, lastMsgId: ${lastMessage.id})`, "sync");

      return { success: true, summary: trimmedSummary };
    } catch (error: any) {
      log(`${logPrefix} LLM error: ${error.message}`, "sync");
      return { success: false, error: error.message };
    }
  }

  private async callOpenAIForSummary(userPrompt: string, agent: AiAgent): Promise<string> {
    const platformSettings = (agent.platformSettings as Record<string, unknown>) || {};
    const apiKey = 
      (platformSettings.openaiApiKey as string) ||
      this.secrets.openaiApiKey ||
      process.env.OPENAI_API_KEY;

    if (!apiKey) {
      throw new Error("No OpenAI API key configured");
    }

    const client = new OpenAI({ apiKey });
    const model = agent.model || "gpt-4o-mini";

    const response = await client.chat.completions.create({
      model,
      messages: [
        { role: "system", content: SUMMARIZER_SYSTEM_PROMPT },
        { role: "user", content: userPrompt },
      ],
      max_tokens: 600,
      temperature: 0.3,
    });

    return response.choices[0]?.message?.content || "";
  }

  private async callGeminiForSummary(userPrompt: string, agent: AiAgent): Promise<string> {
    const platformSettings = (agent.platformSettings as Record<string, unknown>) || {};
    const apiKey = 
      (platformSettings.geminiApiKey as string) ||
      this.secrets.geminiApiKey ||
      process.env.GEMINI_API_KEY;

    if (!apiKey) {
      throw new Error("No Gemini API key configured");
    }

    const client = new GoogleGenAI({ apiKey });
    const model = agent.model || "gemini-2.5-flash";

    const response = await client.models.generateContent({
      model,
      config: {
        systemInstruction: SUMMARIZER_SYSTEM_PROMPT,
        maxOutputTokens: 600,
        temperature: 0.3,
      },
      contents: userPrompt,
    });

    return response.text || "";
  }

  private trimSummary(summary: string): string {
    let result = summary.trim();
    
    if (result.length <= SUMMARY_MAX_CHARS) {
      return result;
    }

    result = result.substring(0, SUMMARY_MAX_CHARS);
    
    const lastNewline = result.lastIndexOf('\n');
    const lastBullet = Math.max(
      result.lastIndexOf('\n•'),
      result.lastIndexOf('\n-'),
      result.lastIndexOf('\n*')
    );
    
    if (lastBullet > SUMMARY_MAX_CHARS * 0.7) {
      result = result.substring(0, lastBullet);
    } else if (lastNewline > SUMMARY_MAX_CHARS * 0.7) {
      result = result.substring(0, lastNewline);
    }

    return result.trim();
  }

  private formatMessagesForSummary(messages: Message[]): string {
    return messages.map((msg) => {
      const role = msg.direction === "inbound" ? "Cliente" : "Marca";
      let content = msg.content || "";

      if (msg.mediaType === "audio" && msg.mediaTranscription) {
        content = `[Audio]: ${msg.mediaTranscription}`;
      } else if (msg.mediaType === "image") {
        content = content || "[Imagen enviada]";
      } else if (msg.mediaType === "video") {
        content = content || "[Video enviado]";
      }

      return `${role}: ${content.substring(0, 300)}`;
    }).join("\n");
  }

  private buildSummaryPrompt(currentSummary: string, newMessages: string): string {
    if (currentSummary) {
      return `--- RESUMEN EXISTENTE ---
${currentSummary}

--- NUEVOS MENSAJES A INCORPORAR ---
${newMessages}

Genera un resumen ACTUALIZADO que combine el resumen existente con la nueva información. Mantén formato de viñetas.`;
    }

    return `--- CONVERSACIÓN A RESUMIR ---
${newMessages}

Genera un resumen inicial de esta conversación. Usa viñetas o puntos para organizar la información.`;
  }
}

export const conversationSummaryService = new ConversationSummaryService();
