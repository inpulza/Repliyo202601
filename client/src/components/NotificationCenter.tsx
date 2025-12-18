import React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNexus } from '@/context/NexusContext';
import { Bell, Check, CheckCheck, MessageSquare, AlertCircle, Bot, Settings, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';
import { Link } from 'wouter';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

interface Notification {
  id: string;
  brandId: string;
  type: string;
  title: string;
  description: string | null;
  isRead: boolean;
  clickUrl: string | null;
  platform: string | null;
  count: number;
  metadata: Record<string, any> | null;
  createdAt: string;
  updatedAt: string;
}

interface NotificationsResponse {
  notifications: Notification[];
  unreadCount: number;
}

const typeIcons: Record<string, React.ReactNode> = {
  'new_messages': <MessageSquare className="h-4 w-4 text-blue-500" />,
  'sync_error': <AlertCircle className="h-4 w-4 text-red-500" />,
  'sync_success': <Check className="h-4 w-4 text-green-500" />,
  'ai_auto_reply': <Bot className="h-4 w-4 text-violet-500" />,
  'config_change': <Settings className="h-4 w-4 text-gray-500" />,
};

const typeColors: Record<string, string> = {
  'new_messages': 'bg-blue-50 border-blue-100',
  'sync_error': 'bg-red-50 border-red-100',
  'sync_success': 'bg-green-50 border-green-100',
  'ai_auto_reply': 'bg-violet-50 border-violet-100',
  'config_change': 'bg-gray-50 border-gray-100',
};

interface NotificationCenterProps {
  isCollapsed?: boolean;
}

export function NotificationCenter({ isCollapsed = false }: NotificationCenterProps) {
  const { activeClient } = useNexus();
  const queryClient = useQueryClient();
  const [isOpen, setIsOpen] = React.useState(false);

  const { data, isLoading } = useQuery<NotificationsResponse>({
    queryKey: ['notifications', activeClient?.id],
    queryFn: async () => {
      if (!activeClient?.id) return { notifications: [], unreadCount: 0 };
      const res = await fetch(`/api/notifications?brandId=${activeClient.id}&limit=30`);
      if (!res.ok) throw new Error('Failed to fetch notifications');
      return res.json();
    },
    enabled: !!activeClient?.id,
    refetchInterval: 30000,
  });

  const markAsReadMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/notifications/${id}/read`, { method: 'PATCH' });
      if (!res.ok) throw new Error('Failed to mark as read');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications', activeClient?.id] });
    },
  });

  const markAllAsReadMutation = useMutation({
    mutationFn: async () => {
      if (!activeClient?.id) return;
      const res = await fetch('/api/notifications/read-all', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ brandId: activeClient.id }),
      });
      if (!res.ok) throw new Error('Failed to mark all as read');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications', activeClient?.id] });
    },
  });

  const unreadCount = data?.unreadCount || 0;
  const notifications = data?.notifications || [];

  const handleNotificationClick = (notification: Notification) => {
    if (!notification.isRead) {
      markAsReadMutation.mutate(notification.id);
    }
    if (notification.clickUrl) {
      setIsOpen(false);
    }
  };

  const bellButton = (
    <Button
      variant="ghost"
      size="icon"
      className={cn(
        "relative h-9 w-9 text-gray-500 hover:text-gray-700 hover:bg-gray-100",
        unreadCount > 0 && "text-gray-700"
      )}
      data-testid="button-notifications"
    >
      <Bell className="h-4 w-4" />
      {unreadCount > 0 && (
        <span 
          className="absolute -top-0.5 -right-0.5 h-4 min-w-4 px-1 rounded-full bg-red-500 text-white text-[10px] font-medium flex items-center justify-center"
          data-testid="badge-notification-count"
        >
          {unreadCount > 99 ? '99+' : unreadCount}
        </span>
      )}
    </Button>
  );

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        {isCollapsed ? (
          <Tooltip>
            <TooltipTrigger asChild>
              {bellButton}
            </TooltipTrigger>
            <TooltipContent side="right">
              <p>Notificaciones {unreadCount > 0 && `(${unreadCount})`}</p>
            </TooltipContent>
          </Tooltip>
        ) : (
          bellButton
        )}
      </PopoverTrigger>
      <PopoverContent 
        className="w-80 p-0" 
        align={isCollapsed ? "start" : "end"}
        side={isCollapsed ? "right" : "bottom"}
      >
        <div className="flex items-center justify-between px-4 py-3 border-b">
          <h3 className="font-semibold text-sm">Notificaciones</h3>
          {unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="h-7 text-xs text-gray-500 hover:text-gray-700"
              onClick={() => markAllAsReadMutation.mutate()}
              disabled={markAllAsReadMutation.isPending}
              data-testid="button-mark-all-read"
            >
              <CheckCheck className="h-3.5 w-3.5 mr-1" />
              Marcar todas leídas
            </Button>
          )}
        </div>
        
        <ScrollArea className="h-[320px]">
          {isLoading ? (
            <div className="flex items-center justify-center h-20">
              <div className="animate-spin h-5 w-5 border-2 border-gray-300 border-t-gray-600 rounded-full" />
            </div>
          ) : notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-32 text-gray-400">
              <Bell className="h-8 w-8 mb-2 opacity-50" />
              <p className="text-sm">Sin notificaciones</p>
            </div>
          ) : (
            <div className="divide-y">
              {notifications.map((notification) => (
                <NotificationItem
                  key={notification.id}
                  notification={notification}
                  onClick={() => handleNotificationClick(notification)}
                />
              ))}
            </div>
          )}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}

function NotificationItem({ 
  notification, 
  onClick 
}: { 
  notification: Notification; 
  onClick: () => void;
}) {
  const icon = typeIcons[notification.type] || <Bell className="h-4 w-4 text-gray-400" />;
  const bgColor = typeColors[notification.type] || 'bg-gray-50 border-gray-100';
  
  const timeAgo = formatDistanceToNow(new Date(notification.updatedAt), {
    addSuffix: true,
    locale: es,
  });

  const content = (
    <div
      className={cn(
        "flex gap-3 p-3 cursor-pointer transition-colors hover:bg-gray-50",
        !notification.isRead && "bg-blue-50/50"
      )}
      onClick={onClick}
      data-testid={`notification-item-${notification.id}`}
    >
      <div className={cn(
        "h-8 w-8 rounded-full flex items-center justify-center shrink-0 border",
        bgColor
      )}>
        {icon}
      </div>
      
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <p className={cn(
            "text-sm leading-tight",
            !notification.isRead && "font-medium text-gray-900"
          )}>
            {notification.title}
            {notification.count > 1 && (
              <span className="ml-1 text-xs text-gray-500">
                ({notification.count})
              </span>
            )}
          </p>
          {!notification.isRead && (
            <div className="h-2 w-2 rounded-full bg-blue-500 shrink-0 mt-1.5" />
          )}
        </div>
        
        {notification.description && (
          <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">
            {notification.description}
          </p>
        )}
        
        <div className="flex items-center gap-2 mt-1">
          <span className="text-[10px] text-gray-400">{timeAgo}</span>
          {notification.platform && (
            <span className="text-[10px] px-1.5 py-0.5 bg-gray-100 rounded text-gray-500 capitalize">
              {notification.platform}
            </span>
          )}
          {notification.clickUrl && (
            <ExternalLink className="h-3 w-3 text-gray-400" />
          )}
        </div>
      </div>
    </div>
  );

  if (notification.clickUrl) {
    return (
      <Link href={notification.clickUrl}>
        {content}
      </Link>
    );
  }

  return content;
}
