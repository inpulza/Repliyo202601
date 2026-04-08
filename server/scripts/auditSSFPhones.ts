import { db } from "../db";
import { brands, crmContacts, crmContactChannels, conversations, messages } from "@shared/schema";
import { eq, and, isNotNull, sql } from "drizzle-orm";

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

const URL_PATTERN = /https?:\/\/[^\s)]+/gi;
const EMAIL_PATTERN = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;

const PHONE_PATTERNS = [
  /\+\d{1,3}[\s.-]?\(?\d{1,4}\)?[\s.-]?\d{1,4}[\s.-]?\d{1,9}/g,
  /\(?\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{4}/g,
  /\b(?:tel|phone|cel|móvil|movil|whatsapp|wsp|wa)[\s.:]*(\+?\d[\d\s.-]{7,})/gi,
];

function isSystemMessage(text: string): boolean {
  return FACEBOOK_SYSTEM_MESSAGE_PATTERNS.some(p => p.test(text));
}

function stripUrls(text: string): string {
  return text.replace(URL_PATTERN, ' ');
}

function extractPhoneFromText(text: string): string | null {
  if (!text || text.length < 5) return null;
  if (isSystemMessage(text)) return null;

  const textForPhone = text.replace(EMAIL_PATTERN, ' ').replace(URL_PATTERN, ' ');

  for (const pattern of PHONE_PATTERNS) {
    pattern.lastIndex = 0;
    const matches = textForPhone.match(pattern);
    if (matches && matches.length > 0) {
      let phone = matches[0].replace(/[^\d+]/g, '');
      if (phone.length >= 7 && phone.length <= 15) {
        if (!phone.startsWith('+') && phone.length === 10) {
          phone = '+1' + phone;
        }
        if (!phone.startsWith('+') && phone.length === 11 && phone.startsWith('1')) {
          phone = '+' + phone;
        }
        return phone;
      }
    }
  }
  return null;
}

function normalizePhone(phone: string): string {
  return phone.replace(/[^\d]/g, '');
}

function phoneDigitsMatch(stored: string, found: string): boolean {
  const a = normalizePhone(stored);
  const b = normalizePhone(found);
  if (a === b) return true;
  if (a.length >= 10 && b.length >= 10) {
    return a.slice(-10) === b.slice(-10);
  }
  return a.includes(b) || b.includes(a);
}

interface AffectedContact {
  contactId: string;
  displayName: string;
  fakePhone: string;
  realPhoneFound: string | null;
  finalState: string;
}

async function main() {
  console.log("=== AUDITORÍA DE TELÉFONOS — SOLIDARIDAD SIN FRONTERAS ===\n");

  const allBrands = await db.select().from(brands);
  const ssfBrand = allBrands.find(b => b.name.toLowerCase().includes("solidaridad"));
  if (!ssfBrand) {
    console.log("Brand 'Solidaridad Sin Fronteras' not found.");
    process.exit(1);
  }
  console.log(`Brand: ${ssfBrand.name} (${ssfBrand.id})\n`);

  const contactsWithPhone = await db.select().from(crmContacts)
    .where(and(eq(crmContacts.brandId, ssfBrand.id), isNotNull(crmContacts.phone)));

  console.log(`Contactos con teléfono almacenado: ${contactsWithPhone.length}`);

  const dmConvs = await db.select().from(conversations)
    .where(and(
      eq(conversations.brandId, ssfBrand.id),
      eq(conversations.type, 'dm')
    ));
  console.log(`Conversaciones DM totales: ${dmConvs.length}`);

  const dmConvsByCustomerId = new Map<string, typeof dmConvs>();
  for (const conv of dmConvs) {
    if (!dmConvsByCustomerId.has(conv.customerId)) {
      dmConvsByCustomerId.set(conv.customerId, []);
    }
    dmConvsByCustomerId.get(conv.customerId)!.push(conv);
  }

  const allChannels = await db.select().from(crmContactChannels);
  const channelsByContactId = new Map<string, typeof allChannels>();
  for (const ch of allChannels) {
    if (!channelsByContactId.has(ch.contactId)) {
      channelsByContactId.set(ch.contactId, []);
    }
    channelsByContactId.get(ch.contactId)!.push(ch);
  }

  const affected: AffectedContact[] = [];
  let correctCount = 0;
  let indeterminateCount = 0;
  let noConvCount = 0;
  let auditedCount = 0;

  for (const contact of contactsWithPhone) {
    const channels = channelsByContactId.get(contact.id) || [];
    const contactConvs: typeof dmConvs = [];

    for (const ch of channels) {
      if (ch.externalId) {
        const matching = dmConvsByCustomerId.get(ch.externalId) || [];
        contactConvs.push(...matching);
      }
    }

    if (contactConvs.length === 0) {
      noConvCount++;
      continue;
    }

    auditedCount++;
    const storedPhoneDigits = normalizePhone(contact.phone!);

    let phoneFoundInUserMessage = false;
    let phoneFoundInUrlOrSystem = false;
    let allInboundUserMessages: string[] = [];

    for (const conv of contactConvs) {
      const msgs = await db.select().from(messages)
        .where(eq(messages.conversationId, conv.id));

      for (const msg of msgs) {
        const contentDigits = msg.content.replace(/\D/g, '');

        if (msg.direction === 'inbound' && !isSystemMessage(msg.content)) {
          allInboundUserMessages.push(msg.content);
          const textNoUrls = stripUrls(msg.content);
          const textDigits = textNoUrls.replace(/\D/g, '');
          if (textDigits.includes(storedPhoneDigits) ||
              (storedPhoneDigits.length >= 10 && textDigits.includes(storedPhoneDigits.slice(-10)))) {
            phoneFoundInUserMessage = true;
          }
        }

        if (isSystemMessage(msg.content)) {
          if (contentDigits.includes(storedPhoneDigits) ||
              (storedPhoneDigits.length >= 10 && contentDigits.includes(storedPhoneDigits.slice(-10)))) {
            phoneFoundInUrlOrSystem = true;
          }
        }

        if (msg.direction === 'inbound') {
          const urls = msg.content.match(URL_PATTERN);
          if (urls) {
            for (const url of urls) {
              const urlDigits = url.replace(/\D/g, '');
              if (urlDigits.includes(storedPhoneDigits) ||
                  (storedPhoneDigits.length >= 10 && urlDigits.includes(storedPhoneDigits.slice(-10)))) {
                phoneFoundInUrlOrSystem = true;
              }
            }
          }
        }
      }
    }

    if (phoneFoundInUserMessage && !phoneFoundInUrlOrSystem) {
      correctCount++;
    } else if (phoneFoundInUrlOrSystem && !phoneFoundInUserMessage) {
      let realPhone: string | null = null;
      for (const content of allInboundUserMessages) {
        const extracted = extractPhoneFromText(content);
        if (extracted && !phoneDigitsMatch(contact.phone!, extracted)) {
          realPhone = extracted;
          break;
        }
      }

      affected.push({
        contactId: contact.id,
        displayName: contact.displayName || contact.firstName || 'Sin nombre',
        fakePhone: contact.phone!,
        realPhoneFound: realPhone,
        finalState: realPhone ? 'corregido' : 'sin_telefono',
      });
    } else if (phoneFoundInUrlOrSystem && phoneFoundInUserMessage) {
      correctCount++;
    } else {
      indeterminateCount++;
    }
  }

  console.log(`\nContactos sin conversaciones DM encontradas: ${noConvCount}`);
  console.log(`Contactos DM auditados (con conversaciones): ${auditedCount}\n`);

  console.log("=== CLASIFICACIÓN ===\n");
  console.log(`Teléfonos correctos: ${correctCount}`);
  console.log(`Teléfonos falsos (de URL/sistema): ${affected.length}`);
  console.log(`Indeterminados: ${indeterminateCount}`);

  const withRealPhone = affected.filter(a => a.realPhoneFound !== null);
  const withoutRealPhone = affected.filter(a => a.realPhoneFound === null);

  console.log(`\n--- De los afectados (${affected.length}): ---`);
  console.log(`  Tenían teléfono real en conversación: ${withRealPhone.length}`);
  console.log(`  NO tenían teléfono real: ${withoutRealPhone.length}`);

  if (affected.length > 0) {
    console.log("\n=== EJECUTANDO LIMPIEZA Y RE-EXTRACCIÓN ===\n");

    let correctedCount = 0;
    let clearedCount = 0;

    for (const entry of affected) {
      if (entry.realPhoneFound) {
        await db.update(crmContacts)
          .set({ phone: entry.realPhoneFound, updatedAt: new Date() })
          .where(eq(crmContacts.id, entry.contactId));
        correctedCount++;
        console.log(`  CORREGIDO: ${entry.displayName} | Falso: ${entry.fakePhone} -> Real: ${entry.realPhoneFound}`);
      } else {
        await db.update(crmContacts)
          .set({ phone: sql`NULL`, updatedAt: new Date() })
          .where(eq(crmContacts.id, entry.contactId));
        clearedCount++;
        console.log(`  LIMPIADO: ${entry.displayName} | Falso removido: ${entry.fakePhone}`);
      }
    }

    console.log(`\nCorregidos: ${correctedCount}, Limpiados: ${clearedCount}`);
  }

  console.log("\n" + "=".repeat(70));
  console.log("REPORTE FINAL — AUDITORÍA DE TELÉFONOS SSF");
  console.log("=".repeat(70));
  console.log(`\n1. Total contactos DM auditados en SSF: ${auditedCount}`);
  console.log(`   (${noConvCount} contactos con teléfono no tenían conversaciones DM vinculadas)`);
  console.log(`2. Contactos afectados (teléfono falso/de URL): ${affected.length}`);
  console.log(`3. Afectados que SÍ tenían teléfono real en conversación: ${withRealPhone.length}`);
  console.log(`4. Afectados que NO tenían teléfono real en conversación: ${withoutRealPhone.length}`);
  console.log(`5. Corregidos con re-extracción (teléfono real recuperado): ${withRealPhone.length}`);
  console.log(`6. Quedaron sin teléfono después de limpieza: ${withoutRealPhone.length}`);

  console.log(`\n7. Lista detallada de contactos afectados:\n`);
  if (affected.length > 0) {
    console.log(`${"Nombre".padEnd(35)} | ${"Tel. Falso".padEnd(20)} | ${"Tel. Real".padEnd(20)} | Estado`);
    console.log("-".repeat(100));
    for (const entry of affected) {
      console.log(
        `${(entry.displayName || '').substring(0, 34).padEnd(35)} | ${entry.fakePhone.padEnd(20)} | ${(entry.realPhoneFound || 'N/A').padEnd(20)} | ${entry.finalState}`
      );
    }
  } else {
    console.log("  (No se encontraron contactos con teléfonos falsos)");
  }

  console.log("\n" + "=".repeat(70));
  console.log("AUDITORÍA COMPLETADA");
  console.log("=".repeat(70));

  process.exit(0);
}

main().catch(err => {
  console.error("Error fatal:", err);
  process.exit(1);
});
