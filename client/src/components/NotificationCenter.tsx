import React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNexus } from '@/context/NexusContext';
import { 
  Bell, Check, CheckCheck, MessageSquare, AlertCircle, Bot, Settings, 
  ExternalLink, Loader2, FileEdit, Filter, X
} from 'lucide-react';
import { FaInstagram, FaTiktok, FaFacebook, FaLinkedin, FaYoutube, FaWhatsapp } from 'react-icons/fa';
import { Button } from '@/components/ui/button';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';
import { Link } from 'wouter';

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

const typeConfig: Record<string, { icon: React.ReactNode; bgColor: string; borderColor: string }> = {
  'new_messages': { 
    icon: <MessageSquare className="h-4 w-4" />, 
    bgColor: 'bg-blue-500',
    borderColor: 'border-blue-200'
  },
  'sync_error': { 
    icon: <AlertCircle className="h-4 w-4" />, 
    bgColor: 'bg-red-500',
    borderColor: 'border-red-200'
  },
  'sync_success': { 
    icon: <Check className="h-4 w-4" />, 
    bgColor: 'bg-green-500',
    borderColor: 'border-green-200'
  },
  'ai_auto_reply': { 
    icon: <Bot className="h-4 w-4" />, 
    bgColor: 'bg-violet-500',
    borderColor: 'border-violet-200'
  },
  'config_change': { 
    icon: <Settings className="h-4 w-4" />, 
    bgColor: 'bg-gray-500',
    borderColor: 'border-gray-200'
  },
  'draft_pending': { 
    icon: <FileEdit className="h-4 w-4" />, 
    bgColor: 'bg-amber-500',
    borderColor: 'border-amber-200'
  },
};

const platformIcons: Record<string, React.ReactNode> = {
  'instagram': <FaInstagram className="h-3 w-3" />,
  'tiktok': <FaTiktok className="h-3 w-3" />,
  'facebook': <FaFacebook className="h-3 w-3" />,
  'linkedin': <FaLinkedin className="h-3 w-3" />,
  'youtube': <FaYoutube className="h-3 w-3" />,
  'whatsapp': <FaWhatsapp className="h-3 w-3" />,
  'google-business': <span className="text-[10px] font-bold">G</span>,
};

const platformColors: Record<string, string> = {
  'instagram': 'bg-gradient-to-br from-purple-500 to-pink-500',
  'tiktok': 'bg-black',
  'facebook': 'bg-blue-600',
  'linkedin': 'bg-[#0077b5]',
  'youtube': 'bg-red-600',
  'whatsapp': 'bg-green-500',
  'google-business': 'bg-blue-500',
};

const typeLabels: Record<string, string> = {
  'new_messages': 'Nuevos mensajes',
  'ai_auto_reply': 'IA enviada',
  'draft_pending': 'Borrador',
  'sync_error': 'Error sync',
  'sync_success': 'Sync OK',
  'config_change': 'Config',
};

const platformLabels: Record<string, string> = {
  'instagram': 'Instagram',
  'tiktok': 'TikTok',
  'facebook': 'Facebook',
  'linkedin': 'LinkedIn',
  'youtube': 'YouTube',
  'whatsapp': 'WhatsApp',
  'google-business': 'Google',
};

type ReadFilter = 'all' | 'unread' | 'read';

interface NotificationCenterProps {
  isCollapsed?: boolean;
}

