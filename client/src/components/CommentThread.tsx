import React from 'react';
import { cn } from '@/lib/utils';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  User, 
  Send, 
  Sparkles, 
  Bot, 
  Brain, 
  Trash2, 
  Pencil, 
  RotateCw, 
  AlertCircle, 
  Check, 
  Loader2,
  Video,
  Bell
} from 'lucide-react';
import { Platform, MessageType, Sentiment } from '@/lib/types';
import { isRepliyoMessage, isAutoReply, isReminderMessage } from '@/lib/mockData';
import type { Message } from '@shared/schema';
import { motion } from "framer-motion";
import { getCharacterLimit } from '@/utils/platformLimits';
import repliyoLogo from '@/assets/repliyo-logo.jpg';

interface MessageNode {
  message: Message;
  children: MessageNode[];
  isOrphan?: boolean;
}

interface ReminderStats {
  threadReminderCounts: Map<string, number>;
  authorReminderCounts: Map<string, number>;
}

function computeReminderStats(messages: Message[]): ReminderStats {
  const threadReminderCounts = new Map<string, number>();
  const authorReminderCounts = new Map<string, number>();
  
  const reminderMessages = messages.filter(m => 
    m.direction === 'outbound' && 
    (m.internalOrigin === 'reminder' || m.source === 'reminder_service')
  );
  
  reminderMessages.forEach(reminder => {
    if (reminder.parentMessageId) {
      const parentMsg = messages.find(m => m.id === reminder.parentMessageId);
      if (parentMsg) {
        let rootId = parentMsg.id;
        let current = parentMsg;
        while (current.parentMessageId) {
          const parent = messages.find(m => m.id === current.parentMessageId);
          if (parent) {
            rootId = parent.id;
            current = parent;
          } else {
            break;
          }
        }
        threadReminderCounts.set(rootId, (threadReminderCounts.get(rootId) || 0) + 1);
        
        if (parentMsg.author) {
          const authorKey = parentMsg.author.toLowerCase();
          authorReminderCounts.set(authorKey, (authorReminderCounts.get(authorKey) || 0) + 1);
        }
      }
    }
  });
  
  return { threadReminderCounts, authorReminderCounts };
}

import type { DraftStatus } from '@/hooks/useBulkDraftQueue';

interface CommentThreadProps {
  messages: Message[];
  platformStyles: {
    userBubble: string;
    ownerBubble: string;
    aiBubble: string;
    manualBubble: string;
    draftCard: { bg: string; border: string; accent: string; iconBg: string };
    badge: string;
    commentBadge: string;
  };
  onStartReply: (message: Message) => void;
  onGenerateDraft: (messageId: string) => void;
  generatingDraftIds: Set<string>;
  editingDraftId: string | null;
  editingDraftText: string;
  setEditingDraftText: (text: string) => void;
  startEditingDraft: (messageId: string, content: string) => void;
  cancelEditingDraft: () => void;
  handleSaveDraftEdit: (messageId: string) => void;
  handleDiscardDraft: (messageId: string) => void;
  handleRegenerateDraft: (messageId: string, force?: boolean) => void;
  handleSendDraft: (messageId: string, content: string) => void;
  showRegenerateConfirm: string | null;
  setShowRegenerateConfirm: (id: string | null) => void;
  highlightedMessageId?: string | null;
  AudioPlayer: React.ComponentType<{ src: string; transcription?: string; isOutbound?: boolean }>;
  SentimentIndicator: React.ComponentType<{ sentiment: Sentiment }>;
  selectionEnabled?: boolean;
  selectedMessageIds?: Set<string>;
  onToggleSelection?: (messageId: string) => void;
  bulkQueueStatusById?: Map<string, DraftStatus>;
  unreadMessageIds?: Set<string>;
  onUnreadSeen?: (messageId: string) => void;
}

const MAX_DEPTH = 4;

const AVATAR_SIZE_ROOT = 32;
const AVATAR_SIZE_REPLY = 24;

function buildMessageTree(messages: Message[]): MessageNode[] {
  const messageMap = new Map<string, MessageNode>();
  const rootNodes: MessageNode[] = [];

  messages.forEach(msg => {
    messageMap.set(msg.id, { message: msg, children: [], isOrphan: false });
  });

  messages.forEach(msg => {
    const node = messageMap.get(msg.id)!;
    if (msg.parentMessageId) {
      if (messageMap.has(msg.parentMessageId)) {
        const parentNode = messageMap.get(msg.parentMessageId)!;
        parentNode.children.push(node);
      } else {
        node.isOrphan = true;
        console.warn(`[CommentThread] Orphan message detected: ${msg.id} has parentMessageId ${msg.parentMessageId} but parent not found in current dataset`);
        rootNodes.push(node);
      }
    } else {
      rootNodes.push(node);
    }
  });

  const sortChildren = (nodes: MessageNode[]) => {
    nodes.sort((a, b) => new Date(a.message.timestamp).getTime() - new Date(b.message.timestamp).getTime());
    nodes.forEach(node => sortChildren(node.children));
  };

  rootNodes.sort((a, b) => new Date(b.message.timestamp).getTime() - new Date(a.message.timestamp).getTime());
  rootNodes.forEach(node => sortChildren(node.children));

  return rootNodes;
}

