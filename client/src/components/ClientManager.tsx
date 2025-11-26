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
          <DialogTitle className="text-xl font-semibold text-white">Agregar Marca</DialogTitle>
          <DialogDescription className="text-gray-400">
            Conecta una nueva marca desde Metricool.
          </DialogDescription>
        </DialogHeader>

        <div className="mt-4 space-y-4">
          <div className="bg-[#252528] p-4 rounded-lg border border-[#3A3A3C] space-y-4">
            <div className="bg-blue-900/20 border border-blue-500/30 rounded-lg p-3 mb-4">
              <div className="flex items-start gap-3">
                <div className="h-8 w-8 rounded-full bg-blue-500/20 flex items-center justify-center flex-shrink-0">
                  <Check className="h-4 w-4 text-blue-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="text-sm font-medium text-blue-100 mb-1">Conexión Segura Configurada</h4>
                  <p className="text-xs text-blue-300/80 leading-relaxed">
                    Las credenciales de Metricool están almacenadas de forma segura en el servidor. 
                    Haz clic en el botón para cargar tus marcas.
                  </p>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between pt-2">
              <div>
                <h3 className="font-medium text-white text-sm">Marcas Disponibles</h3>
                <p className="text-[10px] text-gray-400">Haz clic para listar las marcas de tu cuenta.</p>
              </div>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={fetchMetricoolBrands}
                className="border-[#3A3A3C] bg-indigo-600 hover:bg-indigo-700 text-white border-none"
                disabled={isLoadingMetricool}
                data-testid="button-fetch-brands-client-manager"
              >
                {isLoadingMetricool ? (
                  <Loader2 className="h-3.5 w-3.5 mr-2 animate-spin" />
                ) : (
                  <RefreshCw className="h-3.5 w-3.5 mr-2" />
                )}
                {metricoolBrands.length > 0 ? 'Actualizar Lista' : 'Cargar Marcas'}
              </Button>
            </div>

            <ScrollArea className="h-[160px] pr-4">
              {isLoadingMetricool && metricoolBrands.length === 0 ? (
                 <div className="flex flex-col items-center justify-center h-32 text-gray-500">
                    <Loader2 className="h-8 w-8 mb-2 animate-spin opacity-50" />
                    <span className="text-xs">Conectando con la API de Metricool...</span>
                 </div>
              ) : metricoolBrands.length > 0 ? (
                <div className="space-y-2">
                  {metricoolBrands.map((brand) => {
                    const isAdded = clients.some(c => c.metricoolBlogId === brand.blogId);
                    return (
                      <div key={brand.blogId} className="flex items-center justify-between p-3 bg-[#2C2C2E] rounded-md border border-[#3A3A3C]/50 hover:border-[#3A3A3C] transition-colors">
                        <div className="flex items-center gap-3 min-w-0 flex-1">
                          <Avatar className="h-8 w-8 flex-shrink-0">
                            <AvatarImage src={brand.avatar || undefined} />
                            <AvatarFallback>{brand.name.substring(0, 2)}</AvatarFallback>
                          </Avatar>
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-medium text-white truncate">{brand.name}</p>
                            <p className="text-xs text-gray-500 flex items-center gap-1">
                              <Building2 className="h-3 w-3" /> blogId: {brand.blogId}
                            </p>
                          </div>
                        </div>
                        <Button 
                          size="sm" 
                          variant={isAdded ? "ghost" : "secondary"}
                          className={isAdded ? "text-green-500 hover:text-green-400 hover:bg-transparent" : "bg-indigo-600 hover:bg-indigo-700 text-white border-none"}
                          onClick={() => !isAdded && importMetricoolBrand(brand.blogId)}
                          disabled={isAdded}
                          data-testid={`button-import-brand-cm-${brand.blogId}`}
                        >
                          {isAdded ? (
                            <><Check className="h-4 w-4 mr-1" /> Conectado</>
                          ) : (
                            <>Importar</>
                          )}
                        </Button>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center h-32 text-gray-500 border-2 border-dashed border-[#3A3A3C] rounded-lg">
                  <Globe className="h-8 w-8 mb-2 opacity-20" />
                  <p className="text-sm">No hay marcas cargadas</p>
                  <p className="text-xs opacity-60">Haz clic en "Cargar Marcas" para comenzar</p>
                </div>
              )}
            </ScrollArea>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
