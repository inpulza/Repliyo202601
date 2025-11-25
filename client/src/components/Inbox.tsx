import React, { useState, useEffect } from 'react';
import { useNexus } from '@/context/NexusContext';
import { cn } from '@/lib/utils';
import { CRMContextPanel } from './CRMContextPanel';
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
  MessageSquare,
  Check,
  RefreshCw,
  Loader2,
  LayoutGrid,
  Filter,
  Brain,
  Banknote,
  Inbox as InboxIcon,
  ExternalLink,
} from 'lucide-react';
import { FaInstagram, FaFacebook, FaLinkedin, FaTiktok, FaYoutube, FaWhatsapp } from 'react-icons/fa';
import { GoogleBusinessIcon } from './GoogleBusinessIcon';
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
import { Platform, MessageType, Urgency, Intent, Sentiment, Message, MessageStatus } from '@/lib/mockData';
import { motion, AnimatePresence } from "framer-motion";


// --- New Sub-Component: Quick Stats Widget ---
function QuickStatsWidget({ 
    messages, 
    onCriticalClick, 
    onOpportunitiesClick,
    onPendingClick,
    activeFilters 
}: { 
    messages: Message[], 
    onCriticalClick: () => void, 
    onOpportunitiesClick: () => void,
    onPendingClick: () => void,
    activeFilters: { fireMode: boolean, intent: Intent | 'all' }
}) {
    
    const criticalCount = messages.filter(m => m.urgency === 'high').length;
    const opportunityCount = messages.filter(m => m.intent === 'sales').length;
    const pendingCount = messages.filter(m => m.status === 'unread').length;

    return (
        <div className="grid grid-cols-3 gap-2 px-4 py-3 bg-gray-50/30 border-b">
            {/* Critical Button */}
            <button 
                onClick={onCriticalClick}
                className={cn(
                    "relative flex flex-col items-center justify-center py-2 rounded-xl transition-all",
                    activeFilters.fireMode 
                        ? "bg-red-50" 
                        : "hover:bg-gray-100"
                )}
            >
                <div className={cn(
                    "h-8 w-8 rounded-full flex items-center justify-center mb-1 transition-colors",
                    activeFilters.fireMode ? "bg-white shadow-sm" : "bg-gray-100"
                )}>
                    <Flame className={cn("h-4 w-4", activeFilters.fireMode ? "fill-red-500 text-red-500" : "text-gray-500")} />
                </div>
                <span className={cn("text-[10px] font-semibold uppercase tracking-wide", activeFilters.fireMode ? "text-red-600" : "text-gray-500")}>
                    Critical
                </span>
                
                {/* Notification Badge */}
                {criticalCount > 0 && (
                    <div className="absolute top-1 right-4 bg-red-500 text-white text-[10px] font-bold h-4 min-w-[16px] flex items-center justify-center rounded-full px-1 shadow-sm ring-2 ring-white">
                        {criticalCount}
                    </div>
                )}
            </button>

            {/* Opportunities Button */}
            <button 
                onClick={onOpportunitiesClick}
                className={cn(
                    "relative flex flex-col items-center justify-center py-2 rounded-xl transition-all",
                    activeFilters.intent === 'sales'
                        ? "bg-emerald-50"
                        : "hover:bg-gray-100"
                )}
            >
                 <div className={cn(
                    "h-8 w-8 rounded-full flex items-center justify-center mb-1 transition-colors",
                    activeFilters.intent === 'sales' ? "bg-white shadow-sm" : "bg-gray-100"
                )}>
                    <Banknote className={cn("h-4 w-4", activeFilters.intent === 'sales' ? "text-emerald-600" : "text-gray-500")} />
                </div>
                <span className={cn("text-[10px] font-semibold uppercase tracking-wide", activeFilters.intent === 'sales' ? "text-emerald-600" : "text-gray-500")}>
                    Sales
                </span>

                 {/* Notification Badge */}
                 {opportunityCount > 0 && (
                    <div className="absolute top-1 right-4 bg-emerald-500 text-white text-[10px] font-bold h-4 min-w-[16px] flex items-center justify-center rounded-full px-1 shadow-sm ring-2 ring-white">
                        {opportunityCount}
                    </div>
                )}
            </button>

            {/* Pending Button */}
            <button 
                onClick={onPendingClick}
                className="relative flex flex-col items-center justify-center py-2 rounded-xl transition-all hover:bg-gray-100"
            >
                 <div className="h-8 w-8 rounded-full bg-gray-100 flex items-center justify-center mb-1">
                    <InboxIcon className="h-4 w-4 text-gray-500" />
                </div>
                <span className="text-[10px] font-semibold uppercase tracking-wide text-gray-500">
                    Pending
                </span>

                {/* Notification Badge */}
                {pendingCount > 0 && (
                    <div className="absolute top-1 right-4 bg-blue-500 text-white text-[10px] font-bold h-4 min-w-[16px] flex items-center justify-center rounded-full px-1 shadow-sm ring-2 ring-white">
                        {pendingCount}
                    </div>
                )}
            </button>
        </div>
    );
}

