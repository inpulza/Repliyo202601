import React from 'react';
import { cn } from '@/lib/utils';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { formatDistanceToNow } from 'date-fns';
import { MessageCircle, MessageSquare, ExternalLink, Play } from 'lucide-react';
import { FaInstagram, FaFacebook, FaLinkedin, FaTiktok, FaYoutube, FaWhatsapp } from 'react-icons/fa';
import { GoogleBusinessIcon } from './GoogleBusinessIcon';
import { motion } from "framer-motion";
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
  return <>{icons[platform] || <MessageCircle className={className} />}</>;
}

interface ConversationCardProps {
  conversation: ConversationWithPost;
  isSelected: boolean;
  onClick: () => void;
}

export function ConversationCard({ conversation, isSelected, onClick }: ConversationCardProps) {
  const platform = conversation.platform as Platform;
  const isComment = conversation.type === 'comment';
  const isDM = conversation.type === 'dm';

  const renderThumbnail = () => {
    if (isComment) {
      const thumbnailUrl = conversation.socialPost?.thumbnailUrl;
      const isVideoUrl = thumbnailUrl?.includes('.mp4') || thumbnailUrl?.includes('.webm');
      const isImageThumbnail = thumbnailUrl && !isVideoUrl;
      
      if (isImageThumbnail) {
        return (
          <div className="shrink-0 self-center">
            <div className="h-16 w-12 rounded-lg overflow-hidden border border-gray-200 bg-gray-100">
              <img 
                src={thumbnailUrl} 
                alt="Post thumbnail"
                className="h-full w-full object-cover"
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = 'none';
                  (e.target as HTMLImageElement).parentElement!.classList.add('flex', 'items-center', 'justify-center');
                  (e.target as HTMLImageElement).parentElement!.innerHTML = '<span class="text-gray-400"><svg class="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z"></path><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg></span>';
                }}
              />
            </div>
          </div>
        );
      }
      
      const platformGradients: Record<string, string> = {
        instagram: 'from-pink-100 to-purple-100',
        facebook: 'from-blue-100 to-blue-50',
        linkedin: 'from-sky-100 to-blue-50',
        youtube: 'from-red-100 to-red-50',
        tiktok: 'from-gray-100 to-gray-50',
      };
      const gradient = platformGradients[platform] || 'from-gray-100 to-gray-200';
      
      return (
        <div className="shrink-0 self-center">
          <div className={cn(
            "h-16 w-12 rounded-lg border border-gray-200 flex items-center justify-center bg-gradient-to-br",
            gradient
          )}>
            <Play className="h-6 w-6 text-gray-500 fill-gray-400/50" />
          </div>
        </div>
      );
    }

    return (
      <div className="shrink-0">
        <Avatar className="h-10 w-10 border border-gray-100">
          <AvatarImage src={conversation.customerAvatar || undefined} alt={conversation.customerName || 'User'} className="bg-white" />
          <AvatarFallback className="text-xs font-bold text-gray-600 bg-[#E5E7EB]">
            {(conversation.customerName || 'U').substring(0, 2).toUpperCase()}
          </AvatarFallback>
        </Avatar>
      </div>
    );
  };

  return (
    <motion.button
      initial={{ opacity: 0, y: 5 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      onClick={onClick}
      data-testid={`conversation-card-${conversation.id}`}
      className={cn(
        "w-full max-w-full text-left bg-transparent rounded-lg hover:bg-white/50 transition-all duration-200 relative overflow-hidden group pl-3 py-3 pr-3",
        isSelected && "bg-white/80"
      )}
    >
      <div className="flex items-start gap-3 min-w-0 max-w-full overflow-hidden">
        {renderThumbnail()}

        <div className="flex-1 min-w-0 max-w-full overflow-hidden">
          <div className="flex items-center justify-between mb-2 min-w-0 max-w-full">
            <div className="flex items-center gap-1.5 min-w-0 flex-1 overflow-hidden mr-3">
              <span className={cn(
                "text-sm font-bold truncate text-gray-900",
                conversation.unreadCount && conversation.unreadCount > 0 && "text-gray-900"
              )}>
                {isComment 
                  ? (conversation.socialPost?.caption 
                      ? conversation.socialPost.caption.substring(0, 40) + (conversation.socialPost.caption.length > 40 ? '...' : '')
                      : 'Post comments')
                  : (conversation.customerName || 'Unknown User')
                }
              </span>
              {conversation.unreadCount && conversation.unreadCount > 0 && (
                <Badge 
                  variant="default" 
                  className="h-5 min-w-[20px] px-1.5 text-[10px] font-bold bg-indigo-600 shrink-0"
                  data-testid={`badge-unread-${conversation.id}`}
                >
                  {conversation.unreadCount}
                </Badge>
              )}
            </div>
            <div className="flex items-center gap-1 shrink-0">
              {conversation.socialPost?.permalink && (
                <a 
                  href={conversation.socialPost.permalink}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={(e) => e.stopPropagation()}
                  className="text-gray-400 hover:text-indigo-600 p-0.5 rounded hover:bg-indigo-50 transition-colors"
                  title="View original post"
                  data-testid={`link-post-${conversation.id}`}
                >
                  <ExternalLink className="h-3 w-3" />
                </a>
              )}
              <span className="text-[10px] text-gray-400 whitespace-nowrap shrink-0 ml-1">
                {formatDistanceToNow(new Date(conversation.lastMessageAt), { addSuffix: false }).replace('about ', '')}
              </span>
            </div>
          </div>
          
          <div className="flex items-center gap-2 mb-2.5 flex-wrap min-w-0 max-w-full justify-end">
            <div className="flex items-center shrink-0">
              <PlatformIcon platform={platform} className="h-4 w-4" />
            </div>
            <div className="flex items-center gap-1 text-[11px] text-gray-500 shrink-0">
              {isDM && (
                <>
                  <MessageCircle className="h-3.5 w-3.5" />
                  <span>DM</span>
                </>
              )}
              {isComment && (
                <>
                  <MessageSquare className="h-3.5 w-3.5" />
                  <span>Comments</span>
                </>
              )}
            </div>
            {isDM && conversation.socialPost?.caption && (
              <span className="text-[10px] text-gray-400 truncate max-w-[150px]" title={conversation.socialPost.caption}>
                on: {conversation.socialPost.caption.substring(0, 30)}...
              </span>
            )}
          </div>

          <p className={cn(
            "text-sm line-clamp-2 leading-relaxed text-gray-600 min-w-0 max-w-full break-words", 
            conversation.unreadCount && conversation.unreadCount > 0 ? "font-medium text-gray-900" : ""
          )}>
            {conversation.lastMessagePreview || 'No messages yet'}
          </p>
        </div>
      </div>
    </motion.button>
  );
}
