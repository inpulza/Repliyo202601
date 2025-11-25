import React, { useState, useEffect } from 'react';
import { useNexus } from '@/context/NexusContext';
import { cn } from '@/lib/utils';
import { 
  Check, 
  Send, 
  RefreshCw,
  Sparkles,
  Loader2,
  Search,
  Filter,
  MoreVertical,
  User,
  MessageCircle,
  MessageSquare,
  LayoutGrid // Icon for "All"
} from 'lucide-react';
import { FaInstagram, FaFacebook, FaLinkedin, FaTiktok, FaYoutube } from 'react-icons/fa';
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { formatDistanceToNow } from 'date-fns';
import { Message, MessageStatus, Platform, MessageType } from '@/lib/mockData';
import { motion, AnimatePresence } from "framer-motion";

export function Inbox() {
  const { messages, activeClientId, approveMessage, refreshFeed } = useNexus();
  const [selectedMessageId, setSelectedMessageId] = useState<string | null>(null);
  const [activeFilter, setActiveFilter] = useState<Platform | 'all'>('all');
  
  const clientMessages = messages
    .filter(m => m.clientId === activeClientId)
    .filter(m => activeFilter === 'all' || m.platform === activeFilter)
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

  // Auto-select first message if none selected
  useEffect(() => {
    if (clientMessages.length > 0 && !clientMessages.find(m => m.id === selectedMessageId)) {
      setSelectedMessageId(clientMessages[0].id);
    }
  }, [activeClientId, activeFilter, clientMessages, selectedMessageId]);

  const selectedMessage = messages.find(m => m.id === selectedMessageId);

  return (
    <div className="h-full flex bg-background overflow-hidden">
      {/* LEFT: Message List (Intercom Style) */}
      <div className="w-[380px] border-r flex flex-col bg-gray-50/50">
        {/* Header */}
        <div className="h-16 border-b px-4 flex items-center justify-between bg-white shrink-0">
          <h1 className="font-semibold text-lg tracking-tight">Inbox</h1>
          <div className="flex gap-2">
             <Button variant="ghost" size="icon" onClick={refreshFeed} className="h-8 w-8 text-muted-foreground">
                <RefreshCw className="h-4 w-4" />
             </Button>
          </div>
        </div>
        
        {/* Search & Filters */}
        <div className="p-3 border-b bg-white shrink-0 space-y-3">
           <div className="relative">
             <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
             <Input 
               placeholder="Search messages..." 
               className="pl-9 bg-gray-50 border-transparent focus:bg-white focus:border-gray-200 transition-all rounded-lg" 
             />
           </div>
           
           {/* Filter Tabs */}
           <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar items-center">
              <FilterButton 
                active={activeFilter === 'all'} 
                onClick={() => setActiveFilter('all')}
                label="All" 
                icon={<LayoutGrid className="h-4 w-4" />}
              />
              <FilterButton 
                active={activeFilter === 'instagram'} 
                onClick={() => setActiveFilter('instagram')}
                label="Instagram"
                icon={<FaInstagram className="h-4 w-4" />}
                activeColorClass="bg-pink-600"
                hoverColorClass="hover:text-pink-600 hover:border-pink-200 hover:bg-pink-50"
              />
              <FilterButton 
                active={activeFilter === 'tiktok'} 
                onClick={() => setActiveFilter('tiktok')}
                label="TikTok"
                icon={<FaTiktok className="h-4 w-4" />}
                activeColorClass="bg-black"
                hoverColorClass="hover:text-black hover:border-gray-300 hover:bg-gray-100"
              />
              <FilterButton 
                active={activeFilter === 'facebook'} 
                onClick={() => setActiveFilter('facebook')}
                label="Facebook"
                icon={<FaFacebook className="h-4 w-4" />}
                activeColorClass="bg-blue-600"
                hoverColorClass="hover:text-blue-600 hover:border-blue-200 hover:bg-blue-50"
              />
              <FilterButton 
                active={activeFilter === 'linkedin'} 
                onClick={() => setActiveFilter('linkedin')}
                label="LinkedIn"
                icon={<FaLinkedin className="h-4 w-4" />}
                activeColorClass="bg-[#0077b5]"
                hoverColorClass="hover:text-[#0077b5] hover:border-[#0077b5]/30 hover:bg-[#0077b5]/10"
              />
               <FilterButton 
                active={activeFilter === 'youtube'} 
                onClick={() => setActiveFilter('youtube')}
                label="YouTube"
                icon={<FaYoutube className="h-4 w-4" />}
                activeColorClass="bg-red-600"
                hoverColorClass="hover:text-red-600 hover:border-red-200 hover:bg-red-50"
              />
           </div>
        </div>

        {/* List */}
        <ScrollArea className="flex-1">
          <div className="flex flex-col">
            <AnimatePresence mode="popLayout">
              {clientMessages.length === 0 ? (
                 <div className="p-8 text-center text-muted-foreground text-sm">
                    No messages found for this filter.
                 </div>
              ) : (
                clientMessages.map((msg) => (
                  <motion.button
                    layout
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    transition={{ duration: 0.2 }}
                    key={msg.id}
                    onClick={() => setSelectedMessageId(msg.id)}
                    className={cn(
                      "flex flex-col gap-1 p-4 text-left border-b border-gray-100 hover:bg-gray-100/80 transition-colors relative group",
                      selectedMessageId === msg.id && "bg-white shadow-[inset_3px_0_0_0_var(--color-primary)] z-10"
                    )}
                  >
                    <div className="flex items-center justify-between w-full mb-1">
                      <div className="flex items-center gap-2">
                        <Avatar className="h-6 w-6">
                          <AvatarFallback className="text-[10px] bg-primary/10 text-primary font-bold">
                              {msg.author.substring(0,2).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <span className={cn("text-sm font-medium truncate", msg.status === 'unread' ? "text-foreground" : "text-muted-foreground")}>
                          {msg.author}
                        </span>
                      </div>
                      <span className="text-[10px] text-muted-foreground whitespace-nowrap ml-2">
                        {formatDistanceToNow(new Date(msg.timestamp), { addSuffix: false })}
                      </span>
                    </div>
                    <div className="flex justify-between items-start">
                      <p className={cn("text-sm line-clamp-2 leading-relaxed pr-2", msg.status === 'unread' ? "text-foreground font-medium" : "text-muted-foreground")}>
                        {msg.content}
                      </p>
                      {msg.status === 'unread' && (
                        <div className="h-2 w-2 bg-blue-500 rounded-full shrink-0 mt-1.5" />
                      )}
                    </div>
                    
                    <div className="flex items-center gap-2 mt-3">
                      <PlatformBadge platform={msg.platform} />
                      <TypeBadge type={msg.type} />
                      <StatusDot status={msg.status} />
                    </div>
                  </motion.button>
                ))
              )}
            </AnimatePresence>
          </div>
        </ScrollArea>
      </div>

      {/* RIGHT: Chat Area (Detail View) */}
      <div className="flex-1 flex flex-col bg-white relative">
        {selectedMessage ? (
          <>
            {/* Chat Header */}
            <header className="h-16 border-b px-6 flex items-center justify-between shrink-0 bg-white/80 backdrop-blur-sm z-20">
               <div className="flex items-center gap-3">
                 <Avatar className="h-10 w-10 ring-2 ring-offset-2 ring-gray-100">
                   <AvatarFallback className="bg-gradient-to-br from-indigo-500 to-purple-600 text-white font-bold">
                      {selectedMessage.author.substring(0,2).toUpperCase()}
                   </AvatarFallback>
                 </Avatar>
                 <div>
                    <h2 className="font-semibold text-sm flex items-center gap-2">
                       {selectedMessage.author} 
                       <PlatformIcon platform={selectedMessage.platform} className="h-3 w-3 text-muted-foreground" />
                    </h2>
                    <div className="flex items-center gap-2 mt-0.5">
                      <TypeBadge type={selectedMessage.type} />
                      <span className="text-xs text-muted-foreground">via {selectedMessage.platform}</span>
                    </div>
                 </div>
               </div>
               <Button variant="ghost" size="icon" className="text-muted-foreground">
                  <MoreVertical className="h-5 w-5" />
               </Button>
            </header>

            {/* Chat Content */}
            <ScrollArea className="flex-1 p-8 bg-gray-50/30">
               <div className="max-w-3xl mx-auto space-y-8">
                  {/* User Message */}
                  <div className="flex gap-4">
                     <Avatar className="h-8 w-8 mt-1">
                        <AvatarFallback className="bg-gray-200 text-gray-600"><User className="h-4 w-4" /></AvatarFallback>
                     </Avatar>
                     <div className="flex flex-col gap-1 max-w-[80%]">
                        <div className="bg-white border p-4 rounded-2xl rounded-tl-none shadow-sm text-sm leading-relaxed text-gray-800">
                           {selectedMessage.content}
                        </div>
                        <span className="text-xs text-muted-foreground ml-1">
                           {formatDistanceToNow(new Date(selectedMessage.timestamp), { addSuffix: true })}
                        </span>
                     </div>
                  </div>

                  {/* AI Suggestion / Response Area */}
                  <AnimatePresence mode="wait">
                    {selectedMessage.status !== 'sent' && (
                      <motion.div 
                        initial={{ opacity: 0, y: 20, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 10 }}
                        className="relative"
                      >
                        <div className="absolute -left-10 top-0 flex flex-col items-center gap-1">
                           <div className="h-8 w-8 rounded-full bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center shadow-lg shadow-indigo-200">
                              {selectedMessage.status === 'drafting' ? (
                                <Loader2 className="h-4 w-4 text-white animate-spin" />
                              ) : (
                                <Sparkles className="h-4 w-4 text-white" />
                              )}
                           </div>
                           <div className="w-0.5 h-full bg-indigo-100 absolute top-8 -z-10" />
                        </div>

                        <div className={cn(
                           "ml-4 rounded-xl border overflow-hidden transition-all duration-500",
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
                                       <Sparkles className="h-3 w-3" /> AI Suggestion
                                    </span>
                                    <Badge variant="secondary" className="bg-white/80 text-indigo-700 border-indigo-100 text-[10px] hover:bg-white">
                                       Confidence: 98%
                                    </Badge>
                                 </div>
                                 <div className="p-4">
                                    <textarea 
                                       className="w-full bg-transparent border-none p-0 text-sm text-gray-800 resize-none focus:outline-none min-h-[80px] leading-relaxed"
                                       defaultValue={selectedMessage.draftResponse}
                                    />
                                 </div>
                                 <div className="bg-gray-50 p-3 flex items-center justify-between border-t">
                                    <Button variant="ghost" size="sm" className="text-xs text-muted-foreground hover:text-foreground h-8">
                                       Discard
                                    </Button>
                                    <div className="flex items-center gap-2">
                                       <Button variant="outline" size="sm" className="h-8 text-xs bg-white">
                                          Edit Response
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
                          className="flex gap-4 ml-4"
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
           <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground">
              <div className="h-16 w-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                 <Send className="h-8 w-8 text-gray-400" />
              </div>
              <p className="text-lg font-medium text-gray-900">Select a conversation</p>
              <p className="text-sm max-w-xs text-center mt-1">Choose a message from the list to view details and manage AI responses.</p>
           </div>
        )}
      </div>
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
    case 'instagram': return <FaInstagram className={className} />;
    case 'facebook': return <FaFacebook className={className} />;
    case 'linkedin': return <FaLinkedin className={className} />;
    case 'tiktok': return <FaTiktok className={className} />;
    case 'youtube': return <FaYoutube className={className} />;
    default: return <MessageSquare className={className} />;
  }
}

function PlatformBadge({ platform }: { platform: Platform }) {
  const styles = {
    instagram: "text-pink-600 border-pink-200 bg-pink-50",
    facebook: "text-blue-600 border-blue-200 bg-blue-50",
    linkedin: "text-blue-700 border-blue-200 bg-blue-50",
    tiktok: "text-black border-gray-200 bg-gray-100",
    youtube: "text-red-600 border-red-200 bg-red-50",
  };

  return (
    <Badge variant="outline" title={platform} className={cn("h-5 w-5 p-0 flex items-center justify-center border shrink-0", styles[platform])}>
      <PlatformIcon platform={platform} className="h-3 w-3" />
    </Badge>
  );
}

function TypeBadge({ type }: { type: MessageType }) {
  return (
    <Badge variant="outline" title={type === 'dm' ? 'Direct Message' : 'Comment'} className={cn(
      "h-5 w-5 p-0 flex items-center justify-center border shrink-0",
      type === 'dm' 
        ? "text-purple-600 border-purple-200 bg-purple-50" 
        : "text-orange-600 border-orange-200 bg-orange-50"
    )}>
      {type === 'dm' ? <MessageCircle className="h-3 w-3" /> : <MessageSquare className="h-3 w-3" />}
    </Badge>
  );
}

function StatusDot({ status }: { status: MessageStatus }) {
   switch(status) {
      case 'unread': return null;
      case 'drafting': return <span className="text-[10px] text-amber-600 font-medium flex items-center gap-1"><Loader2 className="h-2 w-2 animate-spin" /> Drafting</span>;
      case 'ready_for_review': return <span className="text-[10px] text-indigo-600 font-medium flex items-center gap-1">● Needs Review</span>;
      case 'approved': return <span className="text-[10px] text-green-600 font-medium flex items-center gap-1">✓ Approved</span>;
      case 'sent': return <span className="text-[10px] text-gray-400 font-medium flex items-center gap-1">✓ Sent</span>;
   }
}
