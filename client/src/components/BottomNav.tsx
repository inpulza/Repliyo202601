import React, { useState } from 'react';
import { Link, useLocation } from 'wouter';
import { Inbox, LayoutDashboard, Settings, BarChart3, Bot, Users, MoreHorizontal, Command, User } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";

export function BottomNav() {
  const [location, setLocation] = useLocation();
  const [isMoreOpen, setIsMoreOpen] = useState(false);

  const mainNavItems = [
    { href: '/app/overview', icon: BarChart3, label: 'Overview' },
    { href: '/app/inbox', icon: Inbox, label: 'Inbox' },
    { href: '/app/crm', icon: Users, label: 'CRM' },
    { href: '/app/connections', icon: LayoutDashboard, label: 'Connect' },
  ];

  const moreNavItems = [
    { href: '/app/settings', icon: Settings, label: 'Agent Settings' },
    { href: '/app/integrations', icon: Command, label: 'Integrations' },
    { href: '/app/ai-metrics', icon: Bot, label: 'IA Metrics' },
    { href: '/app/profile', icon: User, label: 'Profile' },
  ];

  const isMoreActive = moreNavItems.some(item => location === item.href);

  const handleMoreItemClick = (href: string) => {
    setIsMoreOpen(false);
    setLocation(href);
  };

  return (
    <>
      <nav 
        className="md:hidden fixed inset-x-0 bottom-0 bg-[#1C1C1F] border-t border-[#2C2C2E] h-16 z-[9999] flex items-center justify-around px-2" 
        style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
        data-testid="bottom-nav"
      >
        {mainNavItems.map((item) => {
          const isActive = location === item.href;
          return (
            <Link key={item.href} href={item.href}>
              <button
                className={cn(
                  "flex flex-col items-center justify-center w-16 h-full gap-1 pt-1",
                  isActive ? "text-white" : "text-gray-500 hover:text-gray-300"
                )}
                data-testid={`nav-${item.label.toLowerCase().replace(' ', '-')}`}
              >
                <item.icon className={cn("h-6 w-6", isActive && "fill-white/10")} />
                <span className="text-[10px] font-medium">{item.label}</span>
              </button>
            </Link>
          );
        })}
        
        <button
          onClick={() => setIsMoreOpen(true)}
          className={cn(
            "flex flex-col items-center justify-center w-16 h-full gap-1 pt-1",
            isMoreActive ? "text-white" : "text-gray-500 hover:text-gray-300"
          )}
          aria-label="More options"
          data-testid="nav-more"
        >
          <MoreHorizontal className={cn("h-6 w-6", isMoreActive && "fill-white/10")} />
          <span className="text-[10px] font-medium">More</span>
        </button>
      </nav>

      <Sheet open={isMoreOpen} onOpenChange={setIsMoreOpen}>
        <SheetContent 
          side="bottom" 
          className="bg-[#1C1C1F] border-t border-[#2C2C2E] text-white rounded-t-2xl"
          style={{ paddingBottom: 'env(safe-area-inset-bottom, 16px)' }}
        >
          <SheetHeader className="pb-2">
            <SheetTitle className="text-white text-left">More Options</SheetTitle>
          </SheetHeader>
          
          <div className="grid grid-cols-1 gap-1">
            {moreNavItems.map((item) => {
              const isActive = location === item.href;
              return (
                <button
                  key={item.href}
                  onClick={() => handleMoreItemClick(item.href)}
                  className={cn(
                    "flex items-center gap-4 px-4 py-4 rounded-xl transition-colors min-h-[52px]",
                    isActive 
                      ? "bg-white/10 text-white" 
                      : "text-gray-300 hover:bg-white/5 hover:text-white"
                  )}
                  data-testid={`more-${item.label.toLowerCase().replace(' ', '-')}`}
                >
                  <item.icon className="h-6 w-6" />
                  <span className="text-base font-medium">{item.label}</span>
                </button>
              );
            })}
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
