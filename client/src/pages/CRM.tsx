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
  Loader2,
  Clock,
  ArrowUpRight,
  Inbox,
  AlertTriangle,
  GitMerge,
  Undo2,
  ArrowRight,
  Trash2,
  History,
  Download,
  Calendar
} from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { useLocation } from 'wouter';
import { format, formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';
import { cn } from "@/lib/utils";
import { FaInstagram, FaFacebook, FaTiktok, FaYoutube, FaTwitter, FaLinkedin } from 'react-icons/fa';
import { ConversationTimeline } from '@/components/ConversationTimeline';
import { ExtractedDataSection } from '@/components/ExtractedDataSection';
import { useAuth } from '@/context/AuthContext';
import { Link2, Copy, RefreshCw, XCircle, Check } from 'lucide-react';

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
  customFields?: Record<string, any>;
}

interface DuplicatePair {
  contact1: CrmContact;
  contact2: CrmContact;
  matchType: 'email' | 'phone';
  matchValue: string;
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

interface TimelineMessage {
  id: string;
  content: string;
  author: string;
  timestamp: string;
  direction: string;
  platform: string;
  conversationPlatform: string;
  conversationType: string;
}

function PublicLinkManager({ brandId }: { brandId: string }) {
  const queryClient = useQueryClient();
  const [copied, setCopied] = useState(false);

  const { data: tokenData, isLoading } = useQuery({
    queryKey: ['public-access-token', brandId],
    queryFn: async () => {
      const res = await fetch(`/api/public-access-tokens/${brandId}`);
      if (!res.ok) throw new Error('Failed to fetch token');
      return res.json();
    },
    enabled: !!brandId,
  });

  const generateMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch('/api/public-access-tokens', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ brandId }),
      });
      if (!res.ok) throw new Error('Failed to generate token');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['public-access-token', brandId] });
      toast.success('Link generado correctamente');
    },
    onError: () => toast.error('Error al generar el link'),
  });

  const revokeMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/public-access-tokens/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to revoke');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['public-access-token', brandId] });
      toast.success('Link revocado');
    },
    onError: () => toast.error('Error al revocar el link'),
  });

  const activeToken = tokenData?.token;
  const publicUrl = activeToken ? `${window.location.origin}/public/contacts/${activeToken.token}` : '';

  const handleCopy = () => {
    navigator.clipboard.writeText(publicUrl);
    setCopied(true);
    toast.success('Link copiado al portapapeles');
    setTimeout(() => setCopied(false), 2000);
  };

  if (isLoading) return null;

  return (
    <div className="border rounded-lg p-3 bg-gray-50" data-testid="public-link-section">
      <div className="flex items-center gap-2 mb-2">
        <Link2 className="h-4 w-4 text-indigo-500" />
        <span className="text-sm font-medium text-gray-700">Link de acceso para vendedores</span>
      </div>
      {activeToken ? (
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2">
          <div className="flex-1 min-w-0">
            <div className="text-xs text-gray-500 truncate bg-white border rounded px-2 py-1.5 font-mono" data-testid="text-public-link">
              {publicUrl}
            </div>
            <span className="text-[10px] text-gray-400 mt-1 block">
              Creado {format(new Date(activeToken.createdAt), "d MMM yyyy, HH:mm", { locale: es })}
            </span>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <Button variant="outline" size="sm" className="h-7 px-2 text-xs" onClick={handleCopy} data-testid="button-copy-link">
              {copied ? <Check className="h-3.5 w-3.5 text-green-500" /> : <Copy className="h-3.5 w-3.5" />}
            </Button>
            <Button 
              variant="outline" 
              size="sm" 
              className="h-7 px-2 text-xs" 
              onClick={() => generateMutation.mutate()}
              disabled={generateMutation.isPending}
              data-testid="button-regenerate-link"
            >
              <RefreshCw className={cn("h-3.5 w-3.5", generateMutation.isPending && "animate-spin")} />
            </Button>
            <Button 
              variant="outline" 
              size="sm" 
              className="h-7 px-2 text-xs text-red-600 hover:text-red-700 hover:bg-red-50" 
              onClick={() => revokeMutation.mutate(activeToken.id)}
              disabled={revokeMutation.isPending}
              data-testid="button-revoke-link"
            >
              <XCircle className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      ) : (
        <Button 
          variant="outline" 
          size="sm" 
          className="h-8 text-xs"
          onClick={() => generateMutation.mutate()}
          disabled={generateMutation.isPending}
          data-testid="button-generate-link"
        >
          {generateMutation.isPending ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />
          ) : (
            <Link2 className="h-3.5 w-3.5 mr-1.5" />
          )}
          Generar link de acceso
        </Button>
      )}
    </div>
  );
}

