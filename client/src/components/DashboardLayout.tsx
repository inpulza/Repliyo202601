import React, { ReactNode, useEffect } from 'react';
import { useLocation } from 'wouter';
import { Sidebar } from './Sidebar';
import { BottomNav } from './BottomNav';
import { useAuth } from '@/context/AuthContext';
import { Loader2 } from 'lucide-react';

export function DashboardLayout({ children }: { children: ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth();
  const [, setLocation] = useLocation();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      setLocation('/login');
    }
  }, [isLoading, isAuthenticated, setLocation]);

  if (isLoading) {
    return (
      <div className="flex h-[100dvh] w-full items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
          <p className="text-sm text-muted-foreground">Cargando...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

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
