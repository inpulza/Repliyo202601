import { storage } from '../server/storage';
import { createLLMProvider } from '../server/services/llm';

async function processBatch() {
  const brandId = '866600f9-4c0e-4d5e-b9d4-62fc9113426b';
  const platform = 'instagram';
  const limit = 15;
  
  console.log('Starting batch processing...');
  
  const brand = await storage.getBrand(brandId);
  if (!brand) {
    console.error('Brand not found');
    return;
  }
  
  const agent = await storage.getAiAgentByBrand(brandId);
  if (!agent) {
    console.error('Agent not found');
    return;
  }
  
  console.log(`Agent: ${agent.provider}/${agent.model}, Active: ${agent.isActive}`);
  
  const pendingMessages = await storage.getPendingCommentsForBatchProcessing(brandId, platform, limit);
  console.log(`Found ${pendingMessages.length} pending comments`);
  
  if (pendingMessages.length === 0) {
    console.log('No pending comments to process');
    return;
  }
  
  const llmProvider = createLLMProvider(agent, {});
  
  for (const message of pendingMessages) {
    console.log(`\n--- Processing: ${message.author} ---`);
    console.log(`Input: ${message.content?.substring(0, 60)}`);
    
    try {
      let conversation;
      let conversationMessages: any[] = [];
      
      if (message.conversationId) {
        conversation = await storage.getConversation(message.conversationId);
        conversationMessages = await storage.getMessagesByConversation(message.conversationId);
        conversationMessages.sort((a, b) => 
          new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
        );
      }
      
      const response = await llmProvider.generateReply({
        agent,
        message,
        conversation: conversation || undefined,
        brand,
        conversationHistory: conversationMessages,
      });
      
      await storage.updateMessage(message.id, {
        aiSuggestedReply: response.text,
        aiReplyStatus: 'suggested',
        aiAgentId: agent.id,
      });
      
      await storage.createAuditLog({
        agentId: agent.id,
        messageId: message.id,
        conversationId: message.conversationId || null,
        action: 'batch_generate',
        inputContent: message.content,
        outputContent: response.text,
        status: 'success',
        promptTokens: response.usage.promptTokens,
        completionTokens: response.usage.completionTokens,
        platform: message.platform,
        characterCount: response.characterCount,
        wasCharacterLimited: response.wasCharacterLimited,
      });
      
      console.log(`Output (${response.characterCount} chars): ${response.text}`);
      console.log(`✅ Success`);
      
      await new Promise(resolve => setTimeout(resolve, 1000));
      
    } catch (error: any) {
      console.error(`❌ Error: ${error.message}`);
    }
  }
  
  console.log('\n=== Batch processing complete ===');
}

processBatch().catch(console.error);
