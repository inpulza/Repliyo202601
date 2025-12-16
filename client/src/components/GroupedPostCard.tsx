import React, { useState } from 'react';
import { cn } from '@/lib/utils';
import { Badge } from "@/components/ui/badge";
import { formatDistanceToNow } from 'date-fns';
import { MessageSquare, ChevronDown, ChevronRight, Users, ExternalLink, Play } from 'lucide-react';
import { FaInstagram, FaFacebook, FaLinkedin, FaTiktok, FaYoutube, FaWhatsapp } from 'react-icons/fa';
import { GoogleBusinessIcon } from './GoogleBusinessIcon';
import { motion, AnimatePresence } from "framer-motion";
import { ConversationCard } from './ConversationCard';
import type { ConversationWithPost } from '@/context/NexusContext';
import type { Platform } from '@/lib/types';

function PlatformIcon({ platform, className }: { platform: Platform; className?: string }) {
  const icons: Record<Platform, React.ReactNode> = {
    instagram: <FaInstagram className={cn(className, "text-pink-600")} />,
    facebook: <FaFacebook className={cn(className, "text-blue-600")} />,
    linkedin: <FaLinkedin className={cn(className, "text-[#0077b5]")} />,
    tiktok: <FaTiktok className={cn(className, "text-black")} />,
    youtube: <FaYoutube className={cn(className, "text-red-600")} />,
    'google-business': <GoogleBusinessIcon className={className} />,
    whatsapp: <FaWhatsapp className={cn(className, "text-green-500")} />,
  };
  return <>{icons[platform] || <MessageSquare className={className} />}</>;
}

export interface GroupedPost {
  socialPostId: string;
  platform: Platform;
  thumbnailUrl: string | null;
  caption: string | null;
  permalink: string | null;
  conversations: ConversationWithPost[];
  totalUnread: number;
  lastMessageAt: Date;
}

interface GroupedPostCardProps {
  group: GroupedPost;
  activeConversationId: string | null;
  onSelectConversation: (conv: ConversationWithPost) => void;
}

