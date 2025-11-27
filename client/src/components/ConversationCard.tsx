import React from 'react';
import { cn } from '@/lib/utils';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { formatDistanceToNow } from 'date-fns';
import { MessageCircle, MessageSquare, ExternalLink } from 'lucide-react';
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

  return (
    <motion.button
      initial={{ opacity: 0, y: 5 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      onClick={onClick}
      data-testid={`conversation-card-${conversation.id}`}
      className={cn(
        "w-full max-w-full text-left bg-white rounded-lg border border-gray-100 hover:border-gray-300 hover:bg-gray-50 transition-all duration-200 relative overflow-hidden group pl-3 py-3 pr-3",
        isSelected && "ring-1 ring-indigo-500 ring-offset-1 border-transparent bg-gray-50 z-10"
      )}
    >
      <div className="flex items-start gap-3 min-w-0 max-w-full overflow-hidden">
        <div className="relative shrink-0">
          <Avatar className="h-10 w-10 border border-gray-100">
            <AvatarImage src={conversation.customerAvatar || undefined} alt={conversation.customerName || 'User'} />
            <AvatarFallback className="text-xs font-bold text-gray-600 bg-gray-100">
              {(conversation.customerName || 'U').substring(0, 2).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div className="absolute -bottom-1 -right-1 bg-white rounded-full p-0.5 shadow-sm">
            <PlatformIcon platform={platform} className="h-4 w-4" />
          </div>
        </div>

        <div className="flex-1 min-w-0 max-w-full overflow-hidden">
          <div className="flex items-center justify-between mb-2 min-w-0 max-w-full">
            <div className="flex items-center gap-1.5 min-w-0 flex-1 overflow-hidden">
              <span className={cn(
                "text-sm font-bold truncate text-gray-900 max-w-full",
                conversation.unreadCount && conversation.unreadCount > 0 && "text-gray-900"
              )}>
                {conversation.customerName || 'Unknown User'}
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
          
          <div className="flex items-center gap-1.5 mb-2.5 flex-wrap min-w-0 max-w-full">
            <Badge variant="outline" className="text-[10px] font-normal h-5 px-1.5 text-gray-500 border-gray-200 shrink-0">
              {isDM && (
                <>
                  <MessageCircle className="h-3 w-3 mr-1" />
                  DM
                </>
              )}
              {isComment && (
                <>
                  <MessageSquare className="h-3 w-3 mr-1" />
                  Comment
                </>
              )}
            </Badge>
            {conversation.socialPost?.caption && (
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
