import React, { useState, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useNexus, type ConversationWithPost } from '@/context/NexusContext';
import { useIsMobile } from '@/hooks/use-mobile';
import { useWebSocket } from '@/hooks/useWebSocket';
import { useDraftManagement } from '@/hooks/useDraftManagement';
import { useInboxFilters, type Platform, type MessageType, type Intent } from '@/hooks/useInboxFilters';
import { useUnreadTracking } from '@/hooks/useUnreadTracking';
import { useLocation } from 'wouter';
import { cn } from '@/lib/utils';
import { CRMContextPanel } from './CRMContextPanel';
import { ConversationCard } from './ConversationCard';
import { api } from '@/lib/api';
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { 
  Search,
  Flame,
  MoreVertical,
  User,
  Smile,
  Meh,
  Frown,
  Send,
  Sparkle,
  Sparkles,
  MessageCircle,
  MessageSquare,
  Check,
  RefreshCw,
  Loader2,
  LayoutGrid,
  Filter,
  Brain,
  Banknote,
  Inbox as InboxIcon,
  ExternalLink,
  ArrowLeft,
  ArrowUp,
  Info,
  ChevronDown,
  Archive,
  Bot,
  Mic,
  ImageIcon,
  Video,
  FileAudio,
  Play,
  Pause,
  Volume2,
  ChevronRight,
  Trash2,
  Pencil,
  RotateCw,
  AlertCircle,
  Bell,
  PanelRightOpen,
  PanelRightClose,
} from 'lucide-react';
import { FaInstagram, FaFacebook, FaLinkedin, FaTiktok, FaYoutube, FaWhatsapp } from 'react-icons/fa';
import { GoogleBusinessIcon } from './GoogleBusinessIcon';
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { formatDistanceToNow } from 'date-fns';
import { Urgency, Sentiment, MessageStatus, CRMContact } from '@/lib/types';
import { isRepliyoMessage, isAutoReply, isManualReply, isSyncedMessage } from '@/lib/mockData';
import type { Message } from '@shared/schema';
import { motion, AnimatePresence } from "framer-motion";
import { getCharacterLimit } from '@/utils/platformLimits';
import { Reply, X } from 'lucide-react';
import repliyoLogo from '@/assets/repliyo-logo.jpg';
import { toast } from '@/hooks/use-toast';
import { CommentThread } from './CommentThread';
import { BulkDraftActionBar } from './BulkDraftActionBar';


// --- Helper: Platform Styles ---
// Sistema unificado de estilos por plataforma y rol del mensaje
// Roles:
//   - userBubble: mensajes de usuarios/seguidores (inbound)
//   - ownerBubble: mensajes del dueño enviados desde la red social (outbound, source=metricool_sync)
//   - aiBubble: mensajes de auto-reply IA (outbound, internalOrigin=ai)
//   - manualBubble: mensajes enviados manualmente desde Repliyo (outbound, internalOrigin=manual)
//   - draftBubble: borradores de IA pendientes de enviar
const getPlatformStyles = (platform: Platform) => {
    // IMPORTANTE: NO CAMBIAR ESTOS ESTILOS SIN CONSULTAR
    // - userBubble: mensajes del cliente/seguidor (inbound) → transparente
    // - ownerBubble/aiBubble/manualBubble: respuestas de la marca (outbound) → FONDO AZUL
    // Esto aplica tanto a mensajes enviados desde Repliyo como desde la red social directamente.
    // El sistema identifica los mensajes outbound por el ID del dueño de la cuenta.
    const baseStyles = {
        container: "bg-[#EEF2F6]",
        userBubble: "bg-transparent text-gray-900",
        ownerBubble: "bg-indigo-600 text-white",
        aiBubble: "bg-indigo-600 text-white",
        manualBubble: "bg-indigo-600 text-white",
        draftBubble: "bg-transparent text-gray-900",
        draftCard: { bg: "bg-transparent", border: "border-l-gray-300", accent: "text-gray-600", iconBg: "from-gray-400 to-gray-500" },
        badge: "bg-gray-100 text-gray-700 border-gray-200",
        commentBadge: "text-gray-500",
        bubble: "bg-transparent text-gray-900",
        replyBubble: "bg-indigo-600 text-white"
    };
    
    // Colores de badge/accent por plataforma (solo para badges, no fondos)
    switch (platform) {
        case 'whatsapp':
            return { ...baseStyles, badge: "bg-green-50 text-green-700 border-green-200", commentBadge: "text-green-600", draftCard: { ...baseStyles.draftCard, border: "border-l-[#25D366]", accent: "text-green-600", iconBg: "from-[#25D366] to-[#128C7E]" } };
        case 'facebook':
            return { ...baseStyles, badge: "bg-blue-50 text-blue-700 border-blue-200", commentBadge: "text-blue-600", draftCard: { ...baseStyles.draftCard, border: "border-l-[#1877F2]", accent: "text-blue-600", iconBg: "from-[#1877F2] to-[#1565D8]" } };
        case 'instagram':
            return { ...baseStyles, badge: "bg-pink-50 text-pink-700 border-pink-200", commentBadge: "text-pink-600", draftCard: { ...baseStyles.draftCard, border: "border-l-pink-400", accent: "text-pink-600", iconBg: "from-[#833AB4] via-[#E1306C] to-[#F77737]" } };
        case 'linkedin':
            return { ...baseStyles, badge: "bg-sky-50 text-sky-700 border-sky-200", commentBadge: "text-sky-600", draftCard: { ...baseStyles.draftCard, border: "border-l-[#0A66C2]", accent: "text-sky-700", iconBg: "from-[#0A66C2] to-[#004182]" } };
        case 'youtube':
            return { ...baseStyles, badge: "bg-red-50 text-red-700 border-red-200", commentBadge: "text-red-600", draftCard: { ...baseStyles.draftCard, border: "border-l-red-500", accent: "text-red-600", iconBg: "from-red-600 to-red-500" } };
        case 'tiktok':
            return { ...baseStyles, badge: "bg-gray-100 text-gray-800 border-gray-300", commentBadge: "text-gray-700", draftCard: { ...baseStyles.draftCard, border: "border-l-[#121212]", accent: "text-gray-800", iconBg: "from-[#121212] to-[#2F2F2F]" } };
        case 'google-business':
            return { ...baseStyles, badge: "bg-blue-50 text-blue-700 border-blue-200", commentBadge: "text-blue-600", draftCard: { ...baseStyles.draftCard, border: "border-l-[#4285F4]", accent: "text-blue-600", iconBg: "from-[#4285F4] to-[#3367D6]" } };
        default:
            return { ...baseStyles, badge: "bg-indigo-50 text-indigo-700 border-indigo-200", commentBadge: "text-indigo-600", draftCard: { ...baseStyles.draftCard, border: "border-l-indigo-400", accent: "text-indigo-600", iconBg: "from-indigo-500 to-purple-600" } };
    }
};

type ConversationStatus = 'new' | 'open' | 'pending' | 'solved' | 'closed';

const getStatusConfig = (status: ConversationStatus | string | undefined | null) => {
    switch (status) {
        case 'new':
            return { label: 'New', color: 'bg-blue-100 text-blue-700 border-blue-200', icon: '●' };
        case 'open':
            return { label: 'Open', color: 'bg-green-100 text-green-700 border-green-200', icon: '●' };
        case 'pending':
            return { label: 'Pending', color: 'bg-yellow-100 text-yellow-700 border-yellow-200', icon: '●' };
        case 'solved':
            return { label: 'Solved', color: 'bg-purple-100 text-purple-700 border-purple-200', icon: '✓' };
        case 'closed':
            return { label: 'Closed', color: 'bg-gray-200 text-gray-600 border-gray-300', icon: '●' };
        default:
            return { label: 'Open', color: 'bg-green-100 text-green-700 border-green-200', icon: '●' };
    }
};

interface SyncStatus {
  isRunning: boolean;
  isSyncing: boolean;
  lastSyncTime: string | null;
  cooldownBrands: { brandId: string; cooldownUntil: string }[];
}

