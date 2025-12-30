import { storage } from "../storage";
import { log } from "../app";
import { createLLMProvider } from "./llm/factory";
import type { AiAgent } from "@shared/schema";

interface ExtractedFields {
  serviceInterest: string | null;
  budgetAmount: number | null;
  budgetCurrency: string | null;
  intent: string | null;
  qualifiers: string[];
}

interface EnrichmentResult {
  success: boolean;
  fields: ExtractedFields;
  error?: string;
}

interface BackfillStats {
  contactsProcessed: number;
  contactsEnriched: number;
  limboProcessed: number;
  limboEnriched: number;
  errors: number;
}

interface CustomFieldsData {
  serviceInterest?: string;
  budgetAmount?: number;
  budgetCurrency?: string;
  intent?: string | null;
  qualifiers?: string[];
  lastEnrichedAt?: string;
  enrichmentSource?: string;
  [key: string]: any;
}

const EXTRACTION_PROMPT = `Analiza el siguiente mensaje de un cliente y extrae información estructurada.

INSTRUCCIONES:
1. Extrae el "servicio de interés" mencionado (ej: ITIN, LLC, Taxes, Contabilidad, Consultoría, etc.)
2. Si mencionan un presupuesto o cantidad de dinero, extráelo
3. Identifica la intención principal del cliente (consulta, queja, compra, información, etc.)
4. Lista cualquier otro dato relevante como "qualifiers"

IMPORTANTE:
- Solo extrae información que esté EXPLÍCITAMENTE mencionada
- No inventes ni asumas datos
- Si no hay información para un campo, déjalo como null o vacío
- Responde SOLO con JSON válido, sin markdown

FORMATO DE RESPUESTA (JSON):
{
  "serviceInterest": "string o null",
  "budgetAmount": "número o null",
  "budgetCurrency": "string como USD, MXN, EUR o null",
  "intent": "string describiendo la intención",
  "qualifiers": ["array", "de", "datos", "adicionales"]
}

MENSAJE DEL CLIENTE:
`;

class LLMEnrichmentService {
  private parseExtractedFields(response: string): ExtractedFields {
    const defaults: ExtractedFields = {
      serviceInterest: null,
      budgetAmount: null,
      budgetCurrency: null,
      intent: null,
      qualifiers: [],
    };

    try {
      const cleanResponse = response
        .replace(/```json\n?/g, '')
        .replace(/```\n?/g, '')
        .trim();
      
      const parsed = JSON.parse(cleanResponse);
      
      return {
        serviceInterest: parsed.serviceInterest || null,
        budgetAmount: typeof parsed.budgetAmount === 'number' ? parsed.budgetAmount : null,
        budgetCurrency: parsed.budgetCurrency || null,
        intent: parsed.intent || null,
        qualifiers: Array.isArray(parsed.qualifiers) ? parsed.qualifiers : [],
      };
    } catch (error) {
      log(`[LLM Enrichment] Failed to parse response: ${response}`, "crm");
      return defaults;
    }
  }

