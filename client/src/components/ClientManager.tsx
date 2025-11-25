import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RefreshCw, Check, Loader2, Globe, Building2 } from "lucide-react";
import { useNexus } from "@/context/NexusContext";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";

interface ClientManagerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ClientManager({ open, onOpenChange }: ClientManagerProps) {
  const { 
    fetchMetricoolBrands, 
    metricoolBrands, 
    isLoadingMetricool, 
    importMetricoolBrand, 
    clients
  } = useNexus();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] bg-[#1C1C1F] border-[#2C2C2E] text-gray-100">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold text-white">Add Client</DialogTitle>
          <DialogDescription className="text-gray-400">
            Connect a new brand from Metricool.
          </DialogDescription>
        </DialogHeader>

        <div className="mt-4 space-y-4">
          <div className="bg-[#252528] p-4 rounded-lg border border-[#3A3A3C] space-y-4">
            <div className="space-y-2">
              <Label htmlFor="api-token" className="text-gray-300">Metricool User Token</Label>
              <Input 
                id="api-token" 
                type="password"
                placeholder="Paste your X-Mc-Auth token here" 
                className="bg-[#1C1C1F] border-[#3A3A3C] text-white placeholder:text-gray-600 focus-visible:ring-indigo-500 font-mono text-xs"
              />
              <p className="text-[10px] text-gray-500">Found in Account Settings → API</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="user-id" className="text-gray-300">User ID</Label>
              <Input 
                id="user-id" 
                placeholder="e.g. 1234567" 
                className="bg-[#1C1C1F] border-[#3A3A3C] text-white placeholder:text-gray-600 focus-visible:ring-indigo-500 font-mono text-xs"
              />
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-[#3A3A3C]">
              <div>
                <h3 className="font-medium text-white text-sm">Available Brands</h3>
                <p className="text-[10px] text-gray-400">Click fetch to list brands from your account.</p>
              </div>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={fetchMetricoolBrands}
                className="border-[#3A3A3C] bg-transparent hover:bg-[#3A3A3C] text-gray-300"
                disabled={isLoadingMetricool}
              >
                {isLoadingMetricool ? (
                  <Loader2 className="h-3.5 w-3.5 mr-2 animate-spin" />
                ) : (
                  <RefreshCw className="h-3.5 w-3.5 mr-2" />
                )}
                {metricoolBrands.length > 0 ? 'Refresh List' : 'Fetch Brands'}
              </Button>
            </div>

            <ScrollArea className="h-[160px] pr-4">
              {isLoadingMetricool && metricoolBrands.length === 0 ? (
                 <div className="flex flex-col items-center justify-center h-32 text-gray-500">
                    <Loader2 className="h-8 w-8 mb-2 animate-spin opacity-50" />
                    <span className="text-xs">Connecting to Metricool API...</span>
                 </div>
              ) : metricoolBrands.length > 0 ? (
                <div className="space-y-2">
                  {metricoolBrands.map((brand) => {
                    const isAdded = clients.some(c => c.name === brand.name);
                    return (
                      <div key={brand.id} className="flex items-center justify-between p-3 bg-[#2C2C2E] rounded-md border border-[#3A3A3C]/50 hover:border-[#3A3A3C] transition-colors">
                        <div className="flex items-center gap-3">
                          <Avatar className="h-8 w-8">
                            <AvatarImage src={brand.avatar} />
                            <AvatarFallback>{brand.name.substring(0, 2)}</AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="text-sm font-medium text-white">{brand.name}</p>
                            <p className="text-xs text-gray-500 flex items-center gap-1">
                              <Building2 className="h-3 w-3" /> {brand.industry}
                            </p>
                          </div>
                        </div>
                        <Button 
                          size="sm" 
                          variant={isAdded ? "ghost" : "secondary"}
                          className={isAdded ? "text-green-500 hover:text-green-400 hover:bg-transparent" : "bg-indigo-600 hover:bg-indigo-700 text-white border-none"}
                          onClick={() => !isAdded && importMetricoolBrand(brand.id)}
                          disabled={isAdded}
                        >
                          {isAdded ? (
                            <><Check className="h-4 w-4 mr-1" /> Connected</>
                          ) : (
                            <>Import</>
                          )}
                        </Button>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center h-32 text-gray-500 border-2 border-dashed border-[#3A3A3C] rounded-lg">
                  <Globe className="h-8 w-8 mb-2 opacity-20" />
                  <p className="text-sm">No brands loaded.</p>
                  <p className="text-xs opacity-60">Click "Fetch Brands" to start.</p>
                </div>
              )}
            </ScrollArea>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