export function NotificationCenter({ isCollapsed = false }: NotificationCenterProps) {
  const { activeClient } = useNexus();
  const queryClient = useQueryClient();
  const [isOpen, setIsOpen] = React.useState(false);
  const [showFilters, setShowFilters] = React.useState(false);
  const [selectedTypes, setSelectedTypes] = React.useState<string[]>([]);
  const [selectedPlatforms, setSelectedPlatforms] = React.useState<string[]>([]);
  const [readFilter, setReadFilter] = React.useState<ReadFilter>('all');

  const { data, isLoading, refetch } = useQuery<NotificationsResponse>({
    queryKey: ['notifications', activeClient?.id],
    queryFn: async () => {
      if (!activeClient?.id) return { notifications: [], unreadCount: 0 };
      const res = await fetch(`/api/notifications?brandId=${activeClient.id}&limit=50`);
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

  const availableTypes = React.useMemo(() => {
    const types = new Set(notifications.map(n => n.type));
    return Array.from(types).filter(t => typeLabels[t]);
  }, [notifications]);

  const availablePlatforms = React.useMemo(() => {
    const platforms = new Set(notifications.map(n => n.platform).filter(Boolean) as string[]);
    return Array.from(platforms).filter(p => platformLabels[p]);
  }, [notifications]);

  const filteredNotifications = React.useMemo(() => {
    return notifications.filter(n => {
      if (selectedTypes.length > 0 && !selectedTypes.includes(n.type)) return false;
      if (selectedPlatforms.length > 0 && (!n.platform || !selectedPlatforms.includes(n.platform))) return false;
      if (readFilter === 'unread' && n.isRead) return false;
      if (readFilter === 'read' && !n.isRead) return false;
      return true;
    });
  }, [notifications, selectedTypes, selectedPlatforms, readFilter]);

  const hasActiveFilters = selectedTypes.length > 0 || selectedPlatforms.length > 0 || readFilter !== 'all';

  const clearFilters = () => {
    setSelectedTypes([]);
    setSelectedPlatforms([]);
    setReadFilter('all');
  };

  const toggleType = (type: string) => {
    setSelectedTypes(prev => 
      prev.includes(type) ? prev.filter(t => t !== type) : [...prev, type]
    );
  };

  const togglePlatform = (platform: string) => {
    setSelectedPlatforms(prev => 
      prev.includes(platform) ? prev.filter(p => p !== platform) : [...prev, platform]
    );
  };

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
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      {isCollapsed ? (
        <Tooltip>
          <TooltipTrigger asChild>
            <SheetTrigger asChild>
              {bellButton}
            </SheetTrigger>
          </TooltipTrigger>
          <TooltipContent side="right">
            <p>Notificaciones {unreadCount > 0 && `(${unreadCount})`}</p>
          </TooltipContent>
        </Tooltip>
      ) : (
        <SheetTrigger asChild>
          {bellButton}
        </SheetTrigger>
      )}
      
      <SheetContent 
        side="right" 
        className="w-[400px] sm:w-[400px] p-0 flex flex-col"
      >
        <div className="flex items-center justify-between px-5 py-4 border-b bg-white">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-full bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center">
              <Bell className="h-4 w-4 text-white" />
            </div>
            <div>
              <SheetTitle className="text-base font-semibold">Notificaciones</SheetTitle>
              <p className="text-xs text-gray-500">
                {unreadCount > 0 ? `${unreadCount} sin leer` : 'Todas leídas'}
              </p>
            </div>
          </div>
        </div>
        
        <div className="px-5 py-2 border-b bg-gray-50/50 flex items-center justify-between gap-2">
          {unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="h-7 text-xs text-blue-600 hover:text-blue-700 hover:bg-blue-100 gap-1.5"
              onClick={() => markAllAsReadMutation.mutate()}
              disabled={markAllAsReadMutation.isPending}
              data-testid="button-mark-all-read"
            >
              <CheckCheck className="h-3.5 w-3.5" />
              Marcar todas como leídas
            </Button>
          )}
          <div className="flex-1" />
          <Button
            variant={showFilters ? "secondary" : "ghost"}
            size="sm"
            className={cn(
              "h-7 text-xs gap-1.5",
              hasActiveFilters && "text-indigo-600"
            )}
            onClick={() => setShowFilters(!showFilters)}
            data-testid="button-toggle-filters"
          >
            <Filter className="h-3.5 w-3.5" />
            Filtros
            {hasActiveFilters && (
              <span className="ml-0.5 h-4 min-w-4 px-1 rounded-full bg-indigo-500 text-white text-[10px] font-medium flex items-center justify-center">
                {selectedTypes.length + selectedPlatforms.length + (readFilter !== 'all' ? 1 : 0)}
              </span>
            )}
          </Button>
        </div>

        {showFilters && (
          <div className="px-4 py-3 border-b bg-gray-50 space-y-3">
            {availableTypes.length > 0 && (
              <div>
                <p className="text-[10px] font-medium text-gray-500 uppercase mb-1.5">Tipo</p>
                <div className="flex flex-wrap gap-1.5">
                  {availableTypes.map(type => (
                    <button
                      key={type}
                      onClick={() => toggleType(type)}
                      className={cn(
                        "px-2 py-1 text-[11px] rounded-full border transition-colors",
                        selectedTypes.includes(type)
                          ? "bg-indigo-100 border-indigo-300 text-indigo-700"
                          : "bg-white border-gray-200 text-gray-600 hover:bg-gray-100"
                      )}
                      data-testid={`filter-type-${type}`}
                    >
                      {typeLabels[type]}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {availablePlatforms.length > 0 && (
              <div>
                <p className="text-[10px] font-medium text-gray-500 uppercase mb-1.5">Red social</p>
                <div className="flex flex-wrap gap-1.5">
                  {availablePlatforms.map(platform => (
                    <button
                      key={platform}
                      onClick={() => togglePlatform(platform)}
                      className={cn(
                        "px-2 py-1 text-[11px] rounded-full border transition-colors flex items-center gap-1",
                        selectedPlatforms.includes(platform)
                          ? "bg-indigo-100 border-indigo-300 text-indigo-700"
                          : "bg-white border-gray-200 text-gray-600 hover:bg-gray-100"
                      )}
                      data-testid={`filter-platform-${platform}`}
                    >
                      {platformIcons[platform]}
                      {platformLabels[platform]}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div>
              <p className="text-[10px] font-medium text-gray-500 uppercase mb-1.5">Estado</p>
              <div className="flex flex-wrap gap-1.5">
                {(['all', 'unread', 'read'] as ReadFilter[]).map(filter => (
                  <button
                    key={filter}
                    onClick={() => setReadFilter(filter)}
                    className={cn(
                      "px-2 py-1 text-[11px] rounded-full border transition-colors",
                      readFilter === filter
                        ? "bg-indigo-100 border-indigo-300 text-indigo-700"
                        : "bg-white border-gray-200 text-gray-600 hover:bg-gray-100"
                    )}
                    data-testid={`filter-read-${filter}`}
                  >
                    {filter === 'all' ? 'Todas' : filter === 'unread' ? 'Sin leer' : 'Leídas'}
                  </button>
                ))}
              </div>
            </div>

            {hasActiveFilters && (
              <Button
                variant="ghost"
                size="sm"
                className="h-6 text-[11px] text-gray-500 hover:text-gray-700 px-2"
                onClick={clearFilters}
                data-testid="button-clear-filters"
              >
                <X className="h-3 w-3 mr-1" />
                Limpiar filtros
              </Button>
            )}
          </div>
        )}
        
        <ScrollArea className="flex-1">
          {isLoading ? (
            <div className="flex items-center justify-center h-32">
              <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
            </div>
          ) : notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 text-gray-400 px-8">
              <div className="h-16 w-16 rounded-full bg-gray-100 flex items-center justify-center mb-4">
                <Bell className="h-8 w-8 text-gray-300" />
              </div>
              <p className="text-sm font-medium text-gray-500">Sin notificaciones</p>
              <p className="text-xs text-gray-400 text-center mt-1">
                Las notificaciones de nuevos mensajes, respuestas IA y errores aparecerán aquí
              </p>
            </div>
          ) : filteredNotifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 text-gray-400 px-8">
              <div className="h-16 w-16 rounded-full bg-gray-100 flex items-center justify-center mb-4">
                <Filter className="h-8 w-8 text-gray-300" />
              </div>
              <p className="text-sm font-medium text-gray-500">Sin resultados</p>
              <p className="text-xs text-gray-400 text-center mt-1">
                No hay notificaciones que coincidan con los filtros seleccionados
              </p>
              <Button
                variant="ghost"
                size="sm"
                className="mt-3 h-7 text-xs text-indigo-600"
                onClick={clearFilters}
                data-testid="button-clear-filters-empty"
              >
                Limpiar filtros
              </Button>
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {filteredNotifications.map((notification) => (
                <NotificationItem
                  key={notification.id}
                  notification={notification}
                  onClick={() => handleNotificationClick(notification)}
                />
              ))}
            </div>
          )}
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}

function NotificationItem({ 
  notification, 
  onClick 
}: { 
  notification: Notification; 
  onClick: () => void;
}) {
  const config = typeConfig[notification.type] || { 
    icon: <Bell className="h-4 w-4" />, 
    bgColor: 'bg-gray-500',
    borderColor: 'border-gray-200'
  };
  
  const timeAgo = formatDistanceToNow(new Date(notification.updatedAt), {
    addSuffix: true,
    locale: es,
  });

  const platformIcon = notification.platform ? platformIcons[notification.platform] : null;
  const platformColor = notification.platform ? platformColors[notification.platform] : null;
  
  const displayIcon = platformIcon || config.icon;
  const displayColor = platformColor || config.bgColor;

  const content = (
    <div
      className={cn(
        "flex gap-3 px-5 py-4 cursor-pointer transition-all hover:bg-gray-50",
        !notification.isRead && "bg-blue-50/30 border-l-2 border-l-blue-500"
      )}
      onClick={onClick}
      data-testid={`notification-item-${notification.id}`}
    >
      <div className={cn(
        "h-6 w-6 rounded-full flex items-center justify-center text-white shrink-0 mt-0.5",
        displayColor
      )}>
        {displayIcon}
      </div>
      
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <p className={cn(
              "text-sm leading-tight",
              !notification.isRead ? "font-semibold text-gray-900" : "font-medium text-gray-700"
            )}>
              {notification.title}
              {notification.count > 1 && (
                <span className="ml-1.5 text-xs font-normal text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded-full">
                  {notification.count}
                </span>
              )}
            </p>
            
            {notification.description && (
              <p className="text-xs text-gray-500 mt-1 line-clamp-2 leading-relaxed">
                {notification.description}
              </p>
            )}
          </div>
          
          {!notification.isRead && (
            <div className="h-2.5 w-2.5 rounded-full bg-blue-500 shrink-0 mt-1" />
          )}
        </div>
        
        <div className="flex items-center gap-2 mt-2">
          <span className="text-[11px] text-gray-400 font-medium">{timeAgo}</span>
          
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
