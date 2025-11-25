import React from 'react';
import { IntegrationsList } from "@/components/IntegrationsList";

export function IntegrationsPage() {
  return (
    <div className="h-full bg-background p-8 flex flex-col max-w-5xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold tracking-tight text-foreground">Integrations</h1>
        <p className="text-muted-foreground mt-1">Connect your favorite tools to enhance your workflow.</p>
      </div>

      <IntegrationsList />
    </div>
  );
}
