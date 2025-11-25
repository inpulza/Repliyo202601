import React, { useState, useEffect } from 'react';
import { useNexus } from '@/context/NexusContext';
import { cn } from '@/lib/utils';
import { CRMContextPanel } from './CRMContextPanel';
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
import { getCharacterLimit } from '@/utils/platformLimits';


// --- Helper: Platform Styles ---
const getPlatformStyles = (platform: Platform) => {
    switch (platform) {
        case 'whatsapp':
            return {
                container: "bg-[#efeae2]/60", // WhatsApp wallpaper vibe
                bubble: "bg-[#e7fce3] border-[#dcf8c6] text-gray-900", // WhatsApp light green bubble
                badge: "bg-[#dcf8c6] text-green-800 border-green-200",
                commentBadge: "text-green-600"
            };
        case 'facebook':
            return {
                container: "bg-[#f0f2f5]", // Facebook light gray/blue background
                bubble: "bg-white border-gray-200 text-gray-900 shadow-sm",
                badge: "bg-blue-100 text-blue-700 border-blue-200",
                commentBadge: "text-blue-600"
            };
        case 'instagram':
            return {
                container: "bg-gradient-to-br from-pink-50/50 via-white to-purple-50/50", // Subtle gradient
                bubble: "bg-white border-gray-100 text-gray-900 shadow-sm",
                badge: "bg-pink-100 text-pink-700 border-pink-200",
                commentBadge: "text-pink-600"
            };
        case 'linkedin':
            return {
                container: "bg-[#f3f6f8]", // LinkedIn light gray background
                bubble: "bg-white border-gray-200 text-slate-800 shadow-sm",
                badge: "bg-slate-100 text-slate-700 border-slate-200",
                commentBadge: "text-slate-600"
            };
        case 'youtube':
            return {
                container: "bg-red-50/20", // Very subtle red tint
                bubble: "bg-white border-gray-200 text-gray-900 shadow-sm",
                badge: "bg-red-100 text-red-700 border-red-200",
                commentBadge: "text-red-600"
            };
        case 'tiktok':
            return {
                container: "bg-gray-50",
                bubble: "bg-white border-gray-200 text-gray-900 shadow-sm",
                badge: "bg-gray-200 text-gray-800 border-gray-300",
                commentBadge: "text-gray-800"
            };
        case 'google-business':
            return {
                container: "bg-blue-50/20",
                bubble: "bg-white border-blue-100 text-gray-900 shadow-sm",
                badge: "bg-blue-100 text-blue-700 border-blue-200",
                commentBadge: "text-blue-600"
            };
        default:
            return {
                container: "bg-indigo-50/30",
                bubble: "bg-white border-gray-200 text-gray-900 shadow-sm",
                badge: "bg-gray-100 text-gray-700 border-gray-200",
                commentBadge: "text-gray-600"
            };
    }
};

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

  // Calculate Stats for Header
  const clientMessages = messages.filter(m => m.clientId === activeClientId);
  const criticalCount = clientMessages.filter(m => m.urgency === 'high').length;
  const opportunityCount = clientMessages.filter(m => m.intent === 'sales').length;
  const pendingCount = clientMessages.filter(m => m.status === 'unread').length;

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
          <div className="flex items-center gap-3">
            <h1 className="font-bold text-xl tracking-tight text-gray-900">Inbox</h1>
            <Button variant="ghost" size="icon" onClick={refreshFeed} className="h-8 w-8 text-muted-foreground">
               <RefreshCw className="h-4 w-4" />
            </Button>
            <Badge variant="outline" className="font-normal text-gray-500">
              {filteredMessages.length}
            </Badge>
          </div>
          
          {/* Integrated Quick Stats (Moved from Widget) */}
          <div className="flex items-center gap-1">
                {/* Critical Button */}
                <button 
                    onClick={() => setFireMode(!fireMode)}
                    className={cn(
                        "relative h-8 w-8 flex items-center justify-center rounded-full transition-all",
                        fireMode ? "bg-red-100 text-red-600" : "text-gray-400 hover:bg-gray-100 hover:text-gray-600"
                    )}
                    title="Critical Messages"
                >
                    <Flame className={cn("h-4 w-4", fireMode && "fill-red-600")} />
                    {criticalCount > 0 && (
                        <div className="absolute -top-1 -right-1 bg-red-500 text-white text-[9px] font-bold h-3.5 min-w-[14px] flex items-center justify-center rounded-full px-0.5 shadow-sm ring-2 ring-white z-10">
                            {criticalCount}
                        </div>
                    )}
                </button>

                {/* Opportunities Button */}
                <button 
                    onClick={() => setIntentFilter(intentFilter === 'sales' ? 'all' : 'sales')}
                    className={cn(
                        "relative h-8 w-8 flex items-center justify-center rounded-full transition-all",
                        intentFilter === 'sales' ? "bg-emerald-100 text-emerald-600" : "text-gray-400 hover:bg-gray-100 hover:text-gray-600"
                    )}
                    title="Sales Opportunities"
                >
                    <Banknote className="h-4 w-4" />
                    {opportunityCount > 0 && (
                        <div className="absolute -top-1 -right-1 bg-emerald-500 text-white text-[9px] font-bold h-3.5 min-w-[14px] flex items-center justify-center rounded-full px-0.5 shadow-sm ring-2 ring-white z-10">
                            {opportunityCount}
                        </div>
                    )}
                </button>

                {/* Pending Button */}
                <button 
                    onClick={() => {
                        setFireMode(false);
                        setIntentFilter('all');
                        setPlatformFilter('all');
                        setSearchQuery('');
                    }}
                    className="relative h-8 w-8 flex items-center justify-center rounded-full transition-all text-gray-400 hover:bg-gray-100 hover:text-gray-600"
                    title="Show All Pending"
                >
                    <InboxIcon className="h-4 w-4" />
                    {pendingCount > 0 && (
                        <div className="absolute -top-1 -right-1 bg-blue-500 text-white text-[9px] font-bold h-3.5 min-w-[14px] flex items-center justify-center rounded-full px-0.5 shadow-sm ring-2 ring-white z-10">
                            {pendingCount}
                        </div>
                    )}
                </button>
          </div>
        </div>

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
                      <SelectItem value="review">Review</SelectItem>
                  </SelectContent>
              </Select>
           </div>
        </div>

        {/* Messages List */}
        <ScrollArea className="flex-1 bg-gray-200/70">
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
                    onOpenCRM={() => setIsCRMOpen(true)}
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
                             <span className="text-xs text-muted-foreground">
                                {selectedMessage.type === 'dm' && 'Direct Message'}
                                {selectedMessage.type === 'comment' && 'Comment'}
                                {selectedMessage.type === 'review' && 'Review'}
                             </span>
                             
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
                 <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button 
                            variant="ghost" 
                            size="icon" 
                            className={cn("text-gray-400 hover:text-gray-600", isCRMOpen && "bg-gray-100 text-gray-600")}
                            title="More options"
                        >
                            <MoreVertical className="h-5 w-5" />
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => setIsCRMOpen(!isCRMOpen)}>
                            {isCRMOpen ? "Hide CRM Panel" : "Show CRM Panel"}
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem>Mute Conversation</DropdownMenuItem>
                        <DropdownMenuItem>Mark as Unread</DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem className="text-red-600">Block Contact</DropdownMenuItem>
                    </DropdownMenuContent>
                 </DropdownMenu>
               </div>
            </header>

            {/* Chat Content */}
            <div className={cn("flex-1 relative flex flex-col overflow-hidden", selectedMessage ? getPlatformStyles(selectedMessage.platform).container : "bg-indigo-50/30")}>
                <ScrollArea className="flex-1 p-8">
                   <div className="max-w-3xl mx-auto space-y-8 pb-32">
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
                           <span className={cn(
                               "text-[9px] font-bold uppercase tracking-wide ml-1",
                               getPlatformStyles(selectedMessage.platform).commentBadge
                           )}>
                               {selectedMessage.type === 'comment' && 'Public Comment'}
                               {selectedMessage.type === 'review' && 'Public Review'}
                               {selectedMessage.type === 'dm' && 'Direct Message'}
                           </span>
                        </div>
                        <div className={cn(
                            "p-4 rounded-2xl text-sm leading-relaxed shadow-sm relative rounded-tl-none",
                            getPlatformStyles(selectedMessage.platform).bubble
                        )}>
                           {selectedMessage.content}
                        </div>
                     </div>
                  </div>

                  {/* AI Suggestion / Response Area (Modernized) */}
                  <AnimatePresence mode="wait">
                    {selectedMessage.status !== 'sent' && (
                      <motion.div 
                        initial={{ opacity: 0, y: 10, scale: 0.98 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 10 }}
                        className="relative mt-4"
                      >
                        {selectedMessage.status === 'drafting' ? (
                           <div className="rounded-2xl bg-white border border-indigo-100 p-6 shadow-sm flex items-center gap-4 animate-pulse">
                               <div className="h-10 w-10 rounded-full bg-indigo-50 flex items-center justify-center">
                                   <Brain className="h-5 w-5 text-indigo-400" />
                               </div>
                               <div className="space-y-2 flex-1">
                                   <div className="h-4 bg-indigo-50 rounded w-1/3"></div>
                                   <div className="h-3 bg-gray-50 rounded w-2/3"></div>
                               </div>
                           </div>
                        ) : selectedMessage.draftResponse ? (
                           <div className="group relative">
                               {/* Modern Card Container */}
                               <div className={cn(
                                   "rounded-2xl bg-white border shadow-sm transition-all overflow-hidden",
                                   (selectedMessage.draftResponse?.length || 0) > getCharacterLimit(selectedMessage.platform, selectedMessage.type)
                                       ? "border-red-200 shadow-red-500/5 ring-1 ring-red-100"
                                       : "border-indigo-100 shadow-indigo-500/5 hover:shadow-indigo-500/10"
                               )}>
                                   
                                   {/* Header Area */}
                                   <div className="px-5 py-3 flex items-center justify-between border-b border-gray-50 bg-gray-50/30">
                                       <div className="flex items-center gap-2">
                                           <div className="h-6 w-6 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-sm">
                                               <Brain className="h-3 w-3 text-white" />
                                           </div>
                                           <span className="text-xs font-bold text-gray-700">AI Suggestion</span>
                                       </div>
                                       <div className="flex items-center gap-2">
                                           <Badge variant="outline" className="bg-white text-[10px] font-medium text-gray-500 border-gray-200 h-5">
                                               98% match
                                           </Badge>
                                       </div>
                                   </div>

                                   {/* Content Area */}
                                   <div className="p-5 relative">
                                       {isEditing ? (
                                          <textarea 
                                             className={cn(
                                                 "w-full bg-transparent border-none p-0 text-sm text-gray-800 resize-none focus:outline-none min-h-[100px] leading-relaxed placeholder:text-gray-300",
                                             )}
                                             placeholder="Type your response..."
                                             value={selectedMessage.draftResponse}
                                             onChange={(e) => updateMessageDraft(selectedMessage.id, e.target.value)}
                                             autoFocus
                                          />
                                       ) : (
                                          <div className="text-sm text-gray-800 leading-relaxed whitespace-pre-wrap min-h-[60px]">
                                             {selectedMessage.draftResponse}
                                          </div>
                                       )}

                                       {/* Character Counter (Always Visible) */}
                                       <div className="flex justify-end mt-4">
                                          {(() => {
                                              const count = selectedMessage.draftResponse?.length || 0;
                                              const limit = getCharacterLimit(selectedMessage.platform, selectedMessage.type);
                                              const isOver = count > limit;
                                              const isWarning = count > limit * 0.9 && !isOver;
                                              
                                              return (
                                                  <div className={cn(
                                                      "text-[10px] font-medium px-2 py-1 rounded-full transition-colors flex items-center gap-1.5 border",
                                                      isOver ? "bg-red-50 text-red-600 border-red-100" : 
                                                      isWarning ? "bg-amber-50 text-amber-600 border-amber-100" : 
                                                      "bg-gray-50 text-gray-400 border-gray-100"
                                                  )}>
                                                      <span>{count} / {limit}</span>
                                                      {isOver && (
                                                          <span className="font-bold border-l border-red-200 pl-1.5 ml-0.5">
                                                              -{count - limit}
                                                          </span>
                                                      )}
                                                  </div>
                                              );
                                          })()}
                                       </div>
                                   </div>

                                   {/* Action Footer */}
                                   <div className="px-4 py-3 bg-gray-50 flex items-center justify-between gap-3 border-t border-gray-100">
                                       <Button 
                                           variant="ghost" 
                                           size="sm" 
                                           className="text-gray-400 hover:text-gray-600 hover:bg-gray-200/50 h-8 w-8 p-0 rounded-full"
                                           title="Discard"
                                           onClick={() => updateMessageDraft(selectedMessage.id, "")}
                                       >
                                          <RefreshCw className="h-3.5 w-3.5" />
                                       </Button>

                                       <div className="flex items-center gap-2">
                                          <Button 
                                             variant="ghost" 
                                             size="sm" 
                                             className={cn(
                                                "h-8 text-xs font-medium px-3",
                                                isEditing ? "bg-indigo-50 text-indigo-600" : "text-gray-600 hover:bg-white hover:shadow-sm"
                                             )}
                                             onClick={() => setIsEditing(!isEditing)}
                                          >
                                             {isEditing ? "Done Editing" : "Edit Response"}
                                          </Button>
                                          
                                          <Button 
                                             size="sm" 
                                             className={cn(
                                                "h-8 text-xs font-medium px-4 shadow-sm transition-all",
                                                (selectedMessage.draftResponse?.length || 0) > getCharacterLimit(selectedMessage.platform, selectedMessage.type)
                                                    ? "bg-gray-100 text-gray-400 cursor-not-allowed hover:bg-gray-100"
                                                    : "bg-indigo-600 hover:bg-indigo-700 text-white hover:shadow-md hover:shadow-indigo-500/20"
                                             )}
                                             onClick={() => approveMessage(selectedMessage.id)}
                                             disabled={(selectedMessage.draftResponse?.length || 0) > getCharacterLimit(selectedMessage.platform, selectedMessage.type)}
                                          >
                                             <Send className="h-3 w-3 mr-1.5" />
                                             Approve & Send
                                          </Button>
                                       </div>
                                   </div>
                               </div>
                           </div>
                        ) : (
                           <div className="p-6 text-center text-muted-foreground text-sm">
                              Waiting for agent...
                           </div>
                        )}
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

                  {/* Spacer to prevent content from being hidden behind the floating card */}
                  <div className="h-24"></div>
               </div>
            </ScrollArea>

            {/* Floating AI Analysis Card */}
            <div className="absolute bottom-6 left-1/2 -translate-x-1/2 w-[90%] max-w-3xl z-30">
                <motion.div 
                    initial={{ y: 20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    className="bg-white rounded-xl border border-gray-200 shadow-lg p-4 flex items-start gap-4"
                >
                    <div className={cn(
                        "p-2 rounded-lg shrink-0",
                        selectedMessage.urgency === 'high' ? "bg-red-50 text-red-600" : 
                        selectedMessage.urgency === 'medium' ? "bg-amber-50 text-amber-600" : "bg-indigo-50 text-indigo-600"
                    )}>
                        <Brain className="h-5 w-5" />
                    </div>
                    <div className="space-y-1 flex-1">
                        <div className="flex items-center justify-between">
                            <span className="font-semibold text-gray-900 text-sm">AI Analysis</span>
                            <div className={cn(
                                "text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wide",
                                selectedMessage.urgency === 'high' ? "bg-red-100 text-red-700" : 
                                selectedMessage.urgency === 'medium' ? "bg-amber-100 text-amber-700" : "bg-indigo-100 text-indigo-700"
                            )}>
                                {selectedMessage.urgency} Priority
                            </div>
                        </div>
                        <p className="text-sm text-gray-600 leading-relaxed">
                            {selectedMessage.aiSummary || "Analyzing conversation context..."}
                        </p>
                    </div>
                </motion.div>
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

function MessageCard({ message, isSelected, onClick, onOpenCRM }: { message: Message, isSelected: boolean, onClick: () => void, onOpenCRM?: () => void }) {
    return (
        <motion.button
            layout
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95 }}
            onClick={onClick}
            className={cn(
                "w-full text-left bg-white rounded-lg border border-gray-100 hover:border-gray-300 hover:shadow-md transition-all duration-200 relative overflow-hidden group pl-3 py-3 pr-3",
                isSelected && "ring-1 ring-indigo-500 ring-offset-1 border-transparent shadow-md z-10"
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
                            {message.type === 'dm' && 'DM'}
                            {message.type === 'comment' && 'Comment'}
                            {message.type === 'review' && 'Review'}
                        </Badge>
                    </div>

                    <p className={cn(
                        "text-sm line-clamp-2 leading-relaxed text-gray-600", 
                        message.status === 'unread' ? "font-medium text-gray-900" : ""
                    )}>
                        {message.content}
                    </p>
                    
                    <div className="flex items-center justify-between mt-3 pt-2 border-t border-gray-50">
                        {/* CRM Sync Status Indicator (Moved Here) */}
                        {message.crmData ? (
                            <div className="flex items-center gap-1.5" title={`Synced with ${message.crmData.crmType}`}>
                                <div className="flex items-center justify-center h-5 w-5 rounded-full bg-white border shadow-sm shrink-0">
                                    {message.crmData.crmType === 'hubspot' && <img src="/logos/hubspot.png" className="h-3.5 w-3.5 object-contain" />}
                                    {message.crmData.crmType === 'salesforce' && <img src="https://logo.clearbit.com/salesforce.com" className="h-3.5 w-3.5 object-contain" />}
                                    {message.crmData.crmType === 'pipedrive' && <img src="/logos/pipedrive.webp" className="h-3.5 w-3.5 object-contain" />}
                                    {message.crmData.crmType === 'zoho' && <img src="/logos/zoho.png" className="h-3.5 w-3.5 object-contain" />}
                                    {message.crmData.crmType === 'monday' && <img src="https://logo.clearbit.com/monday.com" className="h-3.5 w-3.5 object-contain" />}
                                    {message.crmData.crmType === 'notion' && <img src="https://logo.clearbit.com/notion.so" className="h-3.5 w-3.5 object-contain" />}
                                    {message.crmData.crmType === 'airtable' && <img src="https://logo.clearbit.com/airtable.com" className="h-3.5 w-3.5 object-contain" />}
                                </div>
                                <span className="text-[10px] font-medium text-gray-500 capitalize">
                                    {message.crmData.crmType}
                                </span>
                            </div>
                        ) : (
                            <div 
                                className="flex items-center gap-1.5 opacity-60 hover:opacity-100 transition-opacity cursor-pointer group/add" 
                                title="Not Synced - Click to Create"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onClick();
                                    onOpenCRM?.();
                                }}
                            >
                                <div className="h-5 w-5 rounded-full border border-dashed border-gray-400 flex items-center justify-center shrink-0 bg-gray-50 group-hover/add:border-indigo-500 group-hover/add:bg-indigo-50 transition-colors">
                                    <span className="text-[10px] text-gray-500 font-bold group-hover/add:text-indigo-600">+</span>
                                </div>
                                <span className="text-[10px] font-medium text-gray-500 group-hover/add:text-indigo-600 transition-colors">
                                    Add to CRM
                                </span>
                            </div>
                        )}

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
