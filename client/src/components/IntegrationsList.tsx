import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { 
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Check, ExternalLink, PlugZap, Loader2, AlertCircle, Lock } from "lucide-react";
import { toast } from "@/hooks/use-toast";

export interface IntegrationConfig {
    fieldLabel: string;
    placeholder: string;
    helpText: string;
    type?: 'text' | 'password';
}

export interface Integration {
  id: string;
  name: string;
  description: string;
  logo: string;
  category: 'crm' | 'productivity' | 'database';
  config: IntegrationConfig[];
}

const INTEGRATIONS: Integration[] = [
  {
    id: 'hubspot',
    name: 'HubSpot',
    description: 'Sync contacts, deals, and track email activity.',
    logo: 'https://logo.clearbit.com/hubspot.com',
    category: 'crm',
    config: [
        {
            fieldLabel: "Private App Access Token",
            placeholder: "pat-na1-...",
            helpText: "Go to Settings > Integrations > Private Apps to generate a token.",
            type: "password"
        }
    ]
  },
  {
    id: 'salesforce',
    name: 'Salesforce',
    description: 'Connect your sales team with your support inbox.',
    logo: 'https://logo.clearbit.com/salesforce.com',
    category: 'crm',
    config: [
        {
            fieldLabel: "Consumer Key",
            placeholder: "3MVG9...",
            helpText: "Found in Setup > App Manager > Your Connected App.",
            type: "text"
        },
        {
            fieldLabel: "Consumer Secret",
            placeholder: "...",
            helpText: "Found in Setup > App Manager > Your Connected App.",
            type: "password"
        }
    ]
  },
  {
    id: 'pipedrive',
    name: 'Pipedrive',
    description: 'Visual sales pipeline management integration.',
    logo: 'https://logo.clearbit.com/pipedrive.com',
    category: 'crm',
    config: [
        {
            fieldLabel: "Personal API Token",
            placeholder: "b4a5c6...",
            helpText: "Go to Settings > Personal Preferences > API to find your token.",
            type: "password"
        }
    ]
  },
  {
    id: 'zoho',
    name: 'Zoho CRM',
    description: 'Manage your customer relationships seamlessly.',
    logo: 'https://logo.clearbit.com/zoho.com',
    category: 'crm',
    config: [
        {
            fieldLabel: "Client ID",
            placeholder: "1000.xxxx",
            helpText: "From Zoho Developer Console.",
            type: "text"
        },
        {
            fieldLabel: "Client Secret",
            placeholder: "xxxx",
            helpText: "From Zoho Developer Console.",
            type: "password"
        }
    ]
  },
  {
    id: 'monday',
    name: 'Monday.com',
    description: 'Work OS to manage your team projects and tasks.',
    logo: 'https://logo.clearbit.com/monday.com',
    category: 'productivity',
    config: [
        {
            fieldLabel: "API Token",
            placeholder: "eyJhb...",
            helpText: "Go to Admin > API to generate a new token.",
            type: "password"
        }
    ]
  },
  {
    id: 'notion',
    name: 'Notion',
    description: 'All-in-one workspace for notes, docs, and databases.',
    logo: 'https://logo.clearbit.com/notion.so',
    category: 'productivity',
    config: [
        {
            fieldLabel: "Internal Integration Token",
            placeholder: "secret_...",
            helpText: "Create a new integration at notion.so/my-integrations.",
            type: "password"
        }
    ]
  },
  {
    id: 'airtable',
    name: 'Airtable',
    description: 'Low-code platform for building collaborative apps.',
    logo: 'https://logo.clearbit.com/airtable.com',
    category: 'database',
    config: [
        {
            fieldLabel: "Personal Access Token",
            placeholder: "pat...",
            helpText: "Create a token with 'data.records:read' scope.",
            type: "password"
        },
        {
            fieldLabel: "Base ID",
            placeholder: "app...",
            helpText: "The ID of the Airtable Base you want to connect.",
            type: "text"
        }
    ]
  }
];

