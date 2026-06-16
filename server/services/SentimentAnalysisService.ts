import { storage } from "../storage";
import { log } from "../app";
import { createLLMProvider } from "./llm/factory";
import { SentimentAlertRepository } from "../repositories/SentimentAlertRepository";
import { websocketService } from "./websocketService";
import type { AiAgent, InsertSentimentAlert } from "@shared/schema";

interface SentimentAnalysisResult {
  sentiment: 'critical' | 'negative' | 'neutral' | 'positive';
  severity: 'P1' | 'P2' | 'P3' | 'P4';
  category: string;
  reason: string;
  confidence: number;
}

interface AnalysisOutcome {
  success: boolean;
  result?: SentimentAnalysisResult;
  alertCreated: boolean;
  error?: string;
}

const SENTIMENT_ANALYSIS_PROMPT = `Eres un analista experto en gestión de crisis para redes sociales. Tu trabajo es clasificar mensajes entrantes de clientes según su sentimiento y nivel de urgencia/crisis.

NIVELES DE SEVERIDAD:
- P1 (CRÍTICO): Amenazas legales, problemas de seguridad del paciente/cliente, difamación pública viral, amenazas regulatorias (IRS, FDA, etc.), riesgo financiero grave. Requiere atención INMEDIATA.
- P2 (ALTO): Quejas serias con potencial viral, clientes influyentes molestos, fallos graves de servicio, múltiples quejas similares, amenazas de abandonar la marca públicamente.
- P3 (MEDIO): Quejas individuales moderadas, insatisfacción sin componente viral, problemas recurrentes pero manejables.
- P4 (BAJO): Feedback neutral/positivo, preguntas generales, quejas menores, sugerencias constructivas.

CATEGORÍAS DE CRISIS:
- legal_threat: Amenazas legales, menciones de abogados, demandas, reguladores
- safety_concern: Problemas de seguridad física, salud del paciente/cliente
- service_failure: Fallos graves del servicio, errores profesionales, negligencia
- reputation_damage: Comentarios que dañan la reputación pública de la marca
- customer_churn: Clientes que anuncian que se van o piden no ser contactados
- misinformation: Información falsa sobre la marca circulando
- regulatory_risk: Problemas con reguladores, compliance, IRS, licencias
- general_complaint: Queja general sin componente de crisis
- other: No encaja en ninguna categoría

INSTRUCCIONES:
1. Analiza el contenido del mensaje con atención al contexto cultural (español, inglés, spanglish)
2. Identifica palabras clave de crisis: "abogado", "demanda", "IRS", "nunca más", "pésimo", "peligroso", "denuncia", "estafa", etc.
3. Considera el tono emocional y la intensidad del lenguaje
4. Si hay duda entre dos niveles, elige el MÁS URGENTE (mejor una falsa alarma que perder una crisis real)

RESPONDE SOLO con JSON válido (sin markdown, sin backticks):
{
  "sentiment": "critical|negative|neutral|positive",
  "severity": "P1|P2|P3|P4",
  "category": "una de las categorías listadas",
  "reason": "explicación breve de por qué esta clasificación",
  "confidence": 0.0-1.0
}

MENSAJE A ANALIZAR:
`;

class SentimentAnalysisServiceClass {
  private parseAnalysisResult(response: string): SentimentAnalysisResult {
    const defaults: SentimentAnalysisResult = {
      sentiment: 'neutral',
      severity: 'P4',
      category: 'other',
      reason: 'No se pudo analizar el mensaje',
      confidence: 0,
    };

    try {
      const cleanResponse = response
        .replace(/```json\n?/g, '')
        .replace(/```\n?/g, '')
        .trim();

      const parsed = JSON.parse(cleanResponse);

      const validSentiments = ['critical', 'negative', 'neutral', 'positive'];
      const validSeverities = ['P1', 'P2', 'P3', 'P4'];
      const validCategories = [
        'legal_threat', 'safety_concern', 'service_failure',
        'reputation_damage', 'customer_churn', 'misinformation',
        'regulatory_risk', 'general_complaint', 'other',
      ];

      return {
        sentiment: validSentiments.includes(parsed.sentiment) ? parsed.sentiment : 'neutral',
        severity: validSeverities.includes(parsed.severity) ? parsed.severity : 'P4',
        category: validCategories.includes(parsed.category) ? parsed.category : 'other',
        reason: typeof parsed.reason === 'string' ? parsed.reason.substring(0, 500) : 'Sin razón proporcionada',
        confidence: typeof parsed.confidence === 'number' ? Math.min(1, Math.max(0, parsed.confidence)) : 0.5,
      };
    } catch (error) {
      log(`[SentimentAnalysis] Failed to parse LLM response: ${response}`, "sync");
      return defaults;
    }
  }

