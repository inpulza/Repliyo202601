/**
 * TEST: Simular generación de reminders sin afectar datos
 * 
 * Este script:
 * 1. Toma conversaciones reales de "Inpulza Testing"
 * 2. Llama al nuevo composeReminderPrompt()
 * 3. Envía a la LLM real
 * 4. Muestra el resultado en logs (NO postea nada)
 * 
 * Ejecutar: npx tsx server/scripts/test-reminder-prompt.ts
 */

import { storage } from "../storage";
import { createLLMProvider } from "../services/llm/factory";
import { composeReminderPrompt, filterHistoryByAuthor } from "../services/llm/prompt-composer";
import type { Message } from "@shared/schema";

const BRAND_ID = "83a64a0b-5ac8-4bf7-8a0e-b6da839d77b0"; // Inpulza Testing

// Conversaciones de prueba (con más mensajes)
const TEST_CONVERSATIONS = {
  dm: "320755f5-c314-499d-a3d9-8f76d396daf8",           // DM Instagram, molisen86, 26 msgs
  comment1: "7d0fee48-a07b-4d59-aab5-0be52732bc83",     // Comment Facebook, Mandy Arab, 16 msgs
  comment2: "e3fd1fd7-c467-4049-9994-5f4fba0fa9c9",     // Comment Instagram, joshuaisherdez, 10 msgs (quiere comprar)
};

async function testReminderGeneration(
  conversationId: string, 
  reminderNumber: number,
  label: string
) {
  console.log(`\n${"=".repeat(80)}`);
  console.log(`🧪 TEST: ${label} - Reminder #${reminderNumber}`);
  console.log(`${"=".repeat(80)}\n`);

  try {
    // 1. Obtener conversación
    const conversation = await storage.getConversation(conversationId);
    if (!conversation) {
      console.log(`❌ Conversación no encontrada: ${conversationId}`);
      return;
    }
    console.log(`📍 Conversación: ${conversation.type} en ${conversation.platform}`);
    console.log(`👤 Cliente: ${conversation.customerName}`);

    // 2. Obtener agente
    const agent = await storage.getAiAgentByBrand(conversation.brandId);
    if (!agent) {
      console.log(`❌ No hay agente configurado para esta marca`);
      return;
    }
    console.log(`🤖 Agente: ${agent.name} (${agent.provider}/${agent.model})`);
    console.log(`   - SystemPrompt: ${agent.systemPrompt ? `${agent.systemPrompt.substring(0, 100)}...` : 'No configurado'}`);
    console.log(`   - Guardrails: ${agent.guardrailPrompt ? `${agent.guardrailPrompt.substring(0, 100)}...` : 'No configurado'}`);
    console.log(`   - KnowledgeBase: ${agent.knowledgeBase ? `${agent.knowledgeBase.substring(0, 100)}...` : 'No configurado'}`);

    // 3. Obtener brand
    const brand = await storage.getBrand(conversation.brandId);
    console.log(`🏢 Marca: ${brand?.name}`);

    // 4. Obtener historial
    const allMessages = await storage.getMessagesByConversation(conversation.id);
    const isDm = conversation.type === 'conversation';
    
    let conversationHistory: Message[];
    if (isDm) {
      conversationHistory = allMessages.slice(-20);
    } else {
      const lastInbound = [...allMessages].reverse().find(m => m.direction === 'inbound');
      if (lastInbound) {
        conversationHistory = filterHistoryByAuthor(allMessages, lastInbound, 'comment');
      } else {
        conversationHistory = allMessages.slice(-10);
      }
    }
    console.log(`📜 Historial: ${conversationHistory.length} mensajes`);
    
    // Mostrar mensajes
    console.log(`\n--- HISTORIAL DE MENSAJES ---`);
    for (const msg of conversationHistory) {
      const role = msg.direction === 'inbound' ? '👤 Cliente' : '🤖 Agente';
      console.log(`${role}: ${(msg.content || '').substring(0, 100)}${(msg.content?.length || 0) > 100 ? '...' : ''}`);
    }
    console.log(`--- FIN HISTORIAL ---\n`);

    // 5. Obtener userSummary (para DMs)
    let userSummary = null;
    if (isDm) {
      const lastInbound = [...allMessages].reverse().find(m => m.direction === 'inbound');
      if (lastInbound?.author) {
        userSummary = await storage.getConversationUserSummary(conversation.id, lastInbound.author);
      }
    }
    console.log(`📝 UserSummary: ${userSummary ? 'Sí' : 'No'}`);
    if (userSummary?.summary) {
      console.log(`   "${userSummary.summary.substring(0, 150)}..."`);
    }

    // 6. Obtener socialPost (para comentarios)
    let socialPost = null;
    if (!isDm && conversation.socialPostId) {
      socialPost = await storage.getSocialPost(conversation.socialPostId);
    }
    console.log(`🎬 SocialPost: ${socialPost?.caption ? 'Sí' : 'No'}`);
    if (socialPost?.caption) {
      console.log(`   "${socialPost.caption.substring(0, 150)}..."`);
    }

    // 7. Obtener CRM profile
    let crmProfile = null;
    if (conversation.contactId) {
      const contact = await storage.getCrmContact(conversation.contactId);
      if (contact) {
        const customFields = (contact.customFields || {}) as Record<string, any>;
        crmProfile = {
          lifecycleStage: contact.lifecycleStage,
          status: contact.status,
          serviceInterest: customFields.serviceInterest,
          intent: customFields.intent,
          preferredChannel: customFields.preferredChannel,
        };
      }
    }
    console.log(`📊 CRM Profile: ${crmProfile ? 'Sí' : 'No'}`);

    // 8. Calcular tiempo desde último mensaje
    const lastMessageAt = conversation.lastCustomerMessageAt || conversation.lastMessageAt;
    const timeSinceLastMessage = formatTimeSince(lastMessageAt);
    console.log(`⏰ Tiempo sin respuesta: ${timeSinceLastMessage}`);

    // 9. Obtener nombre del cliente
    const lastInbound = [...allMessages].reverse().find(m => m.direction === 'inbound');
    let customerName = conversation.customerName || lastInbound?.author || 'Cliente';

    // ========== GENERAR PROMPT ==========
    console.log(`\n${"─".repeat(60)}`);
    console.log(`📝 GENERANDO PROMPT CON composeReminderPrompt()...`);
    console.log(`${"─".repeat(60)}\n`);

    const { systemPrompt, userPrompt } = composeReminderPrompt({
      agent,
      brand: brand || undefined,
      conversation,
      conversationHistory,
      userSummary,
      socialPost,
      reminderNumber,
      maxReminders: 2,
      customerName,
      timeSinceLastMessage,
      crmProfile,
    });

    console.log(`\n${"─".repeat(60)}`);
    console.log(`🔧 SYSTEM PROMPT (${systemPrompt.length} chars):`);
    console.log(`${"─".repeat(60)}`);
    console.log(systemPrompt);
    
    console.log(`\n${"─".repeat(60)}`);
    console.log(`📨 USER PROMPT (${userPrompt.length} chars):`);
    console.log(`${"─".repeat(60)}`);
    console.log(userPrompt);

    // ========== ENVIAR A LLM ==========
    console.log(`\n${"─".repeat(60)}`);
    console.log(`🚀 ENVIANDO A LLM (${agent.provider}/${agent.model})...`);
    console.log(`${"─".repeat(60)}\n`);

    const secrets = {
      openaiApiKey: process.env.OPENAI_API_KEY,
      geminiApiKey: process.env.GEMINI_API_KEY,
    };

    const provider = createLLMProvider(agent, secrets);
    const response = await provider.generateRawCompletion(
      systemPrompt,
      userPrompt,
      { temperature: 0.7, maxTokens: 150 }
    );

    console.log(`\n${"=".repeat(60)}`);
    console.log(`✅ RESULTADO DEL REMINDER #${reminderNumber}:`);
    console.log(`${"=".repeat(60)}`);
    console.log(`\n${response.text.trim()}\n`);
    console.log(`${"=".repeat(60)}`);
    console.log(`📊 Tokens usados: ${response.usage?.totalTokens || 'N/A'}`);
    console.log(`${"=".repeat(60)}\n`);

  } catch (error) {
    console.error(`❌ Error en prueba: ${error}`);
  }
}

