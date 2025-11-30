
import React, { useEffect, useState } from 'react';
import { useNexus } from '@/context/NexusContext';
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { RefreshCw, Check, Loader2, Globe, Building2, ShieldCheck, ArrowLeft, ArrowRight, Settings2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { FaInstagram, FaFacebookF, FaTiktok, FaYoutube, FaLinkedinIn, FaGoogle, FaTwitter } from 'react-icons/fa';
import type { DetectedProvider } from '@/lib/api';
import { SocialAccountsManager } from './SocialAccountsManager';
import type { Client } from '@shared/schema';

interface MetricoolConnectionProps {
  onClose: () => void;
}

interface MetricoolBrandWithProviders {
  id: string;
  name: string;
  industry: string;
  avatar: string | null;
  blogId: string;
  detectedProviders?: DetectedProvider[];
}

const PROVIDER_CONFIG: Record<string, { icon: React.ComponentType<any>; label: string; color: string }> = {
  'INSTAGRAM': { icon: FaInstagram, label: 'Instagram', color: 'text-pink-500' },
  'FACEBOOK': { icon: FaFacebookF, label: 'Facebook', color: 'text-blue-600' },
  'TIKTOKBUSINESS': { icon: FaTiktok, label: 'TikTok', color: 'text-black' },
  'YOUTUBE': { icon: FaYoutube, label: 'YouTube', color: 'text-red-600' },
  'LINKEDIN': { icon: FaLinkedinIn, label: 'LinkedIn', color: 'text-blue-700' },
  'GMB': { icon: FaGoogle, label: 'Google Business', color: 'text-blue-500' },
  'twitter': { icon: FaTwitter, label: 'Twitter/X', color: 'text-gray-800' },
};

export function MetricoolConnection({ onClose }: MetricoolConnectionProps) {
  const { 
    fetchMetricoolBrands, 
    metricoolBrands, 
    isLoadingMetricool, 
    importMetricoolBrand, 
    clients 
  } = useNexus();

  const [step, setStep] = useState<'brands' | 'providers'>('brands');
  const [selectedBrand, setSelectedBrand] = useState<MetricoolBrandWithProviders | null>(null);
  const [selectedProviders, setSelectedProviders] = useState<Set<string>>(new Set());
  const [isImporting, setIsImporting] = useState(false);
  const [configureClient, setConfigureClient] = useState<Client | null>(null);

  useEffect(() => {
    fetchMetricoolBrands();
  }, []);

  const handleSelectBrand = (brand: MetricoolBrandWithProviders) => {
    setSelectedBrand(brand);
    if (brand.detectedProviders && brand.detectedProviders.length > 0) {
      setSelectedProviders(new Set(brand.detectedProviders.map(p => p.provider)));
      setStep('providers');
    } else {
      handleImport(brand, []);
    }
  };

  const handleToggleProvider = (provider: string) => {
    const newSelected = new Set(selectedProviders);
    if (newSelected.has(provider)) {
      newSelected.delete(provider);
    } else {
      newSelected.add(provider);
    }
    setSelectedProviders(newSelected);
  };

  const handleBack = () => {
    setStep('brands');
    setSelectedBrand(null);
    setSelectedProviders(new Set());
  };

  const handleImport = async (brand: MetricoolBrandWithProviders, providers: string[]) => {
    setIsImporting(true);
    try {
      await importMetricoolBrand(brand.blogId, brand.detectedProviders || [], providers);
      setStep('brands');
      setSelectedBrand(null);
      setSelectedProviders(new Set());
    } finally {
      setIsImporting(false);
    }
  };

  const handleConfirmProviders = () => {
    if (selectedBrand) {
      handleImport(selectedBrand, Array.from(selectedProviders));
    }
  };

  if (step === 'providers' && selectedBrand) {
    return (
      <div className="space-y-6 py-2">
        <div className="space-y-4">
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={handleBack}
            className="text-muted-foreground"
            data-testid="button-back-to-brands"
          >
            <ArrowLeft className="h-4 w-4 mr-1" />
            Volver a marcas
          </Button>

          <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-4">
            <div className="flex items-center gap-3">
              <Avatar className="h-10 w-10 border">
                <AvatarImage src={selectedBrand.avatar || undefined} />
                <AvatarFallback>{selectedBrand.name.substring(0, 2)}</AvatarFallback>
              </Avatar>
              <div>
                <h4 className="text-sm font-medium text-indigo-900">{selectedBrand.name}</h4>
                <p className="text-xs text-indigo-700">Selecciona las redes a sincronizar</p>
              </div>
            </div>
          </div>

          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
            <p className="text-xs text-amber-800">
              <strong>Privacidad:</strong> Solo se sincronizarán los mensajes de las redes que selecciones. 
              Puedes cambiar esta configuración más tarde desde el panel de administración.
            </p>
          </div>
        </div>

        <div className="border-t pt-4">
          <h3 className="text-sm font-medium mb-4">Redes Detectadas</h3>
          <ScrollArea className="h-[200px] pr-4">
            <div className="space-y-3">
              {selectedBrand.detectedProviders?.map((dp) => {
                const config = PROVIDER_CONFIG[dp.provider] || { icon: Globe, label: dp.provider, color: 'text-gray-500' };
                const Icon = config.icon;
                const isSelected = selectedProviders.has(dp.provider);
                
                return (
                  <div 
                    key={dp.provider}
                    className={`flex items-center justify-between p-3 rounded-lg border transition-all cursor-pointer ${
                      isSelected ? 'bg-indigo-50 border-indigo-300' : 'bg-white hover:border-gray-300'
                    }`}
                    onClick={() => handleToggleProvider(dp.provider)}
                    data-testid={`checkbox-provider-${dp.provider}`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-full bg-white border ${isSelected ? 'border-indigo-300' : ''}`}>
                        <Icon className={`h-4 w-4 ${config.color}`} />
                      </div>
                      <div>
                        <p className="text-sm font-medium">{config.label}</p>
                        {dp.accountName && (
                          <p className="text-xs text-muted-foreground">@{dp.accountName}</p>
                        )}
                      </div>
                    </div>
                    <Checkbox 
                      checked={isSelected}
                      onCheckedChange={() => handleToggleProvider(dp.provider)}
                    />
                  </div>
                );
              })}
            </div>
          </ScrollArea>
        </div>

        <div className="flex justify-between pt-4 border-t">
          <Button 
            variant="outline" 
            onClick={() => setSelectedProviders(new Set())}
            disabled={selectedProviders.size === 0}
            data-testid="button-clear-selection"
          >
            Limpiar
          </Button>
          <Button 
            onClick={handleConfirmProviders}
            disabled={isImporting}
            className="bg-indigo-600 hover:bg-indigo-700"
            data-testid="button-confirm-import"
          >
            {isImporting ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <ArrowRight className="h-4 w-4 mr-2" />
            )}
            Importar ({selectedProviders.size} redes)
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 py-2">
      <div className="space-y-4">
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
          <div className="flex items-start gap-3">
            <ShieldCheck className="h-5 w-5 text-blue-600 mt-0.5" />
            <div className="flex-1">
              <h4 className="text-sm font-medium text-blue-900 mb-1">Conexión Segura Configurada</h4>
              <p className="text-xs text-blue-700">
                Las credenciales de Metricool están almacenadas de forma segura en el servidor. 
                Haz clic en el botón para cargar tus marcas.
              </p>
            </div>
          </div>
        </div>

        <Button 
          className="w-full bg-indigo-600 hover:bg-indigo-700"
          onClick={fetchMetricoolBrands}
          disabled={isLoadingMetricool}
          data-testid="button-refresh-metricool-brands"
        >
          {isLoadingMetricool ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <RefreshCw className="h-4 w-4 mr-2" />
          )}
          Actualizar Marcas
        </Button>
      </div>

      <div className="border-t pt-4">
        <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-medium flex items-center gap-2">
                <Globe className="h-4 w-4 text-indigo-500" />
                Marcas Disponibles
            </h3>
            {metricoolBrands.length > 0 && (
                <Badge variant="outline" className="text-xs font-normal">
                    {metricoolBrands.length} found
                </Badge>
            )}
        </div>

        <ScrollArea className="h-[250px] pr-4 border rounded-md bg-gray-50/50 p-2">
          {isLoadingMetricool && metricoolBrands.length === 0 ? (
             <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
                <Loader2 className="h-6 w-6 mb-2 animate-spin opacity-20" />
                <span className="text-xs">Conectando con Metricool...</span>
             </div>
          ) : metricoolBrands.length > 0 ? (
            <div className="space-y-2">
              {(metricoolBrands as MetricoolBrandWithProviders[]).map((brand) => {
                const isAdded = clients.some(c => c.metricoolBlogId === brand.blogId);
                const providerCount = brand.detectedProviders?.length || 0;
                
                return (
                  <div key={brand.blogId} className="flex items-center justify-between p-3 bg-white rounded-lg border hover:border-indigo-200 transition-all shadow-sm">
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <Avatar className="h-8 w-8 border flex-shrink-0">
                        <AvatarImage src={brand.avatar || undefined} />
                        <AvatarFallback>{brand.name.substring(0, 2)}</AvatarFallback>
                      </Avatar>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-foreground truncate">{brand.name}</p>
                        <div className="flex items-center gap-2">
                          <p className="text-[10px] text-muted-foreground flex items-center gap-1">
                            <Building2 className="h-3 w-3" /> blogId: {brand.blogId}
                          </p>
                          {providerCount > 0 && (
                            <Badge variant="secondary" className="text-[9px] h-4 px-1.5">
                              {providerCount} redes
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                    {isAdded ? (
                      <div className="flex items-center gap-1">
                        <Badge variant="outline" className="text-[10px] text-green-600 border-green-200 bg-green-50 flex items-center gap-1">
                          <Check className="h-2.5 w-2.5" /> Conectado
                        </Badge>
                        <Button 
                          size="sm" 
                          variant="ghost"
                          className="h-7 w-7 p-0 text-gray-400 hover:text-indigo-600"
                          onClick={() => {
                            const client = clients.find(c => c.metricoolBlogId === brand.blogId);
                            if (client) setConfigureClient(client);
                          }}
                          data-testid={`button-configure-brand-${brand.blogId}`}
                        >
                          <Settings2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    ) : (
                      <Button 
                        size="sm" 
                        variant="outline"
                        className="h-7 text-xs"
                        onClick={() => handleSelectBrand(brand)}
                        data-testid={`button-import-brand-${brand.blogId}`}
                      >
                        Importar
                      </Button>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
              <p className="text-xs opacity-70 text-center px-4">
                No se encontraron marcas disponibles. Haz clic en "Actualizar Marcas" para reintentar.
              </p>
            </div>
          )}
        </ScrollArea>
      </div>

      <SocialAccountsManager
        open={!!configureClient}
        onOpenChange={(open) => !open && setConfigureClient(null)}
        client={configureClient}
        onAccountsUpdated={() => {}}
      />
    </div>
  );
}
