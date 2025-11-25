import React from 'react';
import { useNexus } from '@/context/NexusContext';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RefreshCw, Check, Loader2, Globe, Building2, Key, ShieldCheck, AlertCircle } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export function Connections() {
  const { 
    fetchMetricoolBrands, 
    metricoolBrands, 
    isLoadingMetricool, 
    importMetricoolBrand, 
    clients 
  } = useNexus();

  return (
    <div className="h-full bg-background p-8 flex flex-col max-w-5xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold tracking-tight text-foreground">Configuración y Conexiones</h1>
        <p className="text-muted-foreground mt-1">Administra la conexión con Metricool y tus marcas activas.</p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Left Column: API Configuration */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Key className="h-5 w-5 text-indigo-500" />
                Credenciales API
              </CardTitle>
              <CardDescription>Configura tu acceso a la API de Metricool.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="api-token">Metricool User Token (X-Mc-Auth)</Label>
                <Input 
                  id="api-token" 
                  type="password" 
                  placeholder="Paste your token here..." 
                  className="font-mono text-xs"
                  defaultValue="************************"
                />
                <p className="text-[10px] text-muted-foreground">Este token permite leer los mensajes de tus marcas conectadas.</p>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="user-id">User ID</Label>
                <Input 
                  id="user-id" 
                  placeholder="12345678" 
                  defaultValue="2938471"
                />
              </div>

              <div className="pt-2">
                <Button className="w-full bg-indigo-600 hover:bg-indigo-700">
                  <ShieldCheck className="h-4 w-4 mr-2" />
                  Verificar Conexión
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-blue-50 border-blue-100">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-blue-800 text-base">
                <AlertCircle className="h-4 w-4" />
                Estado del Sistema
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between text-sm">
                <span className="text-blue-700">API Status:</span>
                <Badge variant="outline" className="bg-green-100 text-green-700 border-green-200 gap-1">
                  <span className="h-1.5 w-1.5 rounded-full bg-green-500 animate-pulse" />
                  Online
                </Badge>
              </div>
              <div className="flex items-center justify-between text-sm mt-2">
                <span className="text-blue-700">Last Sync:</span>
                <span className="text-blue-900 font-medium">Just now</span>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Column: Brand Management */}
        <Card className="flex flex-col h-full">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Globe className="h-5 w-5 text-indigo-500" />
                  Marcas Disponibles
                </CardTitle>
                <CardDescription>Importa marcas desde tu cuenta de Metricool.</CardDescription>
              </div>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={fetchMetricoolBrands}
                disabled={isLoadingMetricool}
              >
                {isLoadingMetricool ? (
                  <Loader2 className="h-3.5 w-3.5 mr-2 animate-spin" />
                ) : (
                  <RefreshCw className="h-3.5 w-3.5 mr-2" />
                )}
                Actualizar
              </Button>
            </div>
          </CardHeader>
          <CardContent className="flex-1">
            <ScrollArea className="h-[400px] pr-4">
              {isLoadingMetricool && metricoolBrands.length === 0 ? (
                 <div className="flex flex-col items-center justify-center h-40 text-muted-foreground">
                    <Loader2 className="h-8 w-8 mb-2 animate-spin opacity-20" />
                    <span className="text-sm">Conectando con Metricool...</span>
                 </div>
              ) : metricoolBrands.length > 0 ? (
                <div className="space-y-3">
                  {metricoolBrands.map((brand) => {
                    const isAdded = clients.some(c => c.name === brand.name);
                    return (
                      <div key={brand.id} className="flex items-center justify-between p-4 bg-card rounded-lg border hover:border-indigo-200 transition-all group">
                        <div className="flex items-center gap-4">
                          <Avatar className="h-10 w-10 border">
                            <AvatarImage src={brand.avatar} />
                            <AvatarFallback>{brand.name.substring(0, 2)}</AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="font-medium text-foreground">{brand.name}</p>
                            <p className="text-xs text-muted-foreground flex items-center gap-1">
                              <Building2 className="h-3 w-3" /> {brand.industry}
                            </p>
                          </div>
                        </div>
                        <Button 
                          size="sm" 
                          variant={isAdded ? "ghost" : "default"}
                          className={isAdded ? "text-green-600 bg-green-50 hover:text-green-700 hover:bg-green-100" : ""}
                          onClick={() => !isAdded && importMetricoolBrand(brand.id)}
                          disabled={isAdded}
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
                <div className="flex flex-col items-center justify-center h-40 text-muted-foreground border-2 border-dashed rounded-xl bg-gray-50/50">
                  <Globe className="h-10 w-10 mb-3 opacity-20" />
                  <p className="font-medium">No se han cargado marcas</p>
                  <p className="text-sm opacity-70">Haz clic en "Actualizar" para buscar.</p>
                </div>
              )}
            </ScrollArea>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
