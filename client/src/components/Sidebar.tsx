import React from 'react';
import { useNexus } from '@/context/NexusContext';
import { cn } from '@/lib/utils';
import { 
  LayoutDashboard, 
  Inbox, 
  Settings, 
  ChevronsUpDown, 
  LogOut, 
  Sparkles,
  Command,
  Search
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Link, useLocation } from 'wouter';

export function Sidebar() {
  const { activeClient, clients, setActiveClientId } = useNexus();
  const [location] = useLocation();

  return (
    <div className="h-screen w-[260px] bg-[#1C1C1F] text-gray-400 flex flex-col border-r border-[#2C2C2E] shrink-0 transition-all duration-300">
      {/* Header / Branding */}
      <div className="p-5 flex items-center gap-3">
        <div className="h-8 w-8 bg-gradient-to-br from-indigo-500 to-violet-600 rounded-lg flex items-center justify-center shadow-lg shadow-indigo-900/20">
          <Sparkles className="h-4 w-4 text-white" />
        </div>
        <span className="font-bold text-base text-white tracking-tight">NexusFlow</span>
      </div>

      {/* Client Switcher */}
      <div className="px-3 mb-6">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button 
              variant="ghost" 
              className="w-full justify-between h-12 px-2 hover:bg-white/5 hover:text-white border border-transparent hover:border-white/5 rounded-xl transition-all group"
            >
              <div className="flex items-center gap-3 text-left min-w-0">
                <Avatar className="h-6 w-6 rounded-md ring-1 ring-white/10">
                  <AvatarImage src={activeClient?.avatar} />
                  <AvatarFallback className="rounded-md bg-gray-800 text-gray-400 text-[10px]">{activeClient?.name.substring(0,2)}</AvatarFallback>
                </Avatar>
                <span className="text-sm font-medium truncate text-gray-200 group-hover:text-white transition-colors">
                  {activeClient?.name}
                </span>
              </div>
              <ChevronsUpDown className="h-4 w-4 opacity-30 group-hover:opacity-70" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-56 bg-[#252528] border-[#3A3A3C] text-gray-300" align="start">
            <DropdownMenuLabel className="text-xs text-gray-500 uppercase tracking-wider">Switch Workspace</DropdownMenuLabel>
            <DropdownMenuSeparator className="bg-[#3A3A3C]" />
            {clients.map((client) => (
              <DropdownMenuItem 
                key={client.id}
                onClick={() => setActiveClientId(client.id)}
                className="gap-2 cursor-pointer focus:bg-white/10 focus:text-white"
              >
                <Avatar className="h-5 w-5 rounded-sm">
                  <AvatarImage src={client.avatar} />
                  <AvatarFallback className="text-[10px]">{client.name.substring(0,2)}</AvatarFallback>
                </Avatar>
                <span className="truncate text-sm">{client.name}</span>
                {activeClient?.id === client.id && (
                  <div className="ml-auto h-1.5 w-1.5 bg-indigo-500 rounded-full shadow-[0_0_8px_rgba(99,102,241,0.8)]" />
                )}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 space-y-1">
        <div className="px-3 mb-2 flex items-center justify-between">
           <p className="text-[10px] font-semibold text-gray-600 uppercase tracking-wider">
             Menu
           </p>
        </div>
        
        <Link href="/">
          <Button 
            variant="ghost" 
            className={cn(
              "w-full justify-start gap-3 h-9 px-3 text-sm font-medium transition-all rounded-lg", 
              location === "/" 
                ? "bg-white/10 text-white shadow-[inset_0_1px_0_0_rgba(255,255,255,0.05)]" 
                : "hover:bg-white/5 hover:text-gray-200"
            )}
          >
            <Inbox className="h-4 w-4" />
            Inbox
            {/* Optional Badge logic could go here */}
          </Button>
        </Link>

        <Link href="/settings">
          <Button 
            variant="ghost" 
            className={cn(
              "w-full justify-start gap-3 h-9 px-3 text-sm font-medium transition-all rounded-lg", 
              location === "/settings" 
                ? "bg-white/10 text-white shadow-[inset_0_1px_0_0_rgba(255,255,255,0.05)]" 
                : "hover:bg-white/5 hover:text-gray-200"
            )}
          >
            <Settings className="h-4 w-4" />
            Agent Settings
          </Button>
        </Link>
      </nav>

      {/* Footer */}
      <div className="p-4 border-t border-[#2C2C2E]">
        <div className="flex items-center gap-3 px-2 py-2 rounded-xl hover:bg-white/5 transition-colors cursor-pointer group">
          <Avatar className="h-8 w-8 ring-2 ring-white/5 group-hover:ring-white/10 transition-all">
            <AvatarFallback className="bg-gray-700 text-gray-300">US</AvatarFallback>
          </Avatar>
          <div className="flex flex-col overflow-hidden">
            <span className="text-sm font-medium text-gray-200 group-hover:text-white transition-colors">User Account</span>
            <span className="text-xs text-gray-600 truncate">user@agency.com</span>
          </div>
        </div>
      </div>
    </div>
  );
}