export function GroupedPostCard({ group, activeConversationId, onSelectConversation }: GroupedPostCardProps) {
  const isAnySelected = group.conversations.some(c => c.id === activeConversationId);
  const [isExpanded, setIsExpanded] = useState(isAnySelected);
  
  // Auto-expand when a conversation in this group is selected
  React.useEffect(() => {
    if (isAnySelected && !isExpanded) {
      setIsExpanded(true);
    }
  }, [isAnySelected, isExpanded]);
  
  const platformGradients: Record<string, string> = {
    instagram: 'from-pink-100 to-purple-100',
    facebook: 'from-blue-100 to-blue-50',
    linkedin: 'from-sky-100 to-blue-50',
    youtube: 'from-red-100 to-red-50',
    tiktok: 'from-gray-100 to-gray-50',
    'google-business': 'from-blue-100 to-green-50',
  };
  const gradient = platformGradients[group.platform] || 'from-gray-100 to-gray-200';

  const renderThumbnail = () => {
    const thumbnailUrl = group.thumbnailUrl;
    const isVideoUrl = thumbnailUrl?.includes('.mp4') || thumbnailUrl?.includes('.webm');
    const isImageThumbnail = thumbnailUrl && !isVideoUrl;
    
    if (isImageThumbnail) {
      return (
        <div className="relative shrink-0 self-center">
          <div className="h-16 w-12 rounded-lg overflow-hidden border border-gray-200 bg-gray-100 shadow-sm">
            <img 
              src={thumbnailUrl} 
              alt="Post thumbnail"
              className="h-full w-full object-cover"
              onError={(e) => {
                (e.target as HTMLImageElement).style.display = 'none';
              }}
            />
          </div>
          <div className="absolute -bottom-1 -right-1 bg-white rounded-full p-0.5 shadow-sm">
            <PlatformIcon platform={group.platform} className="h-4 w-4" />
          </div>
        </div>
      );
    }
    
    return (
      <div className="relative shrink-0 self-center">
        <div className={cn(
          "h-16 w-12 rounded-lg border border-gray-200 flex items-center justify-center shadow-sm bg-gradient-to-br",
          gradient
        )}>
          <Play className="h-6 w-6 text-gray-500 fill-gray-400/50" />
        </div>
        <div className="absolute -bottom-1 -right-1 bg-white rounded-full p-0.5 shadow-sm">
          <PlatformIcon platform={group.platform} className="h-4 w-4" />
        </div>
      </div>
    );
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 5 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className="flex flex-col"
    >
      <button
        onClick={() => {
          if (!isExpanded) {
            setIsExpanded(true);
            // Auto-select the most recent conversation when expanding
            const mostRecent = group.conversations[0];
            if (mostRecent) {
              onSelectConversation(mostRecent);
            }
          } else {
            setIsExpanded(false);
          }
        }}
        data-testid={`grouped-post-card-${group.socialPostId}`}
        className={cn(
          "w-full max-w-full text-left bg-white rounded-lg border border-gray-100 hover:border-gray-300 hover:bg-gray-50 transition-all duration-200 relative overflow-hidden group pl-3 py-3 pr-3",
          isAnySelected && "ring-1 ring-indigo-500 ring-offset-1 border-transparent bg-gray-50",
          isExpanded && "rounded-b-none border-b-0"
        )}
      >
        <div className="flex items-start gap-3 min-w-0 max-w-full overflow-hidden">
          {renderThumbnail()}

          <div className="flex-1 min-w-0 max-w-full overflow-hidden">
            <div className="flex items-center justify-between mb-1 min-w-0 max-w-full">
              <div className="flex items-center gap-1.5 min-w-0 flex-1 overflow-hidden">
                <span className="text-sm font-bold truncate text-gray-900 max-w-full">
                  {group.caption 
                    ? group.caption.substring(0, 50) + (group.caption.length > 50 ? '...' : '')
                    : 'Post sin título'}
                </span>
              </div>
              <span className="text-xs text-gray-400 ml-2 shrink-0">
                {formatDistanceToNow(new Date(group.lastMessageAt), { addSuffix: false })}
              </span>
            </div>

            <div className="flex items-center gap-2 mb-1.5">
              <div className="flex items-center gap-1 text-xs text-gray-500">
                <Users className="h-3.5 w-3.5" />
                <span>{group.conversations.length} {group.conversations.length === 1 ? 'usuario' : 'usuarios'}</span>
              </div>
              
              {group.totalUnread > 0 && (
                <Badge variant="secondary" className="bg-indigo-100 text-indigo-700 text-[10px] px-1.5 py-0 h-4">
                  {group.totalUnread} sin leer
                </Badge>
              )}

              {group.permalink && (
                <a
                  href={group.permalink}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={(e) => e.stopPropagation()}
                  className="text-xs text-indigo-500 hover:text-indigo-700 flex items-center gap-0.5"
                >
                  <ExternalLink className="h-3 w-3" />
                </a>
              )}
            </div>

            <div className="flex items-center justify-between">
              <p className="text-xs text-gray-500 truncate max-w-[85%]">
                {group.conversations[0]?.customerName}: {group.conversations[0]?.lastMessagePreview}
              </p>
              <div className="flex items-center text-gray-400">
                {isExpanded ? (
                  <ChevronDown className="h-4 w-4" />
                ) : (
                  <ChevronRight className="h-4 w-4" />
                )}
              </div>
            </div>
          </div>
        </div>
      </button>

      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden bg-gray-100 rounded-b-lg border border-t-0 border-gray-200"
          >
            <div className="p-2 space-y-2">
              {group.conversations.map((conv) => (
                <ConversationCard
                  key={conv.id}
                  conversation={conv}
                  isSelected={activeConversationId === conv.id}
                  onClick={() => onSelectConversation(conv)}
                />
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
