import { storage } from "../storage";
import { log } from "../app";

interface EnrichmentResult {
  phone: string | null;
  email: string | null;
  extractedFields: Record<string, string>;
  method: 'regex' | 'none';
}

interface EnrichmentStats {
  messagesProcessed: number;
  phonesFound: number;
  emailsFound: number;
  contactsUpdated: number;
}

class ContactEnrichmentService {
  private phonePatterns = [
    /\+\d{1,3}[\s.-]?\(?\d{1,4}\)?[\s.-]?\d{1,4}[\s.-]?\d{1,9}/g,
    /\(?\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{4}/g,
    /\b\d{10,15}\b/g,
    /\b(?:tel|phone|cel|móvil|movil|whatsapp|wsp|wa)[\s.:]*(\+?\d[\d\s.-]{7,})/gi,
  ];

  private emailPattern = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;

  extractDataFromText(text: string): EnrichmentResult {
    const result: EnrichmentResult = {
      phone: null,
      email: null,
      extractedFields: {},
      method: 'none',
    };

    if (!text || text.length < 5) return result;

    const emails = text.match(this.emailPattern);
    if (emails && emails.length > 0) {
      result.email = emails[0].toLowerCase();
      result.method = 'regex';
    }

    for (const pattern of this.phonePatterns) {
      const matches = text.match(pattern);
      if (matches && matches.length > 0) {
        let phone = matches[0].replace(/[^\d+]/g, '');
        
        if (phone.length >= 7 && phone.length <= 15) {
          if (!phone.startsWith('+') && phone.length === 10) {
            phone = '+1' + phone;
          }
          result.phone = phone;
          result.method = 'regex';
          break;
        }
      }
    }

    return result;
  }

  async enrichContactFromMessage(
    contactId: string,
    messageContent: string,
    messageId?: string
  ): Promise<{ updated: boolean; fields: string[] }> {
    const extraction = this.extractDataFromText(messageContent);
    const updatedFields: string[] = [];

    if (!extraction.phone && !extraction.email) {
      return { updated: false, fields: [] };
    }

    try {
      const contact = await storage.getCrmContact(contactId);
      if (!contact) {
        log(`[Enrichment] Contact ${contactId} not found`, "crm");
        return { updated: false, fields: [] };
      }

      const updates: { phone?: string; email?: string } = {};

      if (extraction.phone && !contact.phone) {
        updates.phone = extraction.phone;
        updatedFields.push('phone');
      }

      if (extraction.email && !contact.email) {
        updates.email = extraction.email;
        updatedFields.push('email');
      }

      if (Object.keys(updates).length > 0) {
        await storage.updateCrmContact(contactId, updates);
        log(`[Enrichment] Updated contact ${contactId}: ${updatedFields.join(', ')} from message${messageId ? ` ${messageId}` : ''}`, "crm");
        return { updated: true, fields: updatedFields };
      }

      return { updated: false, fields: [] };
    } catch (error) {
      log(`[Enrichment] Error enriching contact ${contactId}: ${error}`, "crm");
      return { updated: false, fields: [] };
    }
  }

  async processInboundMessage(
    contactId: string | undefined,
    messageContent: string,
    messageId?: string
  ): Promise<void> {
    if (!contactId || !messageContent) return;

    await this.enrichContactFromMessage(contactId, messageContent, messageId);
  }

  async runBackfill(brandId: string, limit: number = 1000): Promise<EnrichmentStats> {
    const stats: EnrichmentStats = {
      messagesProcessed: 0,
      phonesFound: 0,
      emailsFound: 0,
      contactsUpdated: 0,
    };

    log(`[Enrichment] Starting backfill for brand ${brandId}, limit=${limit}`, "crm");

    try {
      const allConversations = await storage.getConversations(brandId);
      const contactsProcessed = new Set<string>();
      
      let conversationsToProcess = 0;
      for (const conv of allConversations) {
        if (conv.type === 'dm' && conv.contactId && !contactsProcessed.has(conv.contactId)) {
          conversationsToProcess++;
        }
        if (stats.messagesProcessed >= limit) break;
      }

      for (const conv of allConversations) {
        if (stats.messagesProcessed >= limit) break;
        if (conv.type !== 'dm' || !conv.contactId) continue;
        if (contactsProcessed.has(conv.contactId)) continue;

        const messages = await storage.getMessagesByConversation(conv.id);
        
        for (const msg of messages) {
          if (stats.messagesProcessed >= limit) break;
          if (msg.direction !== 'inbound') continue;

          stats.messagesProcessed++;
          const extraction = this.extractDataFromText(msg.content);

          if (extraction.phone || extraction.email) {
            const result = await this.enrichContactFromMessage(
              conv.contactId,
              msg.content,
              msg.id
            );

            if (result.updated) {
              stats.contactsUpdated++;
              if (result.fields.includes('phone')) stats.phonesFound++;
              if (result.fields.includes('email')) stats.emailsFound++;
              contactsProcessed.add(conv.contactId);
              break;
            }
          }
        }
      }

      log(`[Enrichment] Backfill complete: ${stats.messagesProcessed} messages, ${stats.phonesFound} phones, ${stats.emailsFound} emails, ${stats.contactsUpdated} contacts updated`, "crm");
      return stats;
    } catch (error) {
      log(`[Enrichment] Backfill error: ${error}`, "crm");
      throw error;
    }
  }
}

export const contactEnrichmentService = new ContactEnrichmentService();