export function Inbox() {
  const { messages, activeClientId, approveMessage, updateMessageDraft, refreshFeed } = useNexus();
  const [selectedMessageId, setSelectedMessageId] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  
  // Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [intentFilter, setIntentFilter] = useState<Intent | 'all'>('all');
  const [platformFilter, setPlatformFilter] = useState<Platform | 'all'>('all');
  const [typeFilter, setTypeFilter] = useState<MessageType | 'all'>('all');
  const [fireMode, setFireMode] = useState(false);
  const [isCRMOpen, setIsCRMOpen] = useState(true);

  // Filter Logic
  const filteredMessages = messages
    .filter(m => m.clientId === activeClientId)
    .filter(m => {
      if (fireMode && (m.urgency !== 'high' && m.urgency !== 'medium')) return false;
      if (intentFilter !== 'all' && m.intent !== intentFilter) return false;
      if (platformFilter !== 'all' && m.platform !== platformFilter) return false;
      if (typeFilter !== 'all' && m.type !== typeFilter) return false;
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

  // Reset editing state when selecting a new message
  useEffect(() => {
    setIsEditing(false);
  }, [selectedMessageId]);

  const selectedMessage = messages.find(m => m.id === selectedMessageId);

  return (
    <div className="h-full flex bg-background overflow-hidden">
      {/* COLUMN 2: Message List */}
      <div className="w-[400px] border-r flex flex-col bg-white relative z-10 shadow-sm">
        
        {/* Header / Title */}
        <div className="h-16 border-b px-4 flex items-center justify-between shrink-0 bg-white">
          <h1 className="font-bold text-xl tracking-tight text-gray-900">Inbox</h1>
          <div className="flex items-center gap-2">
             <Button variant="ghost" size="icon" onClick={refreshFeed} className="h-8 w-8 text-muted-foreground">
                <RefreshCw className="h-4 w-4" />
             </Button>
             <Badge variant="outline" className="font-normal text-gray-500">
               {filteredMessages.length}
             </Badge>
          </div>
        </div>

        {/* Quick Stats Widget */}
        <QuickStatsWidget 
            messages={messages.filter(m => m.clientId === activeClientId)}
            onCriticalClick={() => setFireMode(!fireMode)}
            onOpportunitiesClick={() => setIntentFilter(intentFilter === 'sales' ? 'all' : 'sales')}
            onPendingClick={() => {
                // Optional: Maybe add a status filter later, for now just logs or does nothing specific visual filter-wise
                // Or we could implement a status filter. 
                // The spec says "Total de mensajes no leídos", but doesn't explicitly say "Click to filter unread", 
                // but "Acción" is implied for the others. Let's make it clear just search/reset.
                // Actually spec says just "Lógica: Total...". Doesn't explicitly demand action like the others.
                // Let's just reset filters on this one for "Show all pending" vibe or similar.
                setFireMode(false);
                setIntentFilter('all');
                setPlatformFilter('all');
                setSearchQuery('');
            }}
            activeFilters={{ fireMode, intent: intentFilter }}
        />

        {/* Filter Bar (The "Playground" for AI) */}
        <div className="p-3 border-b space-y-3 bg-gray-50/50">
          {/* Row 1: Search & Fire Mode */}
          <div className="flex gap-2">
            <div className="relative flex-1">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input 
                placeholder="Search..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 bg-white border-gray-200 focus:ring-offset-0 h-9" 
                />
            </div>
            
            <div className={cn("flex items-center gap-2 shrink-0 px-3 py-1.5 rounded-md border shadow-sm transition-colors", fireMode ? "bg-red-50 border-red-200" : "bg-white border-gray-200")} title="Fire Mode: Show High & Medium Urgency">
                <Switch 
                    id="fire-mode" 
                    checked={fireMode} 
                    onCheckedChange={setFireMode} 
                    className="data-[state=checked]:bg-red-500 scale-75 origin-right"
                />
                <Label htmlFor="fire-mode" className={cn("text-xs font-bold cursor-pointer select-none flex items-center gap-1", fireMode ? "text-red-600" : "text-gray-500")}>
                    <Flame className={cn("h-3.5 w-3.5", fireMode && "fill-red-500")} />
                </Label>
            </div>
          </div>

          {/* Row 2: Platform Filters (Horizontal Scroll) */}
          <div className="flex gap-1.5 overflow-x-auto pb-1 no-scrollbar items-center">
              <FilterButton 
                active={platformFilter === 'all'} 
                onClick={() => setPlatformFilter('all')}
                label="All" 
                icon={<LayoutGrid className="h-3.5 w-3.5" />}
              />
              <FilterButton 
                active={platformFilter === 'instagram'} 
                onClick={() => setPlatformFilter('instagram')}
                label="Instagram"
                icon={<FaInstagram className="h-3.5 w-3.5" />}
                activeColorClass="bg-pink-600"
                hoverColorClass="hover:text-pink-600 hover:border-pink-200 hover:bg-pink-50"
              />
              <FilterButton 
                active={platformFilter === 'tiktok'} 
                onClick={() => setPlatformFilter('tiktok')}
                label="TikTok"
                icon={<FaTiktok className="h-3.5 w-3.5" />}
                activeColorClass="bg-black"
                hoverColorClass="hover:text-black hover:border-gray-300 hover:bg-gray-100"
              />
              <FilterButton 
                active={platformFilter === 'facebook'} 
                onClick={() => setPlatformFilter('facebook')}
                label="Facebook"
                icon={<FaFacebook className="h-3.5 w-3.5" />}
                activeColorClass="bg-blue-600"
                hoverColorClass="hover:text-blue-600 hover:border-blue-200 hover:bg-blue-50"
              />
              <FilterButton 
                active={platformFilter === 'linkedin'} 
                onClick={() => setPlatformFilter('linkedin')}
                label="LinkedIn"
                icon={<FaLinkedin className="h-3.5 w-3.5" />}
                activeColorClass="bg-[#0077b5]"
                hoverColorClass="hover:text-[#0077b5] hover:border-[#0077b5]/30 hover:bg-[#0077b5]/10"
              />
               <FilterButton 
                active={platformFilter === 'youtube'} 
                onClick={() => setPlatformFilter('youtube')}
                label="YouTube"
                icon={<FaYoutube className="h-3.5 w-3.5" />}
                activeColorClass="bg-red-600"
                hoverColorClass="hover:text-red-600 hover:border-red-200 hover:bg-red-50"
              />
              <FilterButton 
                active={platformFilter === 'google-business'} 
                onClick={() => setPlatformFilter('google-business')}
                label="Google Business"
                icon={<GoogleBusinessIcon className="h-3.5 w-3.5" />}
                activeColorClass="bg-blue-500"
                hoverColorClass="hover:text-blue-500 hover:border-blue-200 hover:bg-blue-50"
              />
              <FilterButton 
                active={platformFilter === 'whatsapp'} 
                onClick={() => setPlatformFilter('whatsapp')}
                label="WhatsApp"
                icon={<FaWhatsapp className="h-3.5 w-3.5" />}
                activeColorClass="bg-green-500"
                hoverColorClass="hover:text-green-500 hover:border-green-200 hover:bg-green-50"
              />
           </div>

           {/* Row 3: Intent Filter & Type Filter */}
           <div className="flex gap-2">
             <Select value={intentFilter} onValueChange={(val: any) => setIntentFilter(val)}>
                  <SelectTrigger className="flex-1 bg-white border-gray-200 h-8 text-xs">
                      <div className="flex items-center gap-2 text-muted-foreground">
                          <Filter className="h-3 w-3" />
                          <SelectValue placeholder="Filter by Intent" />
                      </div>
                  </SelectTrigger>
                  <SelectContent>
                      <SelectItem value="all">All Intents</SelectItem>
                      <SelectItem value="sales">Sales / Leads</SelectItem>
                      <SelectItem value="support">Support</SelectItem>
                      <SelectItem value="complaint">Complaints</SelectItem>
                      <SelectItem value="general">General</SelectItem>
                  </SelectContent>
              </Select>

              <Select value={typeFilter} onValueChange={(val: any) => setTypeFilter(val)}>
                  <SelectTrigger className="w-[130px] bg-white border-gray-200 h-8 text-xs">
                      <div className="flex items-center gap-2 text-muted-foreground">
                          <MessageCircle className="h-3 w-3" />
                          <SelectValue placeholder="Type" />
                      </div>
                  </SelectTrigger>
                  <SelectContent>
                      <SelectItem value="all">All Types</SelectItem>
                      <SelectItem value="dm">Direct Message</SelectItem>
                      <SelectItem value="comment">Comment</SelectItem>
                  </SelectContent>
              </Select>
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
                             
                             {selectedMessage.sourceUrl && (
                                <>
                                    <span className="text-gray-300 text-[10px]">|</span>
                                    <a 
                                        href={selectedMessage.sourceUrl}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-xs text-indigo-600 hover:text-indigo-800 hover:underline flex items-center gap-1 font-medium"
                                    >
                                        <ExternalLink className="h-3 w-3" />
                                        View Original {selectedMessage.contextType === 'post' ? 'Post' : 'Context'}
                                    </a>
                                </>
                             )}
                        </div>
                    </div>
                 </div>
                 <Button 
                    variant="ghost" 
                    size="icon" 
                    onClick={() => setIsCRMOpen(!isCRMOpen)} 
                    className={cn("text-gray-400 hover:text-gray-600", isCRMOpen && "bg-gray-100 text-gray-600")}
                    title="Toggle CRM Panel"
                 >
                    <MoreVertical className="h-5 w-5" />
                 </Button>
               </div>

               {/* AI Summary - Clean Minimal Version */}
               <div className="mt-4 group relative">
                  <div className="py-1">
                      <div className="flex items-start gap-3">
                          <div className={cn(
                              "mt-0.5 p-1 rounded-md shrink-0",
                              selectedMessage.urgency === 'high' ? "bg-red-50 text-red-600" : 
                              selectedMessage.urgency === 'medium' ? "bg-amber-50 text-amber-600" : "bg-indigo-50 text-indigo-600"
                          )}>
                              <Brain className="h-3.5 w-3.5" />
                          </div>
                          <div className="space-y-1.5">
                              <p className="text-sm text-gray-600 leading-relaxed">
                                  <span className="font-semibold text-gray-900">AI Analysis:</span> {selectedMessage.aiSummary || "Analyzing conversation context..."}
                              </p>
                              
                              <div className="flex items-center gap-3">
                                  <div className={cn(
                                      "text-[10px] font-medium px-1.5 py-0.5 rounded border uppercase tracking-wide",
                                      selectedMessage.urgency === 'high' ? "bg-red-50 text-red-700 border-red-100" : 
                                      selectedMessage.urgency === 'medium' ? "bg-amber-50 text-amber-700 border-amber-100" : "bg-gray-50 text-gray-600 border-gray-200"
                                  )}>
                                      {selectedMessage.urgency} Priority
                                  </div>
                              </div>
                          </div>
                      </div>
                  </div>
               </div>
            </header>

            {/* Chat Content */}
            <ScrollArea className="flex-1 p-8 bg-gray-50/30">
               <div className="max-w-3xl mx-auto space-y-8">
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

                  {/* AI Suggestion / Response Area (RESTORED) */}
                  <AnimatePresence mode="wait">
                    {selectedMessage.status !== 'sent' && (
                      <motion.div 
                        initial={{ opacity: 0, y: 20, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 10 }}
                        className="relative"
                      >
                        <div className={cn(
                           "rounded-xl border overflow-hidden transition-all duration-500",
                           selectedMessage.status === 'drafting' 
                              ? "bg-white border-indigo-100 shadow-sm h-24 flex items-center px-6"
                              : "bg-white border-indigo-200 shadow-[0_0_30px_-10px_rgba(99,102,241,0.2)] ring-1 ring-indigo-50"
                        )}>
                           {selectedMessage.status === 'drafting' ? (
                              <div className="flex items-center gap-3 text-indigo-600 animate-pulse">
                                 <span className="text-sm font-medium">Agent is drafting a response...</span>
                              </div>
                           ) : selectedMessage.draftResponse ? (
                              <div className="p-0">
                                 <div className="bg-gradient-to-r from-indigo-50/50 to-violet-50/50 p-3 border-b border-indigo-50 flex items-center justify-between">
                                    <span className="text-xs font-bold text-indigo-700 uppercase tracking-wider flex items-center gap-1.5">
                                       <Brain className="h-3 w-3" /> AI Suggestion
                                    </span>
                                    <Badge variant="secondary" className="bg-white/80 text-indigo-700 border-indigo-100 text-[10px] hover:bg-white">
                                       Confidence: 98%
                                    </Badge>
                                 </div>
                                 <div className="p-4">
                                    {isEditing ? (
                                       <textarea 
                                          className="w-full bg-white border border-indigo-200 rounded-md p-3 text-sm text-gray-800 resize-none focus:outline-none focus:ring-2 focus:ring-indigo-500/20 min-h-[120px] leading-relaxed"
                                          value={selectedMessage.draftResponse}
                                          onChange={(e) => updateMessageDraft(selectedMessage.id, e.target.value)}
                                          autoFocus
                                       />
                                    ) : (
                                       <div className="w-full bg-transparent border-none p-0 text-sm text-gray-800 min-h-[80px] leading-relaxed whitespace-pre-wrap">
                                          {selectedMessage.draftResponse}
                                       </div>
                                    )}
                                 </div>
                                 <div className="bg-gray-50 p-3 flex items-center justify-between border-t">
                                    <Button variant="ghost" size="sm" className="text-xs text-muted-foreground hover:text-foreground h-8">
                                       Discard
                                    </Button>
                                    <div className="flex items-center gap-2">
                                       <Button 
                                          variant="outline" 
                                          size="sm" 
                                          className={cn(
                                             "h-8 text-xs bg-white",
                                             isEditing && "bg-indigo-50 text-indigo-700 border-indigo-200"
                                          )}
                                          onClick={() => setIsEditing(!isEditing)}
                                       >
                                          {isEditing ? "Save Draft" : "Edit Response"}
                                       </Button>
                                       <Button 
                                          size="sm" 
                                          className="h-8 text-xs bg-black hover:bg-gray-800 text-white shadow-none gap-1.5 px-4 transition-all"
                                          onClick={() => approveMessage(selectedMessage.id)}
                                       >
                                          <Check className="h-3.5 w-3.5" />
                                          Approve & Send
                                       </Button>
                                    </div>
                                 </div>
                              </div>
                           ) : (
                              <div className="p-6 text-center text-muted-foreground text-sm">
                                 Waiting for agent...
                              </div>
                           )}
                        </div>
                      </motion.div>
                    )}
                    
                    {selectedMessage.status === 'sent' && (
                       <motion.div 
                          initial={{ opacity: 0, scale: 0.9 }}
                          animate={{ opacity: 1, scale: 1 }}
                          className="flex gap-4 ml-0"
                       >
                          <Avatar className="h-8 w-8 mt-1">
                             <AvatarFallback className="bg-indigo-600 text-white">AI</AvatarFallback>
                          </Avatar>
                          <div className="flex flex-col gap-1 max-w-[80%]">
                             <div className="bg-indigo-50 border border-indigo-100 p-4 rounded-2xl rounded-tl-none text-sm leading-relaxed text-indigo-900">
                                {selectedMessage.draftResponse}
                             </div>
                             <span className="text-xs text-muted-foreground ml-1 flex items-center gap-1">
                                <Check className="h-3 w-3" /> Sent just now
                             </span>
                          </div>
                       </motion.div>
                    )}
                  </AnimatePresence>

               </div>
            </ScrollArea>
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

      {/* COLUMN 4: CRM Context Panel */}
      <CRMContextPanel 
          contact={selectedMessage?.crmData}
          isOpen={isCRMOpen}
          onClose={() => setIsCRMOpen(false)}
      />
    </div>
  );
}

// --- Sub-Components ---

function MessageCard({ message, isSelected, onClick }: { message: Message, isSelected: boolean, onClick: () => void }) {
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
                        <div className="flex items-center gap-1.5 min-w-0">
                            <span className={cn("text-sm font-bold truncate text-gray-900", message.status === 'unread' && "")}>
                                {message.author}
                            </span>
                            {/* CRM Sync Status Indicator */}
                            {message.crmData ? (
                                <div className="flex items-center justify-center h-4 w-4 rounded-full bg-gray-50 border shrink-0" title="Synced with CRM">
                                    {message.crmData.crmType === 'hubspot' && <img src="/logos/hubspot.png" className="h-2.5 w-2.5 object-contain" />}
                                    {message.crmData.crmType === 'salesforce' && <img src="https://logo.clearbit.com/salesforce.com" className="h-2.5 w-2.5 object-contain" />}
                                    {message.crmData.crmType === 'pipedrive' && <img src="/logos/pipedrive.webp" className="h-2.5 w-2.5 object-contain" />}
                                    {message.crmData.crmType === 'zoho' && <img src="/logos/zoho.png" className="h-2.5 w-2.5 object-contain" />}
                                    {message.crmData.crmType === 'monday' && <img src="https://logo.clearbit.com/monday.com" className="h-2.5 w-2.5 object-contain" />}
                                    {message.crmData.crmType === 'notion' && <img src="https://logo.clearbit.com/notion.so" className="h-2.5 w-2.5 object-contain" />}
                                    {message.crmData.crmType === 'airtable' && <img src="https://logo.clearbit.com/airtable.com" className="h-2.5 w-2.5 object-contain" />}
                                </div>
                            ) : (
                                <div className="h-4 w-4 rounded-full border border-dashed border-gray-300 flex items-center justify-center shrink-0" title="Not Synced - Click to Create">
                                    <span className="text-[8px] text-gray-400 font-bold">+</span>
                                </div>
                            )}
                        </div>
                        <div className="flex items-center gap-1">
                           {message.sourceUrl && (
                               <a 
                                   href={message.sourceUrl}
                                   target="_blank"
                                   rel="noopener noreferrer"
                                   onClick={(e) => e.stopPropagation()}
                                   className="text-gray-400 hover:text-indigo-600 p-0.5 rounded hover:bg-indigo-50 transition-colors"
                                   title={`View on ${message.platform}`}
                               >
                                   <ExternalLink className="h-3 w-3" />
                               </a>
                           )}
                           <span className="text-[10px] text-gray-400 whitespace-nowrap shrink-0 ml-1">
                                {formatDistanceToNow(new Date(message.timestamp), { addSuffix: false }).replace('about ', '')}
                           </span>
                        </div>
                    </div>
                    
                    <div className="flex items-center gap-1.5 mb-1.5 flex-wrap">
                        {message.urgency === 'high' && (
                            <Badge variant="outline" className="text-[10px] font-medium h-5 px-1.5 text-red-600 bg-red-50 border-red-100 gap-1">
                                <Flame className="h-3 w-3 fill-red-600" /> High
                            </Badge>
                        )}
                        {message.urgency === 'medium' && (
                            <Badge variant="outline" className="text-[10px] font-medium h-5 px-1.5 text-amber-600 bg-amber-50 border-amber-100">
                                Medium
                            </Badge>
                        )}
                        <IntentBadge intent={message.intent} />
                        <Badge variant="outline" className="text-[10px] font-normal h-5 px-1.5 text-gray-500 border-gray-200">
                            {message.type === 'dm' ? 'DM' : 'Comment'}
                        </Badge>
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

function FilterButton({ active, onClick, label, icon, activeColorClass, hoverColorClass }: { active: boolean, onClick: () => void, label: string, icon?: React.ReactNode, activeColorClass?: string, hoverColorClass?: string }) {
  return (
    <button 
      onClick={onClick}
      title={label}
      className={cn(
        "flex items-center justify-center h-8 w-8 rounded-full text-xs font-medium transition-all border shrink-0",
        active 
          ? cn("text-white border-transparent shadow-sm", activeColorClass || "bg-gray-900") 
          : cn("bg-white text-gray-500 border-gray-200", hoverColorClass || "hover:border-gray-300 hover:bg-gray-50 hover:text-gray-900")
      )}
    >
      {icon}
    </button>
  );
}

function PlatformIcon({ platform, className }: { platform: Platform, className?: string }) {
  switch(platform) {
    case 'instagram': return <FaInstagram className={cn("text-pink-600", className)} />;
    case 'facebook': return <FaFacebook className={cn("text-blue-600", className)} />;
    case 'linkedin': return <FaLinkedin className={cn("text-[#0077b5]", className)} />;
    case 'tiktok': return <FaTiktok className={cn("text-black", className)} />;
    case 'youtube': return <FaYoutube className={cn("text-red-600", className)} />;
    case 'google-business': return <GoogleBusinessIcon className={cn("text-blue-500", className)} />;
    case 'whatsapp': return <FaWhatsapp className={cn("text-green-500", className)} />;
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
