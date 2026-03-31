import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { 
  MessageSquare, 
  Bot, 
  Clock, 
  CheckCircle, 
  Bell, 
  BellOff,
  AlertCircle,
  FileText,
  UserPlus,
  ArrowRight,
  Loader2
} from 'lucide-react';
import { formatDistanceToNow, format } from 'date-fns';
import { es } from 'date-fns/locale';
import { cn } from "@/lib/utils";
import { api } from '@/lib/api';
import type { TimelineEvent, TimelineEventType, ConversationTimeline as TimelineType } from '@shared/schema';

interface ConversationTimelineProps {
  conversationId?: string;
  contactId?: string;
  maxEvents?: number;
  showSummary?: boolean;
  journeyApiUrl?: string;
}

const getEventIcon = (type: TimelineEventType) => {
  const iconClass = "h-4 w-4";
  switch (type) {
    case 'first_contact':
      return <UserPlus className={cn(iconClass, "text-green-600")} />;
    case 'message_inbound':
      return <MessageSquare className={cn(iconClass, "text-blue-500")} />;
    case 'message_outbound':
      return <ArrowRight className={cn(iconClass, "text-indigo-500")} />;
    case 'ai_reply':
      return <Bot className={cn(iconClass, "text-purple-500")} />;
    case 'reminder_scheduled':
      return <Clock className={cn(iconClass, "text-amber-500")} />;
    case 'reminder_sent':
      return <Bell className={cn(iconClass, "text-orange-500")} />;
    case 'status_change':
      return <CheckCircle className={cn(iconClass, "text-teal-500")} />;
    case 'summary_generated':
      return <FileText className={cn(iconClass, "text-gray-500")} />;
    case 'opt_out':
      return <BellOff className={cn(iconClass, "text-red-500")} />;
    default:
      return <AlertCircle className={cn(iconClass, "text-gray-400")} />;
  }
};

const getEventColor = (type: TimelineEventType): string => {
  switch (type) {
    case 'first_contact':
      return 'bg-green-100 border-green-200';
    case 'message_inbound':
      return 'bg-blue-50 border-blue-200';
    case 'message_outbound':
      return 'bg-indigo-50 border-indigo-200';
    case 'ai_reply':
      return 'bg-purple-50 border-purple-200';
    case 'reminder_scheduled':
    case 'reminder_sent':
      return 'bg-amber-50 border-amber-200';
    case 'status_change':
      return 'bg-teal-50 border-teal-200';
    case 'summary_generated':
      return 'bg-gray-50 border-gray-200';
    case 'opt_out':
      return 'bg-red-50 border-red-200';
    default:
      return 'bg-gray-50 border-gray-200';
  }
};

const TimelineEventCard: React.FC<{ event: TimelineEvent; isFirst?: boolean; isLast?: boolean }> = ({ 
  event, 
  isFirst, 
  isLast 
}) => {
  return (
    <div className="relative flex gap-3" data-testid={`timeline-event-${event.id}`}>
      <div className="flex flex-col items-center">
        <div className={cn(
          "w-8 h-8 rounded-full flex items-center justify-center border-2",
          getEventColor(event.type)
        )}>
          {getEventIcon(event.type)}
        </div>
        {!isLast && (
          <div className="w-0.5 flex-1 bg-gray-200 mt-1" />
        )}
      </div>
      
      <div className="flex-1 pb-4">
        <div className="flex items-start justify-between gap-2">
          <h4 className="text-sm font-medium text-gray-900">{event.title}</h4>
          <span className="text-[10px] text-gray-400 whitespace-nowrap">
            {formatDistanceToNow(new Date(event.timestamp), { addSuffix: true, locale: es })}
          </span>
        </div>
        
        {event.description && (
          <p className="text-xs text-gray-600 mt-1 line-clamp-2">{event.description}</p>
        )}
        
        <p className="text-[10px] text-gray-400 mt-0.5">
          {format(new Date(event.timestamp), "d MMM yyyy, HH:mm", { locale: es })}
        </p>
      </div>
    </div>
  );
};

export function ConversationTimeline({ 
  conversationId, 
  contactId,
  maxEvents = 15,
  showSummary = true,
  journeyApiUrl,
}: ConversationTimelineProps) {
  const conversationQuery = useQuery({
    queryKey: ['conversation-timeline', conversationId],
    queryFn: () => api.conversations.getTimeline(conversationId!),
    enabled: !!conversationId && !contactId,
    staleTime: 30000,
  });

  const contactQuery = useQuery({
    queryKey: ['contact-journey', contactId, journeyApiUrl],
    queryFn: async () => {
      if (journeyApiUrl) {
        const res = await fetch(journeyApiUrl);
        if (!res.ok) throw new Error('Failed to fetch journey');
        return res.json();
      }
      return api.crm.getContactJourney(contactId!);
    },
    enabled: !!contactId,
    staleTime: 30000,
  });

  const isLoading = conversationQuery.isLoading || contactQuery.isLoading;
  const error = conversationQuery.error || contactQuery.error;
  const data = contactId ? contactQuery.data : conversationQuery.data;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-6" data-testid="timeline-loading">
        <Loader2 className="h-5 w-5 animate-spin text-gray-400" />
      </div>
    );
  }

  if (error || !data?.timeline) {
    return (
      <div className="text-center py-4" data-testid="timeline-error">
        <p className="text-xs text-gray-400">No se pudo cargar el timeline</p>
      </div>
    );
  }

  const { timeline } = data;
  const displayEvents = timeline.events.slice(-maxEvents);

  if (displayEvents.length === 0) {
    return (
      <div className="text-center py-4" data-testid="timeline-empty">
        <p className="text-xs text-gray-400">Sin eventos en el timeline</p>
      </div>
    );
  }

  return (
    <div className="space-y-4" data-testid="conversation-timeline">
      {showSummary && timeline.summary && (
        <div className="bg-gradient-to-r from-indigo-50 to-purple-50 rounded-lg p-3 border border-indigo-100">
          <div className="grid grid-cols-2 gap-2 text-center">
            <div>
              <p className="text-lg font-bold text-indigo-700">{timeline.summary.totalMessages}</p>
              <p className="text-[10px] text-gray-500">Mensajes</p>
            </div>
            <div>
              <p className="text-lg font-bold text-purple-700">{timeline.summary.totalReminders}</p>
              <p className="text-[10px] text-gray-500">Recordatorios</p>
            </div>
          </div>
          {timeline.summary.detectedIntent && (
            <div className="mt-2 pt-2 border-t border-indigo-100">
              <p className="text-[10px] text-gray-500">Intención detectada</p>
              <p className="text-xs text-gray-700 line-clamp-2">{timeline.summary.detectedIntent}</p>
            </div>
          )}
        </div>
      )}

      <div className="space-y-0">
        {displayEvents.map((event, index) => (
          <TimelineEventCard 
            key={event.id} 
            event={event}
            isFirst={index === 0}
            isLast={index === displayEvents.length - 1}
          />
        ))}
      </div>

      {timeline.events.length > maxEvents && (
        <p className="text-[10px] text-center text-gray-400">
          Mostrando últimos {maxEvents} de {timeline.events.length} eventos
        </p>
      )}
    </div>
  );
}

export default ConversationTimeline;
