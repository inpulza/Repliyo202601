import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { 
  MoreVertical, 
  RefreshCw,
  LayoutGrid,
  List,
  Loader2,
  Globe,
  Scan,
  AlertCircle
} from "lucide-react";
import { toast } from "@/hooks/use-toast";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import {
  MobilePageHeader,
  MobileListRow,
  MobileListGroup,
  MobileSectionDivider,
  MobileContainer,
  MobileSpacer
} from '@/components/ui/mobile-primitives';
import { useNexus } from '@/context/NexusContext';
import { api, type SocialAccount } from '@/lib/api';
import { getProviderConfig, getUnconnectedProviders, normalizeProvider } from '@/lib/providerConfig';
import { Plus, Link2 } from "lucide-react";

export function Connections() {
  const { activeClientId, clients } = useNexus();
  const activeClient = clients.find(c => c.id === activeClientId);
  
  const [accounts, setAccounts] = useState<SocialAccount[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [updatingProvider, setUpdatingProvider] = useState<string | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isConnecting, setIsConnecting] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  useEffect(() => {
    if (activeClientId) {
      loadAccounts();
    } else {
      setAccounts([]);
    }
  }, [activeClientId]);

  const loadAccounts = async () => {
    if (!activeClientId) return;
    setIsLoading(true);
    try {
      const data = await api.socialAccounts.getByBrand(activeClientId);
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
    if (!activeClientId) return;
    setUpdatingProvider(provider);
    try {
      const updated = await api.socialAccounts.updateStatus(activeClientId, provider, !currentStatus);
      setAccounts(prev => prev.map(acc => 
        acc.provider === provider ? updated : acc
      ));
      
      toast({
        title: !currentStatus ? "Red Activada" : "Red Desactivada",
        description: `${getProviderConfig(provider).label} ${!currentStatus ? 'se sincronizará' : 'no se sincronizará'}.`,
      });
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
    if (!activeClientId) return;
    setIsSyncing(true);
    try {
      await api.metricool.syncBrand(activeClientId);
      await loadAccounts();
      toast({
        title: "Sincronización Completada",
        description: "Los mensajes de las redes activas han sido actualizados.",
      });
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
    if (!activeClientId) return;
    setIsRefreshing(true);
    try {
      const result = await api.socialAccounts.refresh(activeClientId);
      setAccounts(result.accounts);
      toast({
        title: "Redes Actualizadas",
        description: `Se detectaron ${result.detected} redes conectadas en Metricool.`,
      });
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

  const activeAccounts = accounts.filter(a => a.isActive);
  const inactiveAccounts = accounts.filter(a => !a.isActive);
  const connectedProviders = accounts.map(a => a.provider);
  const unconnectedProviders = getUnconnectedProviders(connectedProviders);

  const handleConnect = async (provider: string) => {
    if (!activeClientId) return;
    setIsConnecting(provider);
    try {
      const result = await api.socialAccounts.refresh(activeClientId);
      const newAccount = result.accounts.find(a => normalizeProvider(a.provider) === normalizeProvider(provider));
      if (newAccount) {
        setAccounts(result.accounts);
        toast({
          title: "Canal Detectado",
          description: `${getProviderConfig(provider).label} ha sido encontrado en Metricool.`,
        });
      } else {
        toast({
          title: "Canal No Disponible",
          description: `No se encontró ${getProviderConfig(provider).label} conectado en Metricool. Conéctalo primero en Metricool.`,
          variant: "destructive"
        });
      }
    } catch (error: any) {
      console.error('Error connecting:', error);
      toast({
        title: "Error",
        description: error.message || "No se pudo conectar el canal.",
        variant: "destructive"
      });
    } finally {
      setIsConnecting(null);
    }
  };

  const getPlatformIcon = (provider: string, size: string = "h-5 w-5") => {
    const config = getProviderConfig(provider);
    const Icon = config.icon;
    return <Icon className={cn(size, config.color)} />;
  };

  if (!activeClient) {
    return (
      <div className="h-full bg-background flex items-center justify-center">
        <div className="text-center text-muted-foreground">
          <AlertCircle className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <p className="text-lg font-medium">No hay marca seleccionada</p>
          <p className="text-sm">Selecciona una marca desde el sidebar para ver sus conexiones.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full bg-background overflow-y-auto">
      {/* Mobile View */}
      <MobileContainer>
        <MobilePageHeader 
          title="Conexiones" 
          subtitle={`${activeClient.name} - ${activeAccounts.length} redes activas`}
        />
        
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <>
            {activeAccounts.length > 0 && (
              <>
                <MobileSpacer size="sm" />
                <MobileSectionDivider title="Conexiones Activas" />
                <MobileListGroup>
                  {activeAccounts.map((account) => {
                    const config = getProviderConfig(account.provider);
                    const Icon = config.icon;
                    const isUpdating = updatingProvider === account.provider;
                    
                    return (
                      <MobileListRow
                        key={account.id}
                        icon={
                          <div className="relative">
                            <Avatar className="h-9 w-9 border-0">
                              {account.accountAvatar ? (
                                <AvatarImage src={account.accountAvatar} />
                              ) : null}
                              <AvatarFallback className={cn("font-semibold", config.bgColor, config.color)}>
                                <Icon className="h-4 w-4" />
                              </AvatarFallback>
                            </Avatar>
                            <div className="absolute -bottom-0.5 -right-0.5 bg-background rounded-full p-0.5 ring-1 ring-background">
                              <Icon className={cn("h-3 w-3", config.color)} />
                            </div>
                          </div>
                        }
                        title={config.label}
                        subtitle={
                          <span className="flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
                            {account.accountName || 'Conectado'}
                          </span>
                        }
                        rightElement={
                          <div className="flex items-center gap-2">
                            {isUpdating && <Loader2 className="h-3 w-3 animate-spin" />}
                            <Switch
                              checked={account.isActive}
                              onCheckedChange={() => handleToggle(account.provider, account.isActive)}
                              disabled={isUpdating}
                              data-testid={`mobile-switch-${account.provider}`}
                            />
                          </div>
                        }
                        showChevron={false}
                        testId={`mobile-connection-${account.provider}`}
                      />
                    );
                  })}
                </MobileListGroup>
              </>
            )}
            
            {inactiveAccounts.length > 0 && (
              <>
                <MobileSpacer size="lg" />
                <MobileSectionDivider title="Canales Desactivados" />
                <MobileListGroup>
                  {inactiveAccounts.map((account) => {
                    const config = getProviderConfig(account.provider);
                    const Icon = config.icon;
                    const isUpdating = updatingProvider === account.provider;
                    
                    return (
                      <MobileListRow
                        key={account.id}
                        icon={
                          <div className="relative">
                            <Avatar className="h-9 w-9 border-0 opacity-60">
                              {account.accountAvatar ? (
                                <AvatarImage src={account.accountAvatar} />
                              ) : null}
                              <AvatarFallback className={cn("font-semibold", config.bgColor, config.color)}>
                                <Icon className="h-4 w-4" />
                              </AvatarFallback>
                            </Avatar>
                            <div className="absolute -bottom-0.5 -right-0.5 bg-background rounded-full p-0.5 ring-1 ring-background">
                              <Icon className={cn("h-3 w-3", config.color)} />
                            </div>
                          </div>
                        }
                        title={config.label}
                        subtitle={account.accountName || config.description}
                        rightElement={
                          <div className="flex items-center gap-2">
                            {isUpdating && <Loader2 className="h-3 w-3 animate-spin" />}
                            <Switch
                              checked={account.isActive}
                              onCheckedChange={() => handleToggle(account.provider, account.isActive)}
                              disabled={isUpdating}
                              data-testid={`mobile-switch-${account.provider}`}
                            />
                          </div>
                        }
                        showChevron={false}
                        testId={`mobile-available-${account.provider}`}
                      />
                    );
                  })}
                </MobileListGroup>
              </>
            )}

            {unconnectedProviders.length > 0 && (
              <>
                <MobileSpacer size="lg" />
                <MobileSectionDivider title="Conectar Canal" />
                <MobileListGroup>
                  {unconnectedProviders.map((provider) => {
                    const config = getProviderConfig(provider);
                    const Icon = config.icon;
                    const connecting = isConnecting === provider;
                    
                    return (
                      <MobileListRow
                        key={provider}
                        icon={
                          <div className={cn("p-2 rounded-lg", config.bgColor)}>
                            <Icon className={cn("h-5 w-5", config.color)} />
                          </div>
                        }
                        title={config.label}
                        subtitle={config.description}
                        rightElement={
                          <Button 
                            variant="ghost" 
                            size="sm"
                            className="h-8 text-xs"
                            onClick={() => handleConnect(provider)}
                            disabled={connecting}
                            data-testid={`mobile-connect-${provider}`}
                          >
                            {connecting ? (
                              <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                            ) : (
                              <Plus className="h-3 w-3 mr-1" />
                            )}
                            Connect
                          </Button>
                        }
                        showChevron={false}
                        testId={`mobile-platform-${provider}`}
                      />
                    );
                  })}
                </MobileListGroup>
              </>
            )}

            {accounts.length === 0 && (
              <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                <Globe className="h-12 w-12 mb-4 opacity-30" />
                <p className="text-sm font-medium">No hay redes detectadas</p>
                <p className="text-xs text-center mt-1">Las redes se detectan automáticamente al importar la marca desde Metricool.</p>
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="mt-4"
                  onClick={handleRefreshProviders}
                  disabled={isRefreshing}
                  data-testid="mobile-button-refresh"
                >
                  {isRefreshing ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Scan className="h-4 w-4 mr-2" />
                  )}
                  Detectar Redes
                </Button>
              </div>
            )}
          </>
        )}
      </MobileContainer>

      {/* Desktop View */}
      <div className="hidden md:flex flex-col p-6 md:p-10 max-w-7xl mx-auto space-y-8">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <h1 className="text-3xl font-bold tracking-tight text-foreground">Conexiones</h1>
            <p className="text-muted-foreground text-base">
              {activeClient.name} - Gestiona las redes sociales conectadas.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              size="sm"
              onClick={handleRefreshProviders}
              disabled={isRefreshing}
              data-testid="button-refresh-providers"
            >
              {isRefreshing ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Scan className="h-4 w-4 mr-2" />
              )}
              Detectar Redes
            </Button>
            <Button
              variant="default"
              size="sm"
              onClick={handleSync}
              disabled={isSyncing || activeAccounts.length === 0}
              data-testid="button-sync-all"
            >
              {isSyncing ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4 mr-2" />
              )}
              Sincronizar
            </Button>
            <div className="flex items-center gap-1 bg-muted/50 p-1 rounded-lg">
              <Button 
                variant={viewMode === 'grid' ? 'secondary' : 'ghost'} 
                size="sm" 
                className="h-8 px-2.5"
                onClick={() => setViewMode('grid')}
                data-testid="button-view-grid"
              >
                <LayoutGrid className="h-4 w-4 mr-2" />
                Grid
              </Button>
              <Button 
                variant={viewMode === 'list' ? 'secondary' : 'ghost'} 
                size="sm" 
                className="h-8 px-2.5"
                onClick={() => setViewMode('list')}
                data-testid="button-view-list"
              >
                <List className="h-4 w-4 mr-2" />
                List
              </Button>
            </div>
          </div>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : accounts.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
            <Globe className="h-16 w-16 mb-4 opacity-30" />
            <p className="text-lg font-medium">No hay redes detectadas</p>
            <p className="text-sm text-center mt-1">Las redes se detectan automáticamente al importar la marca desde Metricool.</p>
            <Button 
              variant="outline" 
              className="mt-6"
              onClick={handleRefreshProviders}
              disabled={isRefreshing}
              data-testid="button-refresh-empty"
            >
              {isRefreshing ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Scan className="h-4 w-4 mr-2" />
              )}
              Detectar Redes desde Metricool
            </Button>
          </div>
        ) : (
          <>
            {/* Active Connections Section */}
            {activeAccounts.length > 0 && (
              <section className="space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-semibold flex items-center gap-2">
                    Conexiones Activas
                    <span className="ml-2 text-sm font-medium text-muted-foreground bg-muted px-2 py-0.5 rounded-md">
                      {activeAccounts.length}
                    </span>
                  </h2>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {activeAccounts.map((account) => {
                    const config = getProviderConfig(account.provider);
                    const Icon = config.icon;
                    const isUpdating = updatingProvider === account.provider;
                    
                    return (
                      <Card 
                        key={account.id} 
                        className="group border border-border bg-card shadow-none transition-colors hover:border-primary/50"
                        data-testid={`card-active-${account.provider}`}
                      >
                        <CardContent className="p-5">
                          <div className="flex items-start justify-between mb-3">
                            <div className="flex items-center gap-3">
                              <div className="relative">
                                <Avatar className="h-10 w-10 border-0">
                                  {account.accountAvatar ? (
                                    <AvatarImage src={account.accountAvatar} />
                                  ) : null}
                                  <AvatarFallback className={cn("font-semibold", config.bgColor, config.color)}>
                                    <Icon className="h-5 w-5" />
                                  </AvatarFallback>
                                </Avatar>
                                <div className="absolute -bottom-1 -right-1 bg-background rounded-full p-0.5 ring-2 ring-background">
                                  <Icon className={cn("h-3.5 w-3.5", config.color)} />
                                </div>
                              </div>
                              <div>
                                <h3 className="font-medium text-sm text-foreground">{config.label}</h3>
                                <p className="text-xs text-muted-foreground">
                                  {account.accountName || 'Cuenta conectada'}
                                </p>
                              </div>
                            </div>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button 
                                  variant="ghost" 
                                  size="icon" 
                                  className="h-8 w-8 -mr-2 text-muted-foreground hover:text-foreground opacity-0 group-hover:opacity-100 transition-opacity"
                                  data-testid={`menu-${account.provider}`}
                                >
                                  <MoreVertical className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={handleSync} disabled={isSyncing}>
                                  <RefreshCw className="h-4 w-4 mr-2" />
                                  Sincronizar
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem 
                                  className="text-destructive focus:text-destructive" 
                                  onClick={() => handleToggle(account.provider, true)}
                                  disabled={isUpdating}
                                >
                                  Desactivar
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                          
                          <div className="flex items-center justify-between text-[11px] font-medium pl-1">
                            <div className="flex items-center gap-3">
                              <div className="flex items-center text-green-600">
                                <div className="w-1.5 h-1.5 rounded-full bg-green-500 mr-2 animate-pulse shadow-[0_0_6px_rgba(34,197,94,0.4)]" />
                                Activa
                              </div>
                              {account.lastSyncAt && (
                                <>
                                  <div className="w-1 h-1 rounded-full bg-border" />
                                  <span className="text-muted-foreground">
                                    Sync: {new Date(account.lastSyncAt).toLocaleDateString()}
                                  </span>
                                </>
                              )}
                            </div>
                            <div className="flex items-center gap-2">
                              {isUpdating && <Loader2 className="h-3 w-3 animate-spin" />}
                              <Switch
                                checked={account.isActive}
                                onCheckedChange={() => handleToggle(account.provider, account.isActive)}
                                disabled={isUpdating}
                                data-testid={`switch-active-${account.provider}`}
                              />
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              </section>
            )}

            {activeAccounts.length > 0 && inactiveAccounts.length > 0 && (
              <Separator className="my-8" />
            )}

            {/* Deactivated Channels Section (Inactive accounts) */}
            {inactiveAccounts.length > 0 && (
              <section className="space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-semibold flex items-center gap-2">
                    Canales Desactivados
                    <span className="ml-2 text-sm font-medium text-muted-foreground bg-muted px-2 py-0.5 rounded-md">
                      {inactiveAccounts.length}
                    </span>
                  </h2>
                </div>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  {inactiveAccounts.map((account) => {
                    const config = getProviderConfig(account.provider);
                    const Icon = config.icon;
                    const isUpdating = updatingProvider === account.provider;
                    
                    return (
                      <Card 
                        key={account.id}
                        className="group relative overflow-hidden border border-border bg-card shadow-none hover:border-primary/50 transition-all duration-200 flex flex-col h-full opacity-75"
                        data-testid={`card-available-${account.provider}`}
                      >
                        <CardContent className="p-6 flex flex-col items-center text-center gap-4 flex-1">
                          <div className="relative">
                            <Avatar className="h-14 w-14 border-0">
                              {account.accountAvatar ? (
                                <AvatarImage src={account.accountAvatar} />
                              ) : null}
                              <AvatarFallback className={cn("font-semibold", config.bgColor, config.color)}>
                                <Icon className="h-6 w-6" />
                              </AvatarFallback>
                            </Avatar>
                            <div className="absolute -bottom-1 -right-1 bg-background rounded-full p-0.5 ring-2 ring-background">
                              <Icon className={cn("h-4 w-4", config.color)} />
                            </div>
                          </div>
                          
                          <div className="space-y-1">
                            <h3 className="font-semibold text-foreground">{config.label}</h3>
                            <p className="text-sm text-muted-foreground leading-relaxed">
                              {account.accountName || config.description}
                            </p>
                          </div>
                        </CardContent>
                        
                        <CardFooter className="p-3 border-t border-border mt-auto flex items-center justify-between">
                          <span className="text-xs text-muted-foreground">Inactivo</span>
                          <div className="flex items-center gap-2">
                            {isUpdating && <Loader2 className="h-3 w-3 animate-spin" />}
                            <Switch
                              checked={account.isActive}
                              onCheckedChange={() => handleToggle(account.provider, account.isActive)}
                              disabled={isUpdating}
                              data-testid={`switch-available-${account.provider}`}
                            />
                          </div>
                        </CardFooter>
                      </Card>
                    );
                  })}
                </div>
              </section>
            )}

            {(activeAccounts.length > 0 || inactiveAccounts.length > 0) && unconnectedProviders.length > 0 && (
              <Separator className="my-8" />
            )}

            {/* Connect New Channels Section */}
            {unconnectedProviders.length > 0 && (
              <section className="space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-semibold flex items-center gap-2">
                    <Link2 className="h-5 w-5 text-muted-foreground" />
                    Conectar Canal
                    <span className="ml-2 text-sm font-medium text-muted-foreground bg-muted px-2 py-0.5 rounded-md">
                      {unconnectedProviders.length}
                    </span>
                  </h2>
                </div>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  {unconnectedProviders.map((provider) => {
                    const config = getProviderConfig(provider);
                    const Icon = config.icon;
                    const connecting = isConnecting === provider;
                    
                    return (
                      <Card 
                        key={provider}
                        className="group relative overflow-hidden border border-dashed border-border bg-muted/30 hover:border-primary/50 hover:bg-card transition-all duration-200 flex flex-col h-full"
                        data-testid={`card-connect-${provider}`}
                      >
                        <CardContent className="p-6 flex flex-col items-center text-center gap-4 flex-1">
                          <div className={cn("p-3 rounded-full", config.bgColor)}>
                            <Icon className={cn("h-8 w-8", config.color)} />
                          </div>
                          
                          <div className="space-y-1">
                            <h3 className="font-semibold text-foreground">{config.label}</h3>
                            <p className="text-sm text-muted-foreground leading-relaxed">
                              {config.description}
                            </p>
                          </div>
                        </CardContent>
                        
                        <CardFooter className="p-3 border-t border-border mt-auto flex items-center justify-center">
                          <Button 
                            variant="outline" 
                            size="sm"
                            className="w-full"
                            onClick={() => handleConnect(provider)}
                            disabled={connecting}
                            data-testid={`button-connect-${provider}`}
                          >
                            {connecting ? (
                              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            ) : (
                              <Plus className="h-4 w-4 mr-2" />
                            )}
                            Connect
                          </Button>
                        </CardFooter>
                      </Card>
                    );
                  })}
                </div>
              </section>
            )}
          </>
        )}
      </div>
    </div>
  );
}
