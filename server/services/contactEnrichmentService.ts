import { storage } from "../storage";
import { log } from "../app";
import { findPhoneNumbersInText, parsePhoneNumber } from 'libphonenumber-js';

interface EnrichmentResult {
  phone: string | null;
  email: string | null;
  extractedFields: Record<string, string>;
  method: 'regex' | 'libphonenumber' | 'none';
}

interface EnrichmentStats {
  messagesProcessed: number;
  phonesFound: number;
  emailsFound: number;
  contactsUpdated: number;
  skippedSystemMessages: number;
}

const FACEBOOK_SYSTEM_MESSAGE_PATTERNS = [
  /facebook created this chat because/i,
  /facebook creó este chat porque/i,
  /o facebook criou essa conversa porque/i,
  /replied to your automated welcome message/i,
  /respondió a tu mensaje de bienvenida automático/i,
  /see comment\(https?:\/\//i,
  /ver comentario\(https?:\/\//i,
  /ver comentário\(https?:\/\//i,
  /You have \d+ days before this chat disappears/i,
  /El chat desaparecerá en \d+ días/i,
  /To change or remove this greeting, visit Messaging settings/i,
  /Auto-label added:/i,
];

class ContactEnrichmentService {
  private fallbackPhonePatterns = [
    /\+\d{1,3}[\s.-]?\(?\d{1,4}\)?[\s.-]?\d{1,4}[\s.-]?\d{1,9}/g,
    /\(?\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{4}/g,
    /\b(?:tel|phone|cel|móvil|movil|whatsapp|wsp|wa|número|numero)[\s.:]*(\+?\d[\d\s.-]{7,})/gi,
  ];

  private nonPhoneContextPattern = /[#]\s*$|(?:ref|referencia|pedido|factura|orden|order|id|código|codigo|code|zip)\s*:?\s*$/i;

  private emailPattern = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;

  private urlPattern = /https?:\/\/[^\s)]+/gi;

  isSystemMessage(text: string): boolean {
    return FACEBOOK_SYSTEM_MESSAGE_PATTERNS.some(pattern => pattern.test(text));
  }

  private stripUrls(text: string): string {
    return text.replace(this.urlPattern, ' ');
  }

  private stripEmailAddresses(text: string): string {
    return text.replace(this.emailPattern, ' ');
  }

  private hasNonPhoneContext(text: string, matchStart: number): boolean {
    if (matchStart <= 0) return false;
    const preceding = text.substring(Math.max(0, matchStart - 20), matchStart);
    return this.nonPhoneContextPattern.test(preceding);
  }

  private extractPhoneWithLibrary(text: string): string | null {
    const found = findPhoneNumbersInText(text, 'US');
    for (const result of found) {
      const phoneNumber = result.number;
      if (this.hasNonPhoneContext(text, result.startsAt)) {
        log(`[Enrichment] Phone candidate skipped (non-phone context): "${phoneNumber.number}"`, "crm");
        continue;
      }
      if (phoneNumber.isValid()) {
        log(`[Enrichment] Phone extracted via libphonenumber: "${phoneNumber.number}" (country: ${phoneNumber.country})`, "crm");
        return phoneNumber.number;
      }
      if (phoneNumber.isPossible()) {
        log(`[Enrichment] Phone extracted via libphonenumber (possible but unvalidated): "${phoneNumber.number}"`, "crm");
        return phoneNumber.number;
      }
    }
    return null;
  }

  private extractPhoneWithFallbackRegex(text: string): string | null {
    for (const pattern of this.fallbackPhonePatterns) {
      pattern.lastIndex = 0;
      const matches = text.match(pattern);
      if (matches && matches.length > 0) {
        const rawMatch = matches[0];
        const matchIndex = text.indexOf(rawMatch);
        if (matchIndex > 0) {
          const preceding = text.substring(Math.max(0, matchIndex - 20), matchIndex);
          if (this.nonPhoneContextPattern.test(preceding)) continue;
        }
        const digits = rawMatch.replace(/[^\d+]/g, '');

        if (digits.length < 7 || digits.length > 15) continue;

        try {
          const parsed = parsePhoneNumber(digits.startsWith('+') ? digits : digits, 'US');
          if (parsed.isValid()) {
            log(`[Enrichment] Phone validated via fallback+libphonenumber: "${parsed.number}" (country: ${parsed.country})`, "crm");
            return parsed.number;
          }
        } catch (e: any) {
          log(`[Enrichment] Fallback phone parse failed for "${digits}": ${e.message}`, "crm");
        }

        let phone = digits;
        if (!phone.startsWith('+') && phone.length === 10) {
          phone = '+1' + phone;
        }
        if (!phone.startsWith('+') && phone.length === 11 && phone.startsWith('1')) {
          phone = '+' + phone;
        }
        if (!phone.startsWith('+')) {
          phone = '+' + phone;
        }
        log(`[Enrichment] Phone extracted via fallback regex (basic normalization): "${phone}"`, "crm");
        return phone;
      }
    }
    return null;
  }

  extractDataFromText(text: string): EnrichmentResult {
    const result: EnrichmentResult = {
      phone: null,
      email: null,
      extractedFields: {},
      method: 'none',
    };

    if (!text || text.length < 5) return result;

    if (this.isSystemMessage(text)) {
      log(`[Enrichment] Skipping system message: "${text.substring(0, 80)}..."`, "crm");
      return result;
    }

    const emails = text.match(this.emailPattern);
    if (emails && emails.length > 0) {
      result.email = emails[0].toLowerCase();
      result.method = 'regex';
    }

    const textForPhone = this.stripEmailAddresses(this.stripUrls(text));

    const libraryPhone = this.extractPhoneWithLibrary(textForPhone);
    if (libraryPhone) {
      result.phone = libraryPhone;
      result.method = 'libphonenumber';
    } else {
      const fallbackPhone = this.extractPhoneWithFallbackRegex(textForPhone);
      if (fallbackPhone) {
        result.phone = fallbackPhone;
        result.method = 'regex';
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
      skippedSystemMessages: 0,
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

          if (this.isSystemMessage(msg.content)) {
            stats.skippedSystemMessages++;
            continue;
          }

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

      log(`[Enrichment] Backfill complete: ${stats.messagesProcessed} messages, ${stats.phonesFound} phones, ${stats.emailsFound} emails, ${stats.contactsUpdated} contacts updated, ${stats.skippedSystemMessages} system messages skipped`, "crm");
      return stats;
    } catch (error) {
      log(`[Enrichment] Backfill error: ${error}`, "crm");
      throw error;
    }
  }
}

export const contactEnrichmentService = new ContactEnrichmentService();
