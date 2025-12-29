import { storage } from "../server/storage";
import { db } from "../server/db";
import { conversations, messages, crmContacts, crmContactChannels } from "../shared/schema";
import { eq, and, sql } from "drizzle-orm";

interface UniqueContact {
  brandId: string;
  platform: string;
  customerId: string;
  customerName: string | null;
  customerAvatar: string | null;
  conversationCount: number;
  totalMessages: number;
  firstMessageAt: string | null;
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

async function getUniqueContactsWithMetrics(): Promise<UniqueContact[]> {
  const results = await db
    .select({
      brandId: conversations.brandId,
      platform: conversations.platform,
      customerId: conversations.customerId,
      customerName: sql<string | null>`MAX(${conversations.customerName})`,
      customerAvatar: sql<string | null>`MAX(${conversations.customerAvatar})`,
      conversationCount: sql<number>`COUNT(DISTINCT ${conversations.id})::int`,
      totalMessages: sql<number>`0`,
      firstMessageAt: sql<string | null>`MIN(${conversations.createdAt})`,
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

interface MessageMetrics {
  count: number;
  firstMessageAt: Date | null;
  lastMessageAt: Date | null;
}

async function getMessageMetricsForConversations(conversationIds: string[]): Promise<MessageMetrics> {
  if (conversationIds.length === 0) return { count: 0, firstMessageAt: null, lastMessageAt: null };
  
  const result = await db
    .select({ 
      count: sql<number>`COUNT(*)::int`,
      firstMessageAt: sql<string | null>`MIN(${messages.timestamp})`,
      lastMessageAt: sql<string | null>`MAX(${messages.timestamp})`
    })
    .from(messages)
    .where(sql`${messages.conversationId} IN (${sql.join(conversationIds.map(id => sql`${id}`), sql`, `)})`);
  
  const row = result[0];
  return {
    count: row?.count || 0,
    firstMessageAt: row?.firstMessageAt ? new Date(row.firstMessageAt) : null,
    lastMessageAt: row?.lastMessageAt ? new Date(row.lastMessageAt) : null,
  };
}

async function getConversationIdsForContact(brandId: string, platform: string, customerId: string): Promise<string[]> {
  const results = await db
    .select({ id: conversations.id })
    .from(conversations)
    .where(and(
      eq(conversations.brandId, brandId),
      eq(conversations.platform, platform),
      eq(conversations.customerId, customerId),
      eq(conversations.type, 'dm')
    ));
  return results.map(r => r.id);
}

async function linkConversationsToContact(conversationIds: string[], contactId: string): Promise<void> {
  if (conversationIds.length === 0) return;
  
  await db
    .update(conversations)
    .set({ contactId })
    .where(sql`${conversations.id} IN (${sql.join(conversationIds.map(id => sql`${id}`), sql`, `)})`);
}

async function migrateContacts() {
  console.log("🔄 Starting CRM Contact Backfill Migration (v2)...\n");
  console.log("This script will:\n");
  console.log("  1. Create CRM contacts from existing DM conversations");
  console.log("  2. Calculate real message counts");
  console.log("  3. Link conversations to CRM contacts\n");

  const uniqueContacts = await getUniqueContactsWithMetrics();
  console.log(`Found ${uniqueContacts.length} unique DM contacts across all brands.\n`);

  let created = 0;
  let updated = 0;
  let skipped = 0;
  let failed = 0;
  let conversationsLinked = 0;

  for (const contact of uniqueContacts) {
    const { brandId, platform, customerId, customerName, customerAvatar, conversationCount, totalMessages, firstMessageAt, lastMessageAt } = contact;

    try {
      const existingChannel = await storage.findCrmContactChannelByExternal(brandId, platform, customerId);
      
      const convIds = await getConversationIdsForContact(brandId, platform, customerId);
      const metrics = await getMessageMetricsForConversations(convIds);
      
      if (existingChannel) {
        await db.update(crmContactChannels)
          .set({ 
            messageCount: metrics.count,
            lastMessageAt: metrics.lastMessageAt
          })
          .where(eq(crmContactChannels.id, existingChannel.id));
        
        await db.update(crmContacts)
          .set({ 
            conversationCount,
            totalMessages: metrics.count,
            firstInteractionAt: metrics.firstMessageAt,
            lastInteractionAt: metrics.lastMessageAt
          })
          .where(eq(crmContacts.id, existingChannel.contactId));

        await linkConversationsToContact(convIds, existingChannel.contactId);
        conversationsLinked += convIds.length;

        console.log(`🔄 Updated: ${customerName || customerId} (${platform}) - ${metrics.count} msgs, ${convIds.length} convs linked`);
        updated++;
        continue;
      }

      const displayName = customerName || customerId;
      const parsedName = parseDisplayName(displayName);

      const newContact = await storage.createCrmContact({
        brandId,
        displayName,
        firstName: parsedName.firstName,
        lastName: parsedName.lastName,
        status: 'lead',
        lifecycleStage: 'new',
        source: `${platform}_dm_backfill`,
        conversationCount,
        totalMessages: metrics.count,
        firstInteractionAt: metrics.firstMessageAt,
        lastInteractionAt: metrics.lastMessageAt,
      });

      await storage.createCrmContactChannel({
        contactId: newContact.id,
        platform,
        externalId: customerId,
        username: customerName || customerId,
        avatarUrl: customerAvatar,
        isActive: true,
        messageCount: metrics.count,
        lastMessageAt: metrics.lastMessageAt,
      });

      await linkConversationsToContact(convIds, newContact.id);
      conversationsLinked += convIds.length;

      console.log(`✅ Created: ${displayName} (${platform}) - ${metrics.count} msgs, ${convIds.length} convs linked`);
      created++;

    } catch (error: any) {
      console.log(`❌ Failed: ${customerName || customerId} (${platform}) - ${error.message}`);
      failed++;
    }
  }

  console.log(`\n${"=".repeat(60)}`);
  console.log(`📊 CRM BACKFILL MIGRATION COMPLETE (v2)`);
  console.log(`${"=".repeat(60)}`);
  console.log(`Total unique DM contacts: ${uniqueContacts.length}`);
  console.log(`✅ Created: ${created}`);
  console.log(`🔄 Updated (existing): ${updated}`);
  console.log(`❌ Failed: ${failed}`);
  console.log(`🔗 Conversations linked: ${conversationsLinked}`);
  console.log(`\nThe script is idempotent - you can safely run it again.`);

  process.exit(0);
}

migrateContacts().catch(err => {
  console.error("Fatal error:", err);
  process.exit(1);
});
