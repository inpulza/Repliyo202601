import React, { ReactNode } from 'react';
import { Sidebar } from './Sidebar';

export function DashboardLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex h-screen w-full overflow-hidden bg-background">
      <Sidebar />
      <main className="flex-1 h-full overflow-hidden relative">
        {children}
      </main>
    </div>
  );
}
