import React, { useState } from 'react';
import { useIsMobile } from '@/hooks/use-mobile';
import { useReminderOptOut } from '@/hooks/useReminderRules';
import { 
  Mail, 
  Phone, 
  MapPin,
  MessageSquare,
  Plus,
  X,
  Loader2,
  Clock,
  User,
  ExternalLink,
  ArrowRight,
  Bell,
  BellOff,
  Sparkles
} from 'lucide-react';
import { useLocation } from 'wouter';
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
import { Switch } from "@/components/ui/switch";
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
import { ConversationTimeline } from './ConversationTimeline';

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

interface TimelineMessage {
  id: string;
  content: string;
  author: string;
  timestamp: string;
  direction: string;
  platform: string;
}

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
  const [, navigate] = useLocation();
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [timelineMessages, setTimelineMessages] = useState<TimelineMessage[]>([]);
  const [isLoadingTimeline, setIsLoadingTimeline] = useState(false);
  const [formData, setFormData] = useState({
    displayName: '',
    email: '',
    phone: '',
  });

  const optOutMutation = useReminderOptOut(conversation?.id);
  const isOptedOut = conversation?.reminderStatus === 'opted_out';
  const hasReminders = conversation?.type === 'dm';

  React.useEffect(() => {
    if (conversation) {
      setFormData({
        displayName: conversation.customerName || '',
        email: '',
        phone: '',
      });
    }
  }, [conversation]);

  React.useEffect(() => {
    if (!crmContact?.id) {
      setTimelineMessages([]);
      setIsLoadingTimeline(false);
      return;
    }
    
    setIsLoadingTimeline(true);
    fetch(`/api/crm/contacts/${crmContact.id}/timeline?limit=10`)
      .then(res => {
        if (!res.ok) {
          throw new Error(`HTTP ${res.status}`);
        }
        return res.json();
      })
      .then(data => {
        setTimelineMessages(data.messages || []);
      })
      .catch(err => {
        console.error('Error loading timeline:', err);
        setTimelineMessages([]);
      })
      .finally(() => {
        setIsLoadingTimeline(false);
      });
  }, [crmContact?.id]);

  const handleGoToCRM = () => {
    if (crmContact?.id) {
      navigate(`/crm?contactId=${crmContact.id}`);
    }
  };

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
        <div className="flex items-center gap-1">
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={handleGoToCRM}
            className="h-8 px-2 text-xs text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50"
            data-testid="button-go-to-crm"
          >
            Ver en CRM
            <ExternalLink className="h-3 w-3 ml-1" />
          </Button>
          <Button variant="ghost" size="icon" onClick={onClose} className="h-8 w-8 hover:bg-gray-100 text-gray-500">
            <X className="h-4 w-4" />
          </Button>
        </div>
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

          {(() => {
            const hiddenFields = ['lastEnrichedAt', 'enrichmentSource', 'lastEnrichmentAt'];
            const fieldLabels: Record<string, string> = {
              intent: 'Intención',
              serviceInterest: 'Servicio de interés',
              qualifiers: 'Observaciones',
              budget: 'Presupuesto',
            };
            const displayableFields = Object.entries(crmContact.customFields || {})
              .filter(([key]) => !key.startsWith('_') && !hiddenFields.includes(key));
            
            if (displayableFields.length === 0) return null;
            
            return (
              <>
                <Separator />
                <div className="space-y-3" data-testid="section-extracted-data">
                  <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider flex items-center gap-2">
                    <Sparkles className="h-3 w-3 text-amber-500" />
                    Datos Extraídos
                  </h4>
                  <div className="bg-gray-50 rounded-lg p-3 space-y-2">
                    {displayableFields.map(([key, value]) => (
                      <div key={key} className="flex items-start justify-between gap-2">
                        <span className="text-xs text-gray-500 shrink-0">
                          {fieldLabels[key] || key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                        </span>
                        <span className="text-xs text-gray-700 text-right break-words max-w-[60%]">
                          {String(value)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            );
          })()}

          {conversation && (conversation.status === 'solved' || conversation.status === 'closed') && conversation.closingSummary && (
            <>
              <Separator />
              <div className="space-y-3" data-testid="section-closing-summary">
                <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider flex items-center gap-2">
                  <span className={cn(
                    "w-2 h-2 rounded-full",
                    conversation.status === 'solved' ? "bg-purple-500" : "bg-gray-500"
                  )} />
                  Resumen de Cierre
                </h4>
                <div className="bg-gray-50 rounded-lg p-3 space-y-2">
                  <p className="text-sm text-gray-700">{conversation.closingSummary}</p>
                  
                  {(conversation.closingSentiment || conversation.closingIntent || conversation.closingResolution) && (
                    <div className="pt-2 border-t border-gray-200 space-y-1.5">
                      {conversation.closingSentiment && (
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-gray-500">Sentimiento</span>
                          <span className={cn(
                            "px-2 py-0.5 rounded font-medium",
                            conversation.closingSentiment === 'positive' && "bg-green-100 text-green-700",
                            conversation.closingSentiment === 'negative' && "bg-red-100 text-red-700",
                            conversation.closingSentiment === 'neutral' && "bg-gray-100 text-gray-600"
                          )}>
                            {conversation.closingSentiment === 'positive' && 'Positivo'}
                            {conversation.closingSentiment === 'negative' && 'Negativo'}
                            {conversation.closingSentiment === 'neutral' && 'Neutral'}
                          </span>
                        </div>
                      )}
                      {conversation.closingIntent && (
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-gray-500">Intención</span>
                          <span className="text-gray-700 font-medium capitalize">{conversation.closingIntent}</span>
                        </div>
                      )}
                      {conversation.closingResolution && (
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-gray-500">Resolución</span>
                          <span className={cn(
                            "px-2 py-0.5 rounded font-medium",
                            conversation.closingResolution === 'resolved' && "bg-green-100 text-green-700",
                            conversation.closingResolution === 'unresolved' && "bg-red-100 text-red-700",
                            conversation.closingResolution === 'escalated' && "bg-amber-100 text-amber-700"
                          )}>
                            {conversation.closingResolution === 'resolved' && 'Resuelto'}
                            {conversation.closingResolution === 'unresolved' && 'Sin resolver'}
                            {conversation.closingResolution === 'escalated' && 'Escalado'}
                          </span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </>
          )}

          {hasReminders && (
            <>
              <Separator />
              <div className="space-y-3" data-testid="section-reminders">
                <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider flex items-center gap-2">
                  {isOptedOut ? <BellOff className="h-3 w-3 text-gray-400" /> : <Bell className="h-3 w-3 text-indigo-500" />}
                  Recordatorios Automáticos
                </h4>
                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900">
                      {isOptedOut ? 'Desactivados' : 'Activos'}
                    </p>
                    <p className="text-xs text-gray-500">
                      {isOptedOut 
                        ? 'No se enviarán recordatorios a esta conversación' 
                        : 'El sistema puede enviar recordatorios de seguimiento'
                      }
                    </p>
                  </div>
                  <Switch
                    checked={!isOptedOut}
                    onCheckedChange={() => {
                      if (!isOptedOut) {
                        optOutMutation.mutate();
                      }
                    }}
                    disabled={optOutMutation.isPending || isOptedOut}
                    data-testid="switch-reminder-opt-out"
                  />
                </div>
                {isOptedOut && (
                  <p className="text-xs text-gray-400 text-center">
                    Para reactivar, contacta al administrador
                  </p>
                )}
              </div>
            </>
          )}

          {(conversation || crmContact) && (
            <>
              <Separator />
              
              <div className="space-y-3" data-testid="section-customer-journey">
                <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider flex items-center gap-2">
                  <Clock className="h-3 w-3 text-indigo-500" />
                  Customer Journey
                </h4>
                <ConversationTimeline 
                  conversationId={conversation?.id}
                  contactId={crmContact?.id}
                  maxEvents={10}
                  showSummary={true}
                />
              </div>
            </>
          )}

          <Separator />
          
          <div className="space-y-3">
            <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider">Historial de Mensajes</h4>
            
            {isLoadingTimeline ? (
              <div className="flex items-center justify-center py-4">
                <Loader2 className="h-5 w-5 animate-spin text-gray-400" />
              </div>
            ) : timelineMessages.length === 0 ? (
              <p className="text-xs text-gray-400 text-center py-2">Sin mensajes recientes</p>
            ) : (
              <div className="space-y-2">
                {timelineMessages.slice(0, 5).map((msg) => (
                  <div 
                    key={msg.id} 
                    className={cn(
                      "p-2 rounded-lg text-xs",
                      msg.direction === 'inbound' 
                        ? "bg-gray-100 text-gray-700" 
                        : "bg-indigo-50 text-indigo-700"
                    )}
                  >
                    <div className="flex items-center gap-1.5 mb-1">
                      {getPlatformIcon(msg.platform)}
                      <span className="font-medium truncate flex-1">
                        {msg.direction === 'inbound' ? msg.author : 'Tú'}
                      </span>
                      <span className="text-[10px] text-gray-400">
                        {formatDistanceToNow(new Date(msg.timestamp), { addSuffix: true, locale: es })}
                      </span>
                    </div>
                    <p className="line-clamp-2 text-gray-600">{msg.content}</p>
                  </div>
                ))}
                
                {timelineMessages.length > 5 && (
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={handleGoToCRM}
                    className="w-full text-xs text-gray-500 hover:text-gray-700"
                  >
                    Ver {timelineMessages.length - 5} mensajes más
                    <ArrowRight className="h-3 w-3 ml-1" />
                  </Button>
                )}
              </div>
            )}
          </div>
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
