import React from 'react';
import { IntegrationsList } from "@/components/IntegrationsList";

export function IntegrationsPage() {
  return (
    <div className="h-full bg-background overflow-y-auto">
      <div className="p-8 flex flex-col max-w-5xl mx-auto">
        <IntegrationsList />
      </div>
    </div>
  );
}