export function Inbox() {
  const { 
    messages, 
    conversations,
    activeConversation,
    activeConversationMessages,
    setActiveConversation,
    activeClientId, 
    activeClient,
    activeClients,
    setActiveClientId,
    approveMessage, 
    updateMessageDraft, 
    refreshFeed,
    isLoadingClients,
    isLoadingConversations,
    isLoadingConversationMessages,
  } = useNexus();
  const isMobile = useIsMobile();
  const queryClient = useQueryClient();
  
  useWebSocket({
    brandId: activeClientId || undefined,
    onNewMessage: () => {
      // Use correct cache keys that match NexusContext queries
      queryClient.invalidateQueries({ queryKey: ['messages', activeClientId] });
      queryClient.invalidateQueries({ queryKey: ['conversations', activeClientId] });
      queryClient.invalidateQueries({ queryKey: ['conversationMessages'] });
    },
    showToasts: true,
  });
  
  const [isEditing, setIsEditing] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [replyToMessage, setReplyToMessage] = useState<Message | null>(null);
  const [replyText, setReplyText] = useState("");
  const [isSendingReply, setIsSendingReply] = useState(false);
  const [isGeneratingAI, setIsGeneratingAI] = useState(false);
  
  // Bulk Draft Selection State
  const [selectionEnabled, setSelectionEnabled] = useState(false);
  const [selectedMessageIds, setSelectedMessageIds] = useState<Set<string>>(new Set());
  
  // Unread Tracking Hook - consolidates unread message tracking states and effects
  const unreadTracking = useUnreadTracking({
    activeConversation,
    activeConversationMessages,
    conversations,
  });
  const { unreadMessageIds, clearUnreadMessage: handleUnreadSeen } = unreadTracking;

  // Draft Management Hook - consolidates 14 draft-related states and handlers
  const draftManagement = useDraftManagement({
    brandId: activeClientId || '',
    conversationId: activeConversation?.id,
    onRefreshFeed: refreshFeed,
    onBulkComplete: () => {
      setSelectedMessageIds(new Set());
      setSelectionEnabled(false);
    },
    onBulkMessageComplete: (messageId, success) => {
      if (success) {
        setSelectedMessageIds(prev => {
          const next = new Set(prev);
          next.delete(messageId);
          return next;
        });
      }
    },
  });
  
  // Destructure commonly used values from draftManagement for local use
  const { getMessageWithOverrides, bulkQueue } = draftManagement;
  
  // Clear selection AND disable selection mode when conversation changes
  React.useEffect(() => {
    setSelectedMessageIds(new Set());
    setSelectionEnabled(false);
  }, [activeConversation?.id]);

  const handleToggleSelection = (messageId: string) => {
    setSelectedMessageIds(prev => {
      const next = new Set(prev);
      if (next.has(messageId)) {
        next.delete(messageId);
      } else {
        next.add(messageId);
      }
      return next;
    });
  };

  const handleBulkGenerate = () => {
    if (selectedMessageIds.size === 0) return;
    bulkQueue.enqueueMany(Array.from(selectedMessageIds));
  };

  const handleClearSelection = () => {
    setSelectedMessageIds(new Set());
  };

  const { data: syncStatus } = useQuery<SyncStatus>({
    queryKey: ['/api/sync/status'],
    refetchInterval: 30000,
  });

  const { data: brandSyncStatus, refetch: refetchSyncStatus } = useQuery({
    queryKey: ['brandSyncStatus', activeClientId],
    queryFn: () => activeClientId ? api.metricool.getSyncStatus(activeClientId) : Promise.resolve({ syncPaused: false }),
    enabled: !!activeClientId,
  });

  // CRM Contact Query - fetch contact when DM conversation is selected
  const { data: crmContactData, isLoading: isLoadingCrmContact } = useQuery({
    queryKey: ['crmContact', activeClientId, activeConversation?.platform, activeConversation?.customerId],
    queryFn: () => {
      if (!activeClientId || !activeConversation?.customerId || activeConversation.type !== 'dm') {
        return null;
      }
      return api.crm.getContactByChannel(activeClientId, activeConversation.platform, activeConversation.customerId);
    },
    enabled: !!activeClientId && !!activeConversation?.customerId && activeConversation?.type === 'dm',
    staleTime: 30000, // Cache for 30 seconds
  });

  const [isUpdatingSyncPause, setIsUpdatingSyncPause] = useState(false);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  const [isGeneratingSummary, setIsGeneratingSummary] = useState(false);

  const handleGenerateSummary = async () => {
    if (!activeConversation || isGeneratingSummary) return;
    
    setIsGeneratingSummary(true);
    try {
      await api.lifecycle.generateSummary(activeConversation.id);
      queryClient.invalidateQueries({ queryKey: ['conversations', activeClientId] });
      queryClient.invalidateQueries({ queryKey: ['conversationMessages', activeConversation.id] });
      toast({
        title: "Summary generated",
        description: "AI has created a closing summary for this conversation.",
      });
    } catch (error: any) {
      toast({
        title: "Error generating summary",
        description: error.message || "Failed to generate summary",
        variant: "destructive",
      });
    } finally {
      setIsGeneratingSummary(false);
    }
  };

  const handleUpdateConversationStatus = async (newStatus: ConversationStatus) => {
    if (!activeConversation || isUpdatingStatus) return;
    if (activeConversation.status === 'closed') {
      toast({
        title: "Cannot modify closed conversation",
        description: "Closed conversations cannot be reopened or modified.",
        variant: "destructive",
      });
      return;
    }
    
    setIsUpdatingStatus(true);
    try {
      await api.lifecycle.updateStatus(activeConversation.id, newStatus);
      queryClient.invalidateQueries({ queryKey: ['conversations', activeClientId] });
      queryClient.invalidateQueries({ queryKey: ['conversationMessages', activeConversation.id] });
      toast({
        title: "Status updated",
        description: `Conversation marked as ${newStatus}`,
      });
    } catch (error: any) {
      toast({
        title: "Error updating status",
        description: error.message || "Failed to update conversation status",
        variant: "destructive",
      });
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  const handleToggleSyncPause = async () => {
    if (!activeClientId || isUpdatingSyncPause) return;
    
    setIsUpdatingSyncPause(true);
    try {
      const newPausedState = !brandSyncStatus?.syncPaused;
      await api.metricool.updateSyncStatus(activeClientId, newPausedState);
      await refetchSyncStatus();
      toast({
        title: newPausedState ? "Sincronización pausada" : "Sincronización reanudada",
        description: newPausedState 
          ? "No se harán llamadas automáticas a Metricool para esta marca" 
          : "Las llamadas automáticas a Metricool se han reanudado",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "No se pudo actualizar el estado de sincronización",
        variant: "destructive",
      });
    } finally {
      setIsUpdatingSyncPause(false);
    }
  };

  const getTimeSinceSync = () => {
    if (!syncStatus?.lastSyncTime) return null;
    const lastSync = new Date(syncStatus.lastSyncTime);
    const now = new Date();
    const diffSeconds = Math.floor((now.getTime() - lastSync.getTime()) / 1000);
    
    if (diffSeconds < 60) return `${diffSeconds}s`;
    if (diffSeconds < 3600) return `${Math.floor(diffSeconds / 60)}m`;
    return `${Math.floor(diffSeconds / 3600)}h`;
  };

  const [syncCountdown, setSyncCountdown] = useState<number | null>(null);

  React.useEffect(() => {
    if (!syncStatus?.lastSyncTime || brandSyncStatus?.syncPaused) {
      setSyncCountdown(null);
      return;
    }

    const updateCountdown = () => {
      const lastSync = new Date(syncStatus.lastSyncTime!);
      const nextSync = new Date(lastSync.getTime() + 2 * 60 * 1000);
      const now = new Date();
      const remaining = Math.max(0, Math.floor((nextSync.getTime() - now.getTime()) / 1000));
      setSyncCountdown(remaining);
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);
    return () => clearInterval(interval);
  }, [syncStatus?.lastSyncTime, brandSyncStatus?.syncPaused]);
  
  // Filters - consolidated into useInboxFilters hook
  const inboxFilters = useInboxFilters();
  const {
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
  } = inboxFilters;
  
  // UI State (not filters)
  const [isCRMOpen, setIsCRMOpen] = useState(true);
  const [showScrollToTop, setShowScrollToTop] = useState(false);
  const [isBulkButtonHovered, setIsBulkButtonHovered] = useState(false);
  const threadScrollRef = React.useRef<HTMLDivElement>(null);
  const [location, setLocation] = useLocation();

  // Deep Link: Process URL params and activate focus mode
  const processDeepLink = React.useCallback(() => {
    const params = new URLSearchParams(window.location.search);
    // Support both 'conversation' (new) and 'conversationId' (legacy) param names
    const conversationId = params.get('conversation') || params.get('conversationId');
    const messageId = params.get('messageId');
    const shouldHighlight = params.get('highlight') === 'true';
    
    if (conversationId) {
      console.log('[DeepLink] Activating focus mode for conversation:', conversationId, 'messageId:', messageId);
      // Set focus mode immediately - this filters the conversation list instantly
      setFocusedConversationId(conversationId);
      setHighlightedConversationId(conversationId);
      if (messageId) {
        setHighlightedMessageId(messageId);
      }
      // Clear conversation highlight after delay
      setTimeout(() => setHighlightedConversationId(null), 3000);
      
      // Clear URL params immediately
      window.history.replaceState({}, '', '/app/inbox');
    }
  }, []);

  // Run on mount and listen for navigation events (for notification clicks while already on /inbox)
  useEffect(() => {
    // Process on mount
    processDeepLink();
    
    // Listen for link clicks that change URL (wouter uses pushState)
    const handleNavigation = () => {
      // Small delay to let URL update complete
      setTimeout(processDeepLink, 50);
    };
    
    // Listen for both popstate (back/forward) and custom navigation event
    window.addEventListener('popstate', handleNavigation);
    
    // Also listen for click events on notification links to catch them before URL updates
    const handleClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      const link = target.closest('a[href*="conversation"]');
      if (link) {
        // Small delay to let wouter update the URL
        setTimeout(processDeepLink, 100);
      }
    };
    document.addEventListener('click', handleClick);
    
    return () => {
      window.removeEventListener('popstate', handleNavigation);
      document.removeEventListener('click', handleClick);
    };
  }, [processDeepLink]);

  // Deep Link: When focus mode is active and conversations load, select the target
  useEffect(() => {
    if (!focusedConversationId || conversations.length === 0) return;
    
    const targetConversation = conversations.find(c => c.id === focusedConversationId);
    if (targetConversation && activeConversation?.id !== focusedConversationId) {
      setActiveConversation(targetConversation);
    }
  }, [focusedConversationId, conversations, activeConversation, setActiveConversation]);


  // Clear message highlight after 5 seconds (after scroll completes)
  useEffect(() => {
    if (!highlightedMessageId) return;
    const timer = setTimeout(() => setHighlightedMessageId(null), 5000);
    return () => clearTimeout(timer);
  }, [highlightedMessageId]);

  const { data: socialAccounts = [] } = useQuery({
    queryKey: ['socialAccounts', activeClientId],
    queryFn: () => activeClientId ? api.socialAccounts.getByBrand(activeClientId) : Promise.resolve([]),
    enabled: !!activeClientId,
  });

  const normalizeProviderToPlatform = (provider: string): string => {
    const mapping: Record<string, string> = {
      'tiktokbusiness': 'tiktok',
      'gmb': 'google-business',
    };
    const normalized = provider.toLowerCase();
    return mapping[normalized] || normalized;
  };

  const activeProviders = React.useMemo(() => {
    return socialAccounts.filter(acc => acc.isActive).map(acc => normalizeProviderToPlatform(acc.provider));
  }, [socialAccounts]);

  const inactiveProviders = React.useMemo(() => {
    return socialAccounts.filter(acc => !acc.isActive).map(acc => normalizeProviderToPlatform(acc.provider));
  }, [socialAccounts]);

  // Filter Conversations - Focus mode takes priority (instant filter from notifications)
  const filteredConversations = conversations
    .filter(c => {
      // Focus mode: show only the focused conversation (instant, like search)
      if (focusedConversationId) {
        return c.id === focusedConversationId;
      }
      // Normal filters
      if (showOnlyUnread && (c.unreadCount || 0) === 0) return false;
      if (platformFilter !== 'all' && c.platform !== platformFilter) return false;
      if (typeFilter !== 'all') {
        const convType = c.type === 'dm' ? 'dm' : 'comment';
        if (typeFilter !== convType) return false;
      }
      if (searchQuery) {
        const searchLower = searchQuery.toLowerCase();
        const matchesName = c.customerName?.toLowerCase().includes(searchLower);
        const matchesPreview = c.lastMessagePreview?.toLowerCase().includes(searchLower);
        if (!matchesName && !matchesPreview) return false;
      }
      if (!showInactiveNetworks && inactiveProviders.length > 0) {
        if (inactiveProviders.includes(c.platform.toLowerCase())) return false;
      }
      return true;
    })
    .sort((a, b) => new Date(b.lastMessageAt).getTime() - new Date(a.lastMessageAt).getTime());

  // Calculate Stats for Header (from conversations)
  const totalUnread = conversations.reduce((sum, c) => sum + (c.unreadCount || 0), 0);
  const criticalCount = 0;
  const opportunityCount = 0;
  const pendingCount = totalUnread;

  // Calculate UNREAD conversation counts per platform (only conversations with unread messages)
  const platformUnreadCounts = React.useMemo(() => ({
    instagram: conversations.filter(c => c.platform === 'instagram' && (c.unreadCount || 0) > 0).length,
    tiktok: conversations.filter(c => c.platform === 'tiktok' && (c.unreadCount || 0) > 0).length,
    facebook: conversations.filter(c => c.platform === 'facebook' && (c.unreadCount || 0) > 0).length,
    linkedin: conversations.filter(c => c.platform === 'linkedin' && (c.unreadCount || 0) > 0).length,
    youtube: conversations.filter(c => c.platform === 'youtube' && (c.unreadCount || 0) > 0).length,
    'google-business': conversations.filter(c => c.platform === 'google-business' && (c.unreadCount || 0) > 0).length,
    whatsapp: conversations.filter(c => c.platform === 'whatsapp' && (c.unreadCount || 0) > 0).length,
  }), [conversations]);

  // Thread messages - recursive approach for multi-level threading
  // This ensures replies to comments appear directly after the comment they respond to
  const threadMessages = React.useMemo(() => {
    if (!activeConversationMessages?.length) return [];

    // 1. Build a map of parent ID -> array of children for quick lookup
    const childrenMap = new Map<string, typeof activeConversationMessages>();
    const rootMessages: typeof activeConversationMessages = [];

    activeConversationMessages.forEach(m => {
      if (m.parentMessageId) {
        // It's a child: add it to its parent's children list
        const siblings = childrenMap.get(m.parentMessageId) || [];
        siblings.push(m);
        childrenMap.set(m.parentMessageId, siblings);
      } else {
        // It's a root (original post/comment): add to root list
        rootMessages.push(m);
      }
    });

    // 2. Recursive function to flatten the tree in correct order
    const flattened: typeof activeConversationMessages = [];

    const addMessageAndChildren = (message: typeof activeConversationMessages[0]) => {
      // A. Add the current message
      flattened.push(message);

      // B. Find children of this message
      const children = childrenMap.get(message.id) || [];
      
      // C. Sort children by timestamp (chronological - oldest first so replies read naturally after parent)
      children.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

      // D. RECURSION: Process each child the same way (add it and find its children)
      children.forEach(child => addMessageAndChildren(child));
    };

    // 3. Start from roots, sorted by timestamp (newest first for social media style)
    rootMessages.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    rootMessages.forEach(root => addMessageAndChildren(root));

    // 4. Handle orphans (safety net for sync errors where parent doesn't exist)
    const processedIds = new Set(flattened.map(m => m.id));
    const orphans = activeConversationMessages
      .filter(m => !processedIds.has(m.id))
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    
    const allMessages = [...flattened, ...orphans];
    
    // 5. Merge local draft overrides for real-time updates
    // NO global sort - preserve parent-child grouping (newest root first, replies chronologically below)
    return allMessages.map(msg => draftManagement.getMessageWithOverrides(msg));
  }, [activeConversationMessages, draftManagement]);

  // Derive active draft message (outbound with drafting/pending status) and last inbound message
  const activeDraftMessage = React.useMemo(() => {
    return threadMessages.find(m => 
      m.direction === 'outbound' && 
      (m.status === 'drafting' || m.status === 'pending' || m.status === 'unread')
    );
  }, [threadMessages]);

  const lastInboundMessage = React.useMemo(() => {
    // With newest first ordering, the first inbound message is the most recent
    const inbound = threadMessages.filter(m => m.direction === 'inbound');
    return inbound[0];
  }, [threadMessages]);

  // For backward compatibility, selectedMessage prioritizes the draft, then last inbound (which is now the first in the array)
  const selectedMessage = activeDraftMessage || lastInboundMessage || threadMessages[0];

  // Compute thread filter statistics
  const threadFilterStats = React.useMemo(() => {
    if (!threadMessages.length) return { noReplyCount: 0, withDraftCount: 0, withReminderCount: 0, noReplyIds: new Set<string>(), withDraftIds: new Set<string>(), withReminderIds: new Set<string>() };
    
    const noReplyIds = new Set<string>();
    const withDraftIds = new Set<string>();
    const withReminderIds = new Set<string>();
    
    // Separate counters for display (count unique items, not expanded IDs)
    let draftCount = 0;
    let reminderCount = 0;
    
    // Build parent-child map for quick lookup
    const childrenByParent = new Map<string, typeof threadMessages>();
    threadMessages.forEach(m => {
      if (m.parentMessageId) {
        const siblings = childrenByParent.get(m.parentMessageId) || [];
        siblings.push(m);
        childrenByParent.set(m.parentMessageId, siblings);
      }
    });
    
    // Helper to get root message ID for any message
    const getRootId = (msgId: string): string => {
      const msg = threadMessages.find(m => m.id === msgId);
      if (!msg || !msg.parentMessageId) return msgId;
      return getRootId(msg.parentMessageId);
    };
    
    // Identify root inbound messages (comments from users) 
    const rootInboundMessages = threadMessages.filter(m => !m.parentMessageId && m.direction === 'inbound');
    
    rootInboundMessages.forEach(root => {
      // Check if this root has any outbound reply (direct or nested)
      const hasOutboundReply = (msgId: string): boolean => {
        const children = childrenByParent.get(msgId) || [];
        for (const child of children) {
          if (child.direction === 'outbound') return true;
          if (hasOutboundReply(child.id)) return true;
        }
        return false;
      };
      
      if (!hasOutboundReply(root.id)) {
        noReplyIds.add(root.id);
      }
    });
    
    // Check for messages with drafts (aiReplyStatus === 'drafted')
    threadMessages.forEach(m => {
      if (m.aiReplyStatus === 'drafted' && m.aiSuggestedReply) {
        draftCount++; // Count the actual draft, not the expanded IDs
        // Add both the message with draft and its root for visibility
        withDraftIds.add(m.id);
        const rootId = getRootId(m.id);
        if (rootId !== m.id) withDraftIds.add(rootId);
      }
    });
    
    // Check for messages with reminders (outbound from reminder_service)
    threadMessages.forEach(m => {
      if (m.direction === 'outbound' && (m.internalOrigin === 'reminder' || m.source === 'reminder_service')) {
        reminderCount++; // Count the actual reminder, not the expanded IDs
        // Add the reminder and its parent thread for visibility
        withReminderIds.add(m.id);
        if (m.parentMessageId) {
          const rootId = getRootId(m.parentMessageId);
          withReminderIds.add(rootId);
        }
      }
    });
    
    return {
      noReplyCount: noReplyIds.size,
      withDraftCount: draftCount,
      withReminderCount: reminderCount,
      noReplyIds,
      withDraftIds,
      withReminderIds,
    };
  }, [threadMessages]);

  // Apply thread filters to get filtered messages
  const filteredThreadMessages = React.useMemo(() => {
    const anyFilterActive = threadFilterNoReply || threadFilterWithDraft || threadFilterWithReminder;
    if (!anyFilterActive) return threadMessages;
    
    // Build set of message IDs to show
    const visibleIds = new Set<string>();
    
    // Helper to add a message and all its ancestors/descendants
    const addThreadBranch = (msgId: string) => {
      // Add the message itself
      visibleIds.add(msgId);
      
      // Add all ancestors (parents)
      let current = threadMessages.find(m => m.id === msgId);
      while (current?.parentMessageId) {
        visibleIds.add(current.parentMessageId);
        current = threadMessages.find(m => m.id === current?.parentMessageId);
      }
      
      // Add all descendants (children recursively)
      const addChildren = (parentId: string) => {
        threadMessages.filter(m => m.parentMessageId === parentId).forEach(child => {
          visibleIds.add(child.id);
          addChildren(child.id);
        });
      };
      addChildren(msgId);
    };
    
    // Add messages based on active filters
    if (threadFilterNoReply) {
      threadFilterStats.noReplyIds.forEach(id => addThreadBranch(id));
    }
    if (threadFilterWithDraft) {
      threadFilterStats.withDraftIds.forEach(id => addThreadBranch(id));
    }
    if (threadFilterWithReminder) {
      threadFilterStats.withReminderIds.forEach(id => addThreadBranch(id));
    }
    
    return threadMessages.filter(m => visibleIds.has(m.id));
  }, [threadMessages, threadFilterNoReply, threadFilterWithDraft, threadFilterWithReminder, threadFilterStats]);

  // Auto-select first conversation (Desktop Only)
  useEffect(() => {
    if (isMobile) return;
    
    if (filteredConversations.length > 0 && !activeConversation) {
      setActiveConversation(filteredConversations[0]);
    }
  }, [filteredConversations, activeConversation, isMobile, setActiveConversation]);

  // Reset editing state, local draft overrides, and thread filters when selecting a new conversation
  useEffect(() => {
    setIsEditing(false);
    draftManagement.clearOverrides();
    setThreadFilterNoReply(false);
    setThreadFilterWithDraft(false);
    setThreadFilterWithReminder(false);
  }, [activeConversation?.id, draftManagement]);

  const handleSyncData = async () => {
    if (!activeClientId || isSyncing) return;
    
    setIsSyncing(true);
    try {
      const { api } = await import('@/lib/api');
      await api.metricool.syncBrand(activeClientId);
      await refreshFeed();
      queryClient.invalidateQueries({ queryKey: ['/api/sync/status'] });
    } catch (error: any) {
      console.error('Sync error:', error);
    } finally {
      setIsSyncing(false);
    }
  };

  const handleStartReply = (message: Message) => {
    setReplyToMessage(message);
    setReplyText("");
  };

  const handleCancelReply = () => {
    setReplyToMessage(null);
    setReplyText("");
  };

  const handleSendReply = async () => {
    if (!replyToMessage || !replyText.trim() || isSendingReply) return;
    
    setIsSendingReply(true);
    try {
      const response = await fetch('/api/inbox/reply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          messageId: replyToMessage.id,
          text: replyText.trim(),
          includeMention: true,
        }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to send reply');
      }
      
      handleCancelReply();
      await refreshFeed();
      if (activeConversation) {
        queryClient.invalidateQueries({ queryKey: ['conversationMessages', activeConversation.id] });
      }
    } catch (error: any) {
      console.error('[Reply] Error:', error);
      alert('Error sending reply: ' + error.message);
    } finally {
      setIsSendingReply(false);
    }
  };

  const getReplyCharacterLimit = () => {
    if (!replyToMessage) return 2200;
    return getCharacterLimit(
      (replyToMessage.platform || 'instagram') as Platform, 
      (replyToMessage.type || 'comment') as MessageType
    );
  };

  const handleGenerateAIReply = async () => {
    if (!replyToMessage || !activeClientId || !activeConversation || isGeneratingAI) return;
    
    setIsGeneratingAI(true);
    try {
      const result = await api.aiAgent.generateReply(
        activeClientId, 
        replyToMessage.id,
        activeConversation.id
      );
      
      if (result.reply) {
        setReplyText(result.reply);
        const providerLabel = result.provider === 'openai' ? 'OpenAI' : result.provider === 'gemini' ? 'Gemini' : result.provider;
        toast({
          title: "Respuesta IA generada",
          description: `${providerLabel} · ${result.model} · ${result.characterCount} chars`,
        });
      }
    } catch (error: any) {
      console.error('[AI Reply] Error:', error);
      toast({
        title: "Error generando respuesta",
        description: error.message || "No se pudo generar la respuesta IA",
        variant: "destructive",
      });
    } finally {
      setIsGeneratingAI(false);
    }
  };

  if (!isLoadingClients && activeClients.length === 0) {
    return (
      <div className="h-full flex items-center justify-center bg-gray-50">
        <div className="text-center max-w-md px-8">
          <div className="w-16 h-16 mx-auto mb-6 bg-indigo-100 rounded-full flex items-center justify-center">
            <InboxIcon className="h-8 w-8 text-indigo-600" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-3">
            ¡Bienvenido a Repliyo!
          </h2>
          <p className="text-gray-600 mb-6">
            Tu cuenta ha sido creada exitosamente. Un administrador te asignará acceso a una marca pronto.
          </p>
          <p className="text-sm text-gray-500">
            Si ya deberías tener acceso, contacta a tu administrador.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex bg-background overflow-hidden relative">
      {/* COLUMN 2: Message List */}
      <div className={cn(
          "w-[400px] border-r flex flex-col bg-white relative z-10",
          isMobile ? "w-full" : "",
          isMobile && activeConversation ? "hidden" : "flex"
      )}>
        
        {/* Header / Title */}
        <div className="h-16 border-b px-4 flex items-center justify-between shrink-0 bg-white">
          <div className="flex items-center gap-3">
            {/* Mobile Brand Selector */}
            {isMobile && activeClients.length > 0 ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button 
                    variant="ghost" 
                    className="flex items-center gap-2 px-2 py-1 h-auto hover:bg-gray-100"
                    data-testid="button-mobile-brand-selector"
                  >
                    <Avatar className="h-6 w-6 rounded-md ring-1 ring-black/5">
                      <AvatarImage src={activeClient?.avatar || undefined} />
                      <AvatarFallback className="rounded-md bg-gray-200 text-gray-600 text-[10px]">
                        {activeClient?.name?.substring(0,2) || 'C'}
                      </AvatarFallback>
                    </Avatar>
                    <span className="font-bold text-lg text-gray-900 max-w-[120px] truncate">
                      {activeClient?.name || 'Inbox'}
                    </span>
                    <ChevronDown className="h-4 w-4 text-gray-400" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-56 bg-white border-gray-200" align="start">
                  <DropdownMenuLabel className="text-xs text-gray-500 uppercase tracking-wider">
                    Cambiar Marca
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator className="bg-gray-100" />
                  <ScrollArea className="max-h-[200px]">
                    {activeClients.map((client) => (
                      <DropdownMenuItem 
                        key={client.id}
                        onClick={() => setActiveClientId(client.id)}
                        className="gap-2 cursor-pointer focus:bg-gray-50"
                        data-testid={`menu-item-brand-${client.id}`}
                      >
                        <Avatar className="h-5 w-5 rounded-sm">
                          <AvatarImage src={client.avatar || undefined} />
                          <AvatarFallback className="text-[10px] bg-gray-100 text-gray-600">
                            {client.name?.substring(0,2) || 'C'}
                          </AvatarFallback>
                        </Avatar>
                        <span className="truncate text-sm">{client.name}</span>
                        {activeClient?.id === client.id && (
                          <div className="ml-auto h-1.5 w-1.5 bg-indigo-500 rounded-full" />
                        )}
                      </DropdownMenuItem>
                    ))}
                  </ScrollArea>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <h1 className="font-bold text-xl tracking-tight text-gray-900">Inbox</h1>
            )}
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1.5">
                <Switch
                  id="sync-toggle"
                  checked={!brandSyncStatus?.syncPaused}
                  onCheckedChange={() => handleToggleSyncPause()}
                  disabled={isUpdatingSyncPause}
                  data-testid="switch-sync-toggle"
                  className="data-[state=checked]:bg-green-500 data-[state=unchecked]:bg-amber-400"
                />
                <Label 
                  htmlFor="sync-toggle" 
                  className={cn(
                    "text-xs font-medium cursor-pointer select-none",
                    brandSyncStatus?.syncPaused ? "text-amber-600" : "text-green-600"
                  )}
                  data-testid="label-sync-status"
                >
                  {isUpdatingSyncPause ? (
                    <Loader2 className="h-3 w-3 animate-spin inline" />
                  ) : brandSyncStatus?.syncPaused ? (
                    "Pausado"
                  ) : (
                    "Sync"
                  )}
                </Label>
              </div>
              {!brandSyncStatus?.syncPaused && (
                <span className="text-[10px] text-gray-400 whitespace-nowrap" data-testid="text-sync-countdown">
                  {syncStatus?.isSyncing ? (
                    "Sincronizando..."
                  ) : syncCountdown !== null ? (
                    syncCountdown >= 60 
                      ? `${Math.floor(syncCountdown / 60)}:${String(syncCountdown % 60).padStart(2, '0')}` 
                      : `${syncCountdown}s`
                  ) : (
                    "--:--"
                  )}
                </span>
              )}
              {!brandSyncStatus?.syncPaused && (
                <button 
                  onClick={handleSyncData} 
                  disabled={isSyncing || syncStatus?.isSyncing}
                  className="h-4 w-4 flex items-center justify-center text-gray-400 hover:text-gray-600 disabled:opacity-50"
                  data-testid="button-sync"
                  title={syncStatus?.lastSyncTime ? `Última sync: ${new Date(syncStatus.lastSyncTime).toLocaleTimeString()}` : 'Sincronizar'}
                >
                  <RefreshCw className={cn("h-3 w-3", (isSyncing || syncStatus?.isSyncing) && "animate-spin")} />
                </button>
              )}
            </div>
          </div>
          
          {/* Inbox Filter Button */}
          <button 
              onClick={() => setShowOnlyUnread(!showOnlyUnread)}
              className={cn(
                  "relative h-8 w-8 flex items-center justify-center rounded-full transition-all",
                  showOnlyUnread 
                      ? "bg-blue-500 text-white hover:bg-blue-600" 
                      : "text-gray-400 hover:bg-gray-100 hover:text-gray-600"
              )}
              title={showOnlyUnread ? "Mostrar todas" : "Solo no leídos"}
              data-testid="button-filter-unread"
          >
              <InboxIcon className="h-4 w-4" />
              {pendingCount > 0 && (
                  <div className={cn(
                      "absolute -top-1 -right-1 text-[9px] font-bold h-3.5 min-w-[14px] flex items-center justify-center rounded-full px-0.5 shadow-sm ring-2 z-10",
                      showOnlyUnread 
                          ? "bg-white text-blue-500 ring-blue-500" 
                          : "bg-blue-500 text-white ring-white"
                  )}>
                      {pendingCount}
                  </div>
              )}
          </button>
        </div>

        {/* Filter Bar (The "Playground" for AI) */}
        <div className="p-3 border-b space-y-3 bg-[#F5F7FA]">

          {/* Row 1: Search & Fire Mode */}
          <div className="flex gap-2">
            <div className="relative flex-1">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input 
                placeholder="Search..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 bg-white border-transparent focus:ring-offset-0 h-9 shadow-none" 
                />
            </div>
            
            <div className={cn("flex items-center gap-2 shrink-0 px-3 py-1.5 rounded-md transition-colors", fireMode ? "bg-white" : "bg-white")} title="Fire Mode: Show High & Medium Urgency">
                <Switch 
                    id="fire-mode" 
                    checked={fireMode} 
                    onCheckedChange={setFireMode} 
                    className="data-[state=checked]:bg-red-500 scale-75 origin-right"
                />
                <Label htmlFor="fire-mode" className={cn("text-xs font-bold cursor-pointer select-none flex items-center gap-1", fireMode ? "text-red-600" : "text-gray-500")}>
                    <Flame className={cn("h-3.5 w-3.5", fireMode && "fill-red-500")} />
                </Label>
            </div>
          </div>

          {/* Row 2: Platform Filters (Horizontal Scroll) */}
          <div className="flex gap-1.5 overflow-x-auto pt-2 pb-1 no-scrollbar items-center">
              <FilterButton 
                active={platformFilter === 'all'} 
                onClick={() => handlePlatformFilterClick('all', false)}
                label="All" 
                icon={<LayoutGrid className="h-3.5 w-3.5" />}
              />
              <FilterButton 
                active={platformFilter === 'instagram'} 
                onClick={() => handlePlatformFilterClick('instagram', platformUnreadCounts.instagram > 0)}
                label="Instagram"
                icon={<FaInstagram className="h-4 w-4" />}
                activeColorClass="bg-pink-600"
                hoverColorClass="hover:text-pink-600 hover:bg-pink-50"
                count={platformUnreadCounts.instagram}
              />
              <FilterButton 
                active={platformFilter === 'tiktok'} 
                onClick={() => handlePlatformFilterClick('tiktok', platformUnreadCounts.tiktok > 0)}
                label="TikTok"
                icon={<FaTiktok className="h-4 w-4" />}
                activeColorClass="bg-black"
                hoverColorClass="hover:text-black hover:bg-gray-100"
                count={platformUnreadCounts.tiktok}
              />
              <FilterButton 
                active={platformFilter === 'facebook'} 
                onClick={() => handlePlatformFilterClick('facebook', platformUnreadCounts.facebook > 0)}
                label="Facebook"
                icon={<FaFacebook className="h-4 w-4" />}
                activeColorClass="bg-blue-600"
                hoverColorClass="hover:text-blue-600 hover:bg-blue-50"
                count={platformUnreadCounts.facebook}
              />
              <FilterButton 
                active={platformFilter === 'linkedin'} 
                onClick={() => handlePlatformFilterClick('linkedin', platformUnreadCounts.linkedin > 0)}
                label="LinkedIn"
                icon={<FaLinkedin className="h-4 w-4" />}
                activeColorClass="bg-[#0077b5]"
                hoverColorClass="hover:text-[#0077b5] hover:bg-[#0077b5]/10"
                count={platformUnreadCounts.linkedin}
              />
               <FilterButton 
                active={platformFilter === 'youtube'} 
                onClick={() => handlePlatformFilterClick('youtube', platformUnreadCounts.youtube > 0)}
                label="YouTube"
                icon={<FaYoutube className="h-4 w-4" />}
                activeColorClass="bg-red-600"
                hoverColorClass="hover:text-red-600 hover:bg-red-50"
                count={platformUnreadCounts.youtube}
              />
              <FilterButton 
                active={platformFilter === 'google-business'} 
                onClick={() => handlePlatformFilterClick('google-business', platformUnreadCounts['google-business'] > 0)}
                label="Google Business"
                icon={<GoogleBusinessIcon className="h-4 w-4" />}
                activeColorClass="bg-blue-500"
                hoverColorClass="hover:text-blue-500 hover:bg-blue-50"
                count={platformUnreadCounts['google-business']}
              />
              <FilterButton 
                active={platformFilter === 'whatsapp'} 
                onClick={() => handlePlatformFilterClick('whatsapp', platformUnreadCounts.whatsapp > 0)}
                label="WhatsApp"
                icon={<FaWhatsapp className="h-4 w-4" />}
                activeColorClass="bg-green-500"
                hoverColorClass="hover:text-green-500 hover:bg-green-50"
                count={platformUnreadCounts.whatsapp}
              />
           </div>

           {/* Row 3: Intent Filter & Type Filter */}
           <div className="flex gap-2">
             <Select value={intentFilter} onValueChange={(val: any) => setIntentFilter(val)}>
                  <SelectTrigger className="flex-1 bg-white border-transparent h-8 text-xs shadow-none">
                      <div className="flex items-center gap-2 text-muted-foreground">
                          <Filter className="h-3 w-3" />
                          <SelectValue placeholder="Filter by Intent" />
                      </div>
                  </SelectTrigger>
                  <SelectContent>
                      <SelectItem value="all">All Intents</SelectItem>
                      <SelectItem value="sales">Sales / Leads</SelectItem>
                      <SelectItem value="support">Support</SelectItem>
                      <SelectItem value="complaint">Complaints</SelectItem>
                      <SelectItem value="general">General</SelectItem>
                  </SelectContent>
              </Select>

              <Select value={typeFilter} onValueChange={(val: any) => setTypeFilter(val)}>
                  <SelectTrigger className="w-[130px] bg-white border-transparent h-8 text-xs shadow-none">
                      <div className="flex items-center gap-2 text-muted-foreground">
                          <MessageCircle className="h-3 w-3" />
                          <SelectValue placeholder="Type" />
                      </div>
                  </SelectTrigger>
                  <SelectContent>
                      <SelectItem value="all">All Types</SelectItem>
                      <SelectItem value="dm">Direct Message</SelectItem>
                      <SelectItem value="comment">Comment</SelectItem>
                      <SelectItem value="review">Review</SelectItem>
                  </SelectContent>
              </Select>
           </div>

           {inactiveProviders.length > 0 && (
             <div className="flex items-center justify-between px-1 py-1.5 rounded-md bg-white">
               <div className="flex items-center gap-2">
                 <Archive className="h-3.5 w-3.5 text-gray-500" />
                 <span className="text-xs text-gray-600">
                   {inactiveProviders.length} redes desactivadas
                 </span>
               </div>
               <div className="flex items-center gap-2">
                 <Switch
                   id="show-inactive"
                   checked={showInactiveNetworks}
                   onCheckedChange={setShowInactiveNetworks}
                   className="h-4 w-7 data-[state=checked]:bg-gray-600"
                 />
                 <Label htmlFor="show-inactive" className="text-xs text-gray-500 cursor-pointer">
                   Mostrar
                 </Label>
               </div>
             </div>
           )}
        </div>

        {/* Fade gradient for smooth transition */}
        <div className="h-4 bg-gradient-to-b from-[#F5F7FA] to-[#EEF2F6] shrink-0" />

        {/* Focus Mode Banner */}
        {focusedConversationId && (
          <div className="flex items-center justify-center py-2">
            <button
              className="text-[10px] text-indigo-500 hover:text-indigo-700 flex items-center gap-1"
              onClick={clearFocusMode}
              data-testid="button-exit-focus-mode"
            >
              <ArrowLeft className="h-2.5 w-2.5" />
              Ver todas las conversaciones
            </button>
          </div>
        )}

        {/* Conversations List */}
        <ScrollArea className="flex-1 bg-[#EEF2F6]">
          <div className="flex flex-col p-2 pb-6 w-full max-w-full min-w-0 overflow-hidden">
            <AnimatePresence mode="sync">
              {isLoadingConversations ? (
                <div className="p-8 text-center text-muted-foreground text-sm flex items-center justify-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Loading conversations...
                </div>
              ) : filteredConversations.length === 0 ? (
                 <div className="p-8 text-center text-muted-foreground text-sm">
                    No conversations match your filters.
                 </div>
              ) : (
                filteredConversations.map((conv, index) => (
                  <React.Fragment key={conv.id}>
                    {index > 0 && (
                      <div className="h-px bg-gray-300 mx-3 my-2" />
                    )}
                    <ConversationCard 
                      conversation={conv} 
                      isSelected={activeConversation?.id === conv.id} 
                      onClick={() => setActiveConversation(conv)}
                      isHighlighted={highlightedConversationId === conv.id}
                    />
                  </React.Fragment>
                ))
              )}
            </AnimatePresence>
          </div>
        </ScrollArea>
      </div>

      {/* COLUMN 3: Chat Detail */}
      <div className={cn(
        "flex-1 flex flex-col bg-white relative min-w-0 z-0",
        isMobile && !activeConversation ? "hidden" : "flex"
      )}>
        {activeConversation ? (
          <>
            {/* Chat Header - AI Summary */}
            <header className="h-auto min-h-[64px] md:min-h-[80px] border-b px-4 md:px-6 py-3 md:py-4 flex flex-col justify-center shrink-0 bg-white z-20">
               <div className="flex items-center justify-between gap-3">
                 <div className="flex items-center gap-3 overflow-hidden flex-1">
                    {isMobile && (
                        <Button variant="ghost" size="icon" className="-ml-2 mr-0 h-8 w-8 shrink-0" onClick={() => setActiveConversation(null)}>
                            <ArrowLeft className="h-5 w-5" />
                        </Button>
                    )}
                    {activeConversation.type === 'comment' ? (
                      (() => {
                        const thumbnailUrl = activeConversation.socialPost?.thumbnailUrl;
                        const isVideoUrl = thumbnailUrl?.includes('.mp4') || thumbnailUrl?.includes('.webm');
                        const isImageThumbnail = thumbnailUrl && !isVideoUrl;
                        const platformGradients: Record<string, string> = {
                          instagram: 'from-pink-100 to-purple-100',
                          facebook: 'from-blue-100 to-blue-50',
                          linkedin: 'from-sky-100 to-blue-50',
                          youtube: 'from-red-100 to-red-50',
                          tiktok: 'from-gray-100 to-gray-50',
                        };
                        const gradient = platformGradients[activeConversation.platform || 'instagram'] || 'from-gray-100 to-gray-200';
                        
                        return isImageThumbnail ? (
                          <div className="h-12 w-9 rounded-lg overflow-hidden border border-gray-200 bg-gray-100 shrink-0">
                            <img 
                              src={thumbnailUrl} 
                              alt="Post thumbnail"
                              className="h-full w-full object-cover"
                              onError={(e) => {
                                const parent = (e.target as HTMLImageElement).parentElement!;
                                (e.target as HTMLImageElement).style.display = 'none';
                                parent.classList.add('flex', 'items-center', 'justify-center', 'bg-gradient-to-br');
                                gradient.split(' ').forEach(token => parent.classList.add(token));
                                parent.innerHTML = '<svg class="h-5 w-5 text-gray-500" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>';
                              }}
                            />
                          </div>
                        ) : (
                          <div className={cn(
                            "h-12 w-9 rounded-lg border border-gray-200 flex items-center justify-center bg-gradient-to-br shrink-0",
                            gradient
                          )}>
                            <Play className="h-5 w-5 text-gray-500 fill-gray-400/50" />
                          </div>
                        );
                      })()
                    ) : (
                      <Avatar className="h-10 w-10 ring-2 ring-offset-2 ring-gray-50 shrink-0">
                        <AvatarImage src={activeConversation.customerAvatar || undefined} alt={activeConversation.customerName || 'User'} className="bg-white" />
                        <AvatarFallback className="bg-[#E5E7EB] font-bold text-gray-600">{(activeConversation.customerName || 'U').substring(0,2).toUpperCase()}</AvatarFallback>
                      </Avatar>
                    )}
                    
                    <div className="min-w-0 flex-1">
                        {/* Row 1: Name or Post Caption */}
                        <h2 className="font-bold text-gray-900 truncate text-sm md:text-base leading-tight" title={activeConversation.type === 'comment' ? (activeConversation.socialPost?.caption || 'Post comments') : undefined}>
                            {activeConversation.type === 'comment' 
                              ? (activeConversation.socialPost?.caption 
                                  ? (activeConversation.socialPost.caption.length > 40 
                                      ? activeConversation.socialPost.caption.substring(0, 40) + '...' 
                                      : activeConversation.socialPost.caption)
                                  : 'Post comments')
                              : (activeConversation.customerName || 'Unknown User')
                            }
                        </h2>
                        
                        {/* Row 2: Info */}
                        <div className="flex items-center gap-1.5 mt-0.5 md:mt-1.5">
                             {/* Platform Badge - Unified location */}
                             <PlatformBadge platform={(activeConversation.platform || 'instagram') as Platform} size="sm" />
                             
                             <span className="text-gray-300 text-[10px] hidden md:inline">|</span>

                             {/* Status Badge - Only for DMs */}
                             {activeConversation.type === 'dm' && (() => {
                               const statusConfig = getStatusConfig(activeConversation.status);
                               return (
                                 <span className={cn(
                                   "text-[10px] font-medium px-1.5 py-0.5 rounded border",
                                   statusConfig.color
                                 )} data-testid="badge-conversation-status">
                                   {statusConfig.label}
                                 </span>
                               );
                             })()}

                             {/* Desktop Metadata */}
                             <div className="hidden md:flex items-center gap-2">
                                <span className="text-gray-300 text-[10px]">|</span>
                                <span className="text-xs text-muted-foreground">
                                   {activeConversation.type === 'dm' && 'Direct Message'}
                                   {activeConversation.type === 'comment' && 'Comment'}
                                   {activeConversation.type === 'review' && 'Review'}
                                </span>
                                
                                {activeConversation.socialPost?.permalink && (
                                   <>
                                       <span className="text-gray-300 text-[10px]">|</span>
                                       <a 
                                           href={activeConversation.socialPost.permalink}
                                           target="_blank"
                                           rel="noopener noreferrer"
                                           className="text-xs text-indigo-600 hover:text-indigo-800 hover:underline flex items-center gap-1 font-medium"
                                       >
                                           <ExternalLink className="h-3 w-3" />
                                           View Original Post
                                       </a>
                                   </>
                                )}
                             </div>

                             {/* Mobile Metadata */}
                             <div className="flex md:hidden items-center gap-1.5">
                                <span className="text-gray-300 text-[10px]">|</span>
                                
                                <DropdownMenu>
                                   <DropdownMenuTrigger asChild>
                                       <Button variant="ghost" size="sm" className="h-5 w-5 p-0 text-gray-400 hover:text-foreground hover:bg-gray-100 rounded-full ml-0.5">
                                           <ChevronDown className="h-3.5 w-3.5" />
                                       </Button>
                                   </DropdownMenuTrigger>
                                   <DropdownMenuContent align="start" className="w-56">
                                       <DropdownMenuLabel className="text-xs font-normal text-muted-foreground">
                                           Conversation Info
                                       </DropdownMenuLabel>
                                       <DropdownMenuItem>
                                           <MessageCircle className="h-3.5 w-3.5 mr-2 text-gray-500" />
                                           <span className="text-xs">
                                               {activeConversation.type === 'dm' && 'Direct Message'}
                                               {activeConversation.type === 'comment' && 'Public Comment'}
                                               {activeConversation.type === 'review' && 'Review'}
                                           </span>
                                       </DropdownMenuItem>
                                       {activeConversation.socialPost?.permalink && (
                                           <>
                                               <DropdownMenuSeparator />
                                               <DropdownMenuItem asChild>
                                                   <a 
                                                       href={activeConversation.socialPost.permalink}
                                                       target="_blank"
                                                       rel="noopener noreferrer"
                                                       className="flex items-center gap-2 text-indigo-600 cursor-pointer"
                                                   >
                                                       <ExternalLink className="h-3.5 w-3.5" />
                                                       <span className="text-xs font-medium">View Original Post</span>
                                                   </a>
                                               </DropdownMenuItem>
                                           </>
                                       )}
                                   </DropdownMenuContent>
                                </DropdownMenu>
                             </div>
                        </div>
                    </div>
                 </div>

                 {/* Right Actions */}
                 <div className="flex items-center gap-1 shrink-0">
                    {/* CRM Panel Toggle Button */}
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          onClick={() => setIsCRMOpen(!isCRMOpen)}
                          className={cn(
                            "text-gray-400 hover:text-gray-600 transition-colors",
                            isCRMOpen && "bg-indigo-50 text-indigo-600 hover:bg-indigo-100 hover:text-indigo-700"
                          )}
                          data-testid="button-toggle-crm-panel"
                        >
                          {isCRMOpen ? <PanelRightClose className="h-5 w-5" /> : <PanelRightOpen className="h-5 w-5" />}
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent side="bottom">
                        <p>{isCRMOpen ? "Ocultar panel CRM" : "Mostrar panel CRM"}</p>
                      </TooltipContent>
                    </Tooltip>
                    
                    <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button 
                            variant="ghost" 
                            size="icon" 
                            className="text-gray-400 hover:text-gray-600"
                            title="More options"
                        >
                            <MoreVertical className="h-5 w-5" />
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-48">
                        {activeConversation.type === 'dm' && (
                          <>
                            <DropdownMenuLabel className="text-xs font-normal text-muted-foreground">
                                Change Status
                            </DropdownMenuLabel>
                            <DropdownMenuItem 
                                onClick={() => handleUpdateConversationStatus('open')}
                                disabled={activeConversation.status === 'closed' || activeConversation.status === 'open' || isUpdatingStatus}
                                data-testid="action-status-open"
                            >
                                <span className="w-2 h-2 rounded-full bg-green-500 mr-2" />
                                Mark as Open
                            </DropdownMenuItem>
                            <DropdownMenuItem 
                                onClick={() => handleUpdateConversationStatus('pending')}
                                disabled={activeConversation.status === 'closed' || activeConversation.status === 'pending' || isUpdatingStatus}
                                data-testid="action-status-pending"
                            >
                                <span className="w-2 h-2 rounded-full bg-yellow-500 mr-2" />
                                Mark as Pending
                            </DropdownMenuItem>
                            <DropdownMenuItem 
                                onClick={() => handleUpdateConversationStatus('solved')}
                                disabled={activeConversation.status === 'closed' || activeConversation.status === 'solved' || isUpdatingStatus}
                                data-testid="action-status-solved"
                            >
                                <span className="w-2 h-2 rounded-full bg-purple-500 mr-2" />
                                Mark as Solved
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem 
                                onClick={handleGenerateSummary}
                                disabled={activeConversation.status === 'new' || isGeneratingSummary}
                                data-testid="action-generate-summary"
                            >
                                {isGeneratingSummary ? (
                                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                ) : (
                                  <Sparkles className="w-4 h-4 mr-2" />
                                )}
                                {activeConversation.closingSummary ? "Regenerate Summary" : "Generate AI Summary"}
                            </DropdownMenuItem>
                          </>
                        )}
                        <DropdownMenuSeparator />
                        <DropdownMenuItem disabled>Mute Conversation</DropdownMenuItem>
                        <DropdownMenuItem disabled>Mark as Unread</DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem className="text-red-600" disabled>Block Contact</DropdownMenuItem>
                    </DropdownMenuContent>
                 </DropdownMenu>
                 </div>
               </div>
            </header>

            {/* Chat Content */}
            <div className={cn("flex-1 relative flex flex-col overflow-hidden", getPlatformStyles((activeConversation.platform || 'instagram') as Platform).container)}>
                {/* Floating Bulk AI Button - Expandable pill animation */}
                {threadMessages.length > 1 && (
                  <motion.button
                    onClick={() => {
                      setSelectionEnabled(!selectionEnabled);
                      if (selectionEnabled) {
                        setSelectedMessageIds(new Set());
                      }
                    }}
                    onPointerEnter={() => setIsBulkButtonHovered(true)}
                    onPointerLeave={() => setIsBulkButtonHovered(false)}
                    initial={false}
                    animate={{
                      width: isBulkButtonHovered ? 'auto' : 40,
                    }}
                    transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                    className={cn(
                      "absolute top-9 right-6 z-20 h-10 rounded-full shadow-lg overflow-hidden flex items-center justify-end cursor-pointer",
                      selectionEnabled 
                        ? "bg-white text-gray-600 border border-gray-300 hover:bg-gray-50" 
                        : "bg-gradient-to-r from-indigo-500 to-purple-500 hover:from-indigo-600 hover:to-purple-600 text-white"
                    )}
                    style={{ originX: 1 }}
                    data-testid="button-toggle-selection-mode"
                    aria-pressed={selectionEnabled}
                  >
                    <AnimatePresence mode="wait">
                      {isBulkButtonHovered && (
                        <motion.span
                          initial={{ opacity: 0, x: 10 }}
                          animate={{ opacity: 1, x: 0 }}
                          exit={{ opacity: 0, x: 10 }}
                          transition={{ duration: 0.15 }}
                          className="text-[10px] font-medium whitespace-nowrap pl-3 pr-1"
                        >
                          {selectionEnabled ? "Cancelar" : "Generar borradores"}
                        </motion.span>
                      )}
                    </AnimatePresence>
                    <span className="h-10 w-10 flex items-center justify-center shrink-0">
                      <Sparkle className="h-5 w-5" />
                    </span>
                  </motion.button>
                )}
                <div className="flex-1 relative overflow-hidden">
                  <div 
                    ref={threadScrollRef}
                    className="absolute inset-0 overflow-y-auto overflow-x-hidden p-4 md:p-8"
                    onScroll={(e) => {
                      const target = e.currentTarget;
                      const scrollPercentage = target.scrollTop / (target.scrollHeight - target.clientHeight);
                      setShowScrollToTop(scrollPercentage > 0.15);
                    }}
                  >
                   <div className={cn(
                     "max-w-3xl mx-auto space-y-8 pb-32 relative",
                     selectionEnabled && "pl-8"
                   )}>
                  {/* Loading state for messages */}
                  {isLoadingConversationMessages ? (
                    <div className="flex items-center justify-center py-8">
                      <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
                      <span className="ml-2 text-sm text-gray-500">Loading messages...</span>
                    </div>
                  ) : (
                    <>
                      {/* Thread Header - Show if multiple messages in thread */}
                      {threadMessages.length > 1 && (
                        <div className="space-y-2 mb-6">
                          {/* Thread Filter Chips - Icon-only with hover expand */}
                          <div className="flex items-center justify-center gap-2 flex-wrap">
                            <motion.button
                              onClick={() => setThreadFilterNoReply(!threadFilterNoReply)}
                              disabled={threadFilterStats.noReplyCount === 0}
                              className={cn(
                                "inline-flex items-center gap-1.5 py-1.5 px-2 rounded-full text-[11px] font-medium",
                                threadFilterNoReply 
                                  ? "text-indigo-700 bg-indigo-100" 
                                  : "text-gray-500 hover:text-gray-700",
                                threadFilterStats.noReplyCount === 0 && "opacity-40 cursor-not-allowed"
                              )}
                              whileHover="hover"
                              animate={threadFilterNoReply ? "active" : "idle"}
                              data-testid="filter-no-reply"
                            >
                              <MessageCircle className="h-3.5 w-3.5 shrink-0" />
                              <motion.span
                                className="overflow-hidden whitespace-nowrap text-[11px]"
                                variants={{
                                  idle: { width: 0, opacity: 0 },
                                  hover: { width: "auto", opacity: 1 },
                                  active: { width: "auto", opacity: 1 }
                                }}
                                transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1] }}
                              >
                                Sin respuesta
                              </motion.span>
                              {threadFilterStats.noReplyCount > 0 && (
                                <span className={cn(
                                  "px-1.5 py-0.5 rounded-full text-[10px] shrink-0",
                                  threadFilterNoReply ? "bg-indigo-200" : "bg-gray-200"
                                )}>
                                  {threadFilterStats.noReplyCount}
                                </span>
                              )}
                            </motion.button>
                            
                            <motion.button
                              onClick={() => setThreadFilterWithDraft(!threadFilterWithDraft)}
                              disabled={threadFilterStats.withDraftCount === 0}
                              className={cn(
                                "inline-flex items-center gap-1.5 py-1.5 px-2 rounded-full text-[11px] font-medium",
                                threadFilterWithDraft 
                                  ? "text-amber-700 bg-amber-100" 
                                  : "text-gray-500 hover:text-gray-700",
                                threadFilterStats.withDraftCount === 0 && "opacity-40 cursor-not-allowed"
                              )}
                              whileHover="hover"
                              animate={threadFilterWithDraft ? "active" : "idle"}
                              data-testid="filter-with-draft"
                            >
                              <Pencil className="h-3.5 w-3.5 shrink-0" />
                              <motion.span
                                className="overflow-hidden whitespace-nowrap text-[11px]"
                                variants={{
                                  idle: { width: 0, opacity: 0 },
                                  hover: { width: "auto", opacity: 1 },
                                  active: { width: "auto", opacity: 1 }
                                }}
                                transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1] }}
                              >
                                Con borrador
                              </motion.span>
                              {threadFilterStats.withDraftCount > 0 && (
                                <span className={cn(
                                  "px-1.5 py-0.5 rounded-full text-[10px] shrink-0",
                                  threadFilterWithDraft ? "bg-amber-200" : "bg-gray-200"
                                )}>
                                  {threadFilterStats.withDraftCount}
                                </span>
                              )}
                            </motion.button>
                            
                            <motion.button
                              onClick={() => setThreadFilterWithReminder(!threadFilterWithReminder)}
                              disabled={threadFilterStats.withReminderCount === 0}
                              className={cn(
                                "inline-flex items-center gap-1.5 py-1.5 px-2 rounded-full text-[11px] font-medium",
                                threadFilterWithReminder 
                                  ? "text-purple-700 bg-purple-100" 
                                  : "text-gray-500 hover:text-gray-700",
                                threadFilterStats.withReminderCount === 0 && "opacity-40 cursor-not-allowed"
                              )}
                              whileHover="hover"
                              animate={threadFilterWithReminder ? "active" : "idle"}
                              data-testid="filter-with-reminder"
                            >
                              <Bell className="h-3.5 w-3.5 shrink-0" />
                              <motion.span
                                className="overflow-hidden whitespace-nowrap text-[11px]"
                                variants={{
                                  idle: { width: 0, opacity: 0 },
                                  hover: { width: "auto", opacity: 1 },
                                  active: { width: "auto", opacity: 1 }
                                }}
                                transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1] }}
                              >
                                Con recordatorio
                              </motion.span>
                              {threadFilterStats.withReminderCount > 0 && (
                                <span className={cn(
                                  "px-1.5 py-0.5 rounded-full text-[10px] shrink-0",
                                  threadFilterWithReminder ? "bg-purple-200" : "bg-gray-200"
                                )}>
                                  {threadFilterStats.withReminderCount}
                                </span>
                              )}
                            </motion.button>
                          </div>
                          
                          {/* Message count label */}
                          <div className="flex items-center justify-center">
                            <span className="text-[10px] font-medium text-gray-400">
                              Thread · {filteredThreadMessages.length === threadMessages.length 
                                ? `${threadMessages.length} messages` 
                                : `${filteredThreadMessages.length} de ${threadMessages.length} messages`}
                            </span>
                          </div>
                        </div>
                      )}

                      {/* Render threaded messages with visual connection lines */}
                      <CommentThread
                        messages={filteredThreadMessages}
                        platformStyles={getPlatformStyles((activeConversation.platform || 'instagram') as Platform)}
                        onStartReply={handleStartReply}
                        draftManagement={draftManagement}
                        highlightedMessageId={highlightedMessageId}
                        AudioPlayer={AudioPlayer}
                        SentimentIndicator={SentimentIndicator}
                        selectionEnabled={selectionEnabled}
                        selectedMessageIds={selectedMessageIds}
                        onToggleSelection={handleToggleSelection}
                        unreadMessageIds={unreadMessageIds}
                        onUnreadSeen={handleUnreadSeen}
                      />

                      {/* Spacer to prevent content from being hidden behind the floating card */}
                      <div className="h-16"></div>
                    </>
                  )}
                   </div>
                  </div>
                  
                  {/* Scroll to Top Button */}
                  <AnimatePresence>
                    {showScrollToTop && threadMessages.length > 3 && (
                      <motion.div
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.8 }}
                        transition={{ duration: 0.2 }}
                        className="absolute bottom-6 right-6 z-30"
                      >
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              onClick={() => {
                                threadScrollRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
                              }}
                              size="icon"
                              className="h-10 w-10 rounded-full bg-white/80 hover:bg-white text-gray-600 hover:text-gray-800 shadow-lg border border-gray-200/50 backdrop-blur-sm transition-all"
                              data-testid="button-scroll-to-top"
                            >
                              <ArrowUp className="h-5 w-5" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent side="left">
                            <p>Ir arriba</p>
                          </TooltipContent>
                        </Tooltip>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

            {/* Bulk Draft Action Bar */}
            <BulkDraftActionBar
              selectedCount={selectedMessageIds.size}
              isProcessing={bulkQueue.isProcessing}
              progress={bulkQueue.progress}
              completedCount={bulkQueue.completedCount}
              totalCount={bulkQueue.totalCount}
              errorCount={bulkQueue.errorCount}
              onGenerate={handleBulkGenerate}
              onClearSelection={handleClearSelection}
              onCancel={bulkQueue.cancel}
            />

            {/* Floating Reply Input Box */}
            <AnimatePresence>
              {replyToMessage && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 20 }}
                  className="absolute bottom-0 left-0 right-0 bg-white border-t border-gray-200 p-4"
                >
                  {/* Quoted Message Preview */}
                  <div className="mb-3 flex items-start gap-2">
                    <div className="flex-1 bg-gray-50 rounded-lg p-3 border border-gray-200">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs font-semibold text-gray-700">
                          Respondiendo a {replyToMessage.author}
                        </span>
                        <PlatformIcon 
                          platform={(replyToMessage.platform || 'instagram') as Platform} 
                          className="h-3 w-3" 
                        />
                      </div>
                      <p className="text-xs text-gray-500 line-clamp-2">
                        {replyToMessage.content}
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 w-6 p-0 text-gray-400 hover:text-gray-600"
                      onClick={handleCancelReply}
                      data-testid="button-cancel-reply"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>

                  {/* Reply Input */}
                  <div className="flex gap-3">
                    <div className="flex-1 flex flex-col gap-1">
                      <Textarea
                        placeholder="Escribe tu respuesta..."
                        value={replyText}
                        onChange={(e) => setReplyText(e.target.value)}
                        className="flex-1 min-h-[60px] max-h-[120px] resize-none text-sm"
                        data-testid="input-reply-text"
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                            handleSendReply();
                          }
                        }}
                      />
                      <div className="flex items-center justify-between">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={handleGenerateAIReply}
                          disabled={isGeneratingAI || !activeClientId}
                          className="h-6 text-[10px] font-medium text-gray-500 hover:text-indigo-600 hover:bg-indigo-50 px-2"
                          data-testid="button-generate-ai-reply"
                        >
                          {isGeneratingAI ? (
                            <>
                              <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                              Generando...
                            </>
                          ) : (
                            <>
                              <Sparkles className="h-3 w-3 mr-1" />
                              Generar con IA
                            </>
                          )}
                        </Button>
                        <span className="text-[10px] text-gray-400">Ctrl+Enter</span>
                      </div>
                    </div>
                    <div className="flex flex-col gap-1">
                      <Button
                        onClick={handleSendReply}
                        disabled={!replyText.trim() || isSendingReply || replyText.length > getReplyCharacterLimit()}
                        className={cn(
                          "h-10 px-4",
                          replyText.length > getReplyCharacterLimit() 
                            ? "bg-red-100 text-red-500 hover:bg-red-100" 
                            : "bg-indigo-600 hover:bg-indigo-700"
                        )}
                        data-testid="button-send-reply"
                      >
                        {isSendingReply ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <>
                            <Send className="h-4 w-4 mr-1" />
                            Enviar
                          </>
                        )}
                      </Button>
                      <div className={cn(
                        "text-[10px] text-center font-medium",
                        replyText.length > getReplyCharacterLimit() 
                          ? "text-red-500" 
                          : replyText.length > getReplyCharacterLimit() * 0.9 
                            ? "text-amber-500" 
                            : "text-gray-400"
                      )}>
                        {replyText.length}/{getReplyCharacterLimit()}
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            </div>
          </>
        ) : (
           <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground bg-gray-50/30">
              <div className="h-24 w-24 bg-gray-100 rounded-full flex items-center justify-center mb-6">
                 <MessageSquare className="h-10 w-10 text-gray-300" />
              </div>
              <p className="text-xl font-semibold text-gray-900">No conversation selected</p>
              <p className="text-sm text-gray-500 mt-2">Select a message from the list to view details.</p>
           </div>
        )}
      </div>

      {/* COLUMN 4: CRM Context Panel */}
      <CRMContextPanel 
          crmContact={crmContactData?.contact}
          crmChannels={crmContactData?.channels}
          isLoadingContact={isLoadingCrmContact}
          conversation={activeConversation}
          brandId={activeClientId || ''}
          isOpen={isCRMOpen}
          onClose={() => setIsCRMOpen(false)}
          onContactCreated={() => {
            queryClient.invalidateQueries({ queryKey: ['crmContact'] });
          }}
      />
    </div>
  );
}

