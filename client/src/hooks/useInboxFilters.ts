import { useState, useCallback } from 'react';
import { Platform, MessageType, Intent } from '@/lib/types';

export type { Platform, MessageType, Intent };

interface UseInboxFiltersResult {
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  intentFilter: Intent | 'all';
  setIntentFilter: (intent: Intent | 'all') => void;
  platformFilter: Platform | 'all';
  setPlatformFilter: (platform: Platform | 'all') => void;
  typeFilter: MessageType | 'all';
  setTypeFilter: (type: MessageType | 'all') => void;
  fireMode: boolean;
  setFireMode: (enabled: boolean) => void;
  showOnlyUnread: boolean;
  setShowOnlyUnread: (show: boolean) => void;
  showInactiveNetworks: boolean;
  setShowInactiveNetworks: (show: boolean) => void;
  focusedConversationId: string | null;
  setFocusedConversationId: (id: string | null) => void;
  highlightedConversationId: string | null;
  setHighlightedConversationId: (id: string | null) => void;
  highlightedMessageId: string | null;
  setHighlightedMessageId: (id: string | null) => void;
  threadFilterNoReply: boolean;
  setThreadFilterNoReply: (enabled: boolean) => void;
  threadFilterWithDraft: boolean;
  setThreadFilterWithDraft: (enabled: boolean) => void;
  threadFilterWithReminder: boolean;
  setThreadFilterWithReminder: (enabled: boolean) => void;
  handlePlatformFilterClick: (platform: Platform | 'all', hasUnread: boolean) => void;
  resetThreadFilters: () => void;
  clearFocusMode: () => void;
}

export function useInboxFilters(): UseInboxFiltersResult {
  const [searchQuery, setSearchQuery] = useState("");
  const [intentFilter, setIntentFilter] = useState<Intent | 'all'>('all');
  const [platformFilter, setPlatformFilter] = useState<Platform | 'all'>('all');
  const [typeFilter, setTypeFilter] = useState<MessageType | 'all'>('all');
  const [fireMode, setFireMode] = useState(false);
  const [showOnlyUnread, setShowOnlyUnread] = useState(false);
  const [showInactiveNetworks, setShowInactiveNetworks] = useState(false);
  const [focusedConversationId, setFocusedConversationId] = useState<string | null>(null);
  const [highlightedConversationId, setHighlightedConversationId] = useState<string | null>(null);
  const [highlightedMessageId, setHighlightedMessageId] = useState<string | null>(null);
  const [threadFilterNoReply, setThreadFilterNoReply] = useState(false);
  const [threadFilterWithDraft, setThreadFilterWithDraft] = useState(false);
  const [threadFilterWithReminder, setThreadFilterWithReminder] = useState(false);

  const handlePlatformFilterClick = useCallback((platform: Platform | 'all', hasUnread: boolean) => {
    setPlatformFilter(platform);
    if (platform !== 'all' && hasUnread) {
      setShowOnlyUnread(true);
    } else {
      setShowOnlyUnread(false);
    }
  }, []);

  const resetThreadFilters = useCallback(() => {
    setThreadFilterNoReply(false);
    setThreadFilterWithDraft(false);
    setThreadFilterWithReminder(false);
  }, []);

  const clearFocusMode = useCallback(() => {
    setFocusedConversationId(null);
    setHighlightedConversationId(null);
    setHighlightedMessageId(null);
  }, []);

  return {
    searchQuery,
    setSearchQuery,
    intentFilter,
    setIntentFilter,
    platformFilter,
    setPlatformFilter,
    typeFilter,
    setTypeFilter,
    fireMode,
    setFireMode,
    showOnlyUnread,
    setShowOnlyUnread,
    showInactiveNetworks,
    setShowInactiveNetworks,
    focusedConversationId,
    setFocusedConversationId,
    highlightedConversationId,
    setHighlightedConversationId,
    highlightedMessageId,
    setHighlightedMessageId,
    threadFilterNoReply,
    setThreadFilterNoReply,
    threadFilterWithDraft,
    setThreadFilterWithDraft,
    threadFilterWithReminder,
    setThreadFilterWithReminder,
    handlePlatformFilterClick,
    resetThreadFilters,
    clearFocusMode,
  };
}