function formatTimeSince(date: Date | null): string {
  if (!date) return 'tiempo desconocido';
  
  const now = new Date();
  const diffMs = now.getTime() - new Date(date).getTime();
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffHours / 24);
  
  if (diffDays > 0) {
    return `${diffDays} día${diffDays > 1 ? 's' : ''}`;
  }
  return `${diffHours} hora${diffHours !== 1 ? 's' : ''}`;
}

async function runAllTests() {
  console.log(`\n${"#".repeat(80)}`);
  console.log(`#  TEST DE REMINDER PROMPTS - ${new Date().toISOString()}`);
  console.log(`#  Marca: Inpulza Testing`);
  console.log(`#  NOTA: Esto NO postea nada, solo muestra resultados en logs`);
  console.log(`${"#".repeat(80)}\n`);

  // Test 1: DM - Primer reminder
  await testReminderGeneration(TEST_CONVERSATIONS.dm, 1, "DM Instagram");
  
  // Test 2: DM - Segundo reminder
  await testReminderGeneration(TEST_CONVERSATIONS.dm, 2, "DM Instagram");

  // Test 3: Comentario Facebook - Primer reminder
  await testReminderGeneration(TEST_CONVERSATIONS.comment1, 1, "Comentario Facebook");
  
  // Test 4: Comentario Instagram - Primer reminder
  await testReminderGeneration(TEST_CONVERSATIONS.comment2, 1, "Comentario Instagram");

  console.log(`\n${"#".repeat(80)}`);
  console.log(`#  PRUEBAS COMPLETADAS`);
  console.log(`${"#".repeat(80)}\n`);
}

// Ejecutar
runAllTests()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("Error fatal:", err);
    process.exit(1);
  });
