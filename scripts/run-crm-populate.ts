import { storage } from "../server/storage";
import { crmTrafficController } from "../server/services/crmTrafficController";

function normalizePlatform(provider: string): string {
  const normalized = provider.toLowerCase();
  const platformMap: Record<string, string> = {
    'tiktokbusiness': 'tiktok',
    'gmb': 'google-business',
    'google_business': 'google-business',
  };
  return platformMap[normalized] || normalized;
}

async function populateCRM(brandId: string, brandName: string) {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`Processing brand: ${brandName} (${brandId})`);
  console.log('='.repeat(60));
  
  const allConversations = await storage.getConversations(brandId);
  
  const stats = {
    total: allConversations.length,
    contactsCreated: 0,
    contactsLinked: 0,
    limboCreated: 0,
    limboUpdated: 0,
    alreadyProcessed: 0,
    errors: 0,
    byType: { dm: 0, comment: 0 },
  };

  for (const conv of allConversations) {
    try {
      const messageType: 'dm' | 'comment' = conv.type === 'dm' || conv.type === 'conversation' ? 'dm' : 'comment';
      stats.byType[messageType]++;
      
      const externalId = conv.customerId || conv.threadExternalId || conv.id;
      
      if (!externalId) {
        console.log(`  [SKIP] Conversation ${conv.id} has no externalId`);
        stats.errors++;
        continue;
      }

      const platform = normalizePlatform(conv.platform || 'unknown');

      const result = await crmTrafficController.routeIncomingMessage({
        brandId,
        platform,
        externalId,
        username: conv.customerName || 'Unknown',
        avatarUrl: conv.customerAvatar,
        displayName: conv.customerName,
        messageType,
      });

      if (result.isNew) {
        if (result.type === 'contact') {
          await storage.updateConversation(conv.id, { contactId: result.contactId });
          stats.contactsCreated++;
          console.log(`  [NEW CONTACT] ${conv.customerName} (${platform}/${messageType})`);
        } else {
          stats.limboCreated++;
        }
      } else {
        if (result.type === 'limbo') {
          stats.limboUpdated++;
        } else {
          if (!conv.contactId && result.contactId) {
            await storage.updateConversation(conv.id, { contactId: result.contactId });
            stats.contactsLinked++;
            console.log(`  [LINKED] ${conv.customerName} -> contact ${result.contactId}`);
          } else {
            stats.alreadyProcessed++;
          }
        }
      }
    } catch (convError: any) {
      console.error(`  [ERROR] Conversation ${conv.id}: ${convError.message}`);
      stats.errors++;
    }
  }

  console.log(`\n  Results for ${brandName}:`);
  console.log(`    Total conversations: ${stats.total} (${stats.byType.dm} DMs, ${stats.byType.comment} comments)`);
  console.log(`    New contacts created: ${stats.contactsCreated}`);
  console.log(`    Contacts linked: ${stats.contactsLinked}`);
  console.log(`    New limbo entries: ${stats.limboCreated}`);
  console.log(`    Limbo updated: ${stats.limboUpdated}`);
  console.log(`    Already processed: ${stats.alreadyProcessed}`);
  console.log(`    Errors: ${stats.errors}`);
  
  return stats;
}

async function main() {
  console.log('CRM Populate Script - Processing all brands');
  console.log('Started at:', new Date().toISOString());
  
  const brands = await storage.getBrands();
  const activeBrands = brands.filter(b => b.status !== 'archived');
  
  console.log(`Found ${activeBrands.length} active brands`);
  
  const allStats = {
    brands: 0,
    totalConversations: 0,
    contactsCreated: 0,
    contactsLinked: 0,
    limboCreated: 0,
    limboUpdated: 0,
    alreadyProcessed: 0,
    errors: 0,
  };
  
  for (const brand of activeBrands) {
    const stats = await populateCRM(brand.id, brand.name);
    allStats.brands++;
    allStats.totalConversations += stats.total;
    allStats.contactsCreated += stats.contactsCreated;
    allStats.contactsLinked += stats.contactsLinked;
    allStats.limboCreated += stats.limboCreated;
    allStats.limboUpdated += stats.limboUpdated;
    allStats.alreadyProcessed += stats.alreadyProcessed;
    allStats.errors += stats.errors;
  }
  
  console.log('\n' + '='.repeat(60));
  console.log('FINAL SUMMARY');
  console.log('='.repeat(60));
  console.log(`Brands processed: ${allStats.brands}`);
  console.log(`Total conversations: ${allStats.totalConversations}`);
  console.log(`New contacts created: ${allStats.contactsCreated}`);
  console.log(`Contacts linked: ${allStats.contactsLinked}`);
  console.log(`New limbo entries: ${allStats.limboCreated}`);
  console.log(`Limbo entries updated: ${allStats.limboUpdated}`);
  console.log(`Already processed: ${allStats.alreadyProcessed}`);
  console.log(`Errors: ${allStats.errors}`);
  console.log('\nCompleted at:', new Date().toISOString());
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('Fatal error:', err);
    process.exit(1);
  });
