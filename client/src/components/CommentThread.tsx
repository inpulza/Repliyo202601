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
  Video 
} from 'lucide-react';
import { Platform, MessageType, Sentiment } from '@/lib/types';
import { isRepliyoMessage, isAutoReply } from '@/lib/mockData';
import type { Message } from '@shared/schema';
import { motion } from "framer-motion";
import { getCharacterLimit } from '@/utils/platformLimits';
import repliyoLogo from '@/assets/repliyo-logo.jpg';

interface MessageNode {
  message: Message;
  children: MessageNode[];
}

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
  AudioPlayer: React.ComponentType<{ src: string; transcription?: string; isOutbound?: boolean }>;
  SentimentIndicator: React.ComponentType<{ sentiment: Sentiment }>;
}

const MAX_DEPTH = 4;

const AVATAR_SIZE_ROOT = 32;
const AVATAR_SIZE_REPLY = 24;

function buildMessageTree(messages: Message[]): MessageNode[] {
  const messageMap = new Map<string, MessageNode>();
  const rootNodes: MessageNode[] = [];

  messages.forEach(msg => {
    messageMap.set(msg.id, { message: msg, children: [] });
  });

  messages.forEach(msg => {
    const node = messageMap.get(msg.id)!;
    if (msg.parentMessageId && messageMap.has(msg.parentMessageId)) {
      const parentNode = messageMap.get(msg.parentMessageId)!;
      parentNode.children.push(node);
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
}

function SingleMessage({
  msg,
  isReply,
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
}: SingleMessageProps) {
  const isOutbound = msg.direction === 'outbound';
  const isOwner = isOutbound;
  const isSentFromRepliyo = isRepliyoMessage(msg.source, msg.internalOrigin);
  const isSentByAI = isAutoReply(msg.source, msg.internalOrigin);

  const avatarSize = isReply ? AVATAR_SIZE_REPLY : AVATAR_SIZE_ROOT;

  return (
    <div className="flex gap-3 group transition-all">
      <Avatar className={cn(
        "mt-1 opacity-80 group-hover:opacity-100 transition-opacity flex-shrink-0",
        isReply ? "h-6 w-6" : "h-8 w-8"
      )}>
        <AvatarImage 
          src={isSentFromRepliyo ? repliyoLogo : (msg.authorAvatar || undefined)} 
          alt={isSentFromRepliyo ? "Repliyo" : msg.author} 
        />
        <AvatarFallback className={cn(
          isOwner ? platformStyles.badge : "bg-gray-200 text-gray-600",
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
          {msg.direction === 'inbound' && !isOwner && (
            <SentimentIndicator sentiment={(msg.sentiment || 'neutral') as Sentiment} />
          )}
        </div>
        
        <div className={cn(
          "p-4 rounded-2xl text-sm leading-relaxed shadow-sm relative rounded-tl-none",
          (() => {
            if (msg.direction === 'inbound') {
              return platformStyles.userBubble;
            }
            if (isSentByAI) {
              return platformStyles.aiBubble;
            }
            if (isSentFromRepliyo) {
              return platformStyles.manualBubble;
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
            <div className="mt-2 pt-2 border-t border-white/20 flex items-center gap-1.5 text-[10px] font-medium text-white/80">
              {isSentByAI ? (
                <Bot className="h-3 w-3" />
              ) : (
                <Send className="h-2.5 w-2.5" />
              )}
              <span>{isSentByAI ? "Respondido con IA" : "Enviado desde Repliyo"}</span>
            </div>
          )}
        </div>
        
        {!isOwner && msg.direction === 'inbound' && (
          <div className="flex items-center gap-3 mt-1 ml-1">
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
        <div className={cn("rounded-2xl bg-gradient-to-r border p-4 shadow-sm flex items-center gap-3 animate-pulse", platformDraftStyles.bg, platformDraftStyles.border.replace('border-l-', 'border-'))}>
          <div className={cn("h-7 w-7 rounded-full bg-gradient-to-br flex items-center justify-center", platformDraftStyles.iconBg)}>
            <Brain className="h-3.5 w-3.5 text-white" />
          </div>
          <div className="space-y-1.5 flex-1">
            <div className="h-2.5 bg-white/60 rounded w-1/4"></div>
            <div className="h-2 bg-white/40 rounded w-1/2"></div>
          </div>
        </div>
      )}

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
          "rounded-xl bg-gradient-to-r border-l-4 border-y border-r shadow-sm transition-all overflow-hidden",
          platformDraftStyles.bg,
          platformDraftStyles.border,
          isOverLimit ? "border-y-red-300 border-r-red-300 border-l-red-500 ring-1 ring-red-100" : "border-y-gray-100 border-r-gray-100"
        )}>
          <div className="px-3 py-2 flex items-center justify-between border-b border-gray-50 bg-gray-50/30">
            <div className="flex items-center gap-1.5">
              <div className={cn("h-4 w-4 rounded-full bg-gradient-to-br flex items-center justify-center", platformDraftStyles.iconBg)}>
                <Brain className="h-2 w-2 text-white" />
              </div>
              <span className={cn("text-[10px] font-bold", platformDraftStyles.accent)}>Borrador IA</span>
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
              <div className="text-xs text-gray-800 leading-relaxed whitespace-pre-wrap">
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
}

interface ThreadNodeProps {
  node: MessageNode;
  depth: number;
  isLastChild: boolean;
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
}

function ThreadNode({
  node,
  depth,
  isLastChild,
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
}: ThreadNodeProps) {
  const isReply = depth > 0;
  const hasChildren = node.children.length > 0;
  const canNest = depth < MAX_DEPTH;

  const avatarCenter = isReply ? AVATAR_SIZE_REPLY / 2 : AVATAR_SIZE_ROOT / 2;
  
  return (
    <div className={cn("relative", depth > 0 && "mt-3")}>
      {isReply && (
        <>
          <span 
            className="absolute border-gray-300 dark:border-gray-600 rounded-bl-xl pointer-events-none"
            style={{
              left: '-20px',
              top: '0',
              width: '20px',
              height: `${avatarCenter + 4}px`,
              borderLeftWidth: '2px',
              borderBottomWidth: '2px',
              borderTopWidth: '0',
              borderRightWidth: '0',
            }}
          />
          {!isLastChild && (
            <span 
              className="absolute border-l-2 border-gray-300 dark:border-gray-600 pointer-events-none"
              style={{
                left: '-20px',
                top: `${avatarCenter + 4}px`,
                bottom: '0',
                width: '0',
              }}
            />
          )}
        </>
      )}

      <SingleMessage
        msg={node.message}
        isReply={isReply}
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
      />

      {hasChildren && canNest && (
        <div className="relative pl-8 mt-2" style={{ marginLeft: isReply ? '12px' : '16px' }}>
          {node.children.map((childNode, index) => (
            <ThreadNode
              key={childNode.message.id}
              node={childNode}
              depth={depth + 1}
              isLastChild={index === node.children.length - 1}
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
            />
          ))}
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
  AudioPlayer,
  SentimentIndicator,
}: CommentThreadProps) {
  const tree = React.useMemo(() => buildMessageTree(messages), [messages]);

  if (tree.length === 0) {
    return null;
  }

  return (
    <div className="space-y-6">
      {tree.map((rootNode, index) => (
        <ThreadNode
          key={rootNode.message.id}
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
          AudioPlayer={AudioPlayer}
          SentimentIndicator={SentimentIndicator}
        />
      ))}
    </div>
  );
}
