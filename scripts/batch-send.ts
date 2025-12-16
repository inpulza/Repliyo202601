import { storage } from '../server/storage';
import { MetricoolService } from '../server/services/metricool';
import { randomUUID } from 'crypto';

async function batchSend() {
  const brandId = '866600f9-4c0e-4d5e-b9d4-62fc9113426b';
  const limit = 15;
  
  console.log('Starting batch SEND (will post to Instagram)...\n');
  
  const brand = await storage.getBrand(brandId);
  if (!brand) {
    console.error('Brand not found');
    return;
  }
  
  if (!brand.metricoolToken || !brand.metricoolBlogId || !brand.metricoolUserId) {
    console.error('Missing Metricool credentials');
    return;
  }
  
  const agent = await storage.getAiAgentByBrand(brandId);
  if (!agent) {
    console.error('Agent not found');
    return;
  }
  
  console.log(`Brand: ${brand.name}`);
  console.log(`Agent: ${agent.provider}/${agent.model}\n`);
  
  // Get messages that have ai_suggested_reply but haven't been sent yet
  const result = await storage.getMessagesWithPendingSuggestions(brandId, 'instagram', limit);
  
  console.log(`Found ${result.length} messages with pending suggestions to send\n`);
  
  if (result.length === 0) {
    console.log('No pending messages to send');
    return;
  }
  
  const metricoolService = new MetricoolService({
    userToken: brand.metricoolToken,
    userId: brand.metricoolUserId,
  });
  
  let successCount = 0;
  let errorCount = 0;
  
  for (const message of result) {
    const rawData = message.rawData as any;
    const objectId = rawData?.id || rawData?.root?.id || message.metricoolId?.split("_")[0];
    
    console.log(`--- Sending reply to: ${message.author} ---`);
    console.log(`Comment: ${message.content?.substring(0, 50)}...`);
    console.log(`Reply: ${message.aiSuggestedReply?.substring(0, 60)}...`);
    
    if (!objectId) {
      console.log(`❌ Skipped: No objectId found (might be DM)`);
      errorCount++;
      continue;
    }
    
    try {
      const conversation = message.conversationId 
        ? await storage.getConversation(message.conversationId)
        : null;
      
      // Send to Instagram via Metricool
      const sendResult = await metricoolService.replyToComment({
        provider: 'instagram',
        objectId: objectId,
        text: message.aiSuggestedReply!,
        blogId: brand.metricoolBlogId,
        mentionUsername: message.author,
      });
      
      if (!sendResult.success) {
        console.log(`❌ Failed: ${sendResult.error}`);
        await storage.updateMessage(message.id, { aiReplyStatus: 'failed' });
        errorCount++;
        continue;
      }
      
      // Create outbound message record
      const replyMessage = await storage.createMessage({
        brandId: brand.id,
        conversationId: message.conversationId!,
        platform: 'instagram',
        type: 'comment',
        direction: 'outbound',
        author: brand.name,
        authorAvatar: brand.avatar,
        content: message.aiSuggestedReply!,
        timestamp: new Date(),
        status: 'read',
        source: 'repliyo_auto',
        internalOrigin: 'ai',
        parentMessageId: message.id,
        aiAgentId: agent.id,
        aiSuggestedReply: message.aiSuggestedReply,
        aiReplyStatus: 'sent',
        urgency: null,
        intent: null,
        sentiment: null,
        aiSummary: null,
        draftResponse: null,
        sourceUrl: null,
        contextType: null,
        crmData: null,
        metricoolId: null,
        rawData: { batchSend: true, metricoolResponse: sendResult.rawResponse },
        threadId: conversation?.threadExternalId,
      });
      
      // Update original message status
      await storage.updateMessage(message.id, { aiReplyStatus: 'sent' });
      
      // Update conversation
      if (conversation) {
        await storage.updateConversation(conversation.id, {
          lastMessageAt: new Date(),
          lastMessagePreview: message.aiSuggestedReply!.substring(0, 100),
          status: 'closed',
        });
      }
      
      // Create audit log
      await storage.createAuditLog({
        agentId: agent.id,
        messageId: message.id,
        conversationId: message.conversationId || null,
        action: 'batch_send',
        inputContent: message.content,
        outputContent: message.aiSuggestedReply,
        status: 'success',
        platform: 'instagram',
        characterCount: message.aiSuggestedReply!.length,
      });
      
      console.log(`✅ Sent successfully! (new msg: ${replyMessage.id})`);
      successCount++;
      
      // Delay between sends to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 2000));
      
    } catch (error: any) {
      console.error(`❌ Error: ${error.message}`);
      await storage.updateMessage(message.id, { aiReplyStatus: 'failed' });
      errorCount++;
    }
  }
  
  console.log(`\n=== Batch send complete ===`);
  console.log(`✅ Success: ${successCount}`);
  console.log(`❌ Failed: ${errorCount}`);
}

batchSend().catch(console.error);
