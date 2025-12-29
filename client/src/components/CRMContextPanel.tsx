import React, { useState } from 'react';
import { useIsMobile } from '@/hooks/use-mobile';
import { 
  Mail, 
  Phone, 
  MapPin,
  MessageSquare,
  Plus,
  X,
  Loader2,
  Clock,
  User
} from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import {
  Drawer,
  DrawerContent,
} from "@/components/ui/drawer";
import { FaInstagram, FaFacebook, FaTiktok, FaYoutube, FaTwitter, FaLinkedin } from 'react-icons/fa';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';
import { api } from '@/lib/api';
import type { Conversation, CrmContact, CrmContactChannel } from '@shared/schema';

interface CRMContextPanelProps {
  crmContact?: CrmContact;
  crmChannels?: CrmContactChannel[];
  isLoadingContact?: boolean;
  conversation?: Conversation | null;
  brandId: string;
  isOpen: boolean;
  onClose: () => void;
  onContactCreated?: () => void;
}

const getPlatformIcon = (platform: string) => {
  const iconClass = "h-4 w-4";
  const platformLower = platform.toLowerCase();
  
  switch (platformLower) {
    case 'instagram': return <FaInstagram className={cn(iconClass, "text-pink-500")} />;
    case 'facebook': return <FaFacebook className={cn(iconClass, "text-blue-600")} />;
    case 'tiktok': return <FaTiktok className={cn(iconClass, "text-gray-900")} />;
    case 'youtube': return <FaYoutube className={cn(iconClass, "text-red-600")} />;
    case 'twitter': return <FaTwitter className={cn(iconClass, "text-sky-500")} />;
    case 'linkedin': return <FaLinkedin className={cn(iconClass, "text-blue-700")} />;
    default: return <MessageSquare className={cn(iconClass, "text-gray-500")} />;
  }
};

const StatusBadge = ({ status }: { status: string | null }) => {
  const statusConfig: Record<string, { bg: string; text: string }> = {
    'lead': { bg: 'bg-blue-50', text: 'text-blue-700' },
    'active': { bg: 'bg-green-50', text: 'text-green-700' },
    'inactive': { bg: 'bg-gray-100', text: 'text-gray-600' },
    'archived': { bg: 'bg-red-50', text: 'text-red-700' },
    'new': { bg: 'bg-purple-50', text: 'text-purple-700' },
  };
  
  const config = statusConfig[status || 'lead'] || statusConfig.lead;
  
  return (
    <span className={cn(
      "inline-flex items-center px-2 py-0.5 text-xs font-medium rounded",
      config.bg,
      config.text
    )}>
      {status || 'lead'}
    </span>
  );
};

const LifecycleBadge = ({ stage }: { stage: string | null }) => {
  const stageConfig: Record<string, { bg: string; text: string }> = {
    'new': { bg: 'bg-slate-100', text: 'text-slate-700' },
    'engaged': { bg: 'bg-amber-50', text: 'text-amber-700' },
    'qualified': { bg: 'bg-emerald-50', text: 'text-emerald-700' },
    'customer': { bg: 'bg-indigo-50', text: 'text-indigo-700' },
  };
  
  const config = stageConfig[stage || 'new'] || stageConfig.new;
  
  return (
    <span className={cn(
      "inline-flex items-center px-2 py-0.5 text-xs font-medium rounded",
      config.bg,
      config.text
    )}>
      {stage || 'new'}
    </span>
  );
};

