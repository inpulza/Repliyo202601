import React from 'react';
import { useNexus } from '@/context/NexusContext';
import { cn } from '@/lib/utils';
import { 
  LayoutDashboard, 
  Inbox, 
  Settings, 
  ChevronsUpDown, 
  LogOut, 
  Sparkles 
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
    <div className="h-screen w-64 border-r bg-sidebar text-sidebar-foreground flex flex-col">
      {/* Header / Branding */}
      <div className="p-6 flex items-center gap-2 border-b border-sidebar-border">
        <div className="h-8 w-8 bg-primary rounded-lg flex items-center justify-center">
          <Sparkles className="h-5 w-5 text-primary-foreground" />
        </div>
        <span className="font-bold text-lg tracking-tight">NexusFlow</span>
      </div>

      {/* Client Switcher */}
      <div className="p-4">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button 
              variant="outline" 
              className="w-full justify-between h-14 px-3 border-sidebar-border hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
            >
              <div className="flex items-center gap-3 text-left">
                <Avatar className="h-8 w-8 rounded-md">
                  <AvatarImage src={activeClient?.avatar} />
                  <AvatarFallback className="rounded-md">{activeClient?.name.substring(0,2)}</AvatarFallback>
                </Avatar>
                <div className="flex flex-col overflow-hidden">
                  <span className="text-sm font-semibold truncate w-28 leading-none mb-1">{activeClient?.name}</span>
                  <span className="text-xs text-muted-foreground truncate w-28 leading-none">{activeClient?.industry}</span>
                </div>
              </div>
              <ChevronsUpDown className="h-4 w-4 opacity-50 shrink-0" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-56" align="start">
            <DropdownMenuLabel>Switch Workspace</DropdownMenuLabel>
            <DropdownMenuSeparator />
            {clients.map((client) => (
              <DropdownMenuItem 
                key={client.id}
                onClick={() => setActiveClientId(client.id)}
                className="gap-2 cursor-pointer"
              >
                <Avatar className="h-6 w-6">
                  <AvatarImage src={client.avatar} />
                  <AvatarFallback>{client.name.substring(0,2)}</AvatarFallback>
                </Avatar>
                <span className="truncate">{client.name}</span>
                {activeClient?.id === client.id && (
                  <div className="ml-auto h-2 w-2 bg-primary rounded-full" />
                )}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-4 space-y-2 py-2">
        <p className="text-xs font-medium text-muted-foreground px-2 mb-2 uppercase tracking-wider">
          Platform
        </p>
        
        <Link href="/">
          <Button 
            variant={location === "/" ? "secondary" : "ghost"} 
            className={cn("w-full justify-start gap-3", location === "/" && "bg-sidebar-accent text-sidebar-accent-foreground")}
          >
            <Inbox className="h-4 w-4" />
            Inbox
          </Button>
        </Link>

        <Link href="/settings">
          <Button 
            variant={location === "/settings" ? "secondary" : "ghost"} 
            className={cn("w-full justify-start gap-3", location === "/settings" && "bg-sidebar-accent text-sidebar-accent-foreground")}
          >
            <Settings className="h-4 w-4" />
            Agent Settings
          </Button>
        </Link>
      </nav>

      {/* Footer */}
      <div className="p-4 border-t border-sidebar-border">
        <div className="flex items-center gap-3 px-2 py-2">
          <Avatar className="h-8 w-8">
            <AvatarFallback>US</AvatarFallback>
          </Avatar>
          <div className="flex flex-col">
            <span className="text-sm font-medium">User Account</span>
            <span className="text-xs text-muted-foreground">user@agency.com</span>
          </div>
        </div>
      </div>
    </div>
  );
}
