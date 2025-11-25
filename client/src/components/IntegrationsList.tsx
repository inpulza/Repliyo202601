import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Check, ExternalLink, PlugZap } from "lucide-react";

export interface Integration {
  id: string;
  name: string;
  description: string;
  logo: string;
  status: 'connected' | 'disconnected';
}

const INTEGRATIONS: Integration[] = [
  {
    id: 'hubspot',
    name: 'HubSpot',
    description: 'Sync contacts, deals, and track email activity.',
    logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/1/11/HubSpot_Logo.svg/2560px-HubSpot_Logo.svg.png',
    status: 'connected',
  },
  {
    id: 'salesforce',
    name: 'Salesforce',
    description: 'Connect your sales team with your support inbox.',
    logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/f/f9/Salesforce.com_logo.svg/2560px-Salesforce.com_logo.svg.png',
    status: 'disconnected',
  },
  {
    id: 'pipedrive',
    name: 'Pipedrive',
    description: 'Visual sales pipeline management integration.',
    logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/6/6a/Pipedrive_Logo.svg/2560px-Pipedrive_Logo.svg.png',
    status: 'disconnected',
  },
  {
    id: 'zoho',
    name: 'Zoho CRM',
    description: 'Manage your customer relationships seamlessly.',
    logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/2/2f/Zoho-logo.png/640px-Zoho-logo.png',
    status: 'disconnected',
  },
];

export function IntegrationsList() {
  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2">
        <h2 className="text-lg font-semibold flex items-center gap-2">
            <PlugZap className="h-5 w-5 text-indigo-500" />
            Integrations Marketplace
        </h2>
        <p className="text-sm text-muted-foreground">Connect your favorite tools to enhance your workflow.</p>
      </div>
      
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-2">
        {INTEGRATIONS.map((integration) => (
          <Card key={integration.id} className="flex flex-col group hover:border-indigo-200 transition-all">
            <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
               <div className="h-8 w-auto max-w-[120px] relative flex items-center">
                   {/* Using object-contain for logos to handle different aspect ratios */}
                   <img 
                        src={integration.logo} 
                        alt={integration.name} 
                        className="h-full w-auto object-contain object-left"
                    />
               </div>
               {integration.status === 'connected' ? (
                   <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 gap-1">
                       <span className="h-1.5 w-1.5 rounded-full bg-green-500 animate-pulse" />
                       Active
                   </Badge>
               ) : (
                   <Badge variant="outline" className="bg-gray-50 text-gray-500 border-gray-200">
                       disconnected
                   </Badge>
               )}
            </CardHeader>
            <CardContent className="flex-1 flex flex-col pt-4">
              <CardTitle className="text-base mb-1">{integration.name}</CardTitle>
              <CardDescription className="mb-4 text-xs">{integration.description}</CardDescription>
              
              <div className="mt-auto pt-2">
                  {integration.status === 'connected' ? (
                      <div className="flex gap-2">
                          <Button size="sm" variant="outline" className="w-full border-gray-200 hover:bg-gray-50 text-xs">
                              Configure
                          </Button>
                          <Button size="sm" variant="ghost" className="w-auto text-red-500 hover:text-red-600 hover:bg-red-50 text-xs">
                              Disconnect
                          </Button>
                      </div>
                  ) : (
                      <Button size="sm" className="w-full bg-indigo-600 hover:bg-indigo-700 text-white text-xs">
                          Connect
                      </Button>
                  )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