interface SingleMessageProps {
  msg: Message;
  isReply: boolean;
  isOrphan?: boolean;
  isHighlighted?: boolean;
  isUnread?: boolean;
  onUnreadSeen?: (messageId: string) => void;
  platformStyles: CommentThreadProps['platformStyles'];
  onStartReply: CommentThreadProps['onStartReply'];
  onGenerateDraft: CommentThreadProps['onGenerateDraft'];
  generatingDraftIds: Set<string>;
  editingDraftId: string | null;
  editingDraftText: string;
  setEditingDraftText: (text: string) => void;
  startEditingDraft: (messageId: string, content: string) => void;
  cancelEditingDraft: () => void;
  handleSaveDraftEdit: (messageId: string) => void;
  handleDiscardDraft: (messageId: string) => void;
  handleRegenerateDraft: (messageId: string, force?: boolean) => void;
  handleSendDraft: (messageId: string, content: string) => void;
  showRegenerateConfirm: string | null;
  setShowRegenerateConfirm: (id: string | null) => void;
  AudioPlayer: CommentThreadProps['AudioPlayer'];
  SentimentIndicator: CommentThreadProps['SentimentIndicator'];
  selectionEnabled?: boolean;
  isSelected?: boolean;
  onToggleSelection?: (messageId: string) => void;
  bulkStatus?: DraftStatus;
  hasChildren?: boolean;
  childrenCount?: number;
  isExpanded?: boolean;
  onToggleExpand?: (messageId: string) => void;
  canNest?: boolean;
  threadReminderCount?: number;
  authorReminderCount?: number;
}

