import React, { useState, useEffect } from 'react';
import { useNexus } from '@/context/NexusContext';
import { cn } from '@/lib/utils';
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
  MessageSquare
} from 'lucide-react';
import { FaInstagram, FaFacebook, FaLinkedin, FaTiktok, FaYoutube } from 'react-icons/fa';
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { formatDistanceToNow } from 'date-fns';
import { Platform, MessageType, Urgency, Intent, Sentiment, Message } from '@/lib/mockData';
import { motion, AnimatePresence } from "framer-motion";

export function Inbox() {
  const { messages, activeClientId } = useNexus();
  const [selectedMessageId, setSelectedMessageId] = useState<string | null>(null);
  
  // Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [intentFilter, setIntentFilter] = useState<Intent | 'all'>('all');
  const [fireMode, setFireMode] = useState(false);

  // Filter Logic
  const filteredMessages = messages
    .filter(m => m.clientId === activeClientId)
    .filter(m => {
      if (fireMode && m.urgency !== 'high') return false;
      if (intentFilter !== 'all' && m.intent !== intentFilter) return false;
      if (searchQuery && !m.content.toLowerCase().includes(searchQuery.toLowerCase()) && !m.author.toLowerCase().includes(searchQuery.toLowerCase())) return false;
      return true;
    })
    .sort((a, b) => {
       // Sort by urgency first if Fire Mode is on, otherwise by date
       if (fireMode) {
           const urgencyScore = { high: 3, medium: 2, low: 1 };
           if (urgencyScore[a.urgency] !== urgencyScore[b.urgency]) {
               return urgencyScore[b.urgency] - urgencyScore[a.urgency];
           }
       }
       return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
    });

  // Auto-select first message
  useEffect(() => {
    if (filteredMessages.length > 0 && !filteredMessages.find(m => m.id === selectedMessageId)) {
      setSelectedMessageId(filteredMessages[0].id);
    }
  }, [filteredMessages, selectedMessageId]);

  const selectedMessage = messages.find(m => m.id === selectedMessageId);

  return (
    <div className="h-full flex bg-background overflow-hidden">
      {/* COLUMN 2: Message List */}
      <div className="w-[400px] border-r flex flex-col bg-white relative z-10 shadow-sm">
        
        {/* Header / Title */}
        <div className="h-16 border-b px-6 flex items-center justify-between shrink-0">
          <h1 className="font-bold text-xl tracking-tight text-gray-900">Inbox</h1>
          <div className="flex items-center gap-2">
             <Badge variant="outline" className="font-normal text-gray-500">
               {filteredMessages.length} messages
             </Badge>
          </div>
        </div>

        {/* Filter Bar (The "Playground" for AI) */}
        <div className="p-4 border-b space-y-4 bg-gray-50/50">
          <div className="relative">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input 
              placeholder="Search..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 bg-white border-gray-200 focus:ring-offset-0" 
            />
          </div>

          <div className="flex items-center justify-between gap-3">
            <div className="flex-1">
                <Select value={intentFilter} onValueChange={(val: any) => setIntentFilter(val)}>
                <SelectTrigger className="w-full bg-white border-gray-200 h-9 text-sm">
                    <SelectValue placeholder="Filter by Intent" />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="all">All Intents</SelectItem>
                    <SelectItem value="sales">Sales / Leads</SelectItem>
                    <SelectItem value="support">Support</SelectItem>
                    <SelectItem value="complaint">Complaints</SelectItem>
                    <SelectItem value="general">General</SelectItem>
                </SelectContent>
                </Select>
            </div>

            <div className="flex items-center gap-2 shrink-0 bg-white px-3 py-1.5 rounded-md border border-gray-200 shadow-sm" title="Fire Mode: Show High Urgency Only">
                <Switch 
                    id="fire-mode" 
                    checked={fireMode} 
                    onCheckedChange={setFireMode} 
                    className="data-[state=checked]:bg-red-500 scale-90"
                />
                <Label htmlFor="fire-mode" className={cn("text-xs font-semibold cursor-pointer select-none", fireMode ? "text-red-600" : "text-gray-500")}>
                    <span className="flex items-center gap-1">Fire Mode <Flame className={cn("h-3.5 w-3.5", fireMode && "fill-red-500")} /></span>
                </Label>
            </div>
          </div>
        </div>

        {/* Messages List */}
        <ScrollArea className="flex-1 bg-gray-50/30">
          <div className="flex flex-col p-2 gap-2">
            <AnimatePresence mode="popLayout">
              {filteredMessages.length === 0 ? (
                 <div className="p-8 text-center text-muted-foreground text-sm">
                    No messages match your filters.
                 </div>
              ) : (
                filteredMessages.map((msg) => (
                  <MessageCard 
                    key={msg.id} 
                    message={msg} 
                    isSelected={selectedMessageId === msg.id} 
                    onClick={() => setSelectedMessageId(msg.id)} 
                  />
                ))
              )}
            </AnimatePresence>
          </div>
        </ScrollArea>
      </div>

      {/* COLUMN 3: Chat Detail */}
      <div className="flex-1 flex flex-col bg-white relative min-w-0">
        {selectedMessage ? (
          <>
            {/* Chat Header - AI Summary */}
            <header className="h-auto min-h-[64px] border-b px-6 py-4 flex flex-col justify-center shrink-0 bg-white z-20 shadow-[0_1px_3px_rgba(0,0,0,0.02)]">
               <div className="flex items-start justify-between gap-4">
                 <div className="flex items-center gap-3">
                    <Avatar className="h-10 w-10 ring-2 ring-offset-2 ring-gray-50">
                        <AvatarFallback className="bg-gray-100 font-bold text-gray-600">{selectedMessage.author.substring(0,2).toUpperCase()}</AvatarFallback>
                    </Avatar>
                    <div>
                        <h2 className="font-bold text-gray-900 flex items-center gap-2">
                            {selectedMessage.author}
                            <PlatformBadge platform={selectedMessage.platform} size="sm" />
                        </h2>
                        <div className="flex items-center gap-2 mt-1">
                             <SentimentIndicator sentiment={selectedMessage.sentiment} showLabel />
                             <span className="text-gray-300 text-[10px]">|</span>
                             <span className="text-xs text-muted-foreground">{selectedMessage.type === 'dm' ? 'Direct Message' : 'Comment'}</span>
                        </div>
                    </div>
                 </div>
                 <Button variant="ghost" size="icon" className="text-gray-400 hover:text-gray-600">
                    <MoreVertical className="h-5 w-5" />
                 </Button>
               </div>

               {/* AI Summary Box */}
               <div className="mt-4 bg-gradient-to-r from-indigo-50 to-blue-50 rounded-lg p-3 border border-indigo-100 flex items-start gap-3">
                  <div className="bg-indigo-100 p-1.5 rounded-md shrink-0">
                      <Sparkles className="h-4 w-4 text-indigo-600" />
                  </div>
                  <div className="text-sm text-indigo-900 leading-snug">
                      <span className="font-semibold text-indigo-700">AI Analysis:</span> {selectedMessage.aiSummary || "Analyzing conversation context..."}
                      <div className="flex items-center gap-2 mt-2">
                          <span className="text-xs font-medium text-indigo-600 uppercase tracking-wider">Urgency Level:</span>
                          <UrgencyBadge urgency={selectedMessage.urgency} />
                      </div>
                  </div>
               </div>
            </header>

            {/* Chat Content */}
            <ScrollArea className="flex-1 p-8 bg-gray-50/30">
               <div className="max-w-3xl mx-auto space-y-6">
                  {/* Date Separator */}
                  <div className="flex justify-center">
                      <span className="text-[10px] font-medium text-gray-400 bg-gray-100 px-3 py-1 rounded-full">
                          {new Date(selectedMessage.timestamp).toLocaleDateString()}
                      </span>
                  </div>

                  {/* The Message Bubble */}
                  <div className="flex gap-4 group">
                     <Avatar className="h-8 w-8 mt-1 opacity-80 group-hover:opacity-100 transition-opacity">
                        <AvatarFallback className="bg-gray-200 text-gray-500"><User className="h-4 w-4" /></AvatarFallback>
                     </Avatar>
                     <div className="flex flex-col gap-1 max-w-[85%]">
                        <div className="flex items-baseline gap-2 mb-1">
                            <span className="text-sm font-medium text-gray-900">{selectedMessage.author}</span>
                            <span className="text-[10px] text-muted-foreground">{new Date(selectedMessage.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                        </div>
                        <div className={cn(
                            "p-4 rounded-2xl text-sm leading-relaxed shadow-sm relative",
                            selectedMessage.type === 'dm' 
                                ? "bg-white border border-gray-200 text-gray-800 rounded-tl-none" // DM Style
                                : "bg-blue-50/50 border border-blue-100 text-blue-900 rounded-tl-none" // Comment Style (Public)
                        )}>
                           {selectedMessage.type === 'comment' && (
                               <div className="absolute -top-3 right-3 bg-blue-100 text-blue-700 text-[9px] font-bold px-1.5 py-0.5 rounded border border-blue-200 uppercase tracking-wide">
                                   Public Comment
                               </div>
                           )}
                           {selectedMessage.content}
                        </div>
                     </div>
                  </div>
               </div>
            </ScrollArea>

            {/* Composer (Mock) */}
            <div className="p-4 border-t bg-white">
               <div className="relative rounded-xl border shadow-sm overflow-hidden focus-within:ring-1 focus-within:ring-indigo-500 focus-within:border-indigo-500 transition-all">
                   <textarea 
                      className="w-full min-h-[80px] p-3 resize-none text-sm focus:outline-none"
                      placeholder="Type a reply..."
                   />
                   <div className="bg-gray-50 p-2 flex items-center justify-between border-t border-gray-100">
                       <div className="flex gap-1">
                           {/* Toolbar icons would go here */}
                       </div>
                       <Button size="sm" className="h-8 gap-2">
                           Send <Send className="h-3.5 w-3.5" />
                       </Button>
                   </div>
               </div>
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
    </div>
  );
}

// --- Sub-Components ---

function MessageCard({ message, isSelected, onClick }: { message: Message, isSelected: boolean, onClick: () => void }) {
    // Urgency Color Bar
    const urgencyColor: Record<Urgency, string> = {
        high: "bg-red-500",
        medium: "bg-yellow-400",
        low: "bg-transparent group-hover:bg-gray-200"
    };

    return (
        <motion.button
            layout
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95 }}
            onClick={onClick}
            className={cn(
                "w-full text-left bg-white rounded-lg border border-gray-100 hover:border-gray-300 hover:shadow-md transition-all duration-200 relative overflow-hidden group pl-3 py-3 pr-3",
                isSelected && "ring-2 ring-indigo-500 ring-offset-1 border-transparent shadow-md z-10"
            )}
        >
            {/* Urgency Indicator Bar */}
            <div className={cn("absolute left-0 top-0 bottom-0 w-[4px]", urgencyColor[message.urgency])} />

            <div className="flex items-start gap-3">
                {/* Avatar & Icon */}
                <div className="relative shrink-0">
                    <Avatar className="h-10 w-10 border border-gray-100">
                        <AvatarFallback className="text-xs font-bold text-gray-600 bg-gray-100">
                            {message.author.substring(0,2).toUpperCase()}
                        </AvatarFallback>
                    </Avatar>
                    <div className="absolute -bottom-1 -right-1 bg-white rounded-full p-0.5 shadow-sm">
                        <PlatformIcon platform={message.platform} className="h-4 w-4" />
                    </div>
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-0.5">
                        <span className={cn("text-sm font-bold truncate text-gray-900", message.status === 'unread' && "")}>
                            {message.author}
                        </span>
                        <span className="text-[10px] text-gray-400 whitespace-nowrap shrink-0 ml-2">
                            {formatDistanceToNow(new Date(message.timestamp), { addSuffix: false }).replace('about ', '')}
                        </span>
                    </div>
                    
                    <div className="flex items-center gap-1.5 mb-1.5">
                        <IntentBadge intent={message.intent} />
                    </div>

                    <p className={cn(
                        "text-sm line-clamp-2 leading-relaxed text-gray-600", 
                        message.status === 'unread' ? "font-medium text-gray-900" : ""
                    )}>
                        {message.content}
                    </p>
                    
                    <div className="flex items-center justify-end mt-2 opacity-60 group-hover:opacity-100 transition-opacity">
                        <SentimentIndicator sentiment={message.sentiment} />
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

function PlatformIcon({ platform, className }: { platform: Platform, className?: string }) {
  switch(platform) {
    case 'instagram': return <FaInstagram className={cn("text-pink-600", className)} />;
    case 'facebook': return <FaFacebook className={cn("text-blue-600", className)} />;
    case 'linkedin': return <FaLinkedin className={cn("text-[#0077b5]", className)} />;
    case 'tiktok': return <FaTiktok className={cn("text-black", className)} />;
    case 'youtube': return <FaYoutube className={cn("text-red-600", className)} />;
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
