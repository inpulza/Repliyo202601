import { useState, useRef, useEffect, useMemo } from 'react';
import type { Conversation, Message } from '@shared/schema';

interface UseUnreadTrackingOptions {
  activeConversation: Conversation | null | undefined;
  activeConversationMessages: Message[] | undefined;
  conversations: Conversation[];
}

export function useUnreadTracking({
  activeConversation,
  activeConversationMessages,
  conversations,
}: UseUnreadTrackingOptions) {
  const [unreadMessageIds, setUnreadMessageIds] = useState<Set<string>>(new Set());
  const [capturedUnreadCount, setCapturedUnreadCount] = useState<number>(0);
  const unreadCapturedRef = useRef<string | null>(null);

  useEffect(() => {
    setUnreadMessageIds(new Set());
    unreadCapturedRef.current = null;
    setCapturedUnreadCount(activeConversation?.unreadCount || 0);
  }, [activeConversation?.id]);

  useEffect(() => {
    if (!activeConversation?.id || !activeConversationMessages?.length) return;
    
    // Only capture once per conversation, and only if there were unread messages
    if (unreadCapturedRef.current === activeConversation.id) return;
    if (capturedUnreadCount <= 0) return;
    
    // Get the N most recent inbound messages where N = capturedUnreadCount
    // IMPORTANT: Only inbound messages can be "unread" - outbound are our own replies
    const inboundMessages = activeConversationMessages
      .filter(m => m.direction === 'inbound')
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, capturedUnreadCount);
    
    if (inboundMessages.length > 0) {
      setUnreadMessageIds(new Set(inboundMessages.map(m => m.id)));
      unreadCapturedRef.current = activeConversation.id;
    }
  }, [activeConversation?.id, activeConversationMessages, capturedUnreadCount]);

  const totalUnread = useMemo(() => 
    conversations.reduce((sum, c) => sum + (c.unreadCount || 0), 0),
    [conversations]
  );

  const platformUnreadCounts = useMemo(() => ({
    instagram: conversations.filter(c => c.platform === 'instagram' && (c.unreadCount || 0) > 0).length,
    tiktok: conversations.filter(c => c.platform === 'tiktok' && (c.unreadCount || 0) > 0).length,
    facebook: conversations.filter(c => c.platform === 'facebook' && (c.unreadCount || 0) > 0).length,
    linkedin: conversations.filter(c => c.platform === 'linkedin' && (c.unreadCount || 0) > 0).length,
    youtube: conversations.filter(c => c.platform === 'youtube' && (c.unreadCount || 0) > 0).length,
    'google-business': conversations.filter(c => c.platform === 'google-business' && (c.unreadCount || 0) > 0).length,
    whatsapp: conversations.filter(c => c.platform === 'whatsapp' && (c.unreadCount || 0) > 0).length,
  }), [conversations]);

  const isMessageUnread = (messageId: string) => unreadMessageIds.has(messageId);
  
  const clearUnreadMessage = (messageId: string) => {
    setUnreadMessageIds(prev => {
      const next = new Set(prev);
      next.delete(messageId);
      return next;
    });
  };
  
  const resetUnreadTracking = () => {
    setUnreadMessageIds(new Set());
    unreadCapturedRef.current = null;
    setCapturedUnreadCount(0);
  };

  return {
    unreadMessageIds,
    setUnreadMessageIds,
    capturedUnreadCount,
    setCapturedUnreadCount,
    totalUnread,
    platformUnreadCounts,
    isMessageUnread,
    clearUnreadMessage,
    resetUnreadTracking,
  };
}
