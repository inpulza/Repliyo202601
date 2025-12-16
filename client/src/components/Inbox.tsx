import React, { useState, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useNexus, type ConversationWithPost } from '@/context/NexusContext';
import { useIsMobile } from '@/hooks/use-mobile';
import { useWebSocket } from '@/hooks/useWebSocket';
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
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { formatDistanceToNow } from 'date-fns';
import { Platform, MessageType, Urgency, Intent, Sentiment, MessageStatus, CRMContact } from '@/lib/types';
import { isRepliyoMessage, isAutoReply } from '@/lib/mockData';
import type { Message } from '@shared/schema';
import { motion, AnimatePresence } from "framer-motion";
import { getCharacterLimit } from '@/utils/platformLimits';
import { Reply, X } from 'lucide-react';
import repliyoLogo from '@/assets/repliyo-logo.jpg';
import { toast } from '@/hooks/use-toast';


// --- Helper: Platform Styles ---
const getPlatformStyles = (platform: Platform) => {
    switch (platform) {
        case 'whatsapp':
            return {
                container: "bg-[#efeae2]/60", // WhatsApp wallpaper vibe
                bubble: "bg-[#e7fce3] border-[#dcf8c6] text-gray-900", // WhatsApp light green bubble
                replyBubble: "bg-[#25D366] border-[#128C7E] text-white", // WhatsApp green for replies
                badge: "bg-[#dcf8c6] text-green-800 border-green-200",
                commentBadge: "text-green-600"
            };
        case 'facebook':
            return {
                container: "bg-[#f0f2f5]", // Facebook light gray/blue background
                bubble: "bg-white border-gray-200 text-gray-900 shadow-sm",
                replyBubble: "bg-[#1877F2] border-[#1565D8] text-white", // Facebook blue for replies
                badge: "bg-blue-100 text-blue-700 border-blue-200",
                commentBadge: "text-blue-600"
            };
        case 'instagram':
            return {
                container: "bg-gradient-to-br from-pink-50/50 via-white to-purple-50/50", // Subtle gradient
                bubble: "bg-white border-gray-100 text-gray-900 shadow-sm",
                replyBubble: "bg-gradient-to-r from-[#833AB4] via-[#E1306C] to-[#F77737] border-pink-500 text-white", // Instagram gradient for replies
                badge: "bg-pink-100 text-pink-700 border-pink-200",
                commentBadge: "text-pink-600"
            };
        case 'linkedin':
            return {
                container: "bg-[#f3f6f8]", // LinkedIn light gray background
                bubble: "bg-white border-gray-200 text-slate-800 shadow-sm",
                replyBubble: "bg-[#0A66C2] border-[#004182] text-white", // LinkedIn blue for replies
                badge: "bg-slate-100 text-slate-700 border-slate-200",
                commentBadge: "text-slate-600"
            };
        case 'youtube':
            return {
                container: "bg-red-50/20", // Very subtle red tint
                bubble: "bg-white border-gray-200 text-gray-900 shadow-sm",
                replyBubble: "bg-red-500/90 border-red-400 text-white", // Softer YouTube red for replies
                badge: "bg-red-100 text-red-700 border-red-200",
                commentBadge: "text-red-600"
            };
        case 'tiktok':
            return {
                container: "bg-gray-50",
                bubble: "bg-white border-gray-200 text-gray-900 shadow-sm",
                replyBubble: "bg-[#121212] border-[#2F2F2F] text-white", // TikTok dark/black for replies
                badge: "bg-gray-200 text-gray-800 border-gray-300",
                commentBadge: "text-gray-800"
            };
        case 'google-business':
            return {
                container: "bg-blue-50/20",
                bubble: "bg-white border-blue-100 text-gray-900 shadow-sm",
                replyBubble: "bg-[#4285F4] border-[#3367D6] text-white", // Google blue for replies
                badge: "bg-blue-100 text-blue-700 border-blue-200",
                commentBadge: "text-blue-600"
            };
        default:
            return {
                container: "bg-indigo-50/30",
                bubble: "bg-white border-gray-200 text-gray-900 shadow-sm",
                replyBubble: "bg-indigo-600 border-indigo-700 text-white", // Default indigo for replies
                badge: "bg-gray-100 text-gray-700 border-gray-200",
                commentBadge: "text-gray-600"
            };
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
    approveMessage, 
    updateMessageDraft, 
    refreshFeed,
    isLoadingConversations,
    isLoadingConversationMessages,
  } = useNexus();
  const isMobile = useIsMobile();
  const queryClient = useQueryClient();
  
  useWebSocket({
    brandId: activeClientId || undefined,
    onNewMessage: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/messages'] });
      queryClient.invalidateQueries({ queryKey: ['/api/conversations'] });
    },
    showToasts: true,
  });
  
  const [isEditing, setIsEditing] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [replyToMessage, setReplyToMessage] = useState<Message | null>(null);
  const [replyText, setReplyText] = useState("");
  const [isSendingReply, setIsSendingReply] = useState(false);
  const [isGeneratingAI, setIsGeneratingAI] = useState(false);
  const [generatingDraftIds, setGeneratingDraftIds] = useState<Set<string>>(new Set());
  const [editingDraftId, setEditingDraftId] = useState<string | null>(null);
  const [editingDraftText, setEditingDraftText] = useState("");
  const [showRegenerateConfirm, setShowRegenerateConfirm] = useState<string | null>(null);
  const [localDraftOverrides, setLocalDraftOverrides] = useState<Map<string, { aiSuggestedReply: string; aiReplyStatus: string; draftWasEdited: boolean }>>(new Map());

  const { data: syncStatus } = useQuery<SyncStatus>({
    queryKey: ['/api/sync/status'],
    refetchInterval: 30000,
  });

  const getTimeSinceSync = () => {
    if (!syncStatus?.lastSyncTime) return null;
    const lastSync = new Date(syncStatus.lastSyncTime);
    const now = new Date();
    const diffSeconds = Math.floor((now.getTime() - lastSync.getTime()) / 1000);
    
    if (diffSeconds < 60) return `${diffSeconds}s`;
    if (diffSeconds < 3600) return `${Math.floor(diffSeconds / 60)}m`;
    return `${Math.floor(diffSeconds / 3600)}h`;
  };
  
  // Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [intentFilter, setIntentFilter] = useState<Intent | 'all'>('all');
  const [platformFilter, setPlatformFilter] = useState<Platform | 'all'>('all');
  const [typeFilter, setTypeFilter] = useState<MessageType | 'all'>('all');
  const [fireMode, setFireMode] = useState(false);
  const [isCRMOpen, setIsCRMOpen] = useState(!isMobile);
  const [showInactiveNetworks, setShowInactiveNetworks] = useState(false);

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

  // Filter Conversations
  const filteredConversations = conversations
    .filter(c => {
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

  // Calculate conversation counts per platform
  const platformCounts = React.useMemo(() => ({
    instagram: conversations.filter(c => c.platform === 'instagram').length,
    tiktok: conversations.filter(c => c.platform === 'tiktok').length,
    facebook: conversations.filter(c => c.platform === 'facebook').length,
    linkedin: conversations.filter(c => c.platform === 'linkedin').length,
    youtube: conversations.filter(c => c.platform === 'youtube').length,
    'google-business': conversations.filter(c => c.platform === 'google-business').length,
    whatsapp: conversations.filter(c => c.platform === 'whatsapp').length,
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
      
      // C. Sort children by timestamp (chronological order)
      children.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

      // D. RECURSION: Process each child the same way (add it and find its children)
      children.forEach(child => addMessageAndChildren(child));
    };

    // 3. Start from roots, sorted by timestamp
    rootMessages.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
    rootMessages.forEach(root => addMessageAndChildren(root));

    // 4. Handle orphans (safety net for sync errors where parent doesn't exist)
    const processedIds = new Set(flattened.map(m => m.id));
    const orphans = activeConversationMessages
      .filter(m => !processedIds.has(m.id))
      .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
    
    const allMessages = [...flattened, ...orphans];
    
    // 5. Merge local draft overrides for real-time updates
    return allMessages.map(msg => {
      const override = localDraftOverrides.get(msg.id);
      if (override) {
        return { ...msg, ...override };
      }
      return msg;
    });
  }, [activeConversationMessages, localDraftOverrides]);

  // Derive active draft message (outbound with drafting/pending status) and last inbound message
  const activeDraftMessage = React.useMemo(() => {
    return threadMessages.find(m => 
      m.direction === 'outbound' && 
      (m.status === 'drafting' || m.status === 'pending' || m.status === 'unread')
    );
  }, [threadMessages]);

  const lastInboundMessage = React.useMemo(() => {
    const inbound = threadMessages.filter(m => m.direction === 'inbound');
    return inbound[inbound.length - 1];
  }, [threadMessages]);

  // For backward compatibility, selectedMessage prioritizes the draft, then last inbound
  const selectedMessage = activeDraftMessage || lastInboundMessage || threadMessages[threadMessages.length - 1];

  // Auto-select first conversation (Desktop Only)
  useEffect(() => {
    if (isMobile) return;
    
    if (filteredConversations.length > 0 && !activeConversation) {
      setActiveConversation(filteredConversations[0]);
    }
  }, [filteredConversations, activeConversation, isMobile, setActiveConversation]);

  // Reset editing state and local draft overrides when selecting a new conversation
  useEffect(() => {
    setIsEditing(false);
    setLocalDraftOverrides(new Map());
  }, [activeConversation?.id]);

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
        queryClient.invalidateQueries({ queryKey: [`/api/conversations/${activeConversation.id}/messages`] });
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

  const handleGenerateDraft = async (messageId: string) => {
    if (!activeClientId || generatingDraftIds.has(messageId)) return;
    
    setGeneratingDraftIds(prev => new Set(prev).add(messageId));
    try {
      const result = await api.aiAgent.generateDraft(activeClientId, messageId);
      if (result.success && result.draft) {
        // Update local state immediately for real-time feedback
        setLocalDraftOverrides(prev => {
          const next = new Map(prev);
          next.set(messageId, {
            aiSuggestedReply: result.draft,
            aiReplyStatus: 'drafted',
            draftWasEdited: false,
          });
          return next;
        });
        
        toast({
          title: "Borrador generado",
          description: `${result.characterCount} caracteres`,
        });
        
        // Background refresh to sync with server, then clear local override
        await refreshFeed();
        setLocalDraftOverrides(prev => {
          const next = new Map(prev);
          next.delete(messageId);
          return next;
        });
        if (activeConversation) {
          queryClient.invalidateQueries({ queryKey: [`/api/conversations/${activeConversation.id}/messages`] });
        }
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "No se pudo generar el borrador",
        variant: "destructive",
      });
    } finally {
      setGeneratingDraftIds(prev => {
        const next = new Set(prev);
        next.delete(messageId);
        return next;
      });
    }
  };

  const handleRegenerateDraft = async (messageId: string, confirmOverwrite: boolean = false) => {
    if (!activeClientId) return;
    
    setGeneratingDraftIds(prev => new Set(prev).add(messageId));
    try {
      const result = await api.aiAgent.regenerateDraft(activeClientId, messageId, confirmOverwrite);
      
      if (result.requiresConfirmation) {
        setShowRegenerateConfirm(messageId);
        setGeneratingDraftIds(prev => {
          const next = new Set(prev);
          next.delete(messageId);
          return next;
        });
        return;
      }
      
      setShowRegenerateConfirm(null);
      if (result.success && result.draft) {
        // Update local state immediately for real-time feedback
        setLocalDraftOverrides(prev => {
          const next = new Map(prev);
          next.set(messageId, {
            aiSuggestedReply: result.draft,
            aiReplyStatus: 'drafted',
            draftWasEdited: false,
          });
          return next;
        });
        
        toast({ title: "Borrador regenerado" });
        
        // Background refresh to sync with server, then clear local override
        await refreshFeed();
        setLocalDraftOverrides(prev => {
          const next = new Map(prev);
          next.delete(messageId);
          return next;
        });
        if (activeConversation) {
          queryClient.invalidateQueries({ queryKey: [`/api/conversations/${activeConversation.id}/messages`] });
        }
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "No se pudo regenerar el borrador",
        variant: "destructive",
      });
    } finally {
      setGeneratingDraftIds(prev => {
        const next = new Set(prev);
        next.delete(messageId);
        return next;
      });
    }
  };

  const handleSaveDraftEdit = async (messageId: string) => {
    if (!activeClientId || !editingDraftText.trim()) return;
    
    try {
      await api.aiAgent.updateDraft(activeClientId, messageId, editingDraftText.trim());
      
      // Update local state immediately
      setLocalDraftOverrides(prev => {
        const next = new Map(prev);
        next.set(messageId, {
          aiSuggestedReply: editingDraftText.trim(),
          aiReplyStatus: 'edited',
          draftWasEdited: true,
        });
        return next;
      });
      
      setEditingDraftId(null);
      setEditingDraftText("");
      toast({ title: "Borrador guardado" });
      
      // Background refresh to sync with server, then clear local override
      await refreshFeed();
      setLocalDraftOverrides(prev => {
        const next = new Map(prev);
        next.delete(messageId);
        return next;
      });
      if (activeConversation) {
        queryClient.invalidateQueries({ queryKey: [`/api/conversations/${activeConversation.id}/messages`] });
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "No se pudo guardar el borrador",
        variant: "destructive",
      });
    }
  };

  const handleDiscardDraft = async (messageId: string) => {
    if (!activeClientId) return;
    
    try {
      await api.aiAgent.discardDraft(activeClientId, messageId);
      
      // Update local state immediately - remove draft
      setLocalDraftOverrides(prev => {
        const next = new Map(prev);
        next.set(messageId, {
          aiSuggestedReply: '',
          aiReplyStatus: 'none',
          draftWasEdited: false,
        });
        return next;
      });
      
      toast({ title: "Borrador descartado" });
      
      // Background refresh to sync with server, then clear local override
      await refreshFeed();
      setLocalDraftOverrides(prev => {
        const next = new Map(prev);
        next.delete(messageId);
        return next;
      });
      if (activeConversation) {
        queryClient.invalidateQueries({ queryKey: [`/api/conversations/${activeConversation.id}/messages`] });
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "No se pudo descartar el borrador",
        variant: "destructive",
      });
    }
  };

  const handleSendDraft = async (messageId: string, draft: string) => {
    if (!activeClientId || !draft.trim()) return;
    
    try {
      const result = await api.aiAgent.sendDraft(activeClientId, messageId);
      
      if (result.success) {
        setLocalDraftOverrides(prev => {
          const next = new Map(prev);
          next.set(messageId, {
            aiSuggestedReply: null,
            aiReplyStatus: 'sent',
            draftWasEdited: false,
          });
          return next;
        });
        
        toast({ title: "Respuesta enviada", description: "La respuesta se publicó en la red social" });
        
        await refreshFeed();
        setLocalDraftOverrides(prev => {
          const next = new Map(prev);
          next.delete(messageId);
          return next;
        });
        if (activeConversation) {
          queryClient.invalidateQueries({ queryKey: [`/api/conversations/${activeConversation.id}/messages`] });
        }
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "No se pudo enviar la respuesta",
        variant: "destructive",
      });
    }
  };

  const startEditingDraft = (messageId: string, currentDraft: string) => {
    setEditingDraftId(messageId);
    setEditingDraftText(currentDraft);
  };

  const cancelEditingDraft = () => {
    setEditingDraftId(null);
    setEditingDraftText("");
  };

  return (
    <div className="h-full flex bg-background overflow-hidden relative">
      {/* COLUMN 2: Message List */}
      <div className={cn(
          "w-[400px] border-r flex flex-col bg-white relative z-10 shadow-sm",
          isMobile ? "w-full" : "",
          isMobile && activeConversation ? "hidden" : "flex"
      )}>
        
        {/* Header / Title */}
        <div className="h-16 border-b px-4 flex items-center justify-between shrink-0 bg-white">
          <div className="flex items-center gap-3">
            <h1 className="font-bold text-xl tracking-tight text-gray-900">Inbox</h1>
            <div className="flex items-center gap-1">
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={handleSyncData} 
                disabled={isSyncing || syncStatus?.isSyncing}
                className="h-8 w-8 text-muted-foreground"
                data-testid="button-sync"
                title={syncStatus?.lastSyncTime ? `Última sync: ${new Date(syncStatus.lastSyncTime).toLocaleTimeString()}` : 'Sincronizar'}
              >
                <RefreshCw className={cn("h-4 w-4", (isSyncing || syncStatus?.isSyncing) && "animate-spin")} />
              </Button>
              {getTimeSinceSync() && (
                <span className="text-xs text-muted-foreground" data-testid="text-sync-time">
                  {getTimeSinceSync()}
                </span>
              )}
            </div>
            <Badge variant="outline" className="font-normal text-gray-500">
              {filteredConversations.length}
            </Badge>
          </div>
          
          {/* Integrated Quick Stats (Moved from Widget) */}
          <div className="flex items-center gap-1">
                {/* Critical Button */}
                <button 
                    onClick={() => setFireMode(!fireMode)}
                    className={cn(
                        "relative h-8 w-8 flex items-center justify-center rounded-full transition-all",
                        fireMode ? "bg-red-100 text-red-600" : "text-gray-400 hover:bg-gray-100 hover:text-gray-600"
                    )}
                    title="Critical Messages"
                >
                    <Flame className={cn("h-4 w-4", fireMode && "fill-red-600")} />
                    {criticalCount > 0 && (
                        <div className="absolute -top-1 -right-1 bg-red-500 text-white text-[9px] font-bold h-3.5 min-w-[14px] flex items-center justify-center rounded-full px-0.5 shadow-sm ring-2 ring-white z-10">
                            {criticalCount}
                        </div>
                    )}
                </button>

                {/* Opportunities Button */}
                <button 
                    onClick={() => setIntentFilter(intentFilter === 'sales' ? 'all' : 'sales')}
                    className={cn(
                        "relative h-8 w-8 flex items-center justify-center rounded-full transition-all",
                        intentFilter === 'sales' ? "bg-emerald-100 text-emerald-600" : "text-gray-400 hover:bg-gray-100 hover:text-gray-600"
                    )}
                    title="Sales Opportunities"
                >
                    <Banknote className="h-4 w-4" />
                    {opportunityCount > 0 && (
                        <div className="absolute -top-1 -right-1 bg-emerald-500 text-white text-[9px] font-bold h-3.5 min-w-[14px] flex items-center justify-center rounded-full px-0.5 shadow-sm ring-2 ring-white z-10">
                            {opportunityCount}
                        </div>
                    )}
                </button>

                {/* Pending Button */}
                <button 
                    onClick={() => {
                        setFireMode(false);
                        setIntentFilter('all');
                        setPlatformFilter('all');
                        setSearchQuery('');
                    }}
                    className="relative h-8 w-8 flex items-center justify-center rounded-full transition-all text-gray-400 hover:bg-gray-100 hover:text-gray-600"
                    title="Show All Pending"
                >
                    <InboxIcon className="h-4 w-4" />
                    {pendingCount > 0 && (
                        <div className="absolute -top-1 -right-1 bg-blue-500 text-white text-[9px] font-bold h-3.5 min-w-[14px] flex items-center justify-center rounded-full px-0.5 shadow-sm ring-2 ring-white z-10">
                            {pendingCount}
                        </div>
                    )}
                </button>
          </div>
        </div>

        {/* Filter Bar (The "Playground" for AI) */}
        <div className="p-3 border-b space-y-3 bg-gray-50/50">

          {/* Row 1: Search & Fire Mode */}
          <div className="flex gap-2">
            <div className="relative flex-1">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input 
                placeholder="Search..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 bg-white border-gray-200 focus:ring-offset-0 h-9" 
                />
            </div>
            
            <div className={cn("flex items-center gap-2 shrink-0 px-3 py-1.5 rounded-md border shadow-sm transition-colors", fireMode ? "bg-red-50 border-red-200" : "bg-white border-gray-200")} title="Fire Mode: Show High & Medium Urgency">
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
                onClick={() => setPlatformFilter('all')}
                label="All" 
                icon={<LayoutGrid className="h-3.5 w-3.5" />}
              />
              <FilterButton 
                active={platformFilter === 'instagram'} 
                onClick={() => setPlatformFilter('instagram')}
                label="Instagram"
                icon={<FaInstagram className="h-3.5 w-3.5" />}
                activeColorClass="bg-pink-600"
                hoverColorClass="hover:text-pink-600 hover:border-pink-200 hover:bg-pink-50"
                count={platformCounts.instagram}
              />
              <FilterButton 
                active={platformFilter === 'tiktok'} 
                onClick={() => setPlatformFilter('tiktok')}
                label="TikTok"
                icon={<FaTiktok className="h-3.5 w-3.5" />}
                activeColorClass="bg-black"
                hoverColorClass="hover:text-black hover:border-gray-300 hover:bg-gray-100"
                count={platformCounts.tiktok}
              />
              <FilterButton 
                active={platformFilter === 'facebook'} 
                onClick={() => setPlatformFilter('facebook')}
                label="Facebook"
                icon={<FaFacebook className="h-3.5 w-3.5" />}
                activeColorClass="bg-blue-600"
                hoverColorClass="hover:text-blue-600 hover:border-blue-200 hover:bg-blue-50"
                count={platformCounts.facebook}
              />
              <FilterButton 
                active={platformFilter === 'linkedin'} 
                onClick={() => setPlatformFilter('linkedin')}
                label="LinkedIn"
                icon={<FaLinkedin className="h-3.5 w-3.5" />}
                activeColorClass="bg-[#0077b5]"
                hoverColorClass="hover:text-[#0077b5] hover:border-[#0077b5]/30 hover:bg-[#0077b5]/10"
                count={platformCounts.linkedin}
              />
               <FilterButton 
                active={platformFilter === 'youtube'} 
                onClick={() => setPlatformFilter('youtube')}
                label="YouTube"
                icon={<FaYoutube className="h-3.5 w-3.5" />}
                activeColorClass="bg-red-600"
                hoverColorClass="hover:text-red-600 hover:border-red-200 hover:bg-red-50"
                count={platformCounts.youtube}
              />
              <FilterButton 
                active={platformFilter === 'google-business'} 
                onClick={() => setPlatformFilter('google-business')}
                label="Google Business"
                icon={<GoogleBusinessIcon className="h-3.5 w-3.5" />}
                activeColorClass="bg-blue-500"
                hoverColorClass="hover:text-blue-500 hover:border-blue-200 hover:bg-blue-50"
                count={platformCounts['google-business']}
              />
              <FilterButton 
                active={platformFilter === 'whatsapp'} 
                onClick={() => setPlatformFilter('whatsapp')}
                label="WhatsApp"
                icon={<FaWhatsapp className="h-3.5 w-3.5" />}
                activeColorClass="bg-green-500"
                hoverColorClass="hover:text-green-500 hover:border-green-200 hover:bg-green-50"
                count={platformCounts.whatsapp}
              />
           </div>

           {/* Row 3: Intent Filter & Type Filter */}
           <div className="flex gap-2">
             <Select value={intentFilter} onValueChange={(val: any) => setIntentFilter(val)}>
                  <SelectTrigger className="flex-1 bg-white border-gray-200 h-8 text-xs">
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
                  <SelectTrigger className="w-[130px] bg-white border-gray-200 h-8 text-xs">
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
             <div className="flex items-center justify-between px-1 py-1.5 bg-amber-50 rounded-md border border-amber-100">
               <div className="flex items-center gap-2">
                 <Archive className="h-3.5 w-3.5 text-amber-600" />
                 <span className="text-xs text-amber-700">
                   {inactiveProviders.length} redes desactivadas
                 </span>
               </div>
               <div className="flex items-center gap-2">
                 <Switch
                   id="show-inactive"
                   checked={showInactiveNetworks}
                   onCheckedChange={setShowInactiveNetworks}
                   className="h-4 w-7 data-[state=checked]:bg-amber-500"
                 />
                 <Label htmlFor="show-inactive" className="text-xs text-amber-600 cursor-pointer">
                   Mostrar
                 </Label>
               </div>
             </div>
           )}
        </div>

        {/* Conversations List */}
        <ScrollArea className="flex-1 bg-gray-200/70">
          <div className="flex flex-col p-2 gap-2 w-full max-w-full min-w-0 overflow-hidden">
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
                filteredConversations.map((conv) => (
                  <ConversationCard 
                    key={conv.id} 
                    conversation={conv} 
                    isSelected={activeConversation?.id === conv.id} 
                    onClick={() => setActiveConversation(conv)} 
                  />
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
            <header className="h-auto min-h-[64px] md:min-h-[80px] border-b px-4 md:px-6 py-3 md:py-4 flex flex-col justify-center shrink-0 bg-white z-20 shadow-[0_1px_3px_rgba(0,0,0,0.02)]">
               <div className="flex items-center justify-between gap-3">
                 <div className="flex items-center gap-3 overflow-hidden flex-1">
                    {isMobile && (
                        <Button variant="ghost" size="icon" className="-ml-2 mr-0 h-8 w-8 shrink-0" onClick={() => setActiveConversation(null)}>
                            <ArrowLeft className="h-5 w-5" />
                        </Button>
                    )}
                    <Avatar className="h-10 w-10 ring-2 ring-offset-2 ring-gray-50 shrink-0">
                        <AvatarImage src={activeConversation.customerAvatar || undefined} alt={activeConversation.customerName || 'User'} />
                        <AvatarFallback className="bg-gray-100 font-bold text-gray-600">{(activeConversation.customerName || 'U').substring(0,2).toUpperCase()}</AvatarFallback>
                    </Avatar>
                    
                    <div className="min-w-0 flex-1">
                        {/* Row 1: Name */}
                        <h2 className="font-bold text-gray-900 truncate text-sm md:text-base leading-tight">
                            {activeConversation.customerName || 'Unknown User'}
                        </h2>
                        
                        {/* Row 2: Info */}
                        <div className="flex items-center gap-1.5 mt-0.5 md:mt-1.5">
                             {/* Platform Badge - Unified location */}
                             <PlatformBadge platform={(activeConversation.platform || 'instagram') as Platform} size="sm" />
                             
                             <span className="text-gray-300 text-[10px] hidden md:inline">|</span>

                             {/* Desktop Metadata */}
                             <div className="hidden md:flex items-center gap-2">
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
                    <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button 
                            variant="ghost" 
                            size="icon" 
                            className={cn("text-gray-400 hover:text-gray-600", isCRMOpen && "bg-gray-100 text-gray-600")}
                            title="More options"
                        >
                            <MoreVertical className="h-5 w-5" />
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => setIsCRMOpen(!isCRMOpen)}>
                            {isCRMOpen ? "Hide CRM Panel" : "Show CRM Panel"}
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem>Mute Conversation</DropdownMenuItem>
                        <DropdownMenuItem>Mark as Unread</DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem className="text-red-600">Block Contact</DropdownMenuItem>
                    </DropdownMenuContent>
                 </DropdownMenu>
                 </div>
               </div>
            </header>

            {/* Chat Content */}
            <div className={cn("flex-1 relative flex flex-col overflow-hidden", getPlatformStyles((activeConversation.platform || 'instagram') as Platform).container)}>
                <ScrollArea className="flex-1 p-4 md:p-8">
                   <div className="max-w-3xl mx-auto space-y-8 pb-32">
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
                        <div className="flex items-center justify-center gap-2 mb-4">
                          <div className="h-px flex-1 bg-gray-200" />
                          <span className="text-[10px] font-medium text-gray-500 bg-white px-3 py-1 rounded-full border border-gray-200 flex items-center gap-1.5">
                            <MessageCircle className="h-3 w-3" />
                            Thread · {threadMessages.length} messages
                          </span>
                          <div className="h-px flex-1 bg-gray-200" />
                        </div>
                      )}

                      {/* Date Separator */}
                      {threadMessages.length > 0 && (
                        <div className="flex justify-center">
                            <span className="text-[10px] font-medium text-gray-400 bg-gray-100 px-3 py-1 rounded-full">
                                {new Date(threadMessages[0].timestamp).toLocaleDateString()}
                            </span>
                        </div>
                      )}

                      {/* Render all messages in the thread */}
                      {threadMessages.map((msg, index) => {
                        const isReply = !!msg.parentMessageId;
                        const isInbound = msg.direction === 'inbound';
                        const isOutbound = msg.direction === 'outbound';
                        
                        // Check if message was sent from Repliyo using internalOrigin (primary) or source (fallback)
                        // This detects both manual sends ('manual') and AI auto-replies ('ai')
                        const isSentFromRepliyo = isRepliyoMessage(msg.source, msg.internalOrigin);
                        const isSentByAI = isAutoReply(msg.source, msg.internalOrigin);
                        
                        // Use direction field from database - this is the authoritative source for owner detection
                        // direction='outbound' means message is from the brand owner, direction='inbound' means from a customer
                        const isOwner = isOutbound;
                    
                    return (
                      <div 
                        key={msg.id} 
                        className={cn(
                          "flex gap-4 group transition-all",
                          isReply && "ml-8",
                          isOwner && "ml-12"
                        )}
                      >
                         <Avatar className={cn(
                           "mt-1 opacity-80 group-hover:opacity-100 transition-opacity",
                           isReply ? "h-6 w-6" : "h-8 w-8"
                         )}>
                            {/* Show Repliyo logo for messages sent from this app, otherwise show author avatar */}
                            <AvatarImage 
                              src={isSentFromRepliyo ? repliyoLogo : (msg.authorAvatar || undefined)} 
                              alt={isSentFromRepliyo ? "Repliyo" : msg.author} 
                            />
                            <AvatarFallback className={cn(
                              isOwner ? "bg-blue-600 text-white" : "bg-gray-200 text-gray-600",
                              isReply ? "text-[10px]" : "text-xs font-medium"
                            )}>
                              {msg.author.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) || <User className={isReply ? "h-3 w-3" : "h-4 w-4"} />}
                            </AvatarFallback>
                         </Avatar>
                         <div className="flex flex-col gap-1 max-w-[85%]">
                            <div className="flex items-baseline gap-2 mb-1 flex-wrap">
                                <span className={cn("font-medium text-gray-900", isReply ? "text-xs" : "text-sm")}>{msg.author}</span>
                                <span className="text-[10px] text-muted-foreground">{new Date(msg.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                               {isReply && (
                                 <span className="text-[9px] font-medium text-indigo-500 bg-indigo-50 px-1.5 py-0.5 rounded">
                                   Reply
                                 </span>
                               )}
                               <span className={cn(
                                   "text-[9px] font-bold uppercase tracking-wide ml-1",
                                   getPlatformStyles((msg.platform || 'instagram') as Platform).commentBadge
                               )}>
                                   {msg.type === 'comment' && 'Public Comment'}
                                   {msg.type === 'review' && 'Public Review'}
                                   {msg.type === 'dm' && 'Direct Message'}
                               </span>
                               {/* Sentiment indicator for inbound messages */}
                               {msg.direction === 'inbound' && !isOwner && (
                                 <SentimentIndicator sentiment={(msg.sentiment || 'neutral') as Sentiment} />
                               )}
                            </div>
                            <div className={cn(
                                "p-4 rounded-2xl text-sm leading-relaxed shadow-sm relative rounded-tl-none",
                                isSentFromRepliyo 
                                  ? "bg-gray-800 text-white" 
                                  : isOwner 
                                    ? "bg-gray-600 text-white"
                                    : isReply 
                                      ? getPlatformStyles((msg.platform || 'instagram') as Platform).replyBubble
                                      : getPlatformStyles((msg.platform || 'instagram') as Platform).bubble
                            )}>
                               {/* Audio message display */}
                               {(msg as any).mediaType === 'audio' && (msg as any).mediaUrl && (
                                 <div className="mb-2">
                                   <AudioPlayer 
                                     src={(msg as any).mediaUrl}
                                     transcription={(msg as any).mediaTranscription}
                                     isOutbound={isSentFromRepliyo || isOwner}
                                   />
                                 </div>
                               )}
                               
                               {/* Image message display */}
                               {(msg as any).mediaType === 'image' && (msg as any).mediaUrl && (
                                 <div className="mb-2">
                                   <img 
                                     src={(msg as any).mediaUrl} 
                                     alt="Imagen adjunta"
                                     className="max-w-full rounded-lg border border-gray-200"
                                     loading="lazy"
                                   />
                                 </div>
                               )}
                               
                               {/* Video message display */}
                               {(msg as any).mediaType === 'video' && (msg as any).mediaUrl && (
                                 <div className="mb-2">
                                   <div className="flex items-center gap-2 mb-2">
                                     <div className="h-8 w-8 rounded-full bg-purple-100 flex items-center justify-center">
                                       <Video className="h-4 w-4 text-purple-600" />
                                     </div>
                                     <span className="text-xs font-medium text-purple-600">Video adjunto</span>
                                   </div>
                                   <video 
                                     controls 
                                     className="w-full rounded-lg"
                                     src={(msg as any).mediaUrl}
                                   >
                                     Tu navegador no soporta video
                                   </video>
                                 </div>
                               )}
                               
                               {/* Regular text content (show if not just a placeholder for media) */}
                               {msg.content && !['[Mensaje de audio]', '[Imagen]', '[Video]', '[Archivo adjunto]'].includes(msg.content) && (
                                 <span>{msg.content}</span>
                               )}
                               
                               {/* "Sent from Repliyo" indicator for messages sent from this app */}
                               {isSentFromRepliyo && (
                                 <div className={cn(
                                   "mt-2 pt-2 border-t border-gray-700/50 flex items-center gap-1.5 text-[10px] font-medium",
                                   isSentByAI ? "text-purple-300" : "text-indigo-300"
                                 )}>
                                   {isSentByAI ? (
                                     <Bot className="h-3 w-3" />
                                   ) : (
                                     <Send className="h-2.5 w-2.5" />
                                   )}
                                   <span>{isSentByAI ? "Respondido con IA" : "Enviado desde Repliyo"}</span>
                                 </div>
                               )}
                               
                            </div>
                            
                            {/* Reply and Generate Draft buttons - visible for inbound messages that aren't from brand owner */}
                            {!isOwner && msg.direction === 'inbound' && (
                              <div className="flex items-center gap-3 mt-1 ml-1">
                                <button
                                  onClick={() => handleStartReply(msg)}
                                  data-testid={`button-reply-${msg.id}`}
                                  title="Reply to this message"
                                  className="flex items-center gap-1 text-gray-400 hover:text-indigo-600 transition-colors"
                                >
                                  <svg 
                                    className="h-4 w-4" 
                                    viewBox="0 0 24 24" 
                                    fill="none" 
                                    stroke="currentColor" 
                                    strokeWidth="2" 
                                    strokeLinecap="round" 
                                    strokeLinejoin="round"
                                  >
                                    <path d="M3 10h10a5 5 0 0 1 5 5v6" />
                                    <path d="M7 6l-4 4 4 4" />
                                  </svg>
                                  <span className="text-[10px] font-medium">Reply</span>
                                </button>
                                
                                {/* Generate Draft button - show if no draft exists and not already generating */}
                                {!msg.aiSuggestedReply && msg.aiReplyStatus !== 'drafted' && msg.aiReplyStatus !== 'drafting' && !generatingDraftIds.has(msg.id) && (
                                  <button
                                    onClick={() => handleGenerateDraft(msg.id)}
                                    disabled={generatingDraftIds.has(msg.id)}
                                    data-testid={`button-generate-draft-${msg.id}`}
                                    title="Generar borrador IA"
                                    className="flex items-center gap-1 transition-colors text-gray-400 hover:text-purple-600"
                                  >
                                    <Sparkles className="h-3.5 w-3.5" />
                                    <span className="text-[10px] font-medium">Generar Borrador</span>
                                  </button>
                                )}
                              </div>
                            )}
                            
                            {/* Inline Draft Card - Rendered directly below each message */}
                            {(() => {
                              const draftContent = msg.aiSuggestedReply || '';
                              const isGeneratingDraft = generatingDraftIds.has(msg.id);
                              const hasError = msg.aiReplyStatus === 'draft_error';
                              const hasDraft = msg.aiSuggestedReply || isGeneratingDraft || hasError;
                              const isEditingThis = editingDraftId === msg.id;
                              const charLimit = getCharacterLimit((msg.platform || 'instagram') as Platform, (msg.type || 'comment') as MessageType);
                              const isOverLimit = draftContent.length > charLimit;
                              const wasEdited = (msg as any).draftWasEdited;

                              if (!hasDraft || isOwner || msg.direction !== 'inbound') return null;

                              return (
                                <motion.div 
                                  initial={{ opacity: 0, y: 10 }}
                                  animate={{ opacity: 1, y: 0 }}
                                  exit={{ opacity: 0, y: -10 }}
                                  className="mt-3"
                                >
                                  {/* Generating State */}
                                  {isGeneratingDraft && !draftContent && (
                                    <div className="rounded-2xl bg-white border border-indigo-100 p-4 shadow-sm flex items-center gap-3 animate-pulse">
                                      <div className="h-7 w-7 rounded-full bg-indigo-50 flex items-center justify-center">
                                        <Brain className="h-3.5 w-3.5 text-indigo-400" />
                                      </div>
                                      <div className="space-y-1.5 flex-1">
                                        <div className="h-2.5 bg-indigo-50 rounded w-1/4"></div>
                                        <div className="h-2 bg-gray-50 rounded w-1/2"></div>
                                      </div>
                                    </div>
                                  )}

                                  {/* Error State */}
                                  {hasError && !draftContent && (
                                    <div className="rounded-2xl bg-white border border-red-200 p-3 shadow-sm">
                                      <div className="flex items-center gap-2">
                                        <div className="h-6 w-6 rounded-full bg-red-50 flex items-center justify-center">
                                          <AlertCircle className="h-3 w-3 text-red-500" />
                                        </div>
                                        <div className="flex-1">
                                          <p className="text-xs font-medium text-red-700">Error al generar</p>
                                        </div>
                                        <Button
                                          variant="outline"
                                          size="sm"
                                          className="h-6 text-[10px] text-red-600 border-red-200 hover:bg-red-50"
                                          onClick={() => handleGenerateDraft(msg.id)}
                                        >
                                          <RotateCw className="h-2.5 w-2.5 mr-1" />
                                          Reintentar
                                        </Button>
                                      </div>
                                    </div>
                                  )}

                                  {/* Draft Card with Content */}
                                  {draftContent && (
                                    <div className={cn(
                                      "rounded-xl bg-gradient-to-r from-indigo-50 to-slate-50 border-l-4 border-l-indigo-400 border border-indigo-200 shadow-sm transition-all overflow-hidden",
                                      isOverLimit ? "border-red-300 border-l-red-500 ring-1 ring-red-100" : ""
                                    )}>
                                      {/* Header */}
                                      <div className="px-3 py-2 flex items-center justify-between border-b border-gray-50 bg-gray-50/30">
                                        <div className="flex items-center gap-1.5">
                                          <div className="h-4 w-4 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
                                            <Brain className="h-2 w-2 text-white" />
                                          </div>
                                          <span className="text-[10px] font-bold text-gray-700">Borrador IA</span>
                                          {wasEdited && (
                                            <Badge variant="outline" className="h-3.5 text-[8px] px-1 text-amber-600 border-amber-200 bg-amber-50">
                                              Editado
                                            </Badge>
                                          )}
                                        </div>
                                        <div className={cn(
                                          "text-[9px] font-medium px-1 py-0.5 rounded-full border",
                                          isOverLimit ? "bg-red-50 text-red-600 border-red-200" : "bg-gray-50 text-gray-500 border-gray-200"
                                        )}>
                                          {draftContent.length}/{charLimit}
                                        </div>
                                      </div>

                                      {/* Content */}
                                      <div className="p-3">
                                        {isEditingThis ? (
                                          <textarea
                                            className="w-full bg-gray-50 border border-gray-200 rounded-lg p-2 text-xs text-gray-800 resize-none focus:outline-none focus:ring-2 focus:ring-indigo-200 min-h-[60px] leading-relaxed"
                                            value={editingDraftText}
                                            onChange={(e) => setEditingDraftText(e.target.value)}
                                            autoFocus
                                            data-testid={`textarea-edit-draft-${msg.id}`}
                                          />
                                        ) : (
                                          <div className="text-xs text-gray-800 leading-relaxed whitespace-pre-wrap">
                                            {draftContent}
                                          </div>
                                        )}
                                      </div>

                                      {/* Regenerate Confirmation */}
                                      {showRegenerateConfirm === msg.id && (
                                        <div className="px-3 py-2 bg-amber-50 border-t border-amber-200">
                                          <p className="text-[10px] text-amber-700 mb-1.5">
                                            ¿Regenerar y perder los cambios?
                                          </p>
                                          <div className="flex gap-1.5">
                                            <Button variant="outline" size="sm" className="h-5 text-[9px] px-2" onClick={() => setShowRegenerateConfirm(null)}>
                                              Cancelar
                                            </Button>
                                            <Button variant="destructive" size="sm" className="h-5 text-[9px] px-2" onClick={() => handleRegenerateDraft(msg.id, true)}>
                                              Sí, regenerar
                                            </Button>
                                          </div>
                                        </div>
                                      )}

                                      {/* Actions Footer */}
                                      <div className="px-2 py-2 bg-gray-50 flex items-center justify-between gap-1 border-t border-gray-100">
                                        <div className="flex items-center gap-0.5">
                                          <Button
                                            variant="ghost"
                                            size="sm"
                                            className="h-6 w-6 p-0 text-gray-400 hover:text-red-600 hover:bg-red-50"
                                            title="Descartar"
                                            onClick={() => handleDiscardDraft(msg.id)}
                                            data-testid={`button-discard-draft-${msg.id}`}
                                          >
                                            <Trash2 className="h-3 w-3" />
                                          </Button>
                                          <Button
                                            variant="ghost"
                                            size="sm"
                                            className="h-6 w-6 p-0 text-gray-400 hover:text-purple-600 hover:bg-purple-50"
                                            title="Regenerar"
                                            onClick={() => handleRegenerateDraft(msg.id)}
                                            disabled={isGeneratingDraft}
                                            data-testid={`button-regenerate-draft-${msg.id}`}
                                          >
                                            {isGeneratingDraft ? (
                                              <Loader2 className="h-3 w-3 animate-spin" />
                                            ) : (
                                              <RotateCw className="h-3 w-3" />
                                            )}
                                          </Button>
                                        </div>

                                        <div className="flex items-center gap-1">
                                          {isEditingThis ? (
                                            <>
                                              <Button variant="ghost" size="sm" className="h-6 text-[10px] text-gray-500 px-2" onClick={cancelEditingDraft}>
                                                Cancelar
                                              </Button>
                                              <Button
                                                variant="outline"
                                                size="sm"
                                                className="h-6 text-[10px] text-indigo-600 border-indigo-200 px-2"
                                                onClick={() => handleSaveDraftEdit(msg.id)}
                                                data-testid={`button-save-draft-${msg.id}`}
                                              >
                                                <Check className="h-2.5 w-2.5 mr-0.5" />
                                                Guardar
                                              </Button>
                                            </>
                                          ) : (
                                            <Button
                                              variant="ghost"
                                              size="sm"
                                              className="h-6 text-[10px] text-gray-600 hover:bg-white hover:shadow-sm px-2"
                                              onClick={() => startEditingDraft(msg.id, draftContent)}
                                              data-testid={`button-edit-draft-${msg.id}`}
                                            >
                                              <Pencil className="h-2.5 w-2.5 mr-0.5" />
                                              Editar
                                            </Button>
                                          )}

                                          {!isEditingThis && (
                                            <Button
                                              size="sm"
                                              className={cn(
                                                "h-6 text-[10px] font-medium px-2 shadow-sm transition-all",
                                                isOverLimit
                                                  ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                                                  : "bg-indigo-600 hover:bg-indigo-700 text-white"
                                              )}
                                              onClick={() => handleSendDraft(msg.id, draftContent)}
                                              disabled={isOverLimit}
                                              data-testid={`button-send-draft-${msg.id}`}
                                            >
                                              <Send className="h-2.5 w-2.5 mr-0.5" />
                                              Enviar
                                            </Button>
                                          )}
                                        </div>
                                      </div>
                                    </div>
                                  )}
                                </motion.div>
                              );
                            })()}
                         </div>
                      </div>
                    );
                  })}

                  {/* Spacer to prevent content from being hidden behind the floating card */}
                  <div className="h-16"></div>
                    </>
                  )}
               </div>
            </ScrollArea>

            {/* Floating Reply Input Box */}
            <AnimatePresence>
              {replyToMessage && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 20 }}
                  className="absolute bottom-0 left-0 right-0 bg-white border-t border-gray-200 shadow-lg p-4"
                >
                  {/* Quoted Message Preview */}
                  <div className="mb-3 flex items-start gap-2">
                    <div className="flex-1 bg-gray-50 rounded-lg p-3 border-l-4 border-indigo-500">
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
          contact={selectedMessage?.crmData as CRMContact | undefined}
          isOpen={isCRMOpen}
          onClose={() => setIsCRMOpen(false)}
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
                        <AvatarImage src={message.authorAvatar || undefined} alt={message.author} />
                        <AvatarFallback className="text-xs font-bold text-gray-600 bg-gray-100">
                            {message.author.substring(0,2).toUpperCase()}
                        </AvatarFallback>
                    </Avatar>
                    <div className="absolute -bottom-1 -right-1 bg-white rounded-full p-0.5 shadow-sm">
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
        "relative flex items-center justify-center h-10 w-10 rounded-full text-xs font-medium transition-all border shrink-0 touch-manipulation",
        active 
          ? cn("text-white border-transparent shadow-sm", activeColorClass || "bg-gray-900") 
          : cn("bg-white text-gray-500 border-gray-200", hoverColorClass || "hover:border-gray-300 hover:bg-gray-50 hover:text-gray-900")
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