function SingleMessage({
  msg,
  isReply,
  isOrphan = false,
  isHighlighted = false,
  isUnread = false,
  onUnreadSeen,
  platformStyles,
  onStartReply,
  onGenerateDraft,
  generatingDraftIds,
  editingDraftId,
  editingDraftText,
  setEditingDraftText,
  startEditingDraft,
  cancelEditingDraft,
  handleSaveDraftEdit,
  handleDiscardDraft,
  handleRegenerateDraft,
  handleSendDraft,
  showRegenerateConfirm,
  setShowRegenerateConfirm,
  AudioPlayer,
  SentimentIndicator,
  selectionEnabled = false,
  isSelected = false,
  onToggleSelection,
  bulkStatus,
  hasChildren = false,
  childrenCount = 0,
  isExpanded = false,
  onToggleExpand,
  canNest = true,
  threadReminderCount = 0,
  authorReminderCount = 0,
}: SingleMessageProps) {
  const isOutbound = msg.direction === 'outbound';
  const isOwner = isOutbound;
  const isSentFromRepliyo = isRepliyoMessage(msg.source, msg.internalOrigin);
  const isSentByAI = isAutoReply(msg.source, msg.internalOrigin);
  const isSentByReminder = isReminderMessage(msg.source, msg.internalOrigin);

  const avatarSize = isReply ? AVATAR_SIZE_REPLY : AVATAR_SIZE_ROOT;

  // Can this message be selected for bulk draft generation?
  const isSelectable = selectionEnabled && msg.direction === 'inbound' && !msg.aiSuggestedReply && msg.aiReplyStatus !== 'drafted';

  // Auto-scroll to this message when highlighted (from notification deep-link)
  const messageRef = React.useRef<HTMLDivElement>(null);
  React.useLayoutEffect(() => {
    if (isHighlighted && messageRef.current) {
      messageRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [isHighlighted]);
  
  // Auto-hide unread indicator after 6 seconds when visible in viewport
  React.useEffect(() => {
    if (!isUnread || !onUnreadSeen || !messageRef.current) return;
    
    let timeoutId: NodeJS.Timeout | null = null;
    let hasFired = false; // Guard to ensure we only fire once
    
    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0]; // Only one element being observed
        if (!entry) return;
        
        if (entry.isIntersecting && !hasFired) {
          // Message is visible - clear any existing timer first, then start new one
          if (timeoutId) clearTimeout(timeoutId);
          
          timeoutId = setTimeout(() => {
            if (!hasFired) {
              hasFired = true;
              onUnreadSeen(msg.id);
            }
          }, 6000);
        } else if (!entry.isIntersecting) {
          // Message left viewport - cancel timer
          if (timeoutId) {
            clearTimeout(timeoutId);
            timeoutId = null;
          }
        }
      },
      { threshold: 0.5 } // 50% of the message must be visible
    );
    
    observer.observe(messageRef.current);
    
    return () => {
      observer.disconnect();
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [isUnread, onUnreadSeen, msg.id]);

  // IMPORTANT: Do NOT change p-2 -m-2 values - they affect L-shape connector positioning
  // overflow-visible ensures absolutely positioned gutter checkbox is visible outside this element
  return (
    <div 
      ref={messageRef}
      className={cn(
        "group transition-all rounded-lg p-2 -m-2 relative overflow-visible",
        isHighlighted && "bg-gray-200/60",
        isSelected && "bg-indigo-50/50"
      )}
      data-testid={`message-${msg.id}`}
    >
      {/* Unread indicator - blue dot */}
      {isUnread && (
        <div 
          className="absolute -left-1 top-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-indigo-500 animate-pulse"
          data-testid={`unread-indicator-${msg.id}`}
        />
      )}
      {/* Selection Checkbox - Positioned in the pl-8 gutter created when selection is enabled */}
      {/* The parent container adds pl-8 (32px) when selectionEnabled, checkbox sits at left:-28px */}
      {selectionEnabled && (
        <div 
          className={cn(
            "absolute flex items-center justify-center pointer-events-auto",
            "left-[-28px]",
            isReply ? "top-[4px]" : "top-[2px]"
          )}
          style={{
            width: '24px',
            height: isReply ? '24px' : '32px',
          }}
        >
          {isSelectable ? (
            bulkStatus === 'running' || bulkStatus === 'queued' ? (
              <Loader2 className="h-4 w-4 animate-spin text-indigo-500" />
            ) : bulkStatus === 'success' ? (
              <Check className="h-4 w-4 text-green-500" />
            ) : bulkStatus === 'error' ? (
              <AlertCircle className="h-4 w-4 text-red-500" />
            ) : (
              <input
                type="checkbox"
                checked={isSelected}
                onChange={() => onToggleSelection?.(msg.id)}
                className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                data-testid={`checkbox-select-${msg.id}`}
              />
            )
          ) : (
            <div className="h-4 w-4" />
          )}
        </div>
      )}

      {/* Message Content - Always uses flex layout, width unchanged */}
      <div className="flex gap-3 flex-1">
      <Avatar className={cn(
        "mt-1 flex-shrink-0 relative z-10 ring-[3px] ring-white",
        isReply ? "h-6 w-6" : "h-8 w-8"
      )}>
        <AvatarImage 
          src={isSentFromRepliyo ? repliyoLogo : (msg.authorAvatar || undefined)} 
          alt={isSentFromRepliyo ? "Repliyo" : msg.author}
          className="bg-white"
        />
        <AvatarFallback className={cn(
          "bg-[#E5E7EB]",
          isOwner ? "text-gray-700" : "text-gray-600",
          isReply ? "text-[10px]" : "text-xs font-medium"
        )}>
          {msg.author?.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) || <User className={isReply ? "h-3 w-3" : "h-4 w-4"} />}
        </AvatarFallback>
      </Avatar>
      
      <div className="flex flex-col gap-1 min-w-0 flex-1">
        <div className="flex items-baseline gap-2 mb-1 flex-wrap">
          <span className={cn("font-medium text-gray-900", isReply ? "text-xs" : "text-sm")}>{msg.author}</span>
          <span className="text-[10px] text-muted-foreground">{new Date(msg.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
          {isReply && (
            <span className={cn(
              "text-[9px] font-medium px-1.5 py-0.5 rounded",
              platformStyles.badge
            )}>
              Reply
            </span>
          )}
          <span className={cn(
            "text-[9px] font-bold uppercase tracking-wide ml-1",
            platformStyles.commentBadge
          )}>
            {msg.type === 'comment' && 'Public Comment'}
            {msg.type === 'review' && 'Public Review'}
            {msg.type === 'dm' && 'Direct Message'}
          </span>
          {isOrphan && (
            <span className="text-[9px] font-medium px-1.5 py-0.5 rounded bg-amber-100 text-amber-700 border border-amber-200" title="Parent message not found in current thread">
              Orphan
            </span>
          )}
          {msg.direction === 'inbound' && authorReminderCount > 0 && (
            <span 
              className="flex items-center gap-0.5 text-[9px] font-medium text-gray-500"
              title={`${authorReminderCount} reminder${authorReminderCount > 1 ? 's' : ''} enviado${authorReminderCount > 1 ? 's' : ''} a este usuario`}
              data-testid={`badge-author-reminders-${msg.id}`}
            >
              <Bell className="h-2.5 w-2.5" />
              <span>{authorReminderCount}</span>
            </span>
          )}
          {!isReply && threadReminderCount > 0 && (
            <span 
              className="flex items-center gap-0.5 text-[9px] font-medium text-gray-500"
              title={`${threadReminderCount} reminder${threadReminderCount > 1 ? 's' : ''} en este hilo`}
              data-testid={`badge-thread-reminders-${msg.id}`}
            >
              <Bell className="h-2.5 w-2.5" />
              <span>Hilo: {threadReminderCount}</span>
            </span>
          )}
        </div>
        
        <div className={cn(
          "text-sm leading-relaxed relative break-words",
          (() => {
            if (msg.direction === 'inbound') {
              return "bg-white text-gray-900 px-4 py-2 rounded-2xl rounded-tl-md w-fit max-w-[85%] md:max-w-[70%]";
            }
            if (isSentByAI || isSentFromRepliyo) {
              return "bg-[#0291FA] text-white px-4 py-2 rounded-2xl rounded-tr-md w-fit max-w-[85%] md:max-w-[70%]";
            }
            return platformStyles.ownerBubble;
          })()
        )}>
          {(msg as any).mediaType === 'audio' && (msg as any).mediaUrl && (
            <div className="mb-2">
              <AudioPlayer 
                src={(msg as any).mediaUrl}
                transcription={(msg as any).mediaTranscription}
                isOutbound={isSentFromRepliyo || isOwner}
              />
            </div>
          )}
          
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
          
          {msg.content && !['[Mensaje de audio]', '[Imagen]', '[Video]', '[Archivo adjunto]'].includes(msg.content) && (
            <span>{msg.content}</span>
          )}
          
          {isSentFromRepliyo && (
            <div className="mt-2 pt-2 border-t border-white/30 flex items-center justify-between text-[10px] font-medium text-white/80">
              <div className="flex items-center gap-1.5">
                {isSentByReminder ? (
                  <Bell className="h-3 w-3 text-amber-300" />
                ) : isSentByAI ? (
                  <Bot className="h-3 w-3" />
                ) : (
                  <Send className="h-2.5 w-2.5" />
                )}
                <span>{isSentByReminder ? "Reminder automático" : isSentByAI ? "Respondido con IA" : "Enviado desde Repliyo"}</span>
              </div>
              <span className="text-[9px] text-white/60">
                {(msg.content || '').length}/{getCharacterLimit((msg.platform || 'instagram') as Platform, (msg.type || 'comment') as MessageType)}
              </span>
            </div>
          )}
        </div>
        
        {!isOwner && msg.direction === 'inbound' && (
          <div className="flex items-center gap-4 mt-1 pt-1">
            {/* Toggle replies button */}
            {hasChildren && canNest && onToggleExpand && (
              <button
                onClick={() => onToggleExpand(msg.id)}
                className="flex items-center gap-1.5 text-[11px] font-medium text-indigo-600 hover:text-indigo-800 transition-colors"
                data-testid={`toggle-replies-${msg.id}`}
              >
                {isExpanded ? (
                  <>
                    <svg className="h-3 w-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M18 15l-6-6-6 6"/>
                    </svg>
                    <span>Ocultar respuestas</span>
                  </>
                ) : (
                  <>
                    <svg className="h-3 w-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M6 9l6 6 6-6"/>
                    </svg>
                    <span>Ver {childrenCount} respuesta{childrenCount > 1 ? 's' : ''}</span>
                  </>
                )}
              </button>
            )}
            
            {/* Reply button */}
            <button
              onClick={() => onStartReply(msg)}
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
            
            {/* Generate Draft button */}
            {!msg.aiSuggestedReply && msg.aiReplyStatus !== 'drafted' && !generatingDraftIds.has(msg.id) && (
              <button
                onClick={() => onGenerateDraft(msg.id)}
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
        
        {/* Toggle for outbound messages with children (no Reply/Generate buttons for owner's messages) */}
        {isOwner && hasChildren && canNest && onToggleExpand && (
          <div className="flex items-center mt-1 pt-1">
            <button
              onClick={() => onToggleExpand(msg.id)}
              className="flex items-center gap-1.5 text-[11px] font-medium text-indigo-600 hover:text-indigo-800 transition-colors"
              data-testid={`toggle-replies-${msg.id}`}
            >
              {isExpanded ? (
                <>
                  <svg className="h-3 w-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M18 15l-6-6-6 6"/>
                  </svg>
                  <span>Ocultar respuestas</span>
                </>
              ) : (
                <>
                  <svg className="h-3 w-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M6 9l6 6 6-6"/>
                  </svg>
                  <span>Ver {childrenCount} respuesta{childrenCount > 1 ? 's' : ''}</span>
                </>
              )}
            </button>
          </div>
        )}
        
        <DraftCard
          msg={msg}
          isOwner={isOwner}
          platformStyles={platformStyles}
          generatingDraftIds={generatingDraftIds}
          editingDraftId={editingDraftId}
          editingDraftText={editingDraftText}
          setEditingDraftText={setEditingDraftText}
          startEditingDraft={startEditingDraft}
          cancelEditingDraft={cancelEditingDraft}
          handleSaveDraftEdit={handleSaveDraftEdit}
          handleDiscardDraft={handleDiscardDraft}
          handleRegenerateDraft={handleRegenerateDraft}
          handleSendDraft={handleSendDraft}
          showRegenerateConfirm={showRegenerateConfirm}
          setShowRegenerateConfirm={setShowRegenerateConfirm}
          onGenerateDraft={onGenerateDraft}
        />
      </div>
      </div>
    </div>
  );
}

interface DraftCardProps {
  msg: Message;
  isOwner: boolean;
  platformStyles: CommentThreadProps['platformStyles'];
  generatingDraftIds: Set<string>;
  editingDraftId: string | null;
  editingDraftText: string;
  setEditingDraftText: (text: string) => void;
  startEditingDraft: (messageId: string, content: string) => void;
  cancelEditingDraft: () => void;
  handleSaveDraftEdit: (messageId: string) => void;
  handleDiscardDraft: (messageId: string) => void;
  handleRegenerateDraft: (messageId: string, force?: boolean) => void;
  handleSendDraft: (messageId: string, content: string) => void;
  showRegenerateConfirm: string | null;
  setShowRegenerateConfirm: (id: string | null) => void;
  onGenerateDraft: (messageId: string) => void;
}

function DraftCard({
  msg,
  isOwner,
  platformStyles,
  generatingDraftIds,
  editingDraftId,
  editingDraftText,
  setEditingDraftText,
  startEditingDraft,
  cancelEditingDraft,
  handleSaveDraftEdit,
  handleDiscardDraft,
  handleRegenerateDraft,
  handleSendDraft,
  showRegenerateConfirm,
  setShowRegenerateConfirm,
  onGenerateDraft,
}: DraftCardProps) {
  const draftContent = msg.aiSuggestedReply || '';
  const isGeneratingDraft = generatingDraftIds.has(msg.id);
  const hasError = msg.aiReplyStatus === 'draft_error';
  const hasDraft = isGeneratingDraft || msg.aiSuggestedReply || hasError;
  const isEditingThis = editingDraftId === msg.id;
  const charLimit = getCharacterLimit((msg.platform || 'instagram') as Platform, (msg.type || 'comment') as MessageType);
  const isOverLimit = draftContent.length > charLimit;
  const wasEdited = (msg as any).draftWasEdited;

  if (!hasDraft || isOwner || msg.direction !== 'inbound') return null;

  const platformDraftStyles = platformStyles.draftCard;

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="mt-3"
    >
      {isGeneratingDraft && !draftContent && (
        <div className={cn("rounded-lg border border-gray-200 p-3 flex items-center gap-3 animate-pulse bg-white/50", platformDraftStyles.border)}>
          <div className={cn("h-6 w-6 rounded-full bg-gradient-to-br flex items-center justify-center", platformDraftStyles.iconBg)}>
            <Brain className="h-3 w-3 text-white" />
          </div>
          <div className="space-y-1.5 flex-1">
            <div className="h-2.5 bg-gray-200 rounded w-1/4"></div>
            <div className="h-2 bg-gray-100 rounded w-1/2"></div>
          </div>
        </div>
      )}

      {hasError && !draftContent && (
        <div className="rounded-lg border border-red-200 p-3">
          <div className="flex items-center gap-2">
            <div className="h-5 w-5 rounded-full bg-red-50 flex items-center justify-center">
              <AlertCircle className="h-3 w-3 text-red-500" />
            </div>
            <div className="flex-1">
              <p className="text-xs font-medium text-red-700">Error al generar</p>
            </div>
            <Button
              variant="outline"
              size="sm"
              className="h-6 text-[10px] text-red-600 border-red-200 hover:bg-red-50"
              onClick={() => onGenerateDraft(msg.id)}
            >
              <RotateCw className="h-2.5 w-2.5 mr-1" />
              Reintentar
            </Button>
          </div>
        </div>
      )}

      {draftContent && (
        <div className={cn(
          "rounded-lg border border-[#C5D9F5] transition-all overflow-hidden bg-transparent",
          isOverLimit && "border-red-300"
        )}>
          <div className="px-3 py-2 flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <div className="h-4 w-4 rounded-full bg-[#1877F2] flex items-center justify-center">
                <Brain className="h-2 w-2 text-white" />
              </div>
              <span className="text-[10px] font-bold text-[#1877F2]">Borrador IA</span>
              {wasEdited && (
                <Badge variant="outline" className="h-3.5 text-[8px] px-1 text-amber-600 border-amber-200 bg-amber-50">
                  Editado
                </Badge>
              )}
            </div>
            <div className={cn(
              "text-[9px] font-medium",
              isOverLimit ? "text-red-600" : "text-gray-500"
            )}>
              {draftContent.length}/{charLimit}
            </div>
          </div>

          <div className="p-3">
            {isEditingThis ? (
              <textarea
                className="w-full bg-gray-50 border border-gray-200 rounded-lg p-2 text-xs text-gray-800 resize-none focus:outline-none focus:ring-2 focus:ring-gray-300 min-h-[60px] leading-relaxed"
                value={editingDraftText}
                onChange={(e) => setEditingDraftText(e.target.value)}
                autoFocus
                data-testid={`textarea-edit-draft-${msg.id}`}
              />
            ) : (
              <div className="text-xs text-[#4A7CB8] leading-relaxed whitespace-pre-wrap">
                {draftContent}
              </div>
            )}
          </div>

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

          <div className="px-2 py-2 flex items-center justify-between gap-1 border-t border-[#C5D9F5]">
            <div className="flex items-center gap-0.5">
              <Button
                variant="ghost"
                size="sm"
                className="h-6 w-6 p-0 text-[#A8C8E8] hover:text-[#1877F2] hover:bg-transparent"
                title="Descartar"
                onClick={() => handleDiscardDraft(msg.id)}
                data-testid={`button-discard-draft-${msg.id}`}
              >
                <Trash2 className="h-3 w-3" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="h-6 w-6 p-0 text-[#A8C8E8] hover:text-[#1877F2] hover:bg-transparent"
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
                  <Button variant="ghost" size="sm" className="h-6 text-[10px] text-[#A8C8E8] px-2 hover:text-[#1877F2] hover:bg-transparent" onClick={cancelEditingDraft}>
                    Cancelar
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 text-[10px] text-[#1877F2] border border-[#C5D9F5] px-2 hover:bg-blue-50"
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
                  className="h-6 text-[10px] text-[#A8C8E8] hover:text-[#1877F2] hover:bg-transparent px-2"
                  onClick={() => startEditingDraft(msg.id, draftContent)}
                  data-testid={`button-edit-draft-${msg.id}`}
                >
                  <Pencil className="h-2.5 w-2.5 mr-0.5" />
                  Editar
                </Button>
              )}

              {!isEditingThis && (
                <Button
                  variant="ghost"
                  size="sm"
                  className={cn(
                    "h-6 text-[10px] font-medium px-2 transition-all hover:bg-transparent",
                    isOverLimit
                      ? "text-gray-400 cursor-not-allowed"
                      : "text-[#1877F2] hover:text-[#1565D8]"
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
}

interface ThreadNodeProps {
  node: MessageNode;
  depth: number;
  isLastChild: boolean;
  parentMessageHeight?: number; // Height of parent's message bubble for connector calculation
  platformStyles: CommentThreadProps['platformStyles'];
  onStartReply: CommentThreadProps['onStartReply'];
  onGenerateDraft: CommentThreadProps['onGenerateDraft'];
  generatingDraftIds: Set<string>;
  editingDraftId: string | null;
  editingDraftText: string;
  setEditingDraftText: (text: string) => void;
  startEditingDraft: (messageId: string, content: string) => void;
  cancelEditingDraft: () => void;
  handleSaveDraftEdit: (messageId: string) => void;
  handleDiscardDraft: (messageId: string) => void;
  handleRegenerateDraft: (messageId: string, force?: boolean) => void;
  handleSendDraft: (messageId: string, content: string) => void;
  showRegenerateConfirm: string | null;
  setShowRegenerateConfirm: (id: string | null) => void;
  AudioPlayer: CommentThreadProps['AudioPlayer'];
  SentimentIndicator: CommentThreadProps['SentimentIndicator'];
  highlightedMessageId?: string | null;
  selectionEnabled?: boolean;
  selectedMessageIds?: Set<string>;
  onToggleSelection?: (messageId: string) => void;
  bulkQueueStatusById?: Map<string, DraftStatus>;
  unreadMessageIds?: Set<string>;
  onUnreadSeen?: (messageId: string) => void;
  // Collapsible threaded comments props
  expandedIds: Set<string>;
  onToggleExpand: (messageId: string) => void;
  // Reminder stats
  threadReminderCounts: Map<string, number>;
  authorReminderCounts: Map<string, number>;
}

function ThreadNode({
  node,
  depth,
  isLastChild,
  parentMessageHeight = 0,
  platformStyles,
  onStartReply,
  onGenerateDraft,
  generatingDraftIds,
  editingDraftId,
  editingDraftText,
  setEditingDraftText,
  startEditingDraft,
  cancelEditingDraft,
  handleSaveDraftEdit,
  handleDiscardDraft,
  handleRegenerateDraft,
  handleSendDraft,
  showRegenerateConfirm,
  setShowRegenerateConfirm,
  AudioPlayer,
  SentimentIndicator,
  highlightedMessageId,
  selectionEnabled,
  selectedMessageIds,
  onToggleSelection,
  bulkQueueStatusById,
  unreadMessageIds,
  onUnreadSeen,
  expandedIds,
  onToggleExpand,
  threadReminderCounts,
  authorReminderCounts,
}: ThreadNodeProps) {
  const isReply = depth > 0;
  const hasChildren = node.children.length > 0;
  const canNest = depth < MAX_DEPTH;
  
  // Collapsible state: check if this node is expanded (default is collapsed)
  const isExpanded = expandedIds.has(node.message.id);

  const FLEX_GAP = 12; // gap-3 in the message flex container
  const AVATAR_MT = 4; // mt-1 on avatar
  const siblingGap = 60; // mt-[60px] between siblings
  
  // This node's avatar size
  const thisAvatarSize = isReply ? AVATAR_SIZE_REPLY : AVATAR_SIZE_ROOT;
  const thisAvatarCenter = thisAvatarSize / 2;
  
  // For connector positioning (used when this node is a reply):
  // Parent's avatar size depends on if parent is root (depth-1 == 0) or also a reply
  const parentAvatarSize = depth === 1 ? AVATAR_SIZE_ROOT : AVATAR_SIZE_REPLY;
  const parentAvatarCenter = parentAvatarSize / 2;
  const childAvatarCenter = AVATAR_SIZE_REPLY / 2;
  
  // Fixed indent for child comments - DO NOT CHANGE THIS or child avatars will move
  const CHILD_MARGIN_LEFT = 32; // Fixed value to keep child avatar position stable
  
  // For connector positioning: calculate where parent avatar center is relative to child container
  // Parent indent = parentAvatarSize + FLEX_GAP (how far child is from parent's left edge)
  const parentIndent = parentAvatarSize + FLEX_GAP;
  
  // Ref to measure this node's message height for passing to children
  const messageRef = React.useRef<HTMLDivElement>(null);
  const [myMessageHeight, setMyMessageHeight] = React.useState(0);
  
  // Measure this message's height using ResizeObserver for dynamic updates
  React.useLayoutEffect(() => {
    const el = messageRef.current;
    if (!el) return;
    
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setMyMessageHeight(entry.contentRect.height);
      }
    });
    
    observer.observe(el);
    // Initial measurement
    setMyMessageHeight(el.getBoundingClientRect().height);
    
    return () => observer.disconnect();
  }, []);
  
  // L-connector: horizontal line starts at child avatar, extends left toward parent
  // Base width from parent avatar center to child avatar center = 28px
  const baseWidth = (CHILD_MARGIN_LEFT - parentAvatarCenter) + thisAvatarCenter;
  // Extend horizontal line 2x for better visibility (user approved this)
  const horizontalConnectorWidth = baseWidth * 2; // 56px
  // Position so right edge stays at child avatar center
  const horizontalConnectorLeft = horizontalConnectorWidth - thisAvatarCenter; // 56 - 12 = 44px
  
  // Vertical line height: from child avatar UP to parent avatar level
  // This accounts for: parent message height + sibling gap + distance to reach parent avatar center
  const verticalLineHeight = isReply 
    ? parentMessageHeight + siblingGap + parentAvatarCenter - childAvatarCenter
    : 0;
  
  return (
    <div className={cn("thread-node relative")} style={isReply ? { marginTop: '60px' } : undefined}>
      {/* L-shaped connector for replies - above background, behind content */}
      {isReply && verticalLineHeight > 0 && (
        <span 
          className="absolute pointer-events-none"
          style={{
            left: `-${horizontalConnectorLeft + 2}px`,
            top: `-${verticalLineHeight - AVATAR_MT - thisAvatarCenter - 6}px`,
            width: `${horizontalConnectorWidth}px`,
            height: `${verticalLineHeight}px`,
            borderLeft: '1px solid #D1D5DB',
            borderBottom: '1px solid #D1D5DB',
            borderBottomLeftRadius: '8px',
            zIndex: 0,
          }}
          aria-hidden="true"
        />
      )}

      <div ref={messageRef}>
        <SingleMessage
          msg={node.message}
          isReply={isReply}
          isOrphan={node.isOrphan}
          isHighlighted={highlightedMessageId === node.message.id}
          isUnread={unreadMessageIds?.has(node.message.id)}
          onUnreadSeen={onUnreadSeen}
          platformStyles={platformStyles}
          onStartReply={onStartReply}
          onGenerateDraft={onGenerateDraft}
          generatingDraftIds={generatingDraftIds}
          editingDraftId={editingDraftId}
          editingDraftText={editingDraftText}
          setEditingDraftText={setEditingDraftText}
          startEditingDraft={startEditingDraft}
          cancelEditingDraft={cancelEditingDraft}
          handleSaveDraftEdit={handleSaveDraftEdit}
          handleDiscardDraft={handleDiscardDraft}
          handleRegenerateDraft={handleRegenerateDraft}
          handleSendDraft={handleSendDraft}
          showRegenerateConfirm={showRegenerateConfirm}
          setShowRegenerateConfirm={setShowRegenerateConfirm}
          AudioPlayer={AudioPlayer}
          SentimentIndicator={SentimentIndicator}
          selectionEnabled={selectionEnabled}
          isSelected={selectedMessageIds?.has(node.message.id)}
          onToggleSelection={onToggleSelection}
          bulkStatus={bulkQueueStatusById?.get(node.message.id)}
          hasChildren={hasChildren}
          childrenCount={node.children.length}
          isExpanded={isExpanded}
          onToggleExpand={onToggleExpand}
          canNest={canNest}
          threadReminderCount={depth === 0 ? threadReminderCounts.get(node.message.id) || 0 : 0}
          authorReminderCount={node.message.author ? authorReminderCounts.get(node.message.author.toLowerCase()) || 0 : 0}
        />
      </div>

      {hasChildren && canNest && isExpanded && (
        <div className="mt-3">
          <div 
            className="thread-children relative mt-8"
            style={{
              marginLeft: `${CHILD_MARGIN_LEFT}px`,
              }}
            >
              {node.children.map((childNode, index) => (
                <ThreadNode
                  key={childNode.message.id}
                  node={childNode}
                  depth={depth + 1}
                  isLastChild={index === node.children.length - 1}
                  parentMessageHeight={myMessageHeight}
                  platformStyles={platformStyles}
                  onStartReply={onStartReply}
                  onGenerateDraft={onGenerateDraft}
                  generatingDraftIds={generatingDraftIds}
                  editingDraftId={editingDraftId}
                  editingDraftText={editingDraftText}
                  setEditingDraftText={setEditingDraftText}
                  startEditingDraft={startEditingDraft}
                  cancelEditingDraft={cancelEditingDraft}
                  handleSaveDraftEdit={handleSaveDraftEdit}
                  handleDiscardDraft={handleDiscardDraft}
                  handleRegenerateDraft={handleRegenerateDraft}
                  handleSendDraft={handleSendDraft}
                  showRegenerateConfirm={showRegenerateConfirm}
                  setShowRegenerateConfirm={setShowRegenerateConfirm}
                  highlightedMessageId={highlightedMessageId}
                  AudioPlayer={AudioPlayer}
                  SentimentIndicator={SentimentIndicator}
                  selectionEnabled={selectionEnabled}
                  selectedMessageIds={selectedMessageIds}
                  onToggleSelection={onToggleSelection}
                  bulkQueueStatusById={bulkQueueStatusById}
                  unreadMessageIds={unreadMessageIds}
                  onUnreadSeen={onUnreadSeen}
                  expandedIds={expandedIds}
                  onToggleExpand={onToggleExpand}
                  threadReminderCounts={threadReminderCounts}
                  authorReminderCounts={authorReminderCounts}
                />
              ))}
            </div>
        </div>
      )}

      {hasChildren && !canNest && (
        <div className="ml-4 mt-2 p-2 bg-gray-50 rounded-lg border border-gray-200">
          <p className="text-[10px] text-gray-500 italic">
            +{node.children.length} respuesta{node.children.length > 1 ? 's' : ''} más (límite de profundidad alcanzado)
          </p>
        </div>
      )}
    </div>
  );
}

export function CommentThread({
  messages,
  platformStyles,
  onStartReply,
  onGenerateDraft,
  generatingDraftIds,
  editingDraftId,
  editingDraftText,
  setEditingDraftText,
  startEditingDraft,
  cancelEditingDraft,
  handleSaveDraftEdit,
  handleDiscardDraft,
  handleRegenerateDraft,
  handleSendDraft,
  showRegenerateConfirm,
  setShowRegenerateConfirm,
  highlightedMessageId,
  AudioPlayer,
  SentimentIndicator,
  selectionEnabled,
  selectedMessageIds,
  onToggleSelection,
  bulkQueueStatusById,
  unreadMessageIds,
  onUnreadSeen,
}: CommentThreadProps) {
  const tree = React.useMemo(() => buildMessageTree(messages), [messages]);
  
  // Compute reminder statistics for badges
  const reminderStats = React.useMemo(() => computeReminderStats(messages), [messages]);
  
  // State for collapsible threaded comments - tracks which nodes are expanded
  const [expandedIds, setExpandedIds] = React.useState<Set<string>>(new Set());
  
  // Helper function to find all ancestor IDs for a given message ID in the tree
  const findAncestorIds = React.useCallback((targetId: string, nodes: MessageNode[]): string[] => {
    const ancestors: string[] = [];
    
    const search = (nodeList: MessageNode[], path: string[]): boolean => {
      for (const node of nodeList) {
        if (node.message.id === targetId) {
          ancestors.push(...path);
          return true;
        }
        if (node.children.length > 0) {
          if (search(node.children, [...path, node.message.id])) {
            return true;
          }
        }
      }
      return false;
    };
    
    search(nodes, []);
    return ancestors;
  }, []);
  
  // Auto-expand ancestors when highlightedMessageId or unreadMessageIds change
  React.useEffect(() => {
    const idsToExpand = new Set<string>();
    
    // Expand ancestors of highlighted message
    if (highlightedMessageId) {
      const ancestors = findAncestorIds(highlightedMessageId, tree);
      ancestors.forEach(id => idsToExpand.add(id));
    }
    
    // Expand ancestors of unread messages
    if (unreadMessageIds && unreadMessageIds.size > 0) {
      unreadMessageIds.forEach(unreadId => {
        const ancestors = findAncestorIds(unreadId, tree);
        ancestors.forEach(id => idsToExpand.add(id));
      });
    }
    
    // Only update if there are new IDs to expand
    if (idsToExpand.size > 0) {
      setExpandedIds(prev => {
        const next = new Set(prev);
        idsToExpand.forEach(id => next.add(id));
        return next;
      });
    }
  }, [highlightedMessageId, unreadMessageIds, tree, findAncestorIds]);
  
  const handleToggleExpand = React.useCallback((messageId: string) => {
    setExpandedIds(prev => {
      const next = new Set(prev);
      if (next.has(messageId)) {
        next.delete(messageId);
      } else {
        next.add(messageId);
      }
      return next;
    });
  }, []);

  const nodesWithDateInfo = React.useMemo(() => {
    const getDateKey = (timestamp: string | Date): string => {
      const date = typeof timestamp === 'string' ? new Date(timestamp) : timestamp;
      return date.toISOString().split('T')[0];
    };

    const getDateDisplay = (timestamp: string | Date): string => {
      const date = typeof timestamp === 'string' ? new Date(timestamp) : timestamp;
      const today = new Date();
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);
      
      const dateKey = date.toISOString().split('T')[0];
      const todayKey = today.toISOString().split('T')[0];
      const yesterdayKey = yesterday.toISOString().split('T')[0];
      
      if (dateKey === todayKey) return 'Hoy';
      if (dateKey === yesterdayKey) return 'Ayer';
      return date.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' });
    };

    let lastDateKey: string | null = null;
    return tree.map((node, index) => {
      const dateKey = getDateKey(node.message.timestamp);
      const showSeparator = dateKey !== lastDateKey;
      lastDateKey = dateKey;
      return {
        node,
        index,
        dateKey,
        dateDisplay: showSeparator ? getDateDisplay(node.message.timestamp) : null,
        showSeparator,
      };
    });
  }, [tree]);

  if (tree.length === 0) {
    return null;
  }

  return (
    <div className="space-y-12">
      {nodesWithDateInfo.map(({ node: rootNode, index, dateKey, dateDisplay, showSeparator }) => (
        <div key={rootNode.message.id} data-testid={`thread-root-${rootNode.message.id}`}>
          {showSeparator && dateDisplay && (
            <div className="flex justify-center my-6" data-testid={`date-separator-${dateKey}`}>
              <span className="text-[10px] font-medium text-gray-500 bg-[#E2E6EB] px-4 py-1.5 rounded-full">
                {dateDisplay}
              </span>
            </div>
          )}
          <ThreadNode
              node={rootNode}
              depth={0}
              isLastChild={index === tree.length - 1}
              platformStyles={platformStyles}
              onStartReply={onStartReply}
              onGenerateDraft={onGenerateDraft}
              generatingDraftIds={generatingDraftIds}
              editingDraftId={editingDraftId}
              editingDraftText={editingDraftText}
              setEditingDraftText={setEditingDraftText}
              startEditingDraft={startEditingDraft}
              cancelEditingDraft={cancelEditingDraft}
              handleSaveDraftEdit={handleSaveDraftEdit}
              handleDiscardDraft={handleDiscardDraft}
              handleRegenerateDraft={handleRegenerateDraft}
              handleSendDraft={handleSendDraft}
              showRegenerateConfirm={showRegenerateConfirm}
              setShowRegenerateConfirm={setShowRegenerateConfirm}
              highlightedMessageId={highlightedMessageId}
              AudioPlayer={AudioPlayer}
              SentimentIndicator={SentimentIndicator}
              selectionEnabled={selectionEnabled}
              selectedMessageIds={selectedMessageIds}
              onToggleSelection={onToggleSelection}
              bulkQueueStatusById={bulkQueueStatusById}
              unreadMessageIds={unreadMessageIds}
              onUnreadSeen={onUnreadSeen}
              expandedIds={expandedIds}
              onToggleExpand={handleToggleExpand}
              threadReminderCounts={reminderStats.threadReminderCounts}
              authorReminderCounts={reminderStats.authorReminderCounts}
            />
        </div>
      ))}
    </div>
  );
}
