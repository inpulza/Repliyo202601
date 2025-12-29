import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNexus } from '@/context/NexusContext';
import { 
  Search, 
  Plus, 
  MoreHorizontal, 
  User, 
  Mail, 
  Phone, 
  MapPin,
  MessageSquare,
  ExternalLink,
  Filter,
  X,
  ChevronRight,
  Loader2
} from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { format, formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';
import { cn } from "@/lib/utils";
import { FaInstagram, FaFacebook, FaTiktok, FaYoutube, FaTwitter, FaLinkedin } from 'react-icons/fa';

interface CrmContact {
  id: string;
  brandId: string;
  displayName: string | null;
  firstName: string | null;
  lastName: string | null;
  phone: string | null;
  email: string | null;
  city: string | null;
  country: string | null;
  status: string | null;
  lifecycleStage: string | null;
  customFields: Record<string, any>;
  conversationCount: number;
  totalMessages: number;
  firstInteractionAt: string | null;
  lastInteractionAt: string | null;
  channelCount?: number;
  platforms?: string[];
}

interface CrmChannel {
  id: string;
  contactId: string;
  platform: string;
  externalId: string;
  username: string | null;
  avatarUrl: string | null;
  messageCount: number;
}

interface LimboEntry {
  id: string;
  brandId: string;
  platform: string;
  externalId: string;
  username: string | null;
  avatarUrl: string | null;
  interactionCount: number;
  lastInteractionAt: string | null;
  promotedToContactId: string | null;
}

const getPlatformIcon = (platform: string) => {
  const iconClass = "h-3.5 w-3.5";
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

export function CRM() {
  const { activeClientId } = useNexus();
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedContact, setSelectedContact] = useState<CrmContact | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'contacts' | 'limbo'>('contacts');
  
  const [newContact, setNewContact] = useState({
    displayName: '',
    email: '',
    phone: '',
    city: '',
    country: '',
  });

  const { data: contactsData, isLoading: contactsLoading } = useQuery({
    queryKey: ['/api/crm/contacts', activeClientId],
    queryFn: async () => {
      const res = await fetch(`/api/crm/contacts?brandId=${activeClientId}`);
      if (!res.ok) throw new Error('Failed to fetch contacts');
      return res.json();
    },
    enabled: !!activeClientId,
  });

  const { data: limboData, isLoading: limboLoading } = useQuery({
    queryKey: ['/api/crm/limbo', activeClientId],
    queryFn: async () => {
      const res = await fetch(`/api/crm/limbo?brandId=${activeClientId}`);
      if (!res.ok) throw new Error('Failed to fetch limbo');
      return res.json();
    },
    enabled: !!activeClientId,
  });

  const { data: contactDetail } = useQuery({
    queryKey: ['/api/crm/contacts', selectedContact?.id],
    queryFn: async () => {
      const res = await fetch(`/api/crm/contacts/${selectedContact?.id}`);
      if (!res.ok) throw new Error('Failed to fetch contact');
      return res.json();
    },
    enabled: !!selectedContact?.id,
  });

  const createContactMutation = useMutation({
    mutationFn: async (data: typeof newContact) => {
      const res = await fetch('/api/crm/contacts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...data, brandId: activeClientId }),
      });
      if (!res.ok) throw new Error('Failed to create contact');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/crm/contacts'] });
      setIsCreateOpen(false);
      setNewContact({ displayName: '', email: '', phone: '', city: '', country: '' });
      toast.success('Contacto creado');
    },
    onError: () => {
      toast.error('Error al crear contacto');
    },
  });

  const promoteMutation = useMutation({
    mutationFn: async (limboId: string) => {
      const res = await fetch(`/api/crm/limbo/${limboId}/promote`, {
        method: 'POST',
      });
      if (!res.ok) throw new Error('Failed to promote');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/crm/contacts'] });
      queryClient.invalidateQueries({ queryKey: ['/api/crm/limbo'] });
      toast.success('Contacto promovido');
    },
    onError: () => {
      toast.error('Error al promover contacto');
    },
  });

  const contacts: CrmContact[] = contactsData?.contacts || [];
  const limboEntries: LimboEntry[] = limboData?.entries || [];
  const channels: CrmChannel[] = contactDetail?.channels || [];

  const filteredContacts = contacts.filter(c => 
    !searchQuery || 
    c.displayName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.phone?.includes(searchQuery)
  );

  const filteredLimbo = limboEntries.filter(e => 
    !searchQuery || 
    e.username?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleContactClick = (contact: CrmContact) => {
    setSelectedContact(contact);
    setIsDetailOpen(true);
  };

  return (
    <div className="flex flex-col h-full bg-white">
      {/* Header - Clean, minimal */}
      <div className="border-b px-6 py-4">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-xl font-semibold text-gray-900" data-testid="crm-title">Contactos</h1>
          <Button 
            onClick={() => setIsCreateOpen(true)}
            size="sm"
            className="h-8 px-3 text-sm"
            data-testid="button-create-contact"
          >
            <Plus className="h-4 w-4 mr-1.5" />
            Nuevo contacto
          </Button>
        </div>
        
        {/* Tabs + Search */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-0.5">
            <button
              onClick={() => setActiveTab('contacts')}
              className={cn(
                "px-3 py-1.5 text-sm font-medium rounded-md transition-colors",
                activeTab === 'contacts' 
                  ? "bg-white text-gray-900" 
                  : "text-gray-600 hover:text-gray-900"
              )}
              data-testid="tab-contacts"
            >
              Contactos
              <span className="ml-1.5 text-xs text-gray-500">({contacts.length})</span>
            </button>
            <button
              onClick={() => setActiveTab('limbo')}
              className={cn(
                "px-3 py-1.5 text-sm font-medium rounded-md transition-colors",
                activeTab === 'limbo' 
                  ? "bg-white text-gray-900" 
                  : "text-gray-600 hover:text-gray-900"
              )}
              data-testid="tab-limbo"
            >
              Pendientes
              <span className="ml-1.5 text-xs text-gray-500">({limboEntries.length})</span>
            </button>
          </div>
          
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Buscar contactos..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 h-9 border-gray-200 focus:border-gray-300 focus:ring-0"
              data-testid="input-search-contacts"
            />
          </div>
        </div>
      </div>

      {/* Table - Airtable/Twenty style */}
      <div className="flex-1 overflow-hidden">
        {activeTab === 'contacts' ? (
          <ScrollArea className="h-full">
            {contactsLoading ? (
              <div className="flex items-center justify-center h-64">
                <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
              </div>
            ) : filteredContacts.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-64 text-gray-500">
                <User className="h-12 w-12 mb-3 text-gray-300" />
                <p className="text-sm">No hay contactos</p>
                <p className="text-xs text-gray-400 mt-1">Los contactos se crean automáticamente cuando alguien te escribe por DM</p>
              </div>
            ) : (
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200 sticky top-0">
                  <tr>
                    <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Nombre</th>
                    <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Canales</th>
                    <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Estado</th>
                    <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Etapa</th>
                    <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Mensajes</th>
                    <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Última actividad</th>
                    <th className="w-10"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filteredContacts.map((contact) => (
                    <tr 
                      key={contact.id}
                      onClick={() => handleContactClick(contact)}
                      className="hover:bg-gray-50 cursor-pointer transition-colors"
                      data-testid={`row-contact-${contact.id}`}
                    >
                      <td className="px-6 py-3">
                        <div className="flex items-center gap-3">
                          <Avatar className="h-8 w-8">
                            <AvatarFallback className="bg-gray-100 text-gray-600 text-xs font-medium">
                              {(contact.displayName || '?')[0].toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="text-sm font-medium text-gray-900">{contact.displayName || 'Sin nombre'}</p>
                            {contact.email && (
                              <p className="text-xs text-gray-500">{contact.email}</p>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-3">
                        <div className="flex items-center gap-1">
                          {contact.platforms?.map((platform, i) => (
                            <span key={i} className="p-1">
                              {getPlatformIcon(platform)}
                            </span>
                          ))}
                          {(!contact.platforms || contact.platforms.length === 0) && (
                            <span className="text-xs text-gray-400">—</span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-3">
                        <StatusBadge status={contact.status} />
                      </td>
                      <td className="px-6 py-3">
                        <LifecycleBadge stage={contact.lifecycleStage} />
                      </td>
                      <td className="px-6 py-3">
                        <span className="text-sm text-gray-600">{contact.totalMessages || 0}</span>
                      </td>
                      <td className="px-6 py-3">
                        <span className="text-sm text-gray-500">
                          {contact.lastInteractionAt 
                            ? formatDistanceToNow(new Date(contact.lastInteractionAt), { addSuffix: true, locale: es })
                            : '—'
                          }
                        </span>
                      </td>
                      <td className="px-6 py-3">
                        <ChevronRight className="h-4 w-4 text-gray-400" />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </ScrollArea>
        ) : (
          /* Limbo Tab */
          <ScrollArea className="h-full">
            {limboLoading ? (
              <div className="flex items-center justify-center h-64">
                <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
              </div>
            ) : filteredLimbo.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-64 text-gray-500">
                <MessageSquare className="h-12 w-12 mb-3 text-gray-300" />
                <p className="text-sm">No hay comentaristas pendientes</p>
                <p className="text-xs text-gray-400 mt-1">Los usuarios que comentan aparecen aquí hasta que te escriban por DM</p>
              </div>
            ) : (
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200 sticky top-0">
                  <tr>
                    <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Usuario</th>
                    <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Plataforma</th>
                    <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Interacciones</th>
                    <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Última actividad</th>
                    <th className="w-32"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filteredLimbo.map((entry) => (
                    <tr 
                      key={entry.id}
                      className="hover:bg-gray-50"
                      data-testid={`row-limbo-${entry.id}`}
                    >
                      <td className="px-6 py-3">
                        <div className="flex items-center gap-3">
                          <Avatar className="h-8 w-8">
                            <AvatarFallback className="bg-gray-100 text-gray-600 text-xs font-medium">
                              {(entry.username || '?')[0].toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <p className="text-sm font-medium text-gray-900">{entry.username || 'Desconocido'}</p>
                        </div>
                      </td>
                      <td className="px-6 py-3">
                        <div className="flex items-center gap-2">
                          {getPlatformIcon(entry.platform)}
                          <span className="text-sm text-gray-600 capitalize">{entry.platform}</span>
                        </div>
                      </td>
                      <td className="px-6 py-3">
                        <span className="text-sm text-gray-600">{entry.interactionCount || 1}</span>
                      </td>
                      <td className="px-6 py-3">
                        <span className="text-sm text-gray-500">
                          {entry.lastInteractionAt 
                            ? formatDistanceToNow(new Date(entry.lastInteractionAt), { addSuffix: true, locale: es })
                            : '—'
                          }
                        </span>
                      </td>
                      <td className="px-6 py-3">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => promoteMutation.mutate(entry.id)}
                          disabled={promoteMutation.isPending}
                          className="h-7 text-xs"
                          data-testid={`button-promote-${entry.id}`}
                        >
                          {promoteMutation.isPending ? (
                            <Loader2 className="h-3 w-3 animate-spin" />
                          ) : (
                            'Promover'
                          )}
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </ScrollArea>
        )}
      </div>

      {/* Contact Detail Slide-over */}
      {isDetailOpen && selectedContact && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div 
            className="absolute inset-0 bg-black/20"
            onClick={() => setIsDetailOpen(false)}
          />
          <div className="relative w-full max-w-md bg-white border-l animate-in slide-in-from-right duration-200">
            <div className="flex items-center justify-between px-6 py-4 border-b">
              <h2 className="text-lg font-semibold text-gray-900">Detalle del contacto</h2>
              <Button 
                variant="ghost" 
                size="icon"
                onClick={() => setIsDetailOpen(false)}
                className="h-8 w-8"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
            
            <ScrollArea className="h-[calc(100vh-65px)]">
              <div className="p-6 space-y-6">
                {/* Profile */}
                <div className="flex items-center gap-4">
                  <Avatar className="h-16 w-16">
                    <AvatarFallback className="bg-gray-100 text-gray-600 text-xl font-medium">
                      {(selectedContact.displayName || '?')[0].toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">{selectedContact.displayName || 'Sin nombre'}</h3>
                    <div className="flex items-center gap-2 mt-1">
                      <StatusBadge status={selectedContact.status} />
                      <LifecycleBadge stage={selectedContact.lifecycleStage} />
                    </div>
                  </div>
                </div>

                {/* Contact Info */}
                <div className="space-y-3">
                  <h4 className="text-xs font-medium text-gray-500 uppercase tracking-wider">Información</h4>
                  
                  {selectedContact.email && (
                    <div className="flex items-center gap-3 text-sm">
                      <Mail className="h-4 w-4 text-gray-400" />
                      <span className="text-gray-900">{selectedContact.email}</span>
                    </div>
                  )}
                  
                  {selectedContact.phone && (
                    <div className="flex items-center gap-3 text-sm">
                      <Phone className="h-4 w-4 text-gray-400" />
                      <span className="text-gray-900">{selectedContact.phone}</span>
                    </div>
                  )}
                  
                  {(selectedContact.city || selectedContact.country) && (
                    <div className="flex items-center gap-3 text-sm">
                      <MapPin className="h-4 w-4 text-gray-400" />
                      <span className="text-gray-900">
                        {[selectedContact.city, selectedContact.country].filter(Boolean).join(', ')}
                      </span>
                    </div>
                  )}
                </div>

                {/* Channels */}
                {channels.length > 0 && (
                  <div className="space-y-3">
                    <h4 className="text-xs font-medium text-gray-500 uppercase tracking-wider">Canales conectados</h4>
                    <div className="space-y-2">
                      {channels.map((channel) => (
                        <div 
                          key={channel.id}
                          className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                        >
                          <div className="flex items-center gap-3">
                            {getPlatformIcon(channel.platform)}
                            <div>
                              <p className="text-sm font-medium text-gray-900">{channel.username || channel.externalId}</p>
                              <p className="text-xs text-gray-500 capitalize">{channel.platform}</p>
                            </div>
                          </div>
                          <span className="text-xs text-gray-500">{channel.messageCount} msgs</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Custom Fields */}
                {selectedContact.customFields && Object.keys(selectedContact.customFields).length > 0 && (
                  <div className="space-y-3">
                    <h4 className="text-xs font-medium text-gray-500 uppercase tracking-wider">Campos personalizados</h4>
                    <div className="space-y-2">
                      {Object.entries(selectedContact.customFields).map(([key, value]) => (
                        <div key={key} className="flex items-center justify-between text-sm">
                          <span className="text-gray-500 capitalize">{key.replace(/_/g, ' ')}</span>
                          <span className="text-gray-900">{String(value)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Stats */}
                <div className="space-y-3">
                  <h4 className="text-xs font-medium text-gray-500 uppercase tracking-wider">Actividad</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-3 bg-gray-50 rounded-lg">
                      <p className="text-2xl font-semibold text-gray-900">{selectedContact.conversationCount || 0}</p>
                      <p className="text-xs text-gray-500">Conversaciones</p>
                    </div>
                    <div className="p-3 bg-gray-50 rounded-lg">
                      <p className="text-2xl font-semibold text-gray-900">{selectedContact.totalMessages || 0}</p>
                      <p className="text-xs text-gray-500">Mensajes</p>
                    </div>
                  </div>
                </div>
              </div>
            </ScrollArea>
          </div>
        </div>
      )}

      {/* Create Contact Dialog */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Nuevo contacto</DialogTitle>
            <DialogDescription>
              Crea un contacto manualmente. Los contactos también se crean automáticamente cuando alguien te escribe por DM.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="displayName">Nombre *</Label>
              <Input
                id="displayName"
                value={newContact.displayName}
                onChange={(e) => setNewContact({ ...newContact, displayName: e.target.value })}
                placeholder="Nombre del contacto"
                data-testid="input-new-displayName"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={newContact.email}
                onChange={(e) => setNewContact({ ...newContact, email: e.target.value })}
                placeholder="email@ejemplo.com"
                data-testid="input-new-email"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Teléfono</Label>
              <Input
                id="phone"
                value={newContact.phone}
                onChange={(e) => setNewContact({ ...newContact, phone: e.target.value })}
                placeholder="+1 234 567 890"
                data-testid="input-new-phone"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="city">Ciudad</Label>
                <Input
                  id="city"
                  value={newContact.city}
                  onChange={(e) => setNewContact({ ...newContact, city: e.target.value })}
                  placeholder="Ciudad"
                  data-testid="input-new-city"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="country">País</Label>
                <Input
                  id="country"
                  value={newContact.country}
                  onChange={(e) => setNewContact({ ...newContact, country: e.target.value })}
                  placeholder="País"
                  data-testid="input-new-country"
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreateOpen(false)}>
              Cancelar
            </Button>
            <Button 
              onClick={() => createContactMutation.mutate(newContact)}
              disabled={!newContact.displayName || createContactMutation.isPending}
              data-testid="button-submit-contact"
            >
              {createContactMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : null}
              Crear contacto
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
