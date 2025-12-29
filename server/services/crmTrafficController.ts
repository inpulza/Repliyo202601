import { storage } from "../storage";
import { log } from "../app";
import type { CrmContact, CrmContactChannel, CrmContactLimbo } from "@shared/schema";

interface IncomingMessageData {
  brandId: string;
  platform: string;
  externalId: string;
  username: string;
  avatarUrl?: string | null;
  displayName?: string | null;
  messageType: 'dm' | 'comment';
}

interface RouteResult {
  type: 'contact' | 'limbo';
  contactId?: string;
  channelId?: string;
  limboId?: string;
  isNew: boolean;
}

class CrmTrafficController {
  async routeIncomingMessage(data: IncomingMessageData): Promise<RouteResult> {
    const { messageType } = data;
    
    if (messageType === 'dm') {
      return this.routeDM(data);
    } else {
      return this.routeComment(data);
    }
  }

  private async routeDM(data: IncomingMessageData): Promise<RouteResult> {
    const { brandId, platform, externalId, username, avatarUrl, displayName } = data;
    
    log(`[CRM-Traffic] Routing DM from ${username} (${platform}/${externalId}) brandId=${brandId}`, "crm");

    const existingChannel = await storage.findCrmContactChannelByExternal(brandId, platform, externalId);
    
    if (existingChannel) {
      await storage.incrementCrmChannelMessageCount(existingChannel.id);
      await storage.incrementCrmContactMetrics(existingChannel.contactId, 0, 1);
      
      log(`[CRM-Traffic] Found existing contact channel ${existingChannel.id}`, "crm");
      return {
        type: 'contact',
        contactId: existingChannel.contactId,
        channelId: existingChannel.id,
        isNew: false,
      };
    }

    const existingLimbo = await storage.findCrmLimboEntry(brandId, platform, externalId);
    
    const parsedName = this.parseDisplayName(displayName || username);
    
    const newContact = await storage.createCrmContact({
      brandId,
      displayName: displayName || username,
      firstName: parsedName.firstName,
      lastName: parsedName.lastName,
      status: 'lead',
      lifecycleStage: 'new',
      source: `${platform}_dm`,
    });
    
    log(`[CRM-Traffic] Created new contact ${newContact.id} from DM`, "crm");

    const newChannel = await storage.createCrmContactChannel({
      contactId: newContact.id,
      platform,
      externalId,
      username,
      avatarUrl: avatarUrl || null,
      messageCount: 1,
      lastMessageAt: new Date(),
    });
    
    log(`[CRM-Traffic] Created new channel ${newChannel.id} for contact`, "crm");

    if (existingLimbo) {
      await storage.promoteCrmLimboToContact(existingLimbo.id, newContact.id);
      log(`[CRM-Traffic] Promoted limbo entry ${existingLimbo.id} to contact`, "crm");
    }

    return {
      type: 'contact',
      contactId: newContact.id,
      channelId: newChannel.id,
      isNew: true,
    };
  }

  private async routeComment(data: IncomingMessageData): Promise<RouteResult> {
    const { brandId, platform, externalId, username, avatarUrl } = data;
    
    log(`[CRM-Traffic] Routing comment from ${username} (${platform}/${externalId}) brandId=${brandId}`, "crm");

    const existingChannel = await storage.findCrmContactChannelByExternal(brandId, platform, externalId);
    
    if (existingChannel) {
      await storage.incrementCrmChannelMessageCount(existingChannel.id);
      await storage.incrementCrmContactMetrics(existingChannel.contactId, 0, 1);
      
      log(`[CRM-Traffic] Comment from existing contact ${existingChannel.contactId}`, "crm");
      return {
        type: 'contact',
        contactId: existingChannel.contactId,
        channelId: existingChannel.id,
        isNew: false,
      };
    }

    const limboEntry = await storage.upsertCrmLimboEntry({
      brandId,
      platform,
      externalId,
      username,
      avatarUrl: avatarUrl || null,
      interactionType: 'comment',
      interactionCount: 1,
      firstInteractionAt: new Date(),
      lastInteractionAt: new Date(),
    });
    
    const isNew = limboEntry.interactionCount === 1;
    log(`[CRM-Traffic] ${isNew ? 'Created' : 'Updated'} limbo entry ${limboEntry.id} (count: ${limboEntry.interactionCount})`, "crm");

    return {
      type: 'limbo',
      limboId: limboEntry.id,
      isNew,
    };
  }

  private parseDisplayName(displayName: string): { firstName: string | null; lastName: string | null } {
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
}

export const crmTrafficController = new CrmTrafficController();
