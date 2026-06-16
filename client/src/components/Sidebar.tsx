import React, { useState } from 'react';
import { useNexus } from '@/context/NexusContext';
import { useAuth } from '@/context/AuthContext';
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
  BarChart3,
  Bot,
  ChevronLeft,
  ChevronRight,
  Menu,
  Users,
  ShieldAlert,
  UserCog,
} from 'lucide-react';
import { NotificationCenter } from './NotificationCenter';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Link, useLocation } from 'wouter';
import { BrandImportWizard } from './BrandImportWizard';
import { useToast } from '@/hooks/use-toast';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

export function Sidebar() {
  const { activeClient, clients, setActiveClientId } = useNexus();
  const { logout, user } = useAuth();
  const [location, setLocation] = useLocation();
  const [isClientManagerOpen, setIsClientManagerOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(true);
  const { toast } = useToast();

  const activeClients = React.useMemo(() => {
    return clients.filter(client => client.status !== 'archived');
  }, [clients]);

  const handleLogout = async () => {
    toast({
      title: "Sesión Cerrada",
      description: "Has cerrado sesión exitosamente.",
    });
    await logout();
  };

  const navItems = [
    { href: "/app/overview", icon: BarChart3, label: "Overview" },
    { href: "/app/inbox", icon: Inbox, label: "Smart Inbox" },
    { href: "/app/crm", icon: Users, label: "CRM" },
    { href: "/app/crisis-alerts", icon: ShieldAlert, label: "Crisis Alerts" },
    { href: "/app/connections", icon: LayoutDashboard, label: "Connections" },
    { href: "/app/integrations", icon: Command, label: "Integrations" },
    { href: "/app/settings", icon: Settings, label: "Agent Settings" },
    { href: "/app/ai-metrics", icon: Bot, label: "IA Metrics" },
    ...(user?.role === 'admin' ? [{ href: "/app/users", icon: UserCog, label: "Usuarios" }] : []),
  ];

  return (
    <TooltipProvider delayDuration={0}>
      <div className={cn(
        "h-screen bg-white text-gray-600 flex flex-col border-r border-gray-200 shrink-0 transition-all duration-300",
        isCollapsed ? "w-[60px]" : "w-[260px]"
      )}>
        <Dialog open={isClientManagerOpen} onOpenChange={setIsClientManagerOpen}>
          <DialogContent className="sm:max-w-[600px]">
            <DialogHeader>
              <DialogTitle>Agregar Marca</DialogTitle>
              <DialogDescription>
                Conecta una nueva marca desde Metricool.
              </DialogDescription>
            </DialogHeader>
            <BrandImportWizard 
              onComplete={() => setIsClientManagerOpen(false)}
              onCancel={() => setIsClientManagerOpen(false)}
            />
          </DialogContent>
        </Dialog>
        
        {/* Header / Branding */}
        <div className={cn("p-3 flex items-center", isCollapsed ? "justify-center" : "gap-3 px-5")}>
          <div className="h-8 w-8 bg-gradient-to-br from-indigo-500 to-violet-600 rounded-lg flex items-center justify-center shrink-0">
            <Command className="h-4 w-4 text-white" />
          </div>
          {!isCollapsed && (
            <>
              <span className="font-bold text-base text-gray-900 tracking-tight">Repliyo</span>
              <div className="ml-auto">
                <NotificationCenter isCollapsed={isCollapsed} />
              </div>
            </>
          )}
        </div>
        
        {/* Notification Bell - Collapsed State */}
        {isCollapsed && (
          <div className="px-2 mb-2 flex justify-center">
            <NotificationCenter isCollapsed={isCollapsed} />
          </div>
        )}

        {/* Collapse Toggle */}
        <div className={cn("px-2 mb-2", isCollapsed ? "flex justify-center" : "flex justify-end px-3")}>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="h-7 w-7 text-gray-400 hover:text-gray-600 hover:bg-gray-100"
            title={isCollapsed ? "Expandir menú" : "Colapsar menú"}
          >
            {isCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
          </Button>
        </div>

        {/* Client Switcher */}
        <div className={cn("mb-4", isCollapsed ? "px-2" : "px-3")}>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              {isCollapsed ? (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button 
                      variant="ghost" 
                      className="w-full h-10 p-0 hover:bg-gray-100 rounded-lg"
                    >
                      <Avatar className="h-7 w-7 rounded-md ring-1 ring-black/5">
                        <AvatarImage src={activeClient?.avatar || undefined} />
                        <AvatarFallback className="rounded-md bg-gray-200 text-gray-600 text-[10px]">{activeClient?.name.substring(0,2) || 'C'}</AvatarFallback>
                      </Avatar>
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="right">
                    <p>{activeClient?.name || 'Seleccionar marca'}</p>
                  </TooltipContent>
                </Tooltip>
              ) : (
                <Button 
                  variant="ghost" 
                  className="w-full justify-between h-12 px-2 hover:bg-gray-100 hover:text-gray-900 rounded-xl transition-all group"
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
              )}
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-56 bg-white border-gray-200 text-gray-700" align="start">
              <DropdownMenuLabel className="text-xs text-gray-500 uppercase tracking-wider">Cambiar Marca</DropdownMenuLabel>
              <DropdownMenuSeparator className="bg-gray-100" />
              <div className="max-h-[200px] overflow-y-auto">
              {activeClients.map((client) => (
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
                    <div className="ml-auto h-1.5 w-1.5 bg-indigo-500 rounded-full" />
                  )}
                </DropdownMenuItem>
              ))}
              </div>
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
        <nav className={cn("flex-1 space-y-1", isCollapsed ? "px-2" : "px-3")}>
          {!isCollapsed && (
            <div className="px-3 mb-2 flex items-center justify-between">
               <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider">
                 Menu
               </p>
            </div>
          )}
          
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = item.href === "/" ? location === "/" : location === item.href;
            
            if (isCollapsed) {
              return (
                <Tooltip key={item.href}>
                  <TooltipTrigger asChild>
                    <Link href={item.href}>
                      <Button 
                        variant="ghost" 
                        className={cn(
                          "w-full h-10 p-0 transition-all rounded-lg", 
                          isActive 
                            ? "bg-gray-100 text-gray-900" 
                            : "hover:bg-gray-100 hover:text-gray-900 text-gray-600"
                        )}
                      >
                        <Icon className="h-4 w-4" />
                      </Button>
                    </Link>
                  </TooltipTrigger>
                  <TooltipContent side="right">
                    <p>{item.label}</p>
                  </TooltipContent>
                </Tooltip>
              );
            }
            
            return (
              <Link key={item.href} href={item.href}>
                <Button 
                  variant="ghost" 
                  className={cn(
                    "w-full justify-start gap-3 h-9 px-3 text-sm font-medium transition-all rounded-lg", 
                    isActive 
                      ? "bg-gray-100 text-gray-900" 
                      : "hover:bg-gray-100 hover:text-gray-900 text-gray-600"
                  )}
                >
                  <Icon className="h-4 w-4" />
                  {item.label}
                </Button>
              </Link>
            );
          })}
        </nav>

        {/* Footer */}
        <div className={cn("border-t border-gray-200", isCollapsed ? "p-2" : "p-4")}>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              {isCollapsed ? (
                <Button variant="ghost" className="w-full h-10 p-0 hover:bg-gray-100 rounded-lg">
                  <Avatar className="h-7 w-7 ring-1 ring-black/5">
                    <AvatarImage src={user?.profileImageUrl || undefined} />
                    <AvatarFallback className="bg-gray-200 text-gray-600 text-[10px]">{user?.name?.substring(0, 2).toUpperCase() || 'US'}</AvatarFallback>
                  </Avatar>
                </Button>
              ) : (
                <div className="flex items-center gap-3 px-2 py-2 rounded-xl hover:bg-gray-100 transition-colors cursor-pointer group select-none">
                  <Avatar className="h-8 w-8 ring-2 ring-black/5 group-hover:ring-black/10 transition-all">
                    <AvatarImage src={user?.profileImageUrl || undefined} />
                    <AvatarFallback className="bg-gray-200 text-gray-600">{user?.name?.substring(0, 2).toUpperCase() || 'US'}</AvatarFallback>
                  </Avatar>
                  <div className="flex flex-col overflow-hidden">
                    <span className="text-sm font-medium text-gray-700 group-hover:text-gray-900 transition-colors">{user?.name || 'Usuario'}</span>
                    <span className="text-xs text-gray-500 truncate">{user?.email || 'user@agency.com'}</span>
                  </div>
                  <ChevronsUpDown className="h-4 w-4 text-gray-400 ml-auto group-hover:text-gray-600 transition-colors" />
                </div>
              )}
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-56 bg-white border-gray-200 text-gray-700" align="start" side="top">
              <DropdownMenuLabel className="text-xs text-gray-500 uppercase tracking-wider">Mi Cuenta</DropdownMenuLabel>
              <DropdownMenuSeparator className="bg-gray-100" />
              <DropdownMenuItem 
                className="gap-2 cursor-pointer focus:bg-gray-50 focus:text-gray-900"
                onClick={() => setLocation('/app/profile')}
                data-testid="button-profile-settings"
              >
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
    </TooltipProvider>
  );
}