export function IntegrationsList() {
  // Mock state for connected integrations
  const [connectedState, setConnectedState] = useState<Record<string, boolean>>({
      'hubspot': true // Default connected as per previous spec
  });
  
  const [selectedIntegration, setSelectedIntegration] = useState<Integration | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  
  // Dynamic form state
  const [formValues, setFormValues] = useState<Record<string, string>>({});

  const handleConnectClick = (integration: Integration) => {
      setSelectedIntegration(integration);
      setFormValues({}); // Reset form
      setIsDialogOpen(true);
  };

  const handleConfirmConnect = () => {
      if (!selectedIntegration) return;
      
      setIsConnecting(true);
      
      // Simulate API call
      setTimeout(() => {
          setConnectedState(prev => ({
              ...prev,
              [selectedIntegration.id]: true
          }));
          setIsConnecting(false);
          setIsDialogOpen(false);
          toast({
              title: "Integration Connected",
              description: `Successfully connected to ${selectedIntegration.name}`,
          });
      }, 1500);
  };

  const handleDisconnect = (id: string) => {
      setConnectedState(prev => {
          const newState = { ...prev };
          delete newState[id];
          return newState;
      });
      toast({
        title: "Integration Disconnected",
        description: "The integration has been removed.",
        variant: "destructive"
    });
  };

  const handleInputChange = (label: string, value: string) => {
      setFormValues(prev => ({
          ...prev,
          [label]: value
      }));
  };

  // Check if all required fields are filled
  const isFormValid = selectedIntegration?.config.every(field => formValues[field.fieldLabel]?.length > 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2">
        <h2 className="text-lg font-semibold flex items-center gap-2">
            <PlugZap className="h-5 w-5 text-indigo-500" />
            Integrations Marketplace
        </h2>
        <p className="text-sm text-muted-foreground">Connect your favorite tools to enhance your workflow.</p>
      </div>
      
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {INTEGRATIONS.map((integration) => {
          const isConnected = connectedState[integration.id];
          
          return (
          <Card key={integration.id} className="flex flex-col group hover:border-indigo-200 transition-all">
            <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
               <div className="h-14 w-14 relative flex items-center justify-center bg-white rounded-xl p-2 border shadow-sm shrink-0">
                   <img 
                        src={integration.logo} 
                        alt={integration.name} 
                        className="h-full w-full object-contain"
                        onError={(e) => {
                            // Fallback if image fails
                            (e.target as HTMLImageElement).style.display = 'none';
                            (e.target as HTMLImageElement).parentElement!.innerHTML = `<span class="text-[10px] font-bold text-gray-400">${integration.name.substring(0,2)}</span>`;
                        }}
                    />
               </div>
               {isConnected ? (
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
            <CardContent className="flex-1 flex flex-col pt-3">
              <div className="mb-4">
                  <CardTitle className="text-base mb-1">{integration.name}</CardTitle>
                  <CardDescription className="text-xs line-clamp-2 h-8">{integration.description}</CardDescription>
              </div>
              
              <div className="mt-auto pt-2">
                  {isConnected ? (
                      <div className="flex gap-2">
                          <Button size="sm" variant="outline" className="w-full border-gray-200 hover:bg-gray-50 text-xs h-8">
                              Configure
                          </Button>
                          <Button 
                            size="sm" 
                            variant="ghost" 
                            className="w-auto text-red-500 hover:text-red-600 hover:bg-red-50 text-xs h-8 px-2"
                            onClick={() => handleDisconnect(integration.id)}
                          >
                              Disconnect
                          </Button>
                      </div>
                  ) : (
                      <Button 
                        size="sm" 
                        className="w-full bg-indigo-600 hover:bg-indigo-700 text-white text-xs h-8"
                        onClick={() => handleConnectClick(integration)}
                      >
                          Connect
                      </Button>
                  )}
              </div>
            </CardContent>
          </Card>
        )})}
      </div>

      {/* Connection Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-md">
            <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
                {selectedIntegration && (
                    <img src={selectedIntegration.logo} className="h-6 w-6 object-contain" alt="logo" />
                )}
                Connect {selectedIntegration?.name}
            </DialogTitle>
            <DialogDescription>
                Enter your API credentials to enable the integration.
            </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4 py-4">
                {selectedIntegration?.config.map((field, idx) => (
                    <div key={idx} className="space-y-2">
                        <Label htmlFor={`field-${idx}`}>{field.fieldLabel}</Label>
                        <Input 
                            id={`field-${idx}`} 
                            type={field.type || 'text'}
                            placeholder={field.placeholder}
                            value={formValues[field.fieldLabel] || ''}
                            onChange={(e) => handleInputChange(field.fieldLabel, e.target.value)}
                            className="font-mono text-xs"
                        />
                        <p className="text-[10px] text-muted-foreground flex items-center gap-1">
                           {field.helpText}
                        </p>
                    </div>
                ))}
                
                <div className="bg-blue-50 p-3 rounded-md border border-blue-100 mt-2">
                    <p className="text-[10px] text-blue-700 flex items-start gap-2">
                        <Lock className="h-3 w-3 mt-0.5 shrink-0" />
                        Your credentials are encrypted using AES-256 and stored securely in our vault. We never share your keys.
                    </p>
                </div>
            </div>

            <DialogFooter className="sm:justify-between flex-row items-center gap-2">
                <Button variant="ghost" size="sm" onClick={() => setIsDialogOpen(false)}>
                    Cancel
                </Button>
                <Button 
                    size="sm" 
                    onClick={handleConfirmConnect} 
                    disabled={!isFormValid || isConnecting}
                    className="bg-indigo-600 hover:bg-indigo-700"
                >
                    {isConnecting ? (
                        <>
                            <Loader2 className="h-3 w-3 mr-2 animate-spin" /> Connecting...
                        </>
                    ) : (
                        "Connect Integration"
                    )}
                </Button>
            </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