function CRMPanelContent({ 
  crmContact, 
  crmChannels,
  isLoadingContact,
  conversation,
  brandId,
  onClose, 
  onContactCreated,
  className 
}: { 
  crmContact?: CrmContact;
  crmChannels?: CrmContactChannel[];
  isLoadingContact?: boolean;
  conversation?: Conversation | null;
  brandId: string;
  onClose: () => void;
  onContactCreated?: () => void;
  className?: string;
}) {
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    displayName: '',
    email: '',
    phone: '',
  });

  React.useEffect(() => {
    if (conversation) {
      setFormData({
        displayName: conversation.customerName || '',
        email: '',
        phone: '',
      });
    }
  }, [conversation]);

  const handleCreateContact = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!conversation || !brandId) return;
    
    setIsSubmitting(true);
    try {
      await api.crm.createContact({
        brandId,
        displayName: formData.displayName || conversation.customerName || 'Unknown',
        email: formData.email || undefined,
        phone: formData.phone || undefined,
        platform: conversation.platform,
        externalId: conversation.customerId,
        username: conversation.customerName || undefined,
        avatarUrl: conversation.customerAvatar || undefined,
      });
      
      setIsCreateDialogOpen(false);
      toast.success("Contacto creado", {
        description: "El contacto ha sido guardado en el CRM."
      });
      onContactCreated?.();
    } catch (error: any) {
      toast.error("Error al crear contacto", {
        description: error.message || "Por favor intenta de nuevo."
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoadingContact) {
    return (
      <div className={cn("flex flex-col h-full", className)}>
        <div className="h-14 border-b px-4 flex items-center justify-between shrink-0 bg-white">
          <span className="text-sm font-semibold text-gray-500 flex items-center gap-2">
            <User className="h-4 w-4" /> CRM
          </span>
          <Button variant="ghost" size="icon" onClick={onClose} className="h-8 w-8 hover:bg-gray-100 text-gray-500">
            <X className="h-4 w-4" />
          </Button>
        </div>
        <div className="flex-1 flex items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
        </div>
      </div>
    );
  }

  if (!crmContact) {
    const isDM = conversation?.type === 'dm';
    
    return (
      <div className={cn("flex flex-col h-full transition-all duration-300 ease-in-out relative overflow-hidden", className)}>
        <div className="h-14 border-b px-4 flex items-center justify-between shrink-0 bg-white">
          <span className="text-sm font-semibold text-gray-500 flex items-center gap-2">
            <User className="h-4 w-4" /> CRM
          </span>
          <Button variant="ghost" size="icon" onClick={onClose} className="h-8 w-8 hover:bg-gray-100 text-gray-500">
            <X className="h-4 w-4" />
          </Button>
        </div>

        <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
          <div className="bg-white p-4 rounded-2xl mb-5 ring-1 ring-gray-200 relative border border-gray-200">
            {isDM && <div className="absolute -top-2 -right-2 bg-green-500 h-4 w-4 rounded-full border-2 border-white animate-pulse" />}
            <div className="bg-indigo-50 p-3 rounded-xl">
              <Plus className="h-7 w-7 text-indigo-600" />
            </div>
          </div>
          
          <h3 className="text-base font-bold text-gray-900 mb-1.5">
            {isDM ? 'Nuevo Prospecto' : 'Sin Contacto'}
          </h3>
          <p className="text-sm text-muted-foreground mb-6 leading-relaxed max-w-[220px]">
            {isDM 
              ? 'Este contacto aún no está en tu CRM. ¡Captura esta oportunidad!'
              : 'Los contactos se crean automáticamente desde DMs.'
            }
          </p>
          
          {isDM && conversation && (
            <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
              <DialogTrigger asChild>
                <Button 
                  className="w-full bg-indigo-600 hover:bg-indigo-700 transition-all"
                  data-testid="button-create-crm-contact"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Crear Contacto
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[400px]">
                <DialogHeader>
                  <DialogTitle>Crear Contacto</DialogTitle>
                  <DialogDescription>
                    Agrega este prospecto a tu CRM.
                  </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleCreateContact}>
                  <div className="grid gap-4 py-4">
                    <div className="space-y-2">
                      <Label htmlFor="name">Nombre</Label>
                      <Input 
                        id="name" 
                        value={formData.displayName}
                        onChange={(e) => setFormData(prev => ({ ...prev, displayName: e.target.value }))}
                        placeholder="Nombre del contacto"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="email">Email (opcional)</Label>
                      <Input 
                        id="email" 
                        type="email"
                        value={formData.email}
                        onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                        placeholder="correo@ejemplo.com"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="phone">Teléfono (opcional)</Label>
                      <Input 
                        id="phone" 
                        value={formData.phone}
                        onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                        placeholder="+1 234 567 8900"
                      />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button type="submit" disabled={isSubmitting}>
                      {isSubmitting ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Creando...
                        </>
                      ) : (
                        "Crear Contacto"
                      )}
                    </Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className={cn("flex flex-col h-full transition-all duration-300 ease-in-out", className)}>
      <div className="h-14 border-b px-4 flex items-center justify-between shrink-0 bg-white">
        <span className="text-sm font-semibold text-gray-900 flex items-center gap-2">
          <User className="h-4 w-4" /> Perfil CRM
        </span>
        <Button variant="ghost" size="icon" onClick={onClose} className="h-8 w-8 hover:bg-gray-100 text-gray-500">
          <X className="h-4 w-4" />
        </Button>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-4 space-y-5">
          <div className="flex flex-col items-center text-center">
            <Avatar className="h-14 w-14 mb-2.5 ring-4 ring-gray-50">
              <AvatarFallback className="bg-indigo-100 text-indigo-600 text-lg font-bold">
                {(crmContact.displayName || '?')[0].toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <h3 className="font-bold text-base text-gray-900 truncate max-w-full px-2">
              {crmContact.displayName || 'Sin nombre'}
            </h3>
            <div className="flex items-center gap-2 mt-2">
              <StatusBadge status={crmContact.status} />
              <LifecycleBadge stage={crmContact.lifecycleStage} />
            </div>
          </div>

          <Separator />

          <div className="space-y-3">
            <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider">Canales Conectados</h4>
            <div className="space-y-2">
              {crmChannels?.map((channel) => (
                <div key={channel.id} className="flex items-center gap-3 p-2 rounded-lg bg-gray-50">
                  {getPlatformIcon(channel.platform)}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">{channel.username || channel.externalId}</p>
                    <p className="text-xs text-gray-500">{channel.messageCount} mensajes</p>
                  </div>
                </div>
              ))}
              {(!crmChannels || crmChannels.length === 0) && (
                <p className="text-xs text-gray-400 text-center py-2">Sin canales conectados</p>
              )}
            </div>
          </div>

          <Separator />

          <div className="space-y-3">
            <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider">Información</h4>
            
            {crmContact.email && (
              <div className="flex items-center gap-3 text-sm">
                <div className="h-8 w-8 rounded-full bg-gray-50 flex items-center justify-center text-gray-400">
                  <Mail className="h-4 w-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-muted-foreground">Email</p>
                  <p className="font-medium text-gray-900 truncate">{crmContact.email}</p>
                </div>
              </div>
            )}

            {crmContact.phone && (
              <div className="flex items-center gap-3 text-sm">
                <div className="h-8 w-8 rounded-full bg-gray-50 flex items-center justify-center text-gray-400">
                  <Phone className="h-4 w-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-muted-foreground">Teléfono</p>
                  <p className="font-medium text-gray-900">{crmContact.phone}</p>
                </div>
              </div>
            )}

            {(crmContact.city || crmContact.country) && (
              <div className="flex items-center gap-3 text-sm">
                <div className="h-8 w-8 rounded-full bg-gray-50 flex items-center justify-center text-gray-400">
                  <MapPin className="h-4 w-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-muted-foreground">Ubicación</p>
                  <p className="font-medium text-gray-900">
                    {[crmContact.city, crmContact.country].filter(Boolean).join(', ')}
                  </p>
                </div>
              </div>
            )}

            {!crmContact.email && !crmContact.phone && !crmContact.city && (
              <p className="text-xs text-gray-400 text-center py-2">Sin información adicional</p>
            )}
          </div>

          <Separator />

          <div className="space-y-3">
            <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider">Actividad</h4>
            
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-gray-50 rounded-lg p-3 text-center">
                <p className="text-xl font-bold text-gray-900">{crmContact.totalMessages}</p>
                <p className="text-xs text-gray-500">Mensajes</p>
              </div>
              <div className="bg-gray-50 rounded-lg p-3 text-center">
                <p className="text-xl font-bold text-gray-900">{crmContact.conversationCount}</p>
                <p className="text-xs text-gray-500">Conversaciones</p>
              </div>
            </div>

            {crmContact.firstInteractionAt && (
              <div className="flex items-center gap-3 text-sm">
                <div className="h-8 w-8 rounded-full bg-gray-50 flex items-center justify-center text-gray-400">
                  <Clock className="h-4 w-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-muted-foreground">Primera interacción</p>
                  <p className="font-medium text-gray-900">
                    {formatDistanceToNow(new Date(crmContact.firstInteractionAt), { addSuffix: true, locale: es })}
                  </p>
                </div>
              </div>
            )}
          </div>

          {Object.keys(crmContact.customFields || {}).length > 0 && (
            <>
              <Separator />
              <div className="space-y-3">
                <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider">Datos Extraídos</h4>
                <div className="space-y-2">
                  {Object.entries(crmContact.customFields || {}).map(([key, value]) => (
                    <div key={key} className="flex items-center justify-between text-sm">
                      <span className="text-gray-500 capitalize">{key.replace(/_/g, ' ')}</span>
                      <span className="font-medium text-gray-900">{String(value)}</span>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}

export function CRMContextPanel({ 
  crmContact, 
  crmChannels,
  isLoadingContact,
  conversation,
  brandId,
  isOpen, 
  onClose,
  onContactCreated,
}: CRMContextPanelProps) {
  const isMobile = useIsMobile();

  if (!isOpen && !isMobile) return null;

  if (isMobile) {
    return (
      <Drawer open={isOpen} onOpenChange={(open) => !open && onClose()}>
        <DrawerContent className="h-[85vh] outline-none">
          <div className="h-full overflow-hidden flex flex-col bg-white rounded-t-[10px]">
            <CRMPanelContent 
              crmContact={crmContact}
              crmChannels={crmChannels}
              isLoadingContact={isLoadingContact}
              conversation={conversation}
              brandId={brandId}
              onClose={onClose}
              onContactCreated={onContactCreated}
              className="bg-white" 
            />
          </div>
        </DrawerContent>
      </Drawer>
    );
  }

  return (
    <div className={cn(
      "w-[300px] border-l flex flex-col h-full shrink-0 z-30 transition-all duration-300 ease-in-out",
      "bg-white"
    )}>
      <CRMPanelContent 
        crmContact={crmContact}
        crmChannels={crmChannels}
        isLoadingContact={isLoadingContact}
        conversation={conversation}
        brandId={brandId}
        onClose={onClose}
        onContactCreated={onContactCreated}
        className="bg-white" 
      />
    </div>
  );
}
