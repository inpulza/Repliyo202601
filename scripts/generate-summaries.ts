import { storage } from "../server/storage";
import { checkAndUpdateSummary } from "../server/services/summaryService";

const BRAND_ID = "866600f9-4c0e-4d5e-b9d4-62fc9113426b";
const MIN_MESSAGES = 10;

async function generateSummaries() {
  console.log("🔄 Starting summary generation for BO Trust brand...\n");

  const conversations = await storage.getConversations(BRAND_ID);
  const dmConversations = conversations.filter(c => c.type === 'dm');
  
  console.log(`Found ${dmConversations.length} DM conversations\n`);

  let generated = 0;
  let failed = 0;
  let skipped = 0;

  for (const conv of dmConversations) {
    const messages = await storage.getMessagesByConversation(conv.id);
    
    if (messages.length < MIN_MESSAGES) {
      console.log(`⏭️ Skipping ${conv.customerName || 'Unknown'}: ${messages.length} messages (min: ${MIN_MESSAGES})`);
      skipped++;
      continue;
    }

    const inboundMessage = messages.find(m => m.direction === 'inbound');
    const author = inboundMessage?.author || conv.customerName || 'Unknown';

    try {
      console.log(`\n📝 Generating summary for ${author} (${messages.length} messages)...`);
      await checkAndUpdateSummary(conv.id, author, BRAND_ID);
      console.log(`✅ Summary generated for ${author}`);
      generated++;
    } catch (error: any) {
      console.log(`❌ Failed for ${author}: ${error.message}`);
      failed++;
    }
  }

  console.log(`\n${"=".repeat(50)}`);
  console.log(`📊 SUMMARY GENERATION COMPLETE`);
  console.log(`${"=".repeat(50)}`);
  console.log(`Total DM conversations: ${dmConversations.length}`);
  console.log(`✅ Generated: ${generated}`);
  console.log(`❌ Failed: ${failed}`);
  console.log(`⏭️ Skipped: ${skipped}`);
  
  process.exit(0);
}

generateSummaries().catch(err => {
  console.error("Fatal error:", err);
  process.exit(1);
});