  async extractFieldsFromMessage(
    messageContent: string,
    agent: AiAgent | null
  ): Promise<EnrichmentResult> {
    if (!messageContent || messageContent.length < 10) {
      return { success: false, fields: this.parseExtractedFields('{}'), error: 'Message too short' };
    }

    if (!agent) {
      return { success: false, fields: this.parseExtractedFields('{}'), error: 'No AI agent configured' };
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
        log(`[LLM Enrichment] Cannot create LLM provider: ${providerError}`, "crm");
        return { success: false, fields: this.parseExtractedFields('{}'), error: 'LLM provider not available' };
      }
      
      const response = await llm.generateRawCompletion(
        EXTRACTION_PROMPT,
        messageContent,
        { temperature: 0.1, maxTokens: 500 }
      );

      const fields = this.parseExtractedFields(response.text);
      
      const hasData = Boolean(fields.serviceInterest || fields.budgetAmount || fields.intent || fields.qualifiers.length > 0);
      
      return { success: hasData, fields };
    } catch (error) {
      log(`[LLM Enrichment] Error extracting fields: ${error}`, "crm");
      return { 
        success: false, 
        fields: this.parseExtractedFields('{}'), 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  }

  async enrichContactFromMessages(
    contactId: string,
    brandId: string
  ): Promise<{ updated: boolean; fields: string[] }> {
    try {
      const contact = await storage.getCrmContact(contactId);
      if (!contact) {
        return { updated: false, fields: [] };
      }

      const existingFields = (contact.customFields || {}) as CustomFieldsData;
      if (existingFields.serviceInterest && existingFields.lastEnrichedAt) {
        log(`[LLM Enrichment] Contact ${contactId} already enriched, skipping`, "crm");
        return { updated: false, fields: [] };
      }

      const agent = await storage.getAiAgentByBrand(brandId);
      if (!agent) {
        log(`[LLM Enrichment] No AI agent configured for brand ${brandId}`, "crm");
        return { updated: false, fields: [] };
      }

      const channels = await storage.getCrmContactChannels(contactId);
      let allMessages: string[] = [];

      for (const channel of channels) {
        const conversations = await storage.getConversations(brandId);
        const relevantConv = conversations.find(
          c => c.customerId === channel.externalId && c.platform === channel.platform
        );
        
        if (relevantConv) {
          const messages = await storage.getMessagesByConversation(relevantConv.id);
          const inboundMessages = messages
            .filter(m => m.direction === 'inbound')
            .slice(-10)
            .map(m => m.content);
          allMessages = allMessages.concat(inboundMessages);
        }
      }

      if (allMessages.length === 0) {
        return { updated: false, fields: [] };
      }

      const combinedText = allMessages.join('\n---\n');
      const result = await this.extractFieldsFromMessage(combinedText, agent);

      if (!result.success) {
        return { updated: false, fields: [] };
      }

      const updatedFields: string[] = [];
      const newCustomFields: CustomFieldsData = { ...existingFields };

      if (result.fields.serviceInterest && !existingFields.serviceInterest) {
        newCustomFields.serviceInterest = result.fields.serviceInterest;
        updatedFields.push('serviceInterest');
      }

      if (result.fields.budgetAmount && !existingFields.budgetAmount) {
        newCustomFields.budgetAmount = result.fields.budgetAmount;
        newCustomFields.budgetCurrency = result.fields.budgetCurrency || 'USD';
        updatedFields.push('budget');
      }

      if (result.fields.intent && !existingFields.intent) {
        newCustomFields.intent = result.fields.intent;
        updatedFields.push('intent');
      }

      if (result.fields.qualifiers.length > 0 && !existingFields.qualifiers) {
        newCustomFields.qualifiers = result.fields.qualifiers;
        updatedFields.push('qualifiers');
      }

      if (updatedFields.length > 0) {
        newCustomFields.lastEnrichedAt = new Date().toISOString();
        newCustomFields.enrichmentSource = 'llm';
        
        await storage.updateCrmContactCustomFields(contactId, newCustomFields);
        log(`[LLM Enrichment] Updated contact ${contactId}: ${updatedFields.join(', ')}`, "crm");
        return { updated: true, fields: updatedFields };
      }

      return { updated: false, fields: [] };
    } catch (error) {
      log(`[LLM Enrichment] Error enriching contact ${contactId}: ${error}`, "crm");
      return { updated: false, fields: [] };
    }
  }

  async enrichLimboFromConversation(
    limboId: string,
    brandId: string
  ): Promise<{ updated: boolean; fields: string[] }> {
    try {
      const limboEntry = await storage.getCrmLimboById(limboId);
      if (!limboEntry) {
        return { updated: false, fields: [] };
      }

      const existingFields = (limboEntry as any).customFields || {};
      if (existingFields.serviceInterest && existingFields.lastEnrichedAt) {
        return { updated: false, fields: [] };
      }

      const agent = await storage.getAiAgentByBrand(brandId);
      if (!agent) {
        return { updated: false, fields: [] };
      }

      const conversations = await storage.getConversations(brandId);
      const relevantConv = conversations.find(
        c => c.customerId === limboEntry.externalId && 
             c.platform === limboEntry.platform && 
             c.type === 'comment'
      );

      if (!relevantConv) {
        return { updated: false, fields: [] };
      }

      const messages = await storage.getMessagesByConversation(relevantConv.id);
      const inboundMessages = messages
        .filter(m => m.direction === 'inbound')
        .slice(-10)
        .map(m => m.content);

      if (inboundMessages.length === 0) {
        return { updated: false, fields: [] };
      }

      const combinedText = inboundMessages.join('\n---\n');
      const result = await this.extractFieldsFromMessage(combinedText, agent);

      if (!result.success) {
        return { updated: false, fields: [] };
      }

      const updatedFields: string[] = [];
      const newCustomFields = { ...existingFields };

      if (result.fields.serviceInterest) {
        newCustomFields.serviceInterest = result.fields.serviceInterest;
        updatedFields.push('serviceInterest');
      }

      if (result.fields.intent) {
        newCustomFields.intent = result.fields.intent;
        updatedFields.push('intent');
      }

      if (updatedFields.length > 0) {
        newCustomFields.lastEnrichedAt = new Date().toISOString();
        newCustomFields.enrichmentSource = 'llm';
        
        await storage.updateCrmLimboCustomFields(limboId, newCustomFields);
        log(`[LLM Enrichment] Updated limbo ${limboId}: ${updatedFields.join(', ')}`, "crm");
        return { updated: true, fields: updatedFields };
      }

      return { updated: false, fields: [] };
    } catch (error) {
      log(`[LLM Enrichment] Error enriching limbo ${limboId}: ${error}`, "crm");
      return { updated: false, fields: [] };
    }
  }

  async processInboundMessage(
    contactId: string | undefined,
    messageContent: string,
    brandId: string
  ): Promise<void> {
    if (!contactId || !messageContent || messageContent.length < 20) return;

    try {
      const contact = await storage.getCrmContact(contactId);
      if (!contact) return;

      const existingFields = (contact.customFields || {}) as CustomFieldsData;
      if (existingFields.serviceInterest) {
        return;
      }

      const agent = await storage.getAiAgentByBrand(brandId);
      if (!agent) return;

      const result = await this.extractFieldsFromMessage(messageContent, agent);
      
      if (result.success && result.fields.serviceInterest) {
        const newCustomFields: CustomFieldsData = {
          ...existingFields,
        };
        
        // Only update if we have new data (idempotent)
        if (result.fields.serviceInterest && !existingFields.serviceInterest) {
          newCustomFields.serviceInterest = result.fields.serviceInterest;
        }
        
        if (result.fields.intent && !existingFields.intent) {
          newCustomFields.intent = result.fields.intent;
        }

        if (result.fields.budgetAmount && !existingFields.budgetAmount) {
          newCustomFields.budgetAmount = result.fields.budgetAmount;
          newCustomFields.budgetCurrency = result.fields.budgetCurrency || 'USD';
        }

        // Merge qualifiers using Set to avoid duplicates
        if (result.fields.qualifiers.length > 0) {
          const existingQualifiers = existingFields.qualifiers || [];
          const mergedQualifiers = Array.from(new Set([...existingQualifiers, ...result.fields.qualifiers]));
          newCustomFields.qualifiers = mergedQualifiers;
        }
        
        // Only persist if we actually have changes
        if (newCustomFields.serviceInterest && newCustomFields.serviceInterest !== existingFields.serviceInterest) {
          newCustomFields.lastEnrichedAt = new Date().toISOString();
          newCustomFields.enrichmentSource = 'llm-realtime';
          await storage.updateCrmContactCustomFields(contactId, newCustomFields);
          log(`[LLM Enrichment] Real-time enriched contact ${contactId}: serviceInterest=${newCustomFields.serviceInterest}`, "crm");
        }
      }
    } catch (error) {
      log(`[LLM Enrichment] Real-time processing error for ${contactId}: ${error}`, "crm");
    }
  }

  async runBackfill(brandId: string, limit: number = 100): Promise<BackfillStats> {
    const stats: BackfillStats = {
      contactsProcessed: 0,
      contactsEnriched: 0,
      limboProcessed: 0,
      limboEnriched: 0,
      errors: 0,
    };

    log(`[LLM Enrichment] Starting backfill for brand ${brandId}, limit=${limit}`, "crm");

    try {
      const contacts = await storage.getCrmContacts(brandId);
      const contactsToProcess = contacts.slice(0, Math.floor(limit / 2));

      for (const contact of contactsToProcess) {
        stats.contactsProcessed++;
        try {
          const result = await this.enrichContactFromMessages(contact.id, brandId);
          if (result.updated) {
            stats.contactsEnriched++;
          }
          await new Promise(resolve => setTimeout(resolve, 500));
        } catch (error) {
          stats.errors++;
        }
      }

      const limboEntries = await storage.getCrmContactLimbo(brandId);
      const limboToProcess = limboEntries.slice(0, Math.floor(limit / 2));

      for (const entry of limboToProcess) {
        stats.limboProcessed++;
        try {
          const result = await this.enrichLimboFromConversation(entry.id, brandId);
          if (result.updated) {
            stats.limboEnriched++;
          }
          await new Promise(resolve => setTimeout(resolve, 500));
        } catch (error) {
          stats.errors++;
        }
      }

      log(`[LLM Enrichment] Backfill complete: ${stats.contactsEnriched}/${stats.contactsProcessed} contacts, ${stats.limboEnriched}/${stats.limboProcessed} limbo, ${stats.errors} errors`, "crm");
      return stats;
    } catch (error) {
      log(`[LLM Enrichment] Backfill error: ${error}`, "crm");
      throw error;
    }
  }
}

export const llmEnrichmentService = new LLMEnrichmentService();
