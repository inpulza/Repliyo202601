import React from 'react';
import { useNexus } from '@/context/NexusContext';
import { cn } from '@/lib/utils';
import { 
  Check, 
  Clock, 
  Send, 
  MessageSquare, 
  RefreshCw,
  MoreHorizontal,
  Sparkles,
  Loader2
} from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { formatDistanceToNow } from 'date-fns';
import { Message, MessageStatus } from '@/lib/mockData';

export function Inbox() {
  const { messages, activeClientId, approveMessage, refreshFeed } = useNexus();
  
  const clientMessages = messages
    .filter(m => m.clientId === activeClientId)
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

  const pendingMessages = clientMessages.filter(m => ['unread', 'drafting', 'ready_for_review'].includes(m.status));
  const completedMessages = clientMessages.filter(m => ['approved', 'sent'].includes(m.status));

  return (
    <div className="h-full flex flex-col bg-muted/30">
      <header className="h-16 border-b bg-background px-6 flex items-center justify-between sticky top-0 z-10">
        <div className="flex items-center gap-4">
          <h1 className="text-xl font-semibold tracking-tight">Unified Inbox</h1>
          <Badge variant="secondary" className="ml-2">
            {pendingMessages.length} Pending
          </Badge>
        </div>
        <Button variant="outline" size="sm" onClick={refreshFeed} className="gap-2">
          <RefreshCw className="h-4 w-4" />
          Sync Feed
        </Button>
      </header>

      <div className="flex-1 overflow-hidden p-6">
        <Tabs defaultValue="pending" className="h-full flex flex-col">
          <TabsList className="w-[400px] mb-4">
            <TabsTrigger value="pending" className="flex-1">Needs Attention</TabsTrigger>
            <TabsTrigger value="completed" className="flex-1">History</TabsTrigger>
          </TabsList>

          <ScrollArea className="flex-1 pr-4 -mr-4">
            <TabsContent value="pending" className="space-y-4 mt-0">
              {pendingMessages.length === 0 ? (
                <div className="h-[400px] flex flex-col items-center justify-center text-muted-foreground">
                  <Check className="h-12 w-12 mb-4 text-green-500/50" />
                  <p className="text-lg font-medium">All caught up!</p>
                  <p className="text-sm">No pending messages for this client.</p>
                </div>
              ) : (
                pendingMessages.map(msg => (
                  <MessageCard key={msg.id} message={msg} onApprove={() => approveMessage(msg.id)} />
                ))
              )}
            </TabsContent>

            <TabsContent value="completed" className="space-y-4 mt-0">
               {completedMessages.length === 0 ? (
                <div className="h-[400px] flex flex-col items-center justify-center text-muted-foreground">
                  <MessageSquare className="h-12 w-12 mb-4 opacity-20" />
                  <p>No message history yet.</p>
                </div>
              ) : (
                completedMessages.map(msg => (
                  <MessageCard key={msg.id} message={msg} isHistory />
                ))
              )}
            </TabsContent>
          </ScrollArea>
        </Tabs>
      </div>
    </div>
  );
}

function MessageCard({ message, onApprove, isHistory = false }: { message: Message; onApprove?: () => void; isHistory?: boolean }) {
  return (
    <Card className={cn(
      "overflow-hidden transition-all duration-200 border-l-4",
      message.status === 'unread' && "border-l-blue-500",
      message.status === 'drafting' && "border-l-yellow-500",
      message.status === 'ready_for_review' && "border-l-green-500 shadow-md",
      (message.status === 'approved' || message.status === 'sent') && "border-l-slate-200 opacity-75 hover:opacity-100"
    )}>
      <CardHeader className="p-4 pb-3 flex flex-row items-start gap-4 space-y-0">
        <Avatar className="mt-1 h-10 w-10 border">
          <AvatarFallback className="bg-slate-100 text-slate-600 font-bold">
            {message.author.substring(1,3).toUpperCase()}
          </AvatarFallback>
        </Avatar>
        
        <div className="flex-1">
          <div className="flex items-center justify-between mb-1">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-sm">{message.author}</span>
              <span className="text-xs text-muted-foreground font-normal">via {message.platform}</span>
            </div>
            <span className="text-xs text-muted-foreground">
              {formatDistanceToNow(new Date(message.timestamp), { addSuffix: true })}
            </span>
          </div>
          <p className="text-sm text-slate-800 leading-relaxed">
            {message.content}
          </p>
        </div>
      </CardHeader>

      {/* Agent Section */}
      <div className="bg-slate-50/50 border-t p-4">
        <div className="flex items-start gap-3">
          <div className={cn(
            "h-8 w-8 rounded-full flex items-center justify-center shrink-0",
            message.status === 'drafting' ? "bg-yellow-100 text-yellow-600 animate-pulse" : 
            message.status === 'ready_for_review' ? "bg-green-100 text-green-600" :
            "bg-slate-100 text-slate-500"
          )}>
            <Sparkles className="h-4 w-4" />
          </div>

          <div className="flex-1">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                {message.status === 'drafting' ? 'AI Agent Drafting...' : 'Suggested Response'}
              </span>
              <StatusBadge status={message.status} />
            </div>

            {message.status === 'drafting' ? (
              <div className="h-6 w-3/4 bg-slate-200/50 rounded animate-pulse" />
            ) : message.draftResponse ? (
              <div className="relative group">
                <textarea 
                  readOnly={isHistory}
                  className="w-full bg-white border rounded-md p-3 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary/20 min-h-[80px]"
                  defaultValue={message.draftResponse}
                />
                {!isHistory && message.status === 'ready_for_review' && (
                  <div className="mt-3 flex items-center justify-end gap-2">
                    <Button variant="outline" size="sm" className="text-xs h-8">
                      Edit
                    </Button>
                    <Button 
                      size="sm" 
                      className="text-xs h-8 bg-green-600 hover:bg-green-700 text-white gap-2"
                      onClick={onApprove}
                    >
                      <Check className="h-3.5 w-3.5" />
                      Approve & Send
                    </Button>
                  </div>
                )}
              </div>
            ) : (
               <div className="text-xs text-muted-foreground italic">Waiting for agent...</div>
            )}
          </div>
        </div>
      </div>
    </Card>
  );
}

function StatusBadge({ status }: { status: MessageStatus }) {
  switch (status) {
    case 'unread':
      return <Badge variant="outline" className="text-xs font-normal">New</Badge>;
    case 'drafting':
      return <Badge variant="secondary" className="text-xs font-normal bg-yellow-50 text-yellow-700 border-yellow-200 gap-1"><Loader2 className="h-3 w-3 animate-spin" /> Thinking</Badge>;
    case 'ready_for_review':
      return <Badge variant="default" className="text-xs font-normal bg-green-600 hover:bg-green-600">Review Ready</Badge>;
    case 'approved':
      return <Badge variant="secondary" className="text-xs font-normal">Approved</Badge>;
    case 'sent':
      return <Badge variant="secondary" className="text-xs font-normal gap-1 text-slate-500"><Check className="h-3 w-3" /> Sent</Badge>;
    default:
      return null;
  }
}
