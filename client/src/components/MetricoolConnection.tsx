
import React from 'react';
import { useNexus } from '@/context/NexusContext';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { RefreshCw, Check, Loader2, Globe, Building2, Key, ShieldCheck, AlertCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface MetricoolConnectionProps {
  onClose: () => void;
}

export function MetricoolConnection({ onClose }: MetricoolConnectionProps) {
  const { 
    fetchMetricoolBrands, 
    metricoolBrands, 
    isLoadingMetricool, 
    importMetricoolBrand, 
    clients 
  } = useNexus();

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
          data-testid="button-fetch-metricool-brands"
        >
          {isLoadingMetricool ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <RefreshCw className="h-4 w-4 mr-2" />
          )}
          Cargar Marcas desde Metricool
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
              {metricoolBrands.map((brand) => {
                const isAdded = clients.some(c => c.name === brand.name);
                return (
                  <div key={brand.id} className="flex items-center justify-between p-3 bg-white rounded-lg border hover:border-indigo-200 transition-all shadow-sm">
                    <div className="flex items-center gap-3">
                      <Avatar className="h-8 w-8 border">
                        <AvatarImage src={brand.avatar} />
                        <AvatarFallback>{brand.name.substring(0, 2)}</AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="text-sm font-medium text-foreground">{brand.name}</p>
                        <p className="text-[10px] text-muted-foreground flex items-center gap-1">
                          <Building2 className="h-3 w-3" /> {brand.industry}
                        </p>
                      </div>
                    </div>
                    <Button 
                      size="sm" 
                      variant={isAdded ? "ghost" : "outline"}
                      className={`h-7 text-xs ${isAdded ? "text-green-600 bg-green-50 hover:text-green-700 hover:bg-green-100" : ""}`}
                      onClick={() => {
                          if (!isAdded) {
                              importMetricoolBrand(brand.id);
                          }
                      }}
                      disabled={isAdded}
                      data-testid={`button-import-brand-${brand.id}`}
                    >
                      {isAdded ? (
                        <><Check className="h-3 w-3 mr-1" /> Conectado</>
                      ) : (
                        "Importar"
                      )}
                    </Button>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
              <p className="text-xs opacity-70 text-center px-4">
                Ingresa tus credenciales y haz clic en verificar para ver tus marcas.
              </p>
            </div>
          )}
        </ScrollArea>
      </div>
    </div>
  );
}