// --- Sub-Components ---

function MessageCard({ message, isSelected, onClick, onOpenCRM }: { message: Message, isSelected: boolean, onClick: () => void, onOpenCRM?: () => void }) {
    return (
        <motion.button
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95 }}
            onClick={onClick}
            className={cn(
                "w-full max-w-full text-left bg-white rounded-lg border border-gray-100 hover:border-gray-300 hover:bg-gray-50 transition-all duration-200 relative overflow-hidden group pl-3 py-3 pr-3",
                isSelected && "ring-1 ring-indigo-500 ring-offset-1 border-transparent bg-gray-50 z-10"
            )}
        >
            <div className="flex items-start gap-3 min-w-0 max-w-full overflow-hidden">
                {/* Avatar & Icon */}
                <div className="relative shrink-0">
                    <Avatar className="h-10 w-10 border border-gray-100">
                        <AvatarImage src={message.authorAvatar || undefined} alt={message.author} className="bg-white" />
                        <AvatarFallback className="text-xs font-bold text-gray-600 bg-[#E5E7EB]">
                            {message.author.substring(0,2).toUpperCase()}
                        </AvatarFallback>
                    </Avatar>
                    <div className="absolute -bottom-1 -right-1 bg-white rounded-full p-0.5">
                        <PlatformIcon platform={(message.platform || 'instagram') as Platform} className="h-4 w-4" />
                    </div>
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0 max-w-full overflow-hidden">
                    <div className="flex items-center justify-between mb-2 min-w-0 max-w-full">
                        <div className="flex items-center gap-1.5 min-w-0 flex-1 overflow-hidden">
                            <span className={cn("text-sm font-bold truncate text-gray-900 max-w-full", message.status === 'unread' && "")}>
                                {message.author}
                            </span>
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                           {message.sourceUrl && (
                               <a 
                                   href={message.sourceUrl}
                                   target="_blank"
                                   rel="noopener noreferrer"
                                   onClick={(e) => e.stopPropagation()}
                                   className="text-gray-400 hover:text-indigo-600 p-0.5 rounded hover:bg-indigo-50 transition-colors"
                                   title={`View on ${message.platform}`}
                               >
                                   <ExternalLink className="h-3 w-3" />
                               </a>
                           )}
                           <span className="text-[10px] text-gray-400 whitespace-nowrap shrink-0 ml-1">
                                {formatDistanceToNow(new Date(message.timestamp), { addSuffix: false }).replace('about ', '')}
                           </span>
                        </div>
                    </div>
                    
                    <div className="flex items-center gap-1.5 mb-2.5 flex-wrap min-w-0 max-w-full">
                        {message.urgency === 'high' && (
                            <Badge variant="outline" className="text-[10px] font-medium h-5 px-1.5 text-red-600 bg-red-50 border-red-100 gap-1 shrink-0">
                                <Flame className="h-3 w-3 fill-red-600" /> High
                            </Badge>
                        )}
                        {message.urgency === 'medium' && (
                            <Badge variant="outline" className="text-[10px] font-medium h-5 px-1.5 text-amber-600 bg-amber-50 border-amber-100 shrink-0">
                                Medium
                            </Badge>
                        )}
                        <IntentBadge intent={(message.intent || 'general') as Intent} />
                        <Badge variant="outline" className="text-[10px] font-normal h-5 px-1.5 text-gray-500 border-gray-200 shrink-0">
                            {message.type === 'dm' && 'DM'}
                            {message.type === 'comment' && 'Comment'}
                            {message.type === 'review' && 'Review'}
                        </Badge>
                    </div>

                    <p className={cn(
                        "text-sm line-clamp-2 leading-relaxed text-gray-600 min-w-0 max-w-full break-words", 
                        message.status === 'unread' ? "font-medium text-gray-900" : ""
                    )}>
                        {message.content}
                    </p>
                    
                    <div className="flex items-center justify-between mt-4 pt-2 border-t border-gray-50 min-w-0 max-w-full">
                        {/* CRM Sync Status Indicator (Moved Here) */}
                        {message.crmData && (message.crmData as CRMContact).crmType ? (
                            <div className="flex items-center gap-1.5" title={`Synced with ${(message.crmData as CRMContact).crmType}`}>
                                <div className="flex items-center justify-center h-5 w-5 rounded-full bg-white border shadow-sm shrink-0">
                                    {(message.crmData as CRMContact).crmType === 'hubspot' && <img src="/logos/hubspot.png" className="h-3.5 w-3.5 object-contain" />}
                                    {(message.crmData as CRMContact).crmType === 'salesforce' && <img src="https://logo.clearbit.com/salesforce.com" className="h-3.5 w-3.5 object-contain" />}
                                    {(message.crmData as CRMContact).crmType === 'pipedrive' && <img src="/logos/pipedrive.webp" className="h-3.5 w-3.5 object-contain" />}
                                    {(message.crmData as CRMContact).crmType === 'zoho' && <img src="/logos/zoho.png" className="h-3.5 w-3.5 object-contain" />}
                                    {(message.crmData as CRMContact).crmType === 'monday' && <img src="https://logo.clearbit.com/monday.com" className="h-3.5 w-3.5 object-contain" />}
                                    {(message.crmData as CRMContact).crmType === 'notion' && <img src="https://logo.clearbit.com/notion.so" className="h-3.5 w-3.5 object-contain" />}
                                    {(message.crmData as CRMContact).crmType === 'airtable' && <img src="https://logo.clearbit.com/airtable.com" className="h-3.5 w-3.5 object-contain" />}
                                </div>
                                <span className="text-[10px] font-medium text-gray-500 capitalize">
                                    {(message.crmData as CRMContact).crmType}
                                </span>
                            </div>
                        ) : (
                            <div 
                                className="flex items-center gap-1.5 opacity-60 hover:opacity-100 transition-opacity cursor-pointer group/add" 
                                title="Not Synced - Click to Create"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onClick();
                                    onOpenCRM?.();
                                }}
                            >
                                <div className="h-5 w-5 rounded-full border border-dashed border-gray-400 flex items-center justify-center shrink-0 bg-gray-50 group-hover/add:border-indigo-500 group-hover/add:bg-indigo-50 transition-colors">
                                    <span className="text-[10px] text-gray-500 font-bold group-hover/add:text-indigo-600">+</span>
                                </div>
                                <span className="text-[10px] font-medium text-gray-500 group-hover/add:text-indigo-600 transition-colors">
                                    Add to CRM
                                </span>
                            </div>
                        )}

                        <SentimentIndicator sentiment={(message.sentiment || 'neutral') as Sentiment} />
                    </div>
                </div>
            </div>
        </motion.button>
    );
}