export function CRM() {
  const { activeClientId } = useNexus();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [, navigate] = useLocation();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedContact, setSelectedContact] = useState<CrmContact | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [selectedLimbo, setSelectedLimbo] = useState<LimboEntry | null>(null);
  const [isLimboDetailOpen, setIsLimboDetailOpen] = useState(false);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'contacts' | 'limbo' | 'duplicates'>('contacts');
  const [detailTab, setDetailTab] = useState<'profile' | 'history' | 'journey'>('profile');
  const [isMergeOpen, setIsMergeOpen] = useState(false);
  const [selectedDuplicate, setSelectedDuplicate] = useState<DuplicatePair | null>(null);
  const [primarySelection, setPrimarySelection] = useState<'contact1' | 'contact2'>('contact1');
  const [lastMergedId, setLastMergedId] = useState<string | null>(null);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [contactToDelete, setContactToDelete] = useState<CrmContact | null>(null);
  const [filterPlatform, setFilterPlatform] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterLifecycle, setFilterLifecycle] = useState<string>('all');
  const [filterLimboPlatform, setFilterLimboPlatform] = useState<string>('all');
  const [filterDuplicatesPlatform, setFilterDuplicatesPlatform] = useState<string>('all');
  const [filterDuplicatesMatchType, setFilterDuplicatesMatchType] = useState<string>('all');
  const [filterHasPhone, setFilterHasPhone] = useState<string>('all');
  const [filterDateType, setFilterDateType] = useState<string>('last');
  const [filterDateFrom, setFilterDateFrom] = useState<string>('');
  const [filterDateTo, setFilterDateTo] = useState<string>('');
  
  const [newContact, setNewContact] = useState({
    displayName: '',
    email: '',
    phone: '',
    city: '',
    country: '',
  });

  const buildFilterParams = () => {
    const params = new URLSearchParams();
    params.set('brandId', activeClientId || '');
    if (filterStatus !== 'all') params.set('status', filterStatus);
    if (filterLifecycle !== 'all') params.set('lifecycleStage', filterLifecycle);
    if (filterPlatform !== 'all') params.set('platform', filterPlatform);
    if (filterHasPhone === 'yes') params.set('hasPhone', 'true');
    else if (filterHasPhone === 'no') params.set('hasPhone', 'false');
    if (filterDateFrom) {
      if (filterDateType === 'first') params.set('firstInteractionFrom', filterDateFrom);
      else params.set('lastInteractionFrom', filterDateFrom);
    }
    if (filterDateTo) {
      if (filterDateType === 'first') params.set('firstInteractionTo', filterDateTo);
      else params.set('lastInteractionTo', filterDateTo);
    }
    return params.toString();
  };

  const { data: contactsData, isLoading: contactsLoading } = useQuery({
    queryKey: ['/api/crm/contacts', activeClientId, filterStatus, filterLifecycle, filterPlatform, filterHasPhone, filterDateType, filterDateFrom, filterDateTo],
    queryFn: async () => {
      const res = await fetch(`/api/crm/contacts?${buildFilterParams()}`);
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

  const { data: duplicatesData, isLoading: duplicatesLoading } = useQuery({
    queryKey: ['/api/crm/duplicates', activeClientId],
    queryFn: async () => {
      const res = await fetch(`/api/crm/duplicates?brandId=${activeClientId}`);
      if (!res.ok) throw new Error('Failed to fetch duplicates');
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

  const { data: timelineData, isLoading: timelineLoading } = useQuery({
    queryKey: ['/api/crm/contacts', selectedContact?.id, 'timeline'],
    queryFn: async () => {
      const res = await fetch(`/api/crm/contacts/${selectedContact?.id}/timeline?limit=100`);
      if (!res.ok) throw new Error('Failed to fetch timeline');
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

  const mergeMutation = useMutation({
    mutationFn: async ({ primaryId, secondaryId }: { primaryId: string; secondaryId: string }) => {
      const res = await fetch('/api/crm/merge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ primaryId, secondaryId }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to merge');
      }
      return res.json();
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['/api/crm/contacts'] });
      queryClient.invalidateQueries({ queryKey: ['/api/crm/duplicates'] });
      setIsMergeOpen(false);
      setSelectedDuplicate(null);
      const archivedId = variables.secondaryId;
      setLastMergedId(archivedId);
      toast.success(`Contactos fusionados: ${data.mergedChannels} canales, ${data.mergedConversations} conversaciones movidas`, {
        action: {
          label: 'Deshacer',
          onClick: () => {
            if (archivedId) {
              undoMergeMutation.mutate(archivedId);
            }
          },
        },
        duration: 15000,
      });
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Error al fusionar contactos');
    },
  });

  const undoMergeMutation = useMutation({
    mutationFn: async (archivedContactId: string) => {
      const res = await fetch('/api/crm/undo-merge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ archivedContactId }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to undo merge');
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/crm/contacts'] });
      queryClient.invalidateQueries({ queryKey: ['/api/crm/duplicates'] });
      setLastMergedId(null);
      toast.success('Fusion deshecha correctamente');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Error al deshacer fusion');
    },
  });

  const deleteContactMutation = useMutation({
    mutationFn: async ({ id, permanent }: { id: string; permanent?: boolean }) => {
      const url = permanent ? `/api/crm/contacts/${id}?permanent=true` : `/api/crm/contacts/${id}`;
      const res = await fetch(url, { method: 'DELETE' });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to delete');
      }
      return res.json();
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['/api/crm/contacts'] });
      queryClient.invalidateQueries({ queryKey: ['/api/crm/duplicates'] });
      setIsDeleteOpen(false);
      setContactToDelete(null);
      toast.success(variables.permanent ? 'Contacto eliminado permanentemente' : 'Contacto archivado');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Error al eliminar contacto');
    },
  });

  const contacts: CrmContact[] = contactsData?.contacts || [];
  const limboEntries: LimboEntry[] = limboData?.entries || [];
  const duplicates: DuplicatePair[] = duplicatesData?.duplicates || [];
  const channels: CrmChannel[] = contactDetail?.channels || [];
  const timelineMessages: TimelineMessage[] = timelineData?.messages || [];
  const mostRecentConversationId: string | null = timelineData?.mostRecentConversationId || null;

  const handleOpenInInbox = () => {
    if (mostRecentConversationId) {
      navigate(`/inbox?conversationId=${mostRecentConversationId}`);
    } else {
      toast.error('No hay conversaciones para este contacto');
    }
  };

  const filteredContacts = contacts.filter(c => {
    const matchesSearch = !searchQuery || 
      c.displayName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.phone?.includes(searchQuery);
    
    return matchesSearch;
  });
  
  const hasActiveContactFilters = filterPlatform !== 'all' || filterStatus !== 'all' || filterLifecycle !== 'all' || filterHasPhone !== 'all' || filterDateFrom !== '' || filterDateTo !== '';
  const hasActiveLimboFilters = filterLimboPlatform !== 'all';
  const hasActiveDuplicateFilters = filterDuplicatesPlatform !== 'all' || filterDuplicatesMatchType !== 'all';
  
  const clearContactFilters = () => {
    setFilterPlatform('all');
    setFilterStatus('all');
    setFilterLifecycle('all');
    setFilterHasPhone('all');
    setFilterDateFrom('');
    setFilterDateTo('');
    setFilterDateType('last');
  };

  const handleDownloadCsv = () => {
    const params = buildFilterParams();
    const url = `/api/crm/contacts/export?${params}`;
    const a = document.createElement('a');
    a.href = url;
    a.download = '';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };
  
  const clearLimboFilters = () => {
    setFilterLimboPlatform('all');
  };
  
  const clearDuplicateFilters = () => {
    setFilterDuplicatesPlatform('all');
    setFilterDuplicatesMatchType('all');
  };

  const filteredLimbo = limboEntries.filter(e => {
    const matchesSearch = !searchQuery || 
      e.username?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesPlatform = filterLimboPlatform === 'all' || 
      e.platform?.toLowerCase() === filterLimboPlatform.toLowerCase();
    return matchesSearch && matchesPlatform;
  });
  
  const filteredDuplicates = duplicates.filter(pair => {
    const matchesPlatform = filterDuplicatesPlatform === 'all' || 
      pair.contact1.platforms?.some(p => p.toLowerCase() === filterDuplicatesPlatform.toLowerCase()) ||
      pair.contact2.platforms?.some(p => p.toLowerCase() === filterDuplicatesPlatform.toLowerCase());
    const matchesType = filterDuplicatesMatchType === 'all' || pair.matchType === filterDuplicatesMatchType;
    return matchesPlatform && matchesType;
  });

  const handleContactClick = (contact: CrmContact) => {
    setSelectedContact(contact);
    setIsDetailOpen(true);
  };

  return (
    <div className="flex flex-col h-full bg-white">
      {/* Header - Clean, minimal - Responsive */}
      <div className="border-b px-3 sm:px-6 py-3 sm:py-4">
        <div className="flex items-center justify-between mb-3 sm:mb-4">
          <h1 className="text-lg sm:text-xl font-semibold text-gray-900" data-testid="crm-title">Contactos</h1>
          <Button 
            onClick={() => setIsCreateOpen(true)}
            size="sm"
            className="h-8 px-2 sm:px-3 text-xs sm:text-sm"
            data-testid="button-create-contact"
          >
            <Plus className="h-4 w-4 sm:mr-1.5" />
            <span className="hidden sm:inline">Nuevo contacto</span>
          </Button>
        </div>

        {user?.role === 'admin' && activeClientId && (
          <div className="mb-3 sm:mb-4">
            <PublicLinkManager brandId={activeClientId} />
          </div>
        )}
        
        {/* Tabs + Search - Responsive */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4">
          {/* Tabs - scrollable on mobile */}
          <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-0.5 overflow-x-auto no-scrollbar">
            <button
              onClick={() => setActiveTab('contacts')}
              className={cn(
                "px-2.5 sm:px-3 py-1.5 text-xs sm:text-sm font-medium rounded-md transition-colors whitespace-nowrap",
                activeTab === 'contacts' 
                  ? "bg-white text-gray-900 shadow-sm" 
                  : "text-gray-600 hover:text-gray-900"
              )}
              data-testid="tab-contacts"
            >
              Contactos
              <span className="ml-1 text-xs text-gray-500">({contacts.length})</span>
            </button>
            <button
              onClick={() => setActiveTab('limbo')}
              className={cn(
                "px-2.5 sm:px-3 py-1.5 text-xs sm:text-sm font-medium rounded-md transition-colors whitespace-nowrap",
                activeTab === 'limbo' 
                  ? "bg-white text-gray-900 shadow-sm" 
                  : "text-gray-600 hover:text-gray-900"
              )}
              data-testid="tab-limbo"
            >
              Pendientes
              <span className="ml-1 text-xs text-gray-500">({limboEntries.length})</span>
            </button>
            <button
              onClick={() => setActiveTab('duplicates')}
              className={cn(
                "px-2.5 sm:px-3 py-1.5 text-xs sm:text-sm font-medium rounded-md transition-colors flex items-center gap-1 whitespace-nowrap",
                activeTab === 'duplicates' 
                  ? "bg-white text-amber-700 shadow-sm" 
                  : duplicates.length > 0 
                    ? "text-amber-600 hover:text-amber-700"
                    : "text-gray-500 hover:text-gray-700"
              )}
              data-testid="tab-duplicates"
            >
              {duplicates.length > 0 && <AlertTriangle className="h-3.5 w-3.5" />}
              {duplicates.length === 0 && <GitMerge className="h-3.5 w-3.5" />}
              <span className="hidden xs:inline">Duplicados</span>
              <span className="xs:hidden">Dup.</span>
              {duplicates.length > 0 && <span className="text-xs bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded-full">{duplicates.length}</span>}
            </button>
          </div>
          
          {/* Search - full width on mobile */}
          <div className="relative flex-1 sm:max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Buscar..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 h-9 sm:h-8 bg-white border-gray-200 shadow-none focus:border-gray-300 focus:ring-0"
              data-testid="input-search-contacts"
            />
          </div>
          
          {activeTab === 'contacts' && (
            <div className="bg-gray-50 rounded-lg border border-gray-100 p-3 mt-1">
              <div className="flex items-center justify-between mb-2.5">
                <div className="flex items-center gap-1.5">
                  <Filter className="h-3.5 w-3.5 text-gray-400" />
                  <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">Filtros</span>
                  {hasActiveContactFilters && (
                    <span className="bg-indigo-100 text-indigo-700 text-[10px] font-medium px-1.5 py-0.5 rounded-full">Activos</span>
                  )}
                </div>
                <div className="flex items-center gap-1.5">
                  {hasActiveContactFilters && (
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={clearContactFilters}
                      className="h-7 px-2 text-xs text-gray-500 hover:text-gray-700"
                      data-testid="button-clear-filters"
                    >
                      <X className="h-3 w-3 mr-1" />
                      Limpiar
                    </Button>
                  )}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleDownloadCsv}
                    className="h-7 px-2.5 text-xs bg-white border-gray-200 shadow-none"
                    data-testid="button-download-csv"
                  >
                    <Download className="h-3.5 w-3.5 mr-1.5" />
                    CSV
                  </Button>
                </div>
              </div>

              <div className="flex flex-wrap items-end gap-2">
                <div className="space-y-1 w-[calc(50%-4px)] sm:w-auto sm:min-w-[120px] sm:flex-1">
                  <label className="text-[11px] font-medium text-gray-500 pl-0.5">Plataforma</label>
                  <Select value={filterPlatform} onValueChange={setFilterPlatform}>
                    <SelectTrigger className="h-8 w-full text-xs bg-white border-gray-200 shadow-none" data-testid="select-filter-platform">
                      <SelectValue placeholder="Todas" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todas</SelectItem>
                      <SelectItem value="instagram">Instagram</SelectItem>
                      <SelectItem value="facebook">Facebook</SelectItem>
                      <SelectItem value="tiktok">TikTok</SelectItem>
                      <SelectItem value="youtube">YouTube</SelectItem>
                      <SelectItem value="twitter">Twitter</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1 w-[calc(50%-4px)] sm:w-auto sm:min-w-[110px] sm:flex-1">
                  <label className="text-[11px] font-medium text-gray-500 pl-0.5">Estado</label>
                  <Select value={filterStatus} onValueChange={setFilterStatus}>
                    <SelectTrigger className="h-8 w-full text-xs bg-white border-gray-200 shadow-none" data-testid="select-filter-status">
                      <SelectValue placeholder="Todos" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos</SelectItem>
                      <SelectItem value="new">Nuevo</SelectItem>
                      <SelectItem value="lead">Lead</SelectItem>
                      <SelectItem value="active">Activo</SelectItem>
                      <SelectItem value="inactive">Inactivo</SelectItem>
                      <SelectItem value="archived">Archivado</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1 w-[calc(50%-4px)] sm:w-auto sm:min-w-[100px] sm:flex-1">
                  <label className="text-[11px] font-medium text-gray-500 pl-0.5">Etapa</label>
                  <Select value={filterLifecycle} onValueChange={setFilterLifecycle}>
                    <SelectTrigger className="h-8 w-full text-xs bg-white border-gray-200 shadow-none" data-testid="select-filter-lifecycle">
                      <SelectValue placeholder="Todas" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todas</SelectItem>
                      <SelectItem value="new">Nuevo</SelectItem>
                      <SelectItem value="lead">Lead</SelectItem>
                      <SelectItem value="customer">Cliente</SelectItem>
                      <SelectItem value="vip">VIP</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1 w-[calc(50%-4px)] sm:w-auto sm:min-w-[110px] sm:flex-1">
                  <label className="text-[11px] font-medium text-gray-500 pl-0.5">Teléfono</label>
                  <Select value={filterHasPhone} onValueChange={setFilterHasPhone}>
                    <SelectTrigger className="h-8 w-full text-xs bg-white border-gray-200 shadow-none" data-testid="select-filter-phone">
                      <SelectValue placeholder="Todos" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos</SelectItem>
                      <SelectItem value="yes">Con teléfono</SelectItem>
                      <SelectItem value="no">Sin teléfono</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="hidden sm:block w-px h-8 bg-gray-200 shrink-0" />

                <div className="space-y-1 w-full sm:w-auto sm:min-w-[150px] sm:flex-1">
                  <label className="text-[11px] font-medium text-gray-500 pl-0.5 flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    Rango de fecha
                  </label>
                  <Select value={filterDateType} onValueChange={setFilterDateType}>
                    <SelectTrigger className="h-8 w-full text-xs bg-white border-gray-200 shadow-none" data-testid="select-filter-date-type">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="last">Última interacción</SelectItem>
                      <SelectItem value="first">Primera interacción</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex items-end gap-1.5 w-full sm:w-auto">
                  <div className="space-y-1 flex-1 sm:flex-none">
                    <label className="text-[11px] font-medium text-gray-500 pl-0.5">Desde</label>
                    <input
                      type="date"
                      value={filterDateFrom}
                      onChange={(e) => setFilterDateFrom(e.target.value)}
                      className="h-8 px-2 text-xs border border-gray-200 rounded-md bg-white w-full sm:w-[130px]"
                      data-testid="input-date-from"
                    />
                  </div>
                  <span className="text-xs text-gray-400 pb-1.5">—</span>
                  <div className="space-y-1 flex-1 sm:flex-none">
                    <label className="text-[11px] font-medium text-gray-500 pl-0.5">Hasta</label>
                    <input
                      type="date"
                      value={filterDateTo}
                      onChange={(e) => setFilterDateTo(e.target.value)}
                      className="h-8 px-2 text-xs border border-gray-200 rounded-md bg-white w-full sm:w-[130px]"
                      data-testid="input-date-to"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}
          
          {activeTab === 'limbo' && (
            <div className="bg-gray-50 rounded-lg border border-gray-100 p-3 mt-1">
              <div className="flex items-center justify-between mb-2.5">
                <div className="flex items-center gap-1.5">
                  <Filter className="h-3.5 w-3.5 text-gray-400" />
                  <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">Filtros</span>
                </div>
                {hasActiveLimboFilters && (
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={clearLimboFilters}
                    className="h-7 px-2 text-xs text-gray-500 hover:text-gray-700"
                  >
                    <X className="h-3 w-3 mr-1" />
                    Limpiar
                  </Button>
                )}
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="space-y-1">
                  <label className="text-[11px] font-medium text-gray-500 pl-0.5">Plataforma</label>
                  <Select value={filterLimboPlatform} onValueChange={setFilterLimboPlatform}>
                    <SelectTrigger className="h-8 w-full text-xs bg-white border-gray-200 shadow-none">
                      <SelectValue placeholder="Todas" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todas</SelectItem>
                      <SelectItem value="instagram">Instagram</SelectItem>
                      <SelectItem value="facebook">Facebook</SelectItem>
                      <SelectItem value="tiktok">TikTok</SelectItem>
                      <SelectItem value="youtube">YouTube</SelectItem>
                      <SelectItem value="linkedin">LinkedIn</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          )}
          
          {activeTab === 'duplicates' && (
            <div className="bg-gray-50 rounded-lg border border-gray-100 p-3 mt-1">
              <div className="flex items-center justify-between mb-2.5">
                <div className="flex items-center gap-1.5">
                  <Filter className="h-3.5 w-3.5 text-gray-400" />
                  <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">Filtros</span>
                </div>
                {hasActiveDuplicateFilters && (
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={clearDuplicateFilters}
                    className="h-7 px-2 text-xs text-gray-500 hover:text-gray-700"
                  >
                    <X className="h-3 w-3 mr-1" />
                    Limpiar
                  </Button>
                )}
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="space-y-1">
                  <label className="text-[11px] font-medium text-gray-500 pl-0.5">Plataforma</label>
                  <Select value={filterDuplicatesPlatform} onValueChange={setFilterDuplicatesPlatform}>
                    <SelectTrigger className="h-8 w-full text-xs bg-white border-gray-200 shadow-none">
                      <SelectValue placeholder="Todas" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todas</SelectItem>
                      <SelectItem value="instagram">Instagram</SelectItem>
                      <SelectItem value="facebook">Facebook</SelectItem>
                      <SelectItem value="tiktok">TikTok</SelectItem>
                      <SelectItem value="youtube">YouTube</SelectItem>
                      <SelectItem value="linkedin">LinkedIn</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] font-medium text-gray-500 pl-0.5">Tipo de coincidencia</label>
                  <Select value={filterDuplicatesMatchType} onValueChange={setFilterDuplicatesMatchType}>
                    <SelectTrigger className="h-8 w-full text-xs bg-white border-gray-200 shadow-none">
                      <SelectValue placeholder="Todos" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos</SelectItem>
                      <SelectItem value="email">Email</SelectItem>
                      <SelectItem value="phone">Teléfono</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          )}
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
              <>
                {/* Mobile Card View */}
                <div className="sm:hidden divide-y divide-gray-100">
                  {filteredContacts.map((contact) => (
                    <div
                      key={contact.id}
                      onClick={() => handleContactClick(contact)}
                      className="p-3 hover:bg-gray-50 active:bg-gray-100 cursor-pointer"
                      data-testid={`card-contact-${contact.id}`}
                    >
                      <div className="flex items-start gap-3">
                        <Avatar className="h-10 w-10 shrink-0">
                          <AvatarFallback className="bg-gray-100 text-gray-600 text-sm font-medium">
                            {(contact.displayName || '?')[0].toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2">
                            <p className="text-sm font-medium text-gray-900 truncate">{contact.displayName || 'Sin nombre'}</p>
                            <div className="flex items-center gap-1 shrink-0">
                              {contact.platforms?.slice(0, 3).map((platform, i) => (
                                <span key={i}>{getPlatformIcon(platform)}</span>
                              ))}
                            </div>
                          </div>
                          <div className="flex items-center gap-2 mt-1">
                            {contact.phone && (
                              <span className="text-xs text-gray-500 font-mono">{contact.phone}</span>
                            )}
                            {contact.email && !contact.phone && (
                              <span className="text-xs text-gray-500 truncate">{contact.email}</span>
                            )}
                          </div>
                          <div className="flex items-center gap-2 mt-2">
                            <StatusBadge status={contact.status} />
                            <span className="text-xs text-gray-400">
                              {contact.totalMessages || 0} msgs
                            </span>
                            <span className="text-xs text-gray-400">
                              {contact.lastInteractionAt 
                                ? formatDistanceToNow(new Date(contact.lastInteractionAt), { addSuffix: true, locale: es })
                                : ''
                              }
                            </span>
                          </div>
                        </div>
                        <ChevronRight className="h-4 w-4 text-gray-400 shrink-0 mt-3" />
                      </div>
                    </div>
                  ))}
                </div>

                {/* Desktop Table View */}
                <table className="w-full hidden sm:table">
                  <thead className="bg-gray-50 border-b border-gray-200 sticky top-0 z-10">
                    <tr>
                      <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Nombre</th>
                      <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Teléfono</th>
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
                          {contact.phone ? (
                            <span className="text-sm text-gray-600 font-mono">{contact.phone}</span>
                          ) : (
                            <span className="text-xs text-gray-400">—</span>
                          )}
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
                        <td className="px-6 py-3" onClick={(e) => e.stopPropagation()}>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8">
                                <MoreHorizontal className="h-4 w-4 text-gray-400" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => handleContactClick(contact)}>
                                <User className="h-4 w-4 mr-2" />
                                Ver contacto
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => { setSelectedContact(contact); setIsDetailOpen(true); setDetailTab('history'); }}>
                                <History className="h-4 w-4 mr-2" />
                                Ver historial
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem 
                                onClick={() => { setContactToDelete(contact); setIsDeleteOpen(true); }}
                                className="text-red-600 focus:text-red-600"
                              >
                                <Trash2 className="h-4 w-4 mr-2" />
                                Eliminar
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </>
            )}
          </ScrollArea>
        ) : activeTab === 'limbo' ? (
          /* Limbo Tab */
          <ScrollArea className="h-full">
            {limboLoading ? (
              <div className="flex items-center justify-center h-64">
                <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
              </div>
            ) : filteredLimbo.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-64 text-gray-500">
                <MessageSquare className="h-12 w-12 mb-3 text-gray-300" />
                <p className="text-sm">{limboEntries.length === 0 ? 'No hay comentaristas pendientes' : 'No hay pendientes con estos filtros'}</p>
                <p className="text-xs text-gray-400 mt-1">{limboEntries.length === 0 ? 'Los usuarios que comentan aparecen aquí hasta que te escriban por DM' : 'Prueba ajustando los filtros'}</p>
              </div>
            ) : (
              <>
                {/* Mobile Card View for Limbo */}
                <div className="sm:hidden divide-y divide-gray-100">
                  {filteredLimbo.map((entry) => (
                    <div
                      key={entry.id}
                      onClick={() => { setSelectedLimbo(entry); setIsLimboDetailOpen(true); }}
                      className="p-3 hover:bg-gray-50 active:bg-gray-100 cursor-pointer"
                      data-testid={`card-limbo-${entry.id}`}
                    >
                      <div className="flex items-start gap-3">
                        <Avatar className="h-10 w-10 shrink-0">
                          {entry.avatarUrl ? (
                            <AvatarImage src={entry.avatarUrl} alt={entry.username || ''} />
                          ) : null}
                          <AvatarFallback className="bg-gray-100 text-gray-600 text-sm font-medium">
                            {(entry.username || '?')[0].toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2">
                            <p className="text-sm font-medium text-gray-900 truncate">{entry.username || 'Desconocido'}</p>
                            <div className="flex items-center gap-1.5 shrink-0">
                              {getPlatformIcon(entry.platform)}
                              <span className="text-xs text-gray-500 capitalize">{entry.platform}</span>
                            </div>
                          </div>
                          <div className="flex items-center gap-3 mt-1.5">
                            <span className="text-xs text-gray-500">{entry.interactionCount || 1} interacciones</span>
                            <span className="text-xs text-gray-400">
                              {entry.lastInteractionAt 
                                ? formatDistanceToNow(new Date(entry.lastInteractionAt), { addSuffix: true, locale: es })
                                : ''
                              }
                            </span>
                          </div>
                        </div>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={(e) => { e.stopPropagation(); promoteMutation.mutate(entry.id); }}
                          disabled={promoteMutation.isPending}
                          className="h-7 text-xs shrink-0"
                          data-testid={`button-promote-mobile-${entry.id}`}
                        >
                          {promoteMutation.isPending ? (
                            <Loader2 className="h-3 w-3 animate-spin" />
                          ) : (
                            <ArrowUpRight className="h-3.5 w-3.5" />
                          )}
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Desktop Table View for Limbo */}
                <table className="w-full hidden sm:table">
                  <thead className="bg-gray-50 border-b border-gray-200 sticky top-0 z-10">
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
                        className="hover:bg-gray-50 cursor-pointer"
                        onClick={() => { setSelectedLimbo(entry); setIsLimboDetailOpen(true); }}
                        data-testid={`row-limbo-${entry.id}`}
                      >
                        <td className="px-6 py-3">
                          <div className="flex items-center gap-3">
                            <Avatar className="h-8 w-8">
                              {entry.avatarUrl ? (
                                <AvatarImage src={entry.avatarUrl} alt={entry.username || ''} />
                              ) : null}
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
                        <td className="px-6 py-3" onClick={(e) => e.stopPropagation()}>
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
              </>
            )}
          </ScrollArea>
        ) : activeTab === 'duplicates' ? (
          /* Duplicates Tab */
          <ScrollArea className="h-full">
            {duplicatesLoading ? (
              <div className="flex items-center justify-center h-64">
                <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
              </div>
            ) : filteredDuplicates.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-64 text-gray-500">
                <GitMerge className="h-12 w-12 mb-3 text-gray-300" />
                <p className="text-sm">{duplicates.length === 0 ? 'No hay contactos duplicados' : 'No hay duplicados con estos filtros'}</p>
                <p className="text-xs text-gray-400 mt-1">{duplicates.length === 0 ? 'Los duplicados se detectan por email o teléfono coincidente' : 'Prueba ajustando los filtros'}</p>
              </div>
            ) : (
              <div className="p-3 sm:p-6 space-y-3 sm:space-y-4">
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 sm:p-4 flex items-start gap-2 sm:gap-3">
                  <AlertTriangle className="h-4 sm:h-5 w-4 sm:w-5 text-amber-600 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-xs sm:text-sm font-medium text-amber-800">Se detectaron {filteredDuplicates.length} posibles duplicados{hasActiveDuplicateFilters ? ' (filtrados)' : ''}</p>
                    <p className="text-xs text-amber-700 mt-1 hidden sm:block">Revisa y fusiona contactos para mantener tu CRM limpio. La fusión consolida canales, conversaciones y datos.</p>
                  </div>
                </div>
                
                <div className="space-y-3">
                  {filteredDuplicates.map((pair, index) => (
                    <div 
                      key={`${pair.contact1.id}-${pair.contact2.id}`}
                      className="border rounded-lg p-3 sm:p-4 hover:border-gray-300 transition-colors"
                      data-testid={`duplicate-pair-${index}`}
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
                        <div className="flex items-center gap-2 flex-wrap">
                          <Badge variant="outline" className="text-xs bg-amber-50 border-amber-200 text-amber-700">
                            {pair.matchType === 'email' ? <Mail className="h-3 w-3 mr-1" /> : <Phone className="h-3 w-3 mr-1" />}
                            <span className="hidden xs:inline">Coincidencia:</span> {pair.matchType === 'email' ? 'Email' : 'Tel.'}
                          </Badge>
                          <span className="text-xs font-mono text-gray-600 truncate max-w-[150px] sm:max-w-none">{pair.matchValue}</span>
                        </div>
                        <Button
                          size="sm"
                          onClick={() => {
                            setSelectedDuplicate(pair);
                            setPrimarySelection('contact1');
                            setIsMergeOpen(true);
                          }}
                          className="h-7 text-xs w-full sm:w-auto"
                          data-testid={`button-merge-${index}`}
                        >
                          <GitMerge className="h-3 w-3 mr-1" />
                          Fusionar
                        </Button>
                      </div>
                      
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                        {(() => {
                          const channels1 = (pair.contact1 as any)?.channels || [];
                          const channels2 = (pair.contact2 as any)?.channels || [];
                          return (
                            <>
                              <div className="bg-gray-50 rounded-lg p-3 flex">
                                <div className="flex-1">
                                  <div className="flex items-center gap-2 mb-2">
                                    <Avatar className="h-8 w-8">
                                      <AvatarFallback className="bg-blue-100 text-blue-600 text-sm font-medium">
                                        {(pair.contact1.displayName || '?')[0].toUpperCase()}
                                      </AvatarFallback>
                                    </Avatar>
                                    <span className="text-sm font-medium">{pair.contact1.displayName || 'Sin nombre'}</span>
                                  </div>
                                  <div className="text-xs text-gray-500 space-y-1 ml-10">
                                    {channels1.map((ch: any, i: number) => (
                                      <p key={i} className="flex items-center gap-1">
                                        {getPlatformIcon(ch.platform)}
                                        <span className="font-medium">@{ch.username}</span>
                                      </p>
                                    ))}
                                    {pair.contact1.email && <p className="flex items-center gap-1"><Mail className="h-3 w-3" /> {pair.contact1.email}</p>}
                                    {pair.contact1.phone && <p className="flex items-center gap-1"><Phone className="h-3 w-3" /> {pair.contact1.phone}</p>}
                                    <p className="text-gray-400 pt-1">{pair.contact1.conversationCount || 0} conversaciones</p>
                                  </div>
                                </div>
                                <div className="flex flex-col gap-1 ml-2">
                                  <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                      <Button variant="ghost" size="icon" className="h-7 w-7">
                                        <MoreHorizontal className="h-4 w-4 text-gray-400" />
                                      </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end">
                                      <DropdownMenuItem onClick={() => { setSelectedContact(pair.contact1); setIsDetailOpen(true); }}>
                                        <User className="h-4 w-4 mr-2" />
                                        Ver contacto
                                      </DropdownMenuItem>
                                      <DropdownMenuItem onClick={() => { setSelectedContact(pair.contact1); setIsDetailOpen(true); setDetailTab('history'); }}>
                                        <History className="h-4 w-4 mr-2" />
                                        Ver historial
                                      </DropdownMenuItem>
                                      <DropdownMenuSeparator />
                                      <DropdownMenuItem 
                                        onClick={() => { setContactToDelete(pair.contact1); setIsDeleteOpen(true); }}
                                        className="text-red-600 focus:text-red-600"
                                      >
                                        <Trash2 className="h-4 w-4 mr-2" />
                                        Eliminar
                                      </DropdownMenuItem>
                                    </DropdownMenuContent>
                                  </DropdownMenu>
                                </div>
                              </div>
                              
                              <div className="bg-gray-50 rounded-lg p-3 flex">
                                <div className="flex-1">
                                  <div className="flex items-center gap-2 mb-2">
                                    <Avatar className="h-8 w-8">
                                      <AvatarFallback className="bg-green-100 text-green-600 text-sm font-medium">
                                        {(pair.contact2.displayName || '?')[0].toUpperCase()}
                                      </AvatarFallback>
                                    </Avatar>
                                    <span className="text-sm font-medium">{pair.contact2.displayName || 'Sin nombre'}</span>
                                  </div>
                                  <div className="text-xs text-gray-500 space-y-1 ml-10">
                                    {channels2.map((ch: any, i: number) => (
                                      <p key={i} className="flex items-center gap-1">
                                        {getPlatformIcon(ch.platform)}
                                        <span className="font-medium">@{ch.username}</span>
                                      </p>
                                    ))}
                                    {pair.contact2.email && <p className="flex items-center gap-1"><Mail className="h-3 w-3" /> {pair.contact2.email}</p>}
                                    {pair.contact2.phone && <p className="flex items-center gap-1"><Phone className="h-3 w-3" /> {pair.contact2.phone}</p>}
                                    <p className="text-gray-400 pt-1">{pair.contact2.conversationCount || 0} conversaciones</p>
                                  </div>
                                </div>
                                <div className="flex flex-col gap-1 ml-2">
                                  <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                      <Button variant="ghost" size="icon" className="h-7 w-7">
                                        <MoreHorizontal className="h-4 w-4 text-gray-400" />
                                      </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end">
                                      <DropdownMenuItem onClick={() => { setSelectedContact(pair.contact2); setIsDetailOpen(true); }}>
                                        <User className="h-4 w-4 mr-2" />
                                        Ver contacto
                                      </DropdownMenuItem>
                                      <DropdownMenuItem onClick={() => { setSelectedContact(pair.contact2); setIsDetailOpen(true); setDetailTab('history'); }}>
                                        <History className="h-4 w-4 mr-2" />
                                        Ver historial
                                      </DropdownMenuItem>
                                      <DropdownMenuSeparator />
                                      <DropdownMenuItem 
                                        onClick={() => { setContactToDelete(pair.contact2); setIsDeleteOpen(true); }}
                                        className="text-red-600 focus:text-red-600"
                                      >
                                        <Trash2 className="h-4 w-4 mr-2" />
                                        Eliminar
                                      </DropdownMenuItem>
                                    </DropdownMenuContent>
                                  </DropdownMenu>
                                </div>
                              </div>
                            </>
                          );
                        })()}
                      </div>
                      
                      <div className="mt-3 pt-3 border-t border-gray-100">
                        <p className="text-xs text-gray-500">
                          <span className="font-medium text-gray-600">¿Por qué son duplicados?</span> Ambos contactos comparten el mismo {pair.matchType === 'email' ? 'email' : 'teléfono'}: <span className="font-mono text-gray-700">{pair.matchValue}</span>
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </ScrollArea>
        ) : null}
      </div>

      {/* Contact Detail Slide-over - Full screen on mobile */}
      {isDetailOpen && selectedContact && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div 
            className="absolute inset-0 bg-black/20 hidden sm:block"
            onClick={() => { setIsDetailOpen(false); setDetailTab('profile'); }}
          />
          <div className="relative w-full sm:max-w-md bg-white sm:border-l animate-in slide-in-from-right sm:slide-in-from-right duration-200 flex flex-col">
            {/* Header with close button and action */}
            <div className="flex items-center justify-between px-4 sm:px-6 py-3 sm:py-4 border-b shrink-0">
              <div className="flex items-center gap-2">
                <Button 
                  variant="ghost" 
                  size="icon"
                  onClick={() => { setIsDetailOpen(false); setDetailTab('profile'); }}
                  className="h-8 w-8 sm:hidden"
                >
                  <ChevronRight className="h-4 w-4 rotate-180" />
                </Button>
                <h2 className="text-base sm:text-lg font-semibold text-gray-900">Detalle</h2>
              </div>
              <div className="flex items-center gap-2">
                <Button 
                  variant="default"
                  size="sm"
                  onClick={handleOpenInInbox}
                  disabled={timelineLoading}
                  className="h-8 px-2 sm:px-3 text-xs sm:text-sm"
                  data-testid="button-open-inbox"
                >
                  {timelineLoading ? (
                    <Loader2 className="h-4 w-4 sm:mr-1.5 animate-spin" />
                  ) : (
                    <Inbox className="h-4 w-4 sm:mr-1.5" />
                  )}
                  <span className="hidden sm:inline">Abrir en Inbox</span>
                </Button>
                <Button 
                  variant="ghost" 
                  size="icon"
                  onClick={() => { setIsDetailOpen(false); setDetailTab('profile'); }}
                  className="h-8 w-8 hidden sm:flex"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>
            
            {/* Tabs for Profile vs History */}
            <div className="flex items-center gap-1 px-4 sm:px-6 py-2 border-b bg-gray-50 shrink-0">
              <button
                onClick={() => setDetailTab('profile')}
                className={cn(
                  "px-3 py-1.5 text-sm font-medium rounded-md transition-colors",
                  detailTab === 'profile' 
                    ? "bg-white text-gray-900" 
                    : "text-gray-600 hover:text-gray-900"
                )}
                data-testid="detail-tab-profile"
              >
                <User className="h-3.5 w-3.5 inline mr-1.5" />
                Perfil
              </button>
              <button
                onClick={() => setDetailTab('history')}
                className={cn(
                  "px-3 py-1.5 text-sm font-medium rounded-md transition-colors",
                  detailTab === 'history' 
                    ? "bg-white text-gray-900" 
                    : "text-gray-600 hover:text-gray-900"
                )}
                data-testid="detail-tab-history"
              >
                <Clock className="h-3.5 w-3.5 inline mr-1.5" />
                Historial
              </button>
              <button
                onClick={() => setDetailTab('journey')}
                className={cn(
                  "px-3 py-1.5 text-sm font-medium rounded-md transition-colors",
                  detailTab === 'journey' 
                    ? "bg-white text-gray-900" 
                    : "text-gray-600 hover:text-gray-900"
                )}
                data-testid="detail-tab-journey"
              >
                <History className="h-3.5 w-3.5 inline mr-1.5" />
                Journey
              </button>
            </div>
            
            <ScrollArea className="flex-1">
              {/* Profile Tab */}
              {detailTab === 'profile' && (
                <div className="p-4 sm:p-6 space-y-4 sm:space-y-6">
                  {/* Profile Header */}
                  <div className="flex items-center gap-3 sm:gap-4">
                    <Avatar className="h-12 sm:h-16 w-12 sm:w-16">
                      <AvatarFallback className="bg-gray-100 text-gray-600 text-lg sm:text-xl font-medium">
                        {(selectedContact.displayName || '?')[0].toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0 flex-1">
                      <h3 className="text-base sm:text-lg font-semibold text-gray-900 truncate">{selectedContact.displayName || 'Sin nombre'}</h3>
                      <div className="flex items-center gap-2 mt-1 flex-wrap">
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

                  {/* Extracted Data Section */}
                  <ExtractedDataSection customFields={selectedContact.customFields} />

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
              )}

              {/* History Tab */}
              {detailTab === 'history' && (
                <div className="p-4">
                  {timelineLoading ? (
                    <div className="flex items-center justify-center py-12">
                      <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
                    </div>
                  ) : timelineMessages.length === 0 ? (
                    <div className="text-center py-12">
                      <MessageSquare className="h-10 w-10 text-gray-300 mx-auto mb-3" />
                      <p className="text-sm text-gray-500">No hay mensajes</p>
                      <p className="text-xs text-gray-400 mt-1">El historial aparecerá cuando haya conversaciones</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {timelineMessages.map((msg) => (
                        <div 
                          key={msg.id}
                          className={cn(
                            "flex gap-2",
                            msg.direction === 'outbound' ? "flex-row-reverse" : "flex-row"
                          )}
                        >
                          <div className={cn(
                            "max-w-[85%] rounded-lg p-3",
                            msg.direction === 'outbound' 
                              ? "bg-indigo-50 text-gray-900" 
                              : "bg-gray-100 text-gray-900"
                          )}>
                            <div className="flex items-center gap-2 mb-1">
                              {getPlatformIcon(msg.conversationPlatform || msg.platform)}
                              <span className="text-xs font-medium text-gray-600">
                                {msg.direction === 'outbound' ? 'Tú' : msg.author}
                              </span>
                              <span className="text-xs text-gray-400">
                                {formatDistanceToNow(new Date(msg.timestamp), { addSuffix: true, locale: es })}
                              </span>
                            </div>
                            <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Journey Tab */}
              {detailTab === 'journey' && (
                <div className="p-4">
                  <ConversationTimeline 
                    contactId={selectedContact.id}
                    maxEvents={20}
                    showSummary={true}
                  />
                </div>
              )}
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

      {/* Merge Dialog */}
      <Dialog open={isMergeOpen} onOpenChange={setIsMergeOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <GitMerge className="h-5 w-5" />
              Fusionar contactos
            </DialogTitle>
            <DialogDescription>
              Selecciona cual sera el contacto principal. El otro sera archivado y sus datos se moveran al principal.
            </DialogDescription>
          </DialogHeader>
          
          {selectedDuplicate && (
            <div className="space-y-4 py-4">
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-sm text-amber-800">
                Coincidencia: {selectedDuplicate.matchType === 'email' ? 'Email' : 'Telefono'} - {selectedDuplicate.matchValue}
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div 
                  className={cn(
                    "border-2 rounded-lg p-4 cursor-pointer transition-all",
                    primarySelection === 'contact1' 
                      ? "border-blue-500 bg-blue-50" 
                      : "border-gray-200 hover:border-gray-300"
                  )}
                  onClick={() => setPrimarySelection('contact1')}
                  data-testid="merge-select-contact1"
                >
                  <div className="flex items-center gap-2 mb-3">
                    <input 
                      type="radio" 
                      checked={primarySelection === 'contact1'} 
                      readOnly 
                      className="h-4 w-4 text-blue-600"
                    />
                    <span className="text-xs font-medium text-blue-600">PRINCIPAL</span>
                  </div>
                  <div className="flex items-center gap-2 mb-2">
                    <Avatar className="h-8 w-8">
                      <AvatarFallback className="bg-gray-200 text-gray-600 text-xs">
                        {(selectedDuplicate.contact1.displayName || '?')[0].toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <span className="text-sm font-medium">{selectedDuplicate.contact1.displayName || 'Sin nombre'}</span>
                  </div>
                  <div className="text-xs text-gray-500 space-y-1 ml-10">
                    {selectedDuplicate.contact1.email && <p>{selectedDuplicate.contact1.email}</p>}
                    {selectedDuplicate.contact1.phone && <p>{selectedDuplicate.contact1.phone}</p>}
                    <p className="text-gray-400">{selectedDuplicate.contact1.conversationCount || 0} conversaciones</p>
                  </div>
                </div>
                
                <div 
                  className={cn(
                    "border-2 rounded-lg p-4 cursor-pointer transition-all",
                    primarySelection === 'contact2' 
                      ? "border-blue-500 bg-blue-50" 
                      : "border-gray-200 hover:border-gray-300"
                  )}
                  onClick={() => setPrimarySelection('contact2')}
                  data-testid="merge-select-contact2"
                >
                  <div className="flex items-center gap-2 mb-3">
                    <input 
                      type="radio" 
                      checked={primarySelection === 'contact2'} 
                      readOnly 
                      className="h-4 w-4 text-blue-600"
                    />
                    <span className="text-xs font-medium text-blue-600">PRINCIPAL</span>
                  </div>
                  <div className="flex items-center gap-2 mb-2">
                    <Avatar className="h-8 w-8">
                      <AvatarFallback className="bg-gray-200 text-gray-600 text-xs">
                        {(selectedDuplicate.contact2.displayName || '?')[0].toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <span className="text-sm font-medium">{selectedDuplicate.contact2.displayName || 'Sin nombre'}</span>
                  </div>
                  <div className="text-xs text-gray-500 space-y-1 ml-10">
                    {selectedDuplicate.contact2.email && <p>{selectedDuplicate.contact2.email}</p>}
                    {selectedDuplicate.contact2.phone && <p>{selectedDuplicate.contact2.phone}</p>}
                    <p className="text-gray-400">{selectedDuplicate.contact2.conversationCount || 0} conversaciones</p>
                  </div>
                </div>
              </div>
              
              <div className="text-xs text-gray-500 bg-gray-50 rounded-lg p-3">
                <p className="font-medium text-gray-700 mb-1">Al fusionar:</p>
                <ul className="list-disc list-inside space-y-0.5">
                  <li>Los canales y conversaciones se moveran al contacto principal</li>
                  <li>Los campos vacios del principal se rellenaran con datos del secundario</li>
                  <li>Tendras 15 minutos para deshacer la fusion</li>
                </ul>
              </div>
            </div>
          )}
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsMergeOpen(false)}>
              Cancelar
            </Button>
            <Button 
              onClick={() => {
                if (selectedDuplicate) {
                  const primaryId = primarySelection === 'contact1' 
                    ? selectedDuplicate.contact1.id 
                    : selectedDuplicate.contact2.id;
                  const secondaryId = primarySelection === 'contact1' 
                    ? selectedDuplicate.contact2.id 
                    : selectedDuplicate.contact1.id;
                  mergeMutation.mutate({ primaryId, secondaryId });
                }
              }}
              disabled={mergeMutation.isPending}
              data-testid="button-confirm-merge"
            >
              {mergeMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <GitMerge className="h-4 w-4 mr-2" />
              )}
              Fusionar contactos
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600">
              <Trash2 className="h-5 w-5" />
              Eliminar contacto
            </DialogTitle>
            <DialogDescription>
              ¿Estás seguro de que quieres eliminar a <strong>{contactToDelete?.displayName || 'este contacto'}</strong>?
            </DialogDescription>
          </DialogHeader>
          
          {contactToDelete && (
            <div className="py-4 space-y-3">
              <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                <Avatar className="h-10 w-10">
                  <AvatarFallback className="bg-gray-200 text-gray-600">
                    {(contactToDelete.displayName || '?')[0].toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-medium">{contactToDelete.displayName || 'Sin nombre'}</p>
                  <p className="text-sm text-gray-500">
                    {contactToDelete.totalMessages || 0} mensajes · {contactToDelete.conversationCount || 0} conversaciones
                  </p>
                </div>
              </div>
              
              <div className="text-sm text-gray-600 bg-amber-50 border border-amber-200 rounded-lg p-3">
                <p className="font-medium text-amber-800 mb-1">Opciones de eliminación:</p>
                <ul className="text-amber-700 space-y-1 text-xs">
                  <li><strong>Archivar:</strong> El contacto se oculta pero se puede recuperar</li>
                  <li><strong>Eliminar permanentemente:</strong> Se borra todo (útil para spam)</li>
                </ul>
              </div>
            </div>
          )}
          
          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button variant="outline" onClick={() => setIsDeleteOpen(false)} className="flex-1">
              Cancelar
            </Button>
            <Button 
              variant="secondary"
              onClick={() => contactToDelete && deleteContactMutation.mutate({ id: contactToDelete.id, permanent: false })}
              disabled={deleteContactMutation.isPending}
              className="flex-1"
              data-testid="button-archive-contact"
            >
              Archivar
            </Button>
            <Button 
              variant="destructive"
              onClick={() => contactToDelete && deleteContactMutation.mutate({ id: contactToDelete.id, permanent: true })}
              disabled={deleteContactMutation.isPending}
              data-testid="button-delete-permanent"
            >
              {deleteContactMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Trash2 className="h-4 w-4 mr-2" />
              )}
              Eliminar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Limbo Detail Slide-over - Full screen on mobile */}
      {isLimboDetailOpen && selectedLimbo && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div 
            className="absolute inset-0 bg-black/20 hidden sm:block"
            onClick={() => setIsLimboDetailOpen(false)}
          />
          <div className="relative w-full sm:max-w-md bg-white sm:border-l animate-in slide-in-from-right duration-200 flex flex-col">
            <div className="flex items-center justify-between px-4 sm:px-6 py-3 sm:py-4 border-b shrink-0">
              <div className="flex items-center gap-2">
                <Button 
                  variant="ghost" 
                  size="icon"
                  onClick={() => setIsLimboDetailOpen(false)}
                  className="h-8 w-8 sm:hidden"
                >
                  <ChevronRight className="h-4 w-4 rotate-180" />
                </Button>
                <h2 className="text-base sm:text-lg font-semibold text-gray-900">Pendiente</h2>
              </div>
              <div className="flex items-center gap-2">
                <Button 
                  variant="default"
                  size="sm"
                  onClick={() => {
                    promoteMutation.mutate(selectedLimbo.id);
                    setIsLimboDetailOpen(false);
                  }}
                  disabled={promoteMutation.isPending}
                  className="h-8 px-2 sm:px-3 text-xs sm:text-sm"
                  data-testid="button-promote-panel"
                >
                  {promoteMutation.isPending ? (
                    <Loader2 className="h-4 w-4 sm:mr-1.5 animate-spin" />
                  ) : (
                    <ArrowUpRight className="h-4 w-4 sm:mr-1.5" />
                  )}
                  <span className="hidden sm:inline">Promover</span>
                </Button>
                <Button 
                  variant="ghost" 
                  size="icon"
                  onClick={() => setIsLimboDetailOpen(false)}
                  className="h-8 w-8 hidden sm:flex"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>
            
            <ScrollArea className="flex-1">
              <div className="p-4 sm:p-6 space-y-4 sm:space-y-6">
                <div className="flex items-center gap-3 sm:gap-4">
                  <Avatar className="h-12 sm:h-16 w-12 sm:w-16">
                    {selectedLimbo.avatarUrl ? (
                      <AvatarImage src={selectedLimbo.avatarUrl} alt={selectedLimbo.username || ''} />
                    ) : null}
                    <AvatarFallback className="bg-gray-100 text-gray-600 text-lg sm:text-xl font-medium">
                      {(selectedLimbo.username || '?')[0].toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1">
                    <h3 className="text-base sm:text-lg font-semibold text-gray-900 truncate">{selectedLimbo.username || 'Desconocido'}</h3>
                    <div className="flex items-center gap-2 mt-1 flex-wrap">
                      <Badge variant="outline" className="text-xs">
                        {getPlatformIcon(selectedLimbo.platform)}
                        <span className="ml-1 capitalize">{selectedLimbo.platform}</span>
                      </Badge>
                      <Badge variant="secondary" className="text-xs bg-amber-50 text-amber-700 border-amber-200">
                        Pendiente
                      </Badge>
                    </div>
                  </div>
                </div>

                <div className="space-y-3">
                  <h4 className="text-xs font-medium text-gray-500 uppercase tracking-wider">Información del canal</h4>
                  <div className="p-4 bg-gray-50 rounded-lg space-y-3">
                    <div className="flex items-center gap-3">
                      {getPlatformIcon(selectedLimbo.platform)}
                      <div>
                        <p className="text-sm font-medium text-gray-900">@{selectedLimbo.username || selectedLimbo.externalId}</p>
                        <p className="text-xs text-gray-500 capitalize">{selectedLimbo.platform}</p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="space-y-3">
                  <h4 className="text-xs font-medium text-gray-500 uppercase tracking-wider">Actividad</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-3 bg-gray-50 rounded-lg">
                      <p className="text-2xl font-semibold text-gray-900">{selectedLimbo.interactionCount || 1}</p>
                      <p className="text-xs text-gray-500">Comentarios</p>
                    </div>
                    <div className="p-3 bg-gray-50 rounded-lg">
                      <p className="text-sm font-medium text-gray-900">
                        {selectedLimbo.lastInteractionAt 
                          ? formatDistanceToNow(new Date(selectedLimbo.lastInteractionAt), { addSuffix: true, locale: es })
                          : '—'
                        }
                      </p>
                      <p className="text-xs text-gray-500">Última actividad</p>
                    </div>
                  </div>
                </div>

                {/* Extracted Data Section for Limbo */}
                <ExtractedDataSection customFields={selectedLimbo.customFields} />

                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <div className="flex items-start gap-3">
                    <MessageSquare className="h-5 w-5 text-blue-600 shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-blue-800">Usuario de comentarios</p>
                      <p className="text-xs text-blue-700 mt-1">
                        Este usuario solo ha interactuado a través de comentarios públicos. 
                        Cuando te escriba por DM, se convertirá automáticamente en un contacto completo.
                      </p>
                      <p className="text-xs text-blue-600 mt-2">
                        También puedes promoverlo manualmente usando el botón de arriba.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </ScrollArea>
          </div>
        </div>
      )}
    </div>
  );
}
