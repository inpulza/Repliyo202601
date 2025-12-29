import { db } from '../server/db';
import { conversations, messages, crmContacts } from '../shared/schema';
import { eq, and } from 'drizzle-orm';

const phonePatterns = [
  /\+\d{1,3}[\s.-]?\(?\d{1,4}\)?[\s.-]?\d{1,4}[\s.-]?\d{1,9}/g,
  /\(?\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{4}/g,
  /\b\d{10,15}\b/g,
];

const emailPattern = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;

function extractPhone(text: string): string | null {
  for (const pattern of phonePatterns) {
    const matches = text.match(pattern);
    if (matches) {
      let phone = matches[0].replace(/[^\d+]/g, '');
      if (phone.length >= 7 && phone.length <= 15) {
        if (!phone.startsWith('+') && phone.length === 10) {
          phone = '+1' + phone;
        }
        return phone;
      }
    }
  }
  return null;
}

function extractEmail(text: string): string | null {
  const matches = text.match(emailPattern);
  if (matches) {
    return matches[0].toLowerCase();
  }
  return null;
}

async function runBackfill() {
  const brandIds = [
    '72307812-2edb-43a6-884b-e19f1a9cf200', // Inpulza
    '7da9fc00-2fbe-411d-9cc1-5c12a0db618b', // hmpsychiatry
    '18830f9f-1bd0-44a5-b52a-c3f0a2515b05', // Fortress
    '866600f9-4c0e-4d5e-b9d4-62fc9113426b', // BO Trust
  ];
  
  console.log('Starting backfill for all brands...');
  
  let allDmConversations: typeof conversations.$inferSelect[] = [];
  
  for (const brandId of brandIds) {
    const convs = await db.select()
      .from(conversations)
      .where(and(
        eq(conversations.brandId, brandId),
        eq(conversations.type, 'dm')
      ));
    allDmConversations.push(...convs);
  }
  
  const dmConversations = allDmConversations;
  
  console.log(`Found ${dmConversations.length} DM conversations`);
  
  let messagesProcessed = 0;
  let phonesFound = 0;
  let emailsFound = 0;
  let contactsUpdated = 0;
  const contactsProcessed = new Set<string>();

  for (const conv of dmConversations) {
    if (!conv.contactId) continue;
    if (contactsProcessed.has(conv.contactId)) continue;
    
    const msgs = await db.select()
      .from(messages)
      .where(and(
        eq(messages.conversationId, conv.id),
        eq(messages.direction, 'inbound')
      ));
    
    for (const msg of msgs) {
      messagesProcessed++;
      
      const phone = extractPhone(msg.content);
      const email = extractEmail(msg.content);
      
      if (!phone && !email) continue;
      
      const contact = await db.select().from(crmContacts).where(eq(crmContacts.id, conv.contactId)).limit(1);
      if (!contact.length) continue;
      
      const updates: Record<string, string> = {};
      const fieldsUpdated: string[] = [];
      
      if (phone && !contact[0].phone) {
        updates.phone = phone;
        fieldsUpdated.push('phone');
        phonesFound++;
      }
      
      if (email && !contact[0].email) {
        updates.email = email;
        fieldsUpdated.push('email');
        emailsFound++;
      }
      
      if (Object.keys(updates).length > 0) {
        await db.update(crmContacts)
          .set(updates)
          .where(eq(crmContacts.id, conv.contactId));
        
        contactsUpdated++;
        contactsProcessed.add(conv.contactId);
        console.log(`Updated contact ${contact[0].displayName}: ${fieldsUpdated.join(', ')}`);
        break;
      }
    }
  }
  
  console.log('\n=== BACKFILL RESULTS ===');
  console.log(`Messages processed: ${messagesProcessed}`);
  console.log(`Phones found: ${phonesFound}`);
  console.log(`Emails found: ${emailsFound}`);
  console.log(`Contacts updated: ${contactsUpdated}`);
}

runBackfill().then(() => {
  console.log('Backfill complete');
  process.exit(0);
}).catch(err => {
  console.error('Backfill error:', err);
  process.exit(1);
});
