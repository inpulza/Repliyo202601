import { db } from "../db";
import { messages, socialPosts, conversations } from "@shared/schema";
import { eq, sql } from "drizzle-orm";

interface RawDataComment {
  root?: {
    element?: {
      id?: string;
      link?: string;
      text?: string;
    };
  };
  participants?: Array<{
    id: string;
    name: string;
    imageProfileUrl?: string;
  }>;
}

interface RawDataConversation {
  conversation?: {
    id?: string;
    participants?: Array<{
      id: string;
      name: string;
      imageProfileUrl?: string;
    }>;
  };
  message?: {
    from?: string;
  };
}

async function migrateToThreads() {
  console.log("Starting migration to thread architecture...");

  const allMessages = await db.select().from(messages);
  console.log(`Found ${allMessages.length} messages to process`);

  const stats = {
    socialPostsCreated: 0,
    conversationsCreated: 0,
    messagesUpdated: 0,
    errors: 0,
  };

  const socialPostCache = new Map<string, string>();
  const conversationCache = new Map<string, string>();

  for (const msg of allMessages) {
    try {
      const rawData = msg.rawData as RawDataComment | RawDataConversation | null;
      let socialPostId: string | null = null;
      let conversationId: string | null = null;

      const platform = msg.platform;
      const brandId = msg.brandId;
      const type = msg.type;

      let customerId = "";
      let customerName = msg.author || "Unknown";
      let customerAvatar = msg.authorAvatar || null;

      if (type === "comment") {
        const commentData = rawData as RawDataComment;
        const postExternalId = msg.threadId || commentData?.root?.element?.id || null;
        const postPermalink = msg.sourceUrl || commentData?.root?.element?.link || null;
        const postCaption = commentData?.root?.element?.text || null;

        if (postExternalId) {
          const socialPostKey = `${brandId}:${platform}:${postExternalId}`;
          
          if (socialPostCache.has(socialPostKey)) {
            socialPostId = socialPostCache.get(socialPostKey)!;
          } else {
            const existingPost = await db
              .select()
              .from(socialPosts)
              .where(
                sql`${socialPosts.brandId} = ${brandId} 
                    AND ${socialPosts.platform} = ${platform} 
                    AND ${socialPosts.externalId} = ${postExternalId}`
              );

            if (existingPost.length > 0) {
              socialPostId = existingPost[0].id;
            } else {
              const [newPost] = await db
                .insert(socialPosts)
                .values({
                  brandId,
                  platform,
                  externalId: postExternalId,
                  permalink: postPermalink,
                  caption: postCaption ? postCaption.substring(0, 500) : null,
                })
                .returning();
              socialPostId = newPost.id;
              stats.socialPostsCreated++;
              console.log(`Created SocialPost: ${platform} - ${postExternalId}`);
            }
            socialPostCache.set(socialPostKey, socialPostId);
          }
        }

        const participants = commentData?.participants || [];
        if (participants.length > 0) {
          const author = participants.find(p => p.name === msg.author) || participants[0];
          customerId = author.id || msg.author;
          customerName = author.name || msg.author;
          customerAvatar = author.imageProfileUrl || msg.authorAvatar || null;
        } else {
          customerId = msg.author;
        }

      } else if (type === "conversation") {
        const convData = rawData as RawDataConversation;
        const participants = convData?.conversation?.participants || [];
        
        const messageFrom = convData?.message?.from;
        if (messageFrom && participants.length > 0) {
          const sender = participants.find(p => p.id === messageFrom);
          if (sender) {
            customerId = sender.id;
            customerName = sender.name || msg.author;
            customerAvatar = sender.imageProfileUrl || msg.authorAvatar || null;
          } else {
            customerId = msg.author;
          }
        } else if (participants.length > 0) {
          const firstParticipant = participants[0];
          customerId = firstParticipant.id || msg.author;
          customerName = firstParticipant.name || msg.author;
          customerAvatar = firstParticipant.imageProfileUrl || null;
        } else {
          customerId = msg.author;
        }
      }

      if (!customerId) {
        customerId = msg.author || `unknown_${msg.id}`;
      }

      const conversationKey = socialPostId 
        ? `${brandId}:${platform}:${customerId}:${socialPostId}`
        : `${brandId}:${platform}:${customerId}:dm`;

      if (conversationCache.has(conversationKey)) {
        conversationId = conversationCache.get(conversationKey)!;
        
        await db
          .update(conversations)
          .set({
            lastMessageAt: msg.timestamp,
            lastMessagePreview: msg.content.substring(0, 100),
          })
          .where(eq(conversations.id, conversationId));
      } else {
        const existingConvQuery = socialPostId
          ? sql`${conversations.brandId} = ${brandId} 
                AND ${conversations.platform} = ${platform} 
                AND ${conversations.customerId} = ${customerId}
                AND ${conversations.socialPostId} = ${socialPostId}`
          : sql`${conversations.brandId} = ${brandId} 
                AND ${conversations.platform} = ${platform} 
                AND ${conversations.customerId} = ${customerId}
                AND ${conversations.socialPostId} IS NULL`;

        const existingConv = await db
          .select()
          .from(conversations)
          .where(existingConvQuery);

        if (existingConv.length > 0) {
          conversationId = existingConv[0].id;
          await db
            .update(conversations)
            .set({
              lastMessageAt: msg.timestamp,
              lastMessagePreview: msg.content.substring(0, 100),
            })
            .where(eq(conversations.id, conversationId));
        } else {
          const [newConv] = await db
            .insert(conversations)
            .values({
              brandId,
              socialPostId,
              platform,
              type: type === "conversation" ? "dm" : "comment",
              customerId,
              customerName,
              customerAvatar,
              lastMessageAt: msg.timestamp,
              lastMessagePreview: msg.content.substring(0, 100),
              status: "open",
            })
            .returning();
          conversationId = newConv.id;
          stats.conversationsCreated++;
          console.log(`Created Conversation: ${customerName} on ${platform} (${type})`);
        }
        conversationCache.set(conversationKey, conversationId);
      }

      await db
        .update(messages)
        .set({
          conversationId,
          direction: "inbound",
        })
        .where(eq(messages.id, msg.id));
      stats.messagesUpdated++;

    } catch (error: any) {
      console.error(`Error processing message ${msg.id}:`, error.message);
      stats.errors++;
    }
  }

  console.log("\n=== Migration Complete ===");
  console.log(`Social Posts created: ${stats.socialPostsCreated}`);
  console.log(`Conversations created: ${stats.conversationsCreated}`);
  console.log(`Messages updated: ${stats.messagesUpdated}`);
  console.log(`Errors: ${stats.errors}`);

  return stats;
}

migrateToThreads()
  .then((stats) => {
    console.log("Migration finished successfully!");
    process.exit(0);
  })
  .catch((error) => {
    console.error("Migration failed:", error);
    process.exit(1);
  });
