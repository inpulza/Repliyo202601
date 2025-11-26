import React, { useState } from 'react';
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
  Search,
  PlusCircle,
  BarChart3
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
import { ScrollArea } from "@/components/ui/scroll-area";
import { Link, useLocation } from 'wouter';
import { ClientManager } from './ClientManager';
import { useToast } from '@/hooks/use-toast';

export function Sidebar() {
  const { activeClient, clients, setActiveClientId } = useNexus();
  const [location, setLocation] = useLocation();
  const [isClientManagerOpen, setIsClientManagerOpen] = useState(false);
  const { toast } = useToast();

  const handleLogout = async () => {
    try {
      const response = await fetch('/api/auth/logout', {
        method: 'POST',
        credentials: 'include',
      });

      if (response.ok) {
        toast({
          title: "Sesión Cerrada",
          description: "Has cerrado sesión exitosamente.",
        });
        setLocation('/login');
      }
    } catch (error) {
      console.error('Logout error:', error);
      toast({
        title: "Error",
        description: "No se pudo cerrar la sesión.",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="h-screen w-[260px] bg-[#EEF2F6] text-gray-600 flex flex-col border-r border-gray-200 shrink-0 transition-all duration-300">
      <ClientManager open={isClientManagerOpen} onOpenChange={setIsClientManagerOpen} />
      
      {/* Header / Branding */}
      <div className="p-5 flex items-center gap-3">
        <div className="h-8 w-8 bg-gradient-to-br from-indigo-500 to-violet-600 rounded-lg flex items-center justify-center shadow-lg shadow-indigo-900/20">
          <Command className="h-4 w-4 text-white" />
        </div>
        <span className="font-bold text-base text-gray-900 tracking-tight">Repliyo</span>
      </div>

      {/* Client Switcher */}
      <div className="px-3 mb-6">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button 
              variant="ghost" 
              className="w-full justify-between h-12 px-2 hover:bg-black/5 hover:text-gray-900 border border-transparent hover:border-black/5 rounded-xl transition-all group"
            >
              <div className="flex items-center gap-3 text-left min-w-0">
                <Avatar className="h-6 w-6 rounded-md ring-1 ring-black/5">
                  <AvatarImage src={activeClient?.avatar || undefined} />
                  <AvatarFallback className="rounded-md bg-gray-200 text-gray-600 text-[10px]">{activeClient?.name.substring(0,2) || 'C'}</AvatarFallback>
                </Avatar>
                <span className="text-sm font-medium truncate text-gray-700 group-hover:text-gray-900 transition-colors">
                  {activeClient?.name}
                </span>
              </div>
              <ChevronsUpDown className="h-4 w-4 opacity-30 group-hover:opacity-70" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-56 bg-white border-gray-200 text-gray-700 shadow-xl" align="start">
            <DropdownMenuLabel className="text-xs text-gray-500 uppercase tracking-wider">Cambiar Marca</DropdownMenuLabel>
            <DropdownMenuSeparator className="bg-gray-100" />
            <ScrollArea className="max-h-[200px]">
            {clients.map((client) => (
              <DropdownMenuItem 
                key={client.id}
                onClick={() => setActiveClientId(client.id)}
                className="gap-2 cursor-pointer focus:bg-gray-50 focus:text-gray-900"
              >
                <Avatar className="h-5 w-5 rounded-sm">
                  <AvatarImage src={client.avatar || undefined} />
                  <AvatarFallback className="text-[10px] bg-gray-100 text-gray-600">{client.name.substring(0,2) || 'C'}</AvatarFallback>
                </Avatar>
                <span className="truncate text-sm">{client.name}</span>
                {activeClient?.id === client.id && (
                  <div className="ml-auto h-1.5 w-1.5 bg-indigo-500 rounded-full shadow-[0_0_8px_rgba(99,102,241,0.8)]" />
                )}
              </DropdownMenuItem>
            ))}
            </ScrollArea>
            <DropdownMenuSeparator className="bg-gray-100" />
            <DropdownMenuItem 
              className="gap-2 cursor-pointer text-indigo-600 hover:text-indigo-700 focus:text-indigo-700 focus:bg-indigo-50"
              onClick={() => setIsClientManagerOpen(true)}
              data-testid="button-add-client-sidebar"
            >
              <PlusCircle className="h-4 w-4" />
              <span className="text-sm">Agregar Marca</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 space-y-1">
        <div className="px-3 mb-2 flex items-center justify-between">
           <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider">
             Menu
           </p>
        </div>
        
        <Link href="/overview">
          <Button 
            variant="ghost" 
            className={cn(
              "w-full justify-start gap-3 h-9 px-3 text-sm font-medium transition-all rounded-lg", 
              location === "/overview" 
                ? "bg-white text-gray-900 shadow-sm border border-gray-200" 
                : "hover:bg-black/5 hover:text-gray-900 text-gray-600"
            )}
          >
            <BarChart3 className="h-4 w-4" />
            Overview
          </Button>
        </Link>

        <Link href="/">
          <Button 
            variant="ghost" 
            className={cn(
              "w-full justify-start gap-3 h-9 px-3 text-sm font-medium transition-all rounded-lg", 
              location === "/" 
                ? "bg-white text-gray-900 shadow-sm border border-gray-200" 
                : "hover:bg-black/5 hover:text-gray-900 text-gray-600"
            )}
          >
            <Inbox className="h-4 w-4" />
            Smart Inbox
            {/* Optional Badge logic could go here */}
          </Button>
        </Link>

        <Link href="/connections">
          <Button 
            variant="ghost" 
            className={cn(
              "w-full justify-start gap-3 h-9 px-3 text-sm font-medium transition-all rounded-lg", 
              location === "/connections" 
                ? "bg-white text-gray-900 shadow-sm border border-gray-200" 
                : "hover:bg-black/5 hover:text-gray-900 text-gray-600"
            )}
          >
            <LayoutDashboard className="h-4 w-4" />
            Connections
          </Button>
        </Link>

        <Link href="/integrations">
          <Button 
            variant="ghost" 
            className={cn(
              "w-full justify-start gap-3 h-9 px-3 text-sm font-medium transition-all rounded-lg", 
              location === "/integrations" 
                ? "bg-white text-gray-900 shadow-sm border border-gray-200" 
                : "hover:bg-black/5 hover:text-gray-900 text-gray-600"
            )}
          >
            <Command className="h-4 w-4" />
            Integrations
          </Button>
        </Link>

        <Link href="/settings">
          <Button 
            variant="ghost" 
            className={cn(
              "w-full justify-start gap-3 h-9 px-3 text-sm font-medium transition-all rounded-lg", 
              location === "/settings" 
                ? "bg-white text-gray-900 shadow-sm border border-gray-200" 
                : "hover:bg-black/5 hover:text-gray-900 text-gray-600"
            )}
          >
            <Settings className="h-4 w-4" />
            Agent Settings
          </Button>
        </Link>
      </nav>

      {/* Footer */}
      <div className="p-4 border-t border-gray-200">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <div className="flex items-center gap-3 px-2 py-2 rounded-xl hover:bg-black/5 transition-colors cursor-pointer group select-none">
              <Avatar className="h-8 w-8 ring-2 ring-black/5 group-hover:ring-black/10 transition-all">
                <AvatarFallback className="bg-gray-200 text-gray-600">US</AvatarFallback>
              </Avatar>
              <div className="flex flex-col overflow-hidden">
                <span className="text-sm font-medium text-gray-700 group-hover:text-gray-900 transition-colors">User Account</span>
                <span className="text-xs text-gray-500 truncate">user@agency.com</span>
              </div>
              <ChevronsUpDown className="h-4 w-4 text-gray-400 ml-auto group-hover:text-gray-600 transition-colors" />
            </div>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-56 bg-white border-gray-200 text-gray-700 shadow-xl" align="start" side="top">
            <DropdownMenuLabel className="text-xs text-gray-500 uppercase tracking-wider">My Account</DropdownMenuLabel>
            <DropdownMenuSeparator className="bg-gray-100" />
            <DropdownMenuItem className="gap-2 cursor-pointer focus:bg-gray-50 focus:text-gray-900">
              <span className="text-sm">Profile Settings</span>
            </DropdownMenuItem>
            <DropdownMenuItem className="gap-2 cursor-pointer focus:bg-gray-50 focus:text-gray-900">
              <span className="text-sm">Billing & Usage</span>
            </DropdownMenuItem>
            <DropdownMenuSeparator className="bg-gray-100" />
            <DropdownMenuItem 
              className="gap-2 cursor-pointer text-red-600 focus:text-red-700 focus:bg-red-50"
              onClick={handleLogout}
              data-testid="button-logout"
            >
              <LogOut className="h-4 w-4" />
              <span className="text-sm">Cerrar Sesión</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}
