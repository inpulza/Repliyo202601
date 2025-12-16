import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Loader2, Globe, RefreshCw, Settings2, Scan } from "lucide-react";
import { FaInstagram, FaFacebookF, FaTiktok, FaYoutube, FaLinkedinIn, FaGoogle, FaTwitter } from 'react-icons/fa';
import { api, type SocialAccount } from '@/lib/api';
import type { Client } from '@shared/schema';
import { toast } from '@/hooks/use-toast';

interface SocialAccountsManagerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  client: Client | null;
  onAccountsUpdated?: () => void;
}

const PROVIDER_CONFIG: Record<string, { icon: React.ComponentType<any>; label: string; color: string; bgColor: string }> = {
  'INSTAGRAM': { icon: FaInstagram, label: 'Instagram', color: 'text-pink-500', bgColor: 'bg-pink-50' },
  'FACEBOOK': { icon: FaFacebookF, label: 'Facebook', color: 'text-blue-600', bgColor: 'bg-blue-50' },
  'TIKTOKBUSINESS': { icon: FaTiktok, label: 'TikTok', color: 'text-black', bgColor: 'bg-gray-100' },
  'YOUTUBE': { icon: FaYoutube, label: 'YouTube', color: 'text-red-600', bgColor: 'bg-red-50' },
  'LINKEDIN': { icon: FaLinkedinIn, label: 'LinkedIn', color: 'text-blue-700', bgColor: 'bg-blue-50' },
  'GMB': { icon: FaGoogle, label: 'Google Business', color: 'text-blue-500', bgColor: 'bg-blue-50' },
  'twitter': { icon: FaTwitter, label: 'Twitter/X', color: 'text-gray-800', bgColor: 'bg-gray-100' },
};

