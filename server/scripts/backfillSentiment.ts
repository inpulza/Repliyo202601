import { db } from "../db";
import { sql } from "drizzle-orm";
import { sentimentAnalysisService } from "../services/SentimentAnalysisService";

const BRAND_IDS = [
  { id: '866600f9-4c0e-4d5e-b9d4-62fc9113426b', name: 'BO Trust' },
  { id: '7da9fc00-2fbe-411d-9cc1-5c12a0db618b', name: 'hmpsychiatry' },
];

const CRISIS_KEYWORDS = [
  'scam', 'fraud', 'estafa', 'steal', 'stolen', 'robo',
  'lawsuit', 'demanda', 'legal', 'lawyer', 'abogado',
  'police', 'policia', 'denuncia',
  'worst', 'terrible', 'horrible', 'disgusting',
  'never again', 'nunca mas', 'nunca más',
  'refund', 'reembolso', 'money back',
  'rip off', 'ripoff',
  'threat', 'amenaz',
  'angry', 'furious', 'furioso',
  'hate', 'odio',
  'urgent', 'urgente', 'emergency', 'emergencia',
  'disappointed', 'decepcion', 'decepción',
  'unacceptable', 'inaceptable',
  'complaint', 'queja',
  'broken', 'damaged', 'dañado',
  'dead', 'die', 'kill', 'morir',
  'help me', 'ayuda', 'socorro',
  'depresion', 'depresión', 'ansiedad', 'anxiety',
  'no aguanto', 'ya no puedo', 'necesito ayuda',
  'mentira', 'engaño',
];

async function backfill() {
  for (const brand of BRAND_IDS) {
    console.log(`\n========================================`);
    console.log(`Starting backfill for: ${brand.name} (${brand.id})`);
    console.log(`========================================\n`);

    const keywordCondition = CRISIS_KEYWORDS
      .map(kw => `m.content ILIKE '%${kw.replace(/'/g, "''")}%'`)
      .join(' OR ');

    const result = await db.execute(sql.raw(`
      SELECT m.id, m.content, m.platform, m.author, m.created_at, m.conversation_id
      FROM messages m
      WHERE m.direction = 'inbound'
        AND m.brand_id = '${brand.id}'
        AND m.content IS NOT NULL
        AND LENGTH(m.content) > 10
        AND (${keywordCondition})
        AND m.id NOT IN (SELECT sa.message_id FROM sentiment_alerts sa WHERE sa.message_id IS NOT NULL)
      ORDER BY m.created_at DESC
      LIMIT 150
    `));

    const msgs = (result.rows || result) as any[];
    console.log(`Found ${msgs.length} flagged messages for ${brand.name}`);

    let processed = 0;
    let alertsCreated = 0;
    let p1Count = 0;
    let p2Count = 0;
    let p3Count = 0;
    let p4Count = 0;
    let errors = 0;

    for (const msg of msgs) {
      try {
        const outcome = await sentimentAnalysisService.processInboundMessage(
          msg.id,
          msg.content,
          brand.id,
          msg.conversation_id,
          msg.platform || 'unknown',
          msg.author || 'unknown',
          new Date(msg.created_at),
        );

        if (outcome.success && outcome.result) {
          if (outcome.result.severity === 'P1') p1Count++;
          else if (outcome.result.severity === 'P2') p2Count++;
          else if (outcome.result.severity === 'P3') p3Count++;
          else p4Count++;
        }

        if (outcome.alertCreated) alertsCreated++;
        processed++;

        if (processed % 5 === 0) {
          console.log(`  [${brand.name}] ${processed}/${msgs.length} | Alerts: ${alertsCreated} (P1:${p1Count} P2:${p2Count} P3:${p3Count} P4:${p4Count})`);
        }

        await new Promise(resolve => setTimeout(resolve, 300));
      } catch (err) {
        errors++;
        console.error(`  Error on message ${msg.id}:`, err);
      }
    }

    console.log(`\n--- ${brand.name} RESULTS ---`);
    console.log(`  Total processed: ${processed}`);
    console.log(`  Alerts created: ${alertsCreated}`);
    console.log(`  P1 (Critical): ${p1Count}`);
    console.log(`  P2 (High): ${p2Count}`);
    console.log(`  P3 (Medium): ${p3Count}`);
    console.log(`  P4 (Low): ${p4Count}`);
    console.log(`  Errors: ${errors}`);
  }

  console.log('\n\n=== BACKFILL COMPLETE ===');
  process.exit(0);
}

backfill().catch(err => {
  console.error('Backfill failed:', err);
  process.exit(1);
});
