import { db } from "./server/db";
import { conversations, brands, aiAgents, reminderRules } from "./shared/schema";
import { eq, and } from "drizzle-orm";
import { composeReminderPrompt } from "./server/services/llm/prompt-composer";
import { createLLMProvider } from "./server/services/llm/provider-factory";
import { storage } from "./server/storage";

async function testReminderGeneration() {
  // Get a TikTok conversation from BOTrust
  const [conversation] = await db
    .select()
    .from(conversations)
    .where(
      and(
        eq(conversations.platform, "tiktok"),
        eq(conversations.brandId, (await db.select().from(brands).where(eq(brands.name, "BO Trust ")).limit(1))[0]?.id || '')
      )
    )
    .limit(1);

  if (!conversation) {
    console.log("No TikTok conversation found");
    return;
  }

  console.log(`\nConversación encontrada: ${conversation.id}`);
  console.log(`Plataforma: ${conversation.platform}`);

  const agent = await storage.getAiAgentByBrand(conversation.brandId);
  const brand = await storage.getBrand(conversation.brandId);
  const messages = await storage.getMessagesByConversation(conversation.id);

  if (!agent) {
    console.log("No agent found");
    return;
  }

  const { systemPrompt, userPrompt } = composeReminderPrompt({
    agent,
    brand: brand || undefined,
    conversation,
    conversationHistory: messages.slice(-5),
    reminderNumber: 1,
    maxReminders: 2,
    customerName: messages[0]?.author || "Cliente",
    timeSinceLastMessage: "2 días",
  });

  console.log("\n========== USER PROMPT (extracto) ==========");
  // Show just the TAREA section
  const tareaMatch = userPrompt.match(/--- TAREA ---[\s\S]*$/);
  if (tareaMatch) {
    console.log(tareaMatch[0]);
  }

  // Now generate the actual content
  console.log("\n========== GENERANDO CONTENIDO ==========");
  const provider = createLLMProvider(agent, {});
  const response = await provider.generateRawCompletion(
    systemPrompt,
    userPrompt,
    { temperature: 0.7, maxTokens: 150 }
  );

  console.log(`\nContenido generado (${response.text.length} caracteres):`);
  console.log(`"${response.text}"`);
  
  if (response.text.length <= 150) {
    console.log("\n✅ CORRECTO: El mensaje tiene menos de 150 caracteres");
  } else {
    console.log("\n❌ PROBLEMA: El mensaje excede 150 caracteres");
  }
}

testReminderGeneration().then(() => process.exit(0)).catch(e => {
  console.error(e);
  process.exit(1);
});
