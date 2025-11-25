import React, { ReactNode } from 'react';
import { Sidebar } from './Sidebar';
import { BottomNav } from './BottomNav';

export function DashboardLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex h-[100dvh] w-full overflow-hidden bg-background">
      <div className="hidden md:flex h-full shrink-0">
        <Sidebar />
      </div>
      
      <main className="flex-1 h-full overflow-hidden relative pb-16 md:pb-0">
        {children}
      </main>

      <BottomNav />
    </div>
  );
}