export function SocialAccountsManager({ open, onOpenChange, client, onAccountsUpdated }: SocialAccountsManagerProps) {
  const [accounts, setAccounts] = useState<SocialAccount[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [updatingProvider, setUpdatingProvider] = useState<string | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  useEffect(() => {
    if (open && client) {
      loadAccounts();
    }
  }, [open, client]);

  const loadAccounts = async () => {
    if (!client) return;
    setIsLoading(true);
    try {
      const data = await api.socialAccounts.getByBrand(client.id);
      setAccounts(data);
    } catch (error: any) {
      console.error('Error loading social accounts:', error);
      toast({
        title: "Error",
        description: "No se pudieron cargar las cuentas sociales.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleToggle = async (provider: string, currentStatus: boolean) => {
    if (!client) return;
    setUpdatingProvider(provider);
    try {
      const updated = await api.socialAccounts.updateStatus(client.id, provider, !currentStatus);
      setAccounts(prev => prev.map(acc => 
        acc.provider === provider ? updated : acc
      ));
      
      toast({
        title: !currentStatus ? "Red Activada" : "Red Desactivada",
        description: `${PROVIDER_CONFIG[provider]?.label || provider} ${!currentStatus ? 'se sincronizará' : 'no se sincronizará'}.`,
      });
      
      onAccountsUpdated?.();
    } catch (error: any) {
      console.error('Error updating account:', error);
      toast({
        title: "Error",
        description: "No se pudo actualizar el estado de la cuenta.",
        variant: "destructive"
      });
    } finally {
      setUpdatingProvider(null);
    }
  };

  const handleSync = async () => {
    if (!client) return;
    setIsSyncing(true);
    try {
      await api.metricool.syncBrand(client.id);
      await loadAccounts();
      toast({
        title: "Sincronización Completada",
        description: "Los mensajes de las redes activas han sido actualizados.",
      });
      onAccountsUpdated?.();
    } catch (error: any) {
      console.error('Error syncing:', error);
      toast({
        title: "Error",
        description: "No se pudo completar la sincronización.",
        variant: "destructive"
      });
    } finally {
      setIsSyncing(false);
    }
  };

  const handleRefreshProviders = async () => {
    if (!client) return;
    setIsRefreshing(true);
    try {
      const result = await api.socialAccounts.refresh(client.id);
      setAccounts(result.accounts);
      toast({
        title: "Redes Actualizadas",
        description: `Se detectaron ${result.detected} redes conectadas en Metricool.`,
      });
      onAccountsUpdated?.();
    } catch (error: any) {
      console.error('Error refreshing providers:', error);
      toast({
        title: "Error",
        description: error.message || "No se pudieron detectar las redes.",
        variant: "destructive"
      });
    } finally {
      setIsRefreshing(false);
    }
  };

  const activeCount = accounts.filter(a => a.isActive).length;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Settings2 className="h-5 w-5 text-indigo-500" />
            Redes Sociales
          </DialogTitle>
          <DialogDescription>
            {client?.name} - Gestiona qué redes se sincronizarán
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 overflow-hidden">
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
            <p className="text-xs text-amber-800">
              <strong>Privacidad:</strong> Solo se sincronizarán los mensajes de las redes activadas. 
              Las redes desactivadas no mostrarán mensajes nuevos.
            </p>
          </div>

          <div className="flex items-center justify-between">
            <Badge variant="secondary" className="text-xs">
              {activeCount} de {accounts.length} redes activas
            </Badge>
            <div className="flex items-center gap-2">
              <Button 
                size="sm" 
                variant="ghost" 
                onClick={handleRefreshProviders}
                disabled={isRefreshing}
                data-testid="button-detect-networks"
                title="Detectar nuevas redes desde Metricool"
              >
                {isRefreshing ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Scan className="h-4 w-4" />
                )}
              </Button>
              <Button 
                size="sm" 
                variant="outline" 
                onClick={handleSync}
                disabled={isSyncing || activeCount === 0}
                data-testid="button-sync-accounts"
              >
                {isSyncing ? (
                  <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                ) : (
                  <RefreshCw className="h-4 w-4 mr-1" />
                )}
                Sincronizar
              </Button>
            </div>
          </div>

          <ScrollArea className="h-[280px] pr-2">
            {isLoading ? (
              <div className="flex items-center justify-center h-full">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : accounts.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
                <Globe className="h-8 w-8 mb-2 opacity-30" />
                <p className="text-sm">No se detectaron redes sociales</p>
              </div>
            ) : (
              <div className="space-y-2">
                {accounts.map((account) => {
                  const config = PROVIDER_CONFIG[account.provider] || { 
                    icon: Globe, 
                    label: account.provider, 
                    color: 'text-gray-500',
                    bgColor: 'bg-gray-100'
                  };
                  const Icon = config.icon;
                  const isUpdating = updatingProvider === account.provider;

                  return (
                    <div 
                      key={account.id}
                      className={`flex items-center justify-between p-3 rounded-lg border transition-all ${
                        account.isActive ? 'bg-white border-indigo-200' : 'bg-gray-50 border-gray-200'
                      }`}
                      data-testid={`account-row-${account.provider}`}
                    >
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        <div className={`p-2 rounded-full shrink-0 ${config.bgColor}`}>
                          <Icon className={`h-4 w-4 ${config.color}`} />
                        </div>
                        <div className="min-w-0 overflow-hidden">
                          <p className="text-sm font-medium truncate">{config.label}</p>
                          {account.accountName && (
                            <p className="text-xs text-muted-foreground truncate">@{account.accountName}</p>
                          )}
                          {account.lastSyncAt && (
                            <p className="text-[10px] text-muted-foreground truncate">
                              Último sync: {new Date(account.lastSyncAt).toLocaleDateString()}
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {isUpdating && (
                          <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />
                        )}
                        <Switch
                          checked={account.isActive}
                          onCheckedChange={() => handleToggle(account.provider, account.isActive)}
                          disabled={isUpdating}
                          data-testid={`switch-${account.provider}`}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </ScrollArea>
        </div>
      </DialogContent>
    </Dialog>
  );
}
