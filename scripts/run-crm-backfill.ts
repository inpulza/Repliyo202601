import { db } from '../server/db';
import { conversations, crmContacts, crmContactChannels, crmContactLimbo } from '../shared/schema';
import { eq, and, isNull, or, sql } from 'drizzle-orm';

interface BackfillStats {
  dmConversationsProcessed: number;
  contactsCreated: number;
  channelsCreated: number;
  commentConversationsProcessed: number;
  limboEntriesCreated: number;
  skippedAlreadyExists: number;
}

async function runCrmBackfill() {
  console.log('🚀 Starting comprehensive CRM backfill...\n');
  
  const stats: BackfillStats = {
    dmConversationsProcessed: 0,
    contactsCreated: 0,
    channelsCreated: 0,
    commentConversationsProcessed: 0,
    limboEntriesCreated: 0,
    skippedAlreadyExists: 0,
  };

  // Get all brands
  const allConversations = await db.select().from(conversations);
  const brandIds = [...new Set(allConversations.map(c => c.brandId))];
  
  console.log(`Found ${brandIds.length} brands to process\n`);

  for (const brandId of brandIds) {
    console.log(`\n📦 Processing brand: ${brandId}`);
    
    // STEP 1: Process DM conversations -> Create contacts
    await processDMConversations(brandId, stats);
    
    // STEP 2: Process comment conversations -> Create limbo entries
    await processCommentConversations(brandId, stats);
  }

  console.log('\n\n====================================');
  console.log('📊 BACKFILL RESULTS');
  console.log('====================================');
  console.log(`DM Conversations processed: ${stats.dmConversationsProcessed}`);
  console.log(`Contacts created: ${stats.contactsCreated}`);
  console.log(`Channels created: ${stats.channelsCreated}`);
  console.log(`Comment conversations processed: ${stats.commentConversationsProcessed}`);
  console.log(`Limbo entries created: ${stats.limboEntriesCreated}`);
  console.log(`Skipped (already exists): ${stats.skippedAlreadyExists}`);
  console.log('====================================\n');
}

async function processDMConversations(brandId: string, stats: BackfillStats) {
  const dmConversations = await db.select()
    .from(conversations)
    .where(and(
      eq(conversations.brandId, brandId),
      eq(conversations.type, 'dm')
    ));

  console.log(`  Found ${dmConversations.length} DM conversations`);

  for (const conv of dmConversations) {
    stats.dmConversationsProcessed++;
    
    const customerId = conv.customerId;
    const platform = conv.platform;
    
    if (!customerId) continue;

    // Check if channel already exists for this customer
    const existingChannel = await db.select()
      .from(crmContactChannels)
      .where(and(
        eq(crmContactChannels.platform, platform),
        eq(crmContactChannels.externalId, customerId)
      ))
      .limit(1);

    if (existingChannel.length > 0) {
      stats.skippedAlreadyExists++;
      
      // Update conversation with contactId if missing
      if (!conv.contactId) {
        await db.update(conversations)
          .set({ contactId: existingChannel[0].contactId })
          .where(eq(conversations.id, conv.id));
      }
      continue;
    }

    // Create new contact
    const [newContact] = await db.insert(crmContacts)
      .values({
        brandId,
        displayName: conv.customerName || 'Unknown',
        firstName: parseFirstName(conv.customerName),
        lastName: parseLastName(conv.customerName),
        status: 'lead',
        lifecycleStage: 'new',
        source: `${platform}_dm`,
        conversationCount: 1,
        totalMessages: 0,
        firstInteractionAt: conv.createdAt,
        lastInteractionAt: conv.lastMessageAt,
      })
      .returning();

    stats.contactsCreated++;

    // Create channel for the contact
    await db.insert(crmContactChannels)
      .values({
        contactId: newContact.id,
        platform,
        externalId: customerId,
        username: conv.customerName,
        avatarUrl: conv.customerAvatar,
        messageCount: 1,
        lastMessageAt: conv.lastMessageAt,
      });

    stats.channelsCreated++;

    // Link conversation to contact
    await db.update(conversations)
      .set({ contactId: newContact.id })
      .where(eq(conversations.id, conv.id));

    console.log(`    ✅ Created contact: ${conv.customerName} (${platform})`);
  }
}

async function processCommentConversations(brandId: string, stats: BackfillStats) {
  const commentConversations = await db.select()
    .from(conversations)
    .where(and(
      eq(conversations.brandId, brandId),
      eq(conversations.type, 'comment')
    ));

  console.log(`  Found ${commentConversations.length} comment conversations`);

  // Group by unique customer to avoid duplicates
  const uniqueCommenters = new Map<string, typeof commentConversations[0]>();
  
  for (const conv of commentConversations) {
    const key = `${conv.platform}:${conv.customerId}`;
    const existing = uniqueCommenters.get(key);
    
    if (!existing || (conv.lastMessageAt && existing.lastMessageAt && conv.lastMessageAt > existing.lastMessageAt)) {
      uniqueCommenters.set(key, conv);
    }
  }

  console.log(`  Unique commenters: ${uniqueCommenters.size}`);

  for (const [key, conv] of uniqueCommenters) {
    stats.commentConversationsProcessed++;
    
    const customerId = conv.customerId;
    const platform = conv.platform;
    
    // Skip entries without customerId - can't identify them
    if (!customerId || customerId.trim() === '') continue;

    // Check if this person is already a contact (has DM'd us)
    const existingChannel = await db.select()
      .from(crmContactChannels)
      .where(and(
        eq(crmContactChannels.platform, platform),
        eq(crmContactChannels.externalId, customerId)
      ))
      .limit(1);

    if (existingChannel.length > 0) {
      stats.skippedAlreadyExists++;
      continue;
    }

    // Check if limbo entry already exists (safe null handling)
    const existingLimbo = await db.select()
      .from(crmContactLimbo)
      .where(and(
        eq(crmContactLimbo.brandId, brandId),
        eq(crmContactLimbo.platform, platform),
        eq(crmContactLimbo.externalId, customerId)
      ))
      .limit(1);

    if (existingLimbo.length > 0) {
      // Already exists - skip without modifying (idempotent)
      stats.skippedAlreadyExists++;
      continue;
    }

    // Create new limbo entry
    await db.insert(crmContactLimbo)
      .values({
        brandId,
        platform,
        externalId: customerId,
        username: conv.customerName,
        avatarUrl: conv.customerAvatar,
        interactionType: 'comment',
        interactionCount: 1,
        firstInteractionAt: conv.createdAt || new Date(),
        lastInteractionAt: conv.lastMessageAt || new Date(),
      });

    stats.limboEntriesCreated++;
    console.log(`    📝 Created limbo: ${conv.customerName} (${platform})`);
  }
}

function parseFirstName(fullName: string | null): string | null {
  if (!fullName) return null;
  const parts = fullName.trim().split(/\s+/);
  return parts[0] || null;
}

function parseLastName(fullName: string | null): string | null {
  if (!fullName) return null;
  const parts = fullName.trim().split(/\s+/);
  return parts.length > 1 ? parts.slice(1).join(' ') : null;
}

runCrmBackfill()
  .then(() => {
    console.log('✅ CRM Backfill completed successfully!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Backfill failed:', error);
    process.exit(1);
  });