  async analyzeMessage(
    messageContent: string,
    brandId: string,
    agent: AiAgent | null
  ): Promise<SentimentAnalysisResult | null> {
    if (!messageContent || messageContent.length < 5) {
      return null;
    }

    if (!agent) {
      return null;
    }

    try {
      const secrets = {
        openaiApiKey: process.env.OPENAI_API_KEY,
        geminiApiKey: process.env.GEMINI_API_KEY,
      };

      let llm;
      try {
        llm = createLLMProvider(agent, secrets);
      } catch (providerError) {
        log(`[SentimentAnalysis] Cannot create LLM provider: ${providerError}`, "sync");
        return null;
      }

      const response = await llm.generateRawCompletion(
        SENTIMENT_ANALYSIS_PROMPT,
        messageContent,
        { temperature: 0, maxTokens: 300 }
      );

      return this.parseAnalysisResult(response.text);
    } catch (error) {
      log(`[SentimentAnalysis] Error analyzing message: ${error}`, "sync");
      return null;
    }
  }

  async processInboundMessage(
    messageId: string,
    messageContent: string,
    brandId: string,
    conversationId: string,
    platform: string,
    author: string,
    messageTimestamp: Date
  ): Promise<AnalysisOutcome> {
    if (!messageContent || messageContent.length < 5) {
      return { success: false, alertCreated: false, error: 'Message too short' };
    }

    try {
      const agent = await storage.getAiAgentByBrand(brandId);
      if (!agent) {
        return { success: false, alertCreated: false, error: 'No AI agent configured' };
      }

      const result = await this.analyzeMessage(messageContent, brandId, agent);
      if (!result) {
        return { success: false, alertCreated: false, error: 'Analysis returned null' };
      }

      try {
        await storage.updateMessage(messageId, {
          sentiment: result.sentiment,
          urgency: result.severity,
        });
      } catch (updateErr) {
        log(`[SentimentAnalysis] Error updating message fields: ${updateErr}`, "sync");
      }

      let alertCreated = false;

      if (result.severity === 'P1' || result.severity === 'P2') {
        try {
          const existingAlert = await SentimentAlertRepository.getByMessageId(messageId);
          if (!existingAlert) {
            const alertData: InsertSentimentAlert = {
              brandId,
              messageId,
              conversationId,
              severity: result.severity,
              sentiment: result.sentiment,
              category: result.category,
              reason: result.reason,
              confidence: result.confidence,
              status: 'new',
              platform,
              messageAuthor: author,
              messagePreview: messageContent.substring(0, 200),
              messageTimestamp,
            };

            const alert = await SentimentAlertRepository.create(alertData);
            alertCreated = true;

            log(`[SentimentAnalysis] 🚨 ${result.severity} ALERT created for message ${messageId}: ${result.category} - ${result.reason}`, "sync");

            try {
              websocketService.notifyCrisisAlert(brandId, {
                alert,
                severity: result.severity,
                category: result.category,
                reason: result.reason,
                messageAuthor: author,
                messagePreview: messageContent.substring(0, 200),
                platform,
                conversationId,
                messageId,
              });
            } catch (wsErr) {
              log(`[SentimentAnalysis] WebSocket notification error: ${wsErr}`, "sync");
            }
          }
        } catch (alertErr) {
          log(`[SentimentAnalysis] Error creating alert: ${alertErr}`, "sync");
        }
      }

      return { success: true, result, alertCreated };
    } catch (error) {
      log(`[SentimentAnalysis] processInboundMessage error: ${error}`, "sync");
      return {
        success: false,
        alertCreated: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }
}

export const sentimentAnalysisService = new SentimentAnalysisServiceClass();