function IntentBadge({ intent }: { intent: Intent }) {
    const styles = {
        sales: "bg-green-100 text-green-800 border-green-200",
        support: "bg-blue-100 text-blue-800 border-blue-200",
        complaint: "bg-red-100 text-red-800 border-red-200",
        general: "bg-gray-100 text-gray-700 border-gray-200",
    };

    const labels = {
        sales: "Potential Sale",
        support: "Support",
        complaint: "Complaint",
        general: "General",
    };

    return (
        <span className={cn("text-[10px] px-2 py-0.5 rounded-full font-medium border", styles[intent])}>
            {labels[intent]}
        </span>
    );
}

function UrgencyBadge({ urgency }: { urgency: Urgency }) {
    const styles = {
        high: "text-red-600 bg-red-50 border-red-100",
        medium: "text-yellow-700 bg-yellow-50 border-yellow-100",
        low: "text-gray-600 bg-gray-50 border-gray-100",
    };

    return (
        <Badge variant="outline" className={cn("ml-2 border capitalize shadow-none", styles[urgency])}>
            {urgency}
        </Badge>
    );
}

function AudioPlayer({ 
  src, 
  transcription,
  isOutbound = false 
}: { 
  src: string; 
  transcription?: string | null;
  isOutbound?: boolean;
}) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [showTranscription, setShowTranscription] = useState(false);
  const audioRef = React.useRef<HTMLAudioElement>(null);
  const progressRef = React.useRef<HTMLDivElement>(null);

  const formatTime = (time: number) => {
    if (!time || !isFinite(time)) return '0:00';
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const togglePlay = () => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause();
      } else {
        audioRef.current.play();
      }
    }
  };

  const handleTimeUpdate = () => {
    if (audioRef.current) {
      setCurrentTime(audioRef.current.currentTime);
    }
  };

  const handleLoadedMetadata = () => {
    if (audioRef.current && isFinite(audioRef.current.duration)) {
      setDuration(audioRef.current.duration);
    }
  };

  const handleEnded = () => {
    setIsPlaying(false);
    setCurrentTime(0);
  };

  const handleProgressClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (progressRef.current && audioRef.current && duration > 0) {
      const rect = progressRef.current.getBoundingClientRect();
      const percent = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
      audioRef.current.currentTime = percent * duration;
      setCurrentTime(percent * duration);
    }
  };

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;
  
  const waveformBars = 35;
  const waveformPattern = React.useMemo(() => {
    return Array.from({ length: waveformBars }, (_, i) => {
      const x = i / waveformBars;
      const wave1 = Math.sin(x * Math.PI * 3) * 0.4;
      const wave2 = Math.sin(x * Math.PI * 7 + 1) * 0.25;
      const wave3 = Math.sin(x * Math.PI * 11 + 2) * 0.15;
      const noise = (((i * 17 + 11) % 23) / 23 - 0.5) * 0.2;
      const value = 0.4 + wave1 + wave2 + wave3 + noise;
      return Math.max(15, Math.min(100, value * 100));
    });
  }, []);

  const baseColor = isOutbound ? 'rgba(255,255,255,0.35)' : '#c7d2fe';
  const activeColor = isOutbound ? '#ffffff' : '#4f46e5';
  const textColor = isOutbound ? 'text-white/70' : 'text-gray-500';
  const buttonBg = isOutbound ? 'bg-white/20 hover:bg-white/30' : 'bg-indigo-100 hover:bg-indigo-200';
  const buttonIcon = isOutbound ? 'text-white' : 'text-indigo-600';
  const transcriptionBg = isOutbound ? 'bg-white/10' : 'bg-gray-50';
  const transcriptionBorder = isOutbound ? 'border-white/20' : 'border-gray-200';
  const transcriptionText = isOutbound ? 'text-white/90' : 'text-gray-700';

  return (
    <div className="w-full min-w-[280px] max-w-[360px]">
      <audio
        ref={audioRef}
        src={src}
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={handleLoadedMetadata}
        onEnded={handleEnded}
        onPlay={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
        preload="metadata"
      />
      
      <div className="flex items-center gap-3">
        <button
          onClick={togglePlay}
          className={cn(
            "h-12 w-12 rounded-full flex items-center justify-center transition-all shrink-0 shadow-sm",
            buttonBg
          )}
          data-testid="button-audio-play"
        >
          {isPlaying ? (
            <Pause className={cn("h-5 w-5", buttonIcon)} />
          ) : (
            <Play className={cn("h-5 w-5 ml-0.5", buttonIcon)} />
          )}
        </button>

        <div className="flex-1 min-w-0">
          <div 
            ref={progressRef}
            onClick={handleProgressClick}
            className="flex items-end gap-[2px] h-9 cursor-pointer py-1"
            data-testid="audio-waveform"
          >
            {waveformPattern.map((height, i) => {
              const barProgress = (i / waveformBars) * 100;
              const isActive = barProgress <= progress;
              return (
                <div
                  key={i}
                  className="flex-1 rounded-full transition-colors duration-150"
                  style={{ 
                    height: `${height}%`,
                    backgroundColor: isActive ? activeColor : baseColor,
                    minWidth: '2px',
                    maxWidth: '4px'
                  }}
                />
              );
            })}
          </div>
          
          <div className={cn("flex justify-between text-[11px] font-medium", textColor)}>
            <span>{formatTime(currentTime)}</span>
            <span>{formatTime(duration)}</span>
          </div>
        </div>
      </div>

      {transcription && (
        <div className="mt-3">
          <button
            onClick={() => setShowTranscription(!showTranscription)}
            className={cn(
              "flex items-center gap-1 text-xs font-medium transition-colors",
              isOutbound ? "text-white/80 hover:text-white" : "text-indigo-600 hover:text-indigo-700"
            )}
            data-testid="button-toggle-transcription"
          >
            <ChevronRight className={cn("h-3.5 w-3.5 transition-transform duration-200", showTranscription && "rotate-90")} />
            Ver transcripción
          </button>
          
          <AnimatePresence>
            {showTranscription && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="overflow-hidden"
              >
                <div className={cn(
                  "mt-2 p-3 rounded-xl border text-sm leading-relaxed",
                  transcriptionBg,
                  transcriptionBorder,
                  transcriptionText
                )}>
                  {transcription}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}

function SentimentIndicator({ sentiment, showLabel }: { sentiment: Sentiment, showLabel?: boolean }) {
    const config = {
        positive: { icon: Smile, color: "text-green-500", label: "Positive" },
        neutral: { icon: Meh, color: "text-gray-400", label: "Neutral" },
        negative: { icon: Frown, color: "text-red-500", label: "Negative" },
    };

    const { icon: Icon, color, label } = config[sentiment];

    return (
        <div className={cn("flex items-center gap-1", color)} title={`Sentiment: ${label}`}>
            <Icon className="h-4 w-4" />
            {showLabel && <span className="text-xs font-medium">{label}</span>}
        </div>
    );
}

function FilterButton({ active, onClick, label, icon, activeColorClass, hoverColorClass, count }: { active: boolean, onClick: () => void, label: string, icon?: React.ReactNode, activeColorClass?: string, hoverColorClass?: string, count?: number }) {
  return (
    <button 
      onClick={onClick}
      title={label}
      type="button"
      className={cn(
        "relative flex items-center justify-center h-10 w-10 rounded-full text-xs font-medium transition-all shrink-0 touch-manipulation",
        active 
          ? cn("text-white", activeColorClass || "bg-gray-900") 
          : cn("bg-white text-gray-500", hoverColorClass || "hover:bg-gray-100 hover:text-gray-900")
      )}
    >
      {icon}
      {count !== undefined && count > 0 && (
        <div className="absolute -top-1 -right-1 bg-red-500 text-white text-[9px] font-bold h-4 min-w-[16px] flex items-center justify-center rounded-full px-1 shadow-sm ring-2 ring-white z-10">
          {count > 99 ? '99+' : count}
        </div>
      )}
    </button>
  );
}

function PlatformIcon({ platform, className }: { platform: Platform, className?: string }) {
  switch(platform) {
    case 'instagram': return <FaInstagram className={cn("text-pink-600", className)} />;
    case 'facebook': return <FaFacebook className={cn("text-blue-600", className)} />;
    case 'linkedin': return <FaLinkedin className={cn("text-[#0077b5]", className)} />;
    case 'tiktok': return <FaTiktok className={cn("text-black", className)} />;
    case 'youtube': return <FaYoutube className={cn("text-red-600", className)} />;
    case 'google-business': return <GoogleBusinessIcon className={cn("text-blue-500", className)} />;
    case 'whatsapp': return <FaWhatsapp className={cn("text-green-500", className)} />;
    default: return <MessageSquare className={className} />;
  }
}

function PlatformBadge({ platform, size = 'default' }: { platform: Platform, size?: 'sm' | 'default' }) {
    return (
        <Badge variant="secondary" className="bg-gray-100 text-gray-600 hover:bg-gray-200 gap-1">
            <PlatformIcon platform={platform} className="h-3 w-3" />
            <span className="capitalize">{platform}</span>
        </Badge>
    )
}

function ExpandableAICard({ message }: { message: Message }) {
    const [isExpanded, setIsExpanded] = useState(false);
    
    const urgencyColors = {
        high: {
            bg: "bg-red-50",
            text: "text-red-600",
            badge: "bg-red-100 text-red-700",
            border: "border-red-200"
        },
        medium: {
            bg: "bg-amber-50",
            text: "text-amber-600",
            badge: "bg-amber-100 text-amber-700",
            border: "border-amber-200"
        },
        low: {
            bg: "bg-indigo-50",
            text: "text-indigo-600",
            badge: "bg-indigo-100 text-indigo-700",
            border: "border-indigo-200"
        }
    };
    
    const urgency = (message.urgency || 'low') as keyof typeof urgencyColors;
    const colors = urgencyColors[urgency];

    return (
        <div 
            className="absolute top-20 right-4 z-30"
            onMouseEnter={() => setIsExpanded(true)}
            onMouseLeave={() => setIsExpanded(false)}
        >
            <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                layout
                className={cn(
                    "bg-white rounded-xl border shadow-lg cursor-pointer overflow-hidden",
                    colors.border
                )}
            >
                <AnimatePresence mode="wait">
                    {!isExpanded ? (
                        <motion.div
                            key="collapsed"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="flex items-center gap-2 px-3 py-2"
                        >
                            <div className={cn("p-1.5 rounded-lg", colors.bg, colors.text)}>
                                <Brain className="h-4 w-4" />
                            </div>
                            <div className={cn(
                                "text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wide",
                                colors.badge
                            )}>
                                {urgency} Priority
                            </div>
                        </motion.div>
                    ) : (
                        <motion.div
                            key="expanded"
                            initial={{ opacity: 0, width: 0 }}
                            animate={{ opacity: 1, width: "auto" }}
                            exit={{ opacity: 0, width: 0 }}
                            className="p-4 flex items-start gap-4 min-w-[320px] max-w-md"
                        >
                            <div className={cn("p-2 rounded-lg shrink-0", colors.bg, colors.text)}>
                                <Brain className="h-5 w-5" />
                            </div>
                            <div className="space-y-1 flex-1">
                                <div className="flex items-center justify-between">
                                    <span className="font-semibold text-gray-900 text-sm">AI Analysis</span>
                                    <div className={cn(
                                        "text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wide",
                                        colors.badge
                                    )}>
                                        {urgency} Priority
                                    </div>
                                </div>
                                <p className="text-sm text-gray-600 leading-relaxed">
                                    {message.aiSummary || "Analyzing conversation context..."}
                                </p>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </motion.div>
        </div>
    );
}
