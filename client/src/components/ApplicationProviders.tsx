import type { ReactNode } from "react";
import { QueryClientProvider } from "@tanstack/react-query";

import { AuthProvider } from "@/context/AuthContext";
import { LanguageProvider } from "@/context/LanguageContext";
import { NexusProvider } from "@/context/NexusContext";
import { queryClient } from "@/lib/queryClient";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";

export function ApplicationProviders({ children }: { children: ReactNode }) {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <NexusProvider>
          <LanguageProvider>
            <TooltipProvider>
              {children}
              <Toaster />
            </TooltipProvider>
          </LanguageProvider>
        </NexusProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}
