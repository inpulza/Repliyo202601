
import React from 'react';
import { Link, useLocation } from 'wouter';
import { Inbox, LayoutDashboard, Command, Settings } from 'lucide-react';
import { cn } from '@/lib/utils';

export function BottomNav() {
  const [location] = useLocation();

  const navItems = [
    { href: '/', icon: Inbox, label: 'Inbox' },
    { href: '/connections', icon: LayoutDashboard, label: 'Connections' },
    { href: '/integrations', icon: Command, label: 'Apps' },
    { href: '/settings', icon: Settings, label: 'Settings' },
  ];

  return (
    <div className="md:hidden fixed bottom-0 left-0 right-0 bg-[#1C1C1F] border-t border-[#2C2C2E] h-16 z-50 flex items-center justify-around px-2 pb-safe">
      {navItems.map((item) => {
        const isActive = location === item.href;
        return (
          <Link key={item.href} href={item.href}>
            <button
              className={cn(
                "flex flex-col items-center justify-center w-16 h-full gap-1 pt-1",
                isActive ? "text-white" : "text-gray-500 hover:text-gray-300"
              )}
            >
              <item.icon className={cn("h-6 w-6", isActive && "fill-white/10")} />
              <span className="text-[10px] font-medium">{item.label}</span>
            </button>
          </Link>
        );
      })}
    </div>
  );
}
