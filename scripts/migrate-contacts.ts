import { storage } from "../server/storage";
import { db } from "../server/db";
import { conversations, crmContacts, crmContactChannels } from "../shared/schema";
import { eq, sql } from "drizzle-orm";

interface UniqueContact {
  brandId: string;
  platform: string;
  customerId: string;
  customerName: string | null;
  customerAvatar: string | null;
  conversationCount: number;
  lastMessageAt: string | null;
}

function parseDisplayName(displayName: string): { firstName: string | null; lastName: string | null } {
  if (!displayName) return { firstName: null, lastName: null };
  
  const cleaned = displayName.replace(/@/g, '').replace(/_/g, ' ').trim();
  
  if (/^\d+$/.test(cleaned) || cleaned.length < 2) {
    return { firstName: null, lastName: null };
  }
  
  const parts = cleaned.split(/\s+/).filter(Boolean);
  
  if (parts.length === 0) return { firstName: null, lastName: null };
  if (parts.length === 1) {
    const capitalized = parts[0].charAt(0).toUpperCase() + parts[0].slice(1).toLowerCase();
    return { firstName: capitalized, lastName: null };
  }
  
  const firstName = parts[0].charAt(0).toUpperCase() + parts[0].slice(1).toLowerCase();
  const lastName = parts.slice(1).map(p => p.charAt(0).toUpperCase() + p.slice(1).toLowerCase()).join(' ');
  
  return { firstName, lastName };
}

async function getUniqueContactsFromConversations(): Promise<UniqueContact[]> {
  const results = await db
    .select({
      brandId: conversations.brandId,
      platform: conversations.platform,
      customerId: conversations.customerId,
      customerName: sql<string | null>`MAX(${conversations.customerName})`,
      customerAvatar: sql<string | null>`MAX(${conversations.customerAvatar})`,
      conversationCount: sql<number>`COUNT(*)::int`,
      lastMessageAt: sql<string | null>`MAX(${conversations.lastMessageAt})`,
    })
    .from(conversations)
    .where(eq(conversations.type, 'dm'))
    .groupBy(
      conversations.brandId,
      conversations.platform,
      conversations.customerId
    );

  return results;
}

async function migrateContacts() {
  console.log("🔄 Starting CRM Contact Backfill Migration...\n");
  console.log("This script will populate the CRM with existing DM conversations.\n");

  const uniqueContacts = await getUniqueContactsFromConversations();
  console.log(`Found ${uniqueContacts.length} unique DM contacts across all brands.\n`);

  let created = 0;
  let skipped = 0;
  let failed = 0;

  for (const contact of uniqueContacts) {
    const { brandId, platform, customerId, customerName, customerAvatar, conversationCount, lastMessageAt } = contact;

    try {
      const existingChannel = await storage.findCrmContactChannelByExternal(brandId, platform, customerId);
      
      if (existingChannel) {
        console.log(`⏭️ Skipped: ${customerName || customerId} (${platform}) - already exists`);
        skipped++;
        continue;
      }

      const displayName = customerName || customerId;
      const parsedName = parseDisplayName(displayName);
      const interactionDate = lastMessageAt ? new Date(lastMessageAt) : null;

      const newContact = await storage.createCrmContact({
        brandId,
        displayName,
        firstName: parsedName.firstName,
        lastName: parsedName.lastName,
        status: 'lead',
        lifecycleStage: 'new',
        source: `${platform}_dm_backfill`,
        conversationCount,
        totalMessages: 0,
        firstInteractionAt: interactionDate,
        lastInteractionAt: interactionDate,
      });

      await storage.createCrmContactChannel({
        contactId: newContact.id,
        platform,
        externalId: customerId,
        username: customerName || customerId,
        avatarUrl: customerAvatar,
        isActive: true,
        messageCount: 0,
        lastMessageAt: interactionDate,
      });

      console.log(`✅ Created: ${displayName} (${platform}) → Contact ID: ${newContact.id}`);
      created++;

    } catch (error: any) {
      console.log(`❌ Failed: ${customerName || customerId} (${platform}) - ${error.message}`);
      failed++;
    }
  }

  console.log(`\n${"=".repeat(60)}`);
  console.log(`📊 CRM BACKFILL MIGRATION COMPLETE`);
  console.log(`${"=".repeat(60)}`);
  console.log(`Total unique DM contacts: ${uniqueContacts.length}`);
  console.log(`✅ Created: ${created}`);
  console.log(`⏭️ Skipped (already exist): ${skipped}`);
  console.log(`❌ Failed: ${failed}`);
  console.log(`\nThe script is idempotent - you can safely run it again.`);

  process.exit(0);
}

migrateContacts().catch(err => {
  console.error("Fatal error:", err);
  process.exit(1);
});
