import React, { useState, useCallback, useEffect, useMemo } from 'react';
import { useParams } from 'wouter';
import { useQuery } from '@tanstack/react-query';
import { Search, Phone, Mail, MapPin, Loader2, ShieldAlert, Users, ChevronLeft, ChevronRight, Filter, Download, X, Calendar, User, Clock, History } from 'lucide-react';
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { FaInstagram, FaFacebook, FaTiktok, FaYoutube, FaTwitter, FaLinkedin } from 'react-icons/fa';
import { MessageSquare, Sparkles } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';
import { ConversationTimeline } from '@/components/ConversationTimeline';
import { ExtractedDataSection } from '@/components/ExtractedDataSection';

interface PublicContact {
  id: string;
  displayName: string | null;
  firstName: string | null;
  lastName: string | null;
  phone: string | null;
  email: string | null;
  status: string | null;
  lifecycleStage: string | null;
  city: string | null;
  country: string | null;
  totalMessages: number;
  lastInteractionAt: string | null;
  platforms: string[];
}

interface PublicContactDetail {
  id: string;
  displayName: string | null;
  firstName: string | null;
  lastName: string | null;
  phone: string | null;
  email: string | null;
  status: string | null;
  lifecycleStage: string | null;
  city: string | null;
  country: string | null;
  totalMessages: number;
  conversationCount: number;
  lastInteractionAt: string | null;
  firstInteractionAt: string | null;
  customFields: Record<string, any> | null;
  channels: Array<{
    id: string;
    platform: string;
    username: string | null;
    externalId: string;
    messageCount: number;
  }>;
}

interface TimelineMessage {
  id: string;
  content: string;
  direction: string;
  author: string;
  timestamp: string;
  platform: string;
  conversationPlatform?: string;
}

interface PublicContactsResponse {
  brandName: string;
  contacts: PublicContact[];
  hasMore: boolean;
  offset: number;
  limit: number;
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
    <span className={cn("inline-flex items-center px-2 py-0.5 text-xs font-medium rounded", config.bg, config.text)} data-testid={`status-badge-${status}`}>
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
    <span className={cn("inline-flex items-center px-2 py-0.5 text-xs font-medium rounded", config.bg, config.text)}>
      {stage || 'new'}
    </span>
  );
};

const PAGE_SIZE = 100;

export function PublicContacts() {
  const params = useParams<{ token: string }>();
  const token = params.token;
  const [searchInput, setSearchInput] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterPlatform, setFilterPlatform] = useState('all');
  const [filterLifecycle, setFilterLifecycle] = useState('all');
  const [filterHasPhone, setFilterHasPhone] = useState('all');
  const [filterDateType, setFilterDateType] = useState('last');
  const [filterDateFrom, setFilterDateFrom] = useState('');
  const [filterDateTo, setFilterDateTo] = useState('');
  const [page, setPage] = useState(0);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [selectedContact, setSelectedContact] = useState<PublicContact | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [detailTab, setDetailTab] = useState<'profile' | 'history' | 'journey'>('profile');

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchInput);
      setPage(0);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchInput]);

  useEffect(() => {
    setPage(0);
  }, [filterStatus, filterPlatform, filterLifecycle, filterHasPhone, filterDateType, filterDateFrom, filterDateTo]);

  const hasActiveFilters = filterStatus !== 'all' || filterPlatform !== 'all' || filterLifecycle !== 'all' || filterHasPhone !== 'all' || filterDateFrom || filterDateTo;

  const clearFilters = () => {
    setFilterStatus('all');
    setFilterPlatform('all');
    setFilterLifecycle('all');
    setFilterHasPhone('all');
    setFilterDateType('last');
    setFilterDateFrom('');
    setFilterDateTo('');
    setSearchInput('');
    setDebouncedSearch('');
  };

  const buildParams = useCallback(() => {
    const p = new URLSearchParams();
    p.set('limit', String(PAGE_SIZE));
    p.set('offset', String(page * PAGE_SIZE));
    if (debouncedSearch) p.set('search', debouncedSearch);
    if (filterStatus !== 'all') p.set('status', filterStatus);
    if (filterPlatform !== 'all') p.set('platform', filterPlatform);
    if (filterLifecycle !== 'all') p.set('lifecycleStage', filterLifecycle);
    if (filterHasPhone === 'yes') p.set('hasPhone', 'true');
    else if (filterHasPhone === 'no') p.set('hasPhone', 'false');
    if (filterDateFrom) {
      if (filterDateType === 'first') p.set('firstInteractionFrom', filterDateFrom);
      else p.set('lastInteractionFrom', filterDateFrom);
    }
    if (filterDateTo) {
      if (filterDateType === 'first') p.set('firstInteractionTo', filterDateTo);
      else p.set('lastInteractionTo', filterDateTo);
    }
    return p.toString();
  }, [page, debouncedSearch, filterStatus, filterPlatform, filterLifecycle, filterHasPhone, filterDateType, filterDateFrom, filterDateTo]);

  const { data, isLoading, isFetching, error } = useQuery({
    queryKey: ['public-contacts', token, page, debouncedSearch, filterStatus, filterPlatform, filterLifecycle, filterHasPhone, filterDateType, filterDateFrom, filterDateTo],
    queryFn: async () => {
      const res = await fetch(`/api/public/contacts/${token}?${buildParams()}`);
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'Link inválido o expirado' }));
        throw new Error(err.error || 'Error al cargar contactos');
      }
      return res.json() as Promise<PublicContactsResponse>;
    },
    enabled: !!token,
    retry: false,
    placeholderData: (prev: PublicContactsResponse | undefined) => prev,
  });

  const contacts: PublicContact[] = data?.contacts || [];
  const brandName: string = data?.brandName || '';
  const hasMore: boolean = data?.hasMore || false;

  const filteredContacts = useMemo(() => {
    if (!debouncedSearch) return contacts;
    const q = debouncedSearch.toLowerCase();
    return contacts.filter(c =>
      c.displayName?.toLowerCase().includes(q) ||
      c.firstName?.toLowerCase().includes(q) ||
      c.lastName?.toLowerCase().includes(q) ||
      c.email?.toLowerCase().includes(q) ||
      c.phone?.includes(debouncedSearch)
    );
  }, [contacts, debouncedSearch]);

  const handleDownloadCsv = async () => {
    const exportParams = new URLSearchParams();
    if (debouncedSearch) exportParams.set('search', debouncedSearch);
    if (filterStatus !== 'all') exportParams.set('status', filterStatus);
    if (filterPlatform !== 'all') exportParams.set('platform', filterPlatform);
    if (filterLifecycle !== 'all') exportParams.set('lifecycleStage', filterLifecycle);
    if (filterHasPhone === 'yes') exportParams.set('hasPhone', 'true');
    else if (filterHasPhone === 'no') exportParams.set('hasPhone', 'false');
    if (filterDateFrom) {
      if (filterDateType === 'first') exportParams.set('firstInteractionFrom', filterDateFrom);
      else exportParams.set('lastInteractionFrom', filterDateFrom);
    }
    if (filterDateTo) {
      if (filterDateType === 'first') exportParams.set('firstInteractionTo', filterDateTo);
      else exportParams.set('lastInteractionTo', filterDateTo);
    }
    window.open(`/api/public/contacts/${token}/export?${exportParams.toString()}`, '_blank');
  };

  const handleContactClick = (contact: PublicContact) => {
    setSelectedContact(contact);
    setIsDetailOpen(true);
    setDetailTab('profile');
  };

  const { data: contactDetail } = useQuery<PublicContactDetail>({
    queryKey: ['public-contact-detail', token, selectedContact?.id],
    queryFn: async () => {
      const res = await fetch(`/api/public/contacts/${token}/detail/${selectedContact?.id}`);
      if (!res.ok) throw new Error('Failed to fetch contact');
      return res.json();
    },
    enabled: !!selectedContact?.id && !!token,
  });

  const { data: timelineData, isLoading: timelineLoading } = useQuery({
    queryKey: ['public-contact-timeline', token, selectedContact?.id],
    queryFn: async () => {
      const res = await fetch(`/api/public/contacts/${token}/detail/${selectedContact?.id}/timeline?limit=100`);
      if (!res.ok) throw new Error('Failed to fetch timeline');
      return res.json();
    },
    enabled: !!selectedContact?.id && !!token,
  });

  const channels = contactDetail?.channels || [];
  const timelineMessages: TimelineMessage[] = timelineData?.messages || [];

  if (isLoading && page === 0) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-gray-50">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-indigo-500 mx-auto mb-3" />
          <p className="text-sm text-gray-500">Cargando contactos...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-gray-50">
        <div className="text-center max-w-md mx-auto px-4">
          <ShieldAlert className="h-12 w-12 text-red-400 mx-auto mb-4" />
          <h2 className="text-lg font-semibold text-gray-900 mb-2" data-testid="text-error-title">Link no válido</h2>
          <p className="text-sm text-gray-500" data-testid="text-error-message">
            {(error as Error).message || 'Este link de acceso no es válido o ha sido revocado.'}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-white">
      <div className="border-b border-gray-200 px-4 sm:px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <Users className="h-5 w-5 text-indigo-500" />
              <h1 className="text-lg font-semibold text-gray-900" data-testid="text-brand-name">
                Contactos
              </h1>
            </div>
            <p className="text-xs text-gray-500 mt-0.5 ml-7" data-testid="text-readonly-notice">
              {brandName} — Vista de solo lectura
            </p>
          </div>
        </div>
      </div>

      <div className="px-4 sm:px-6 pt-3 pb-2 space-y-2 border-b border-gray-100">
        <div className="flex flex-col sm:flex-row sm:items-center gap-2">
          <div className="relative flex-1 sm:max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Buscar..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className="pl-9 h-9 sm:h-8 bg-white border-gray-200 shadow-none focus:border-gray-300 focus:ring-0"
              data-testid="input-search"
            />
          </div>
        </div>

        <div className="bg-gray-50 rounded-lg border border-gray-100 p-3">
          <div className="flex items-center justify-between">
            <button
              onClick={() => setFiltersOpen(!filtersOpen)}
              className="flex items-center gap-1.5 sm:cursor-default"
              data-testid="button-toggle-filters"
            >
              <Filter className="h-3.5 w-3.5 text-gray-400" />
              <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">Filtros</span>
              {hasActiveFilters && (
                <span className="bg-indigo-100 text-indigo-700 text-[10px] font-medium px-1.5 py-0.5 rounded-full">Activos</span>
              )}
              <ChevronRight className={cn("h-3.5 w-3.5 text-gray-400 transition-transform sm:hidden", filtersOpen && "rotate-90")} />
            </button>
            <div className="flex items-center gap-1.5">
              {hasActiveFilters && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={clearFilters}
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

          <div className={cn("flex flex-wrap items-end gap-2 mt-2.5", !filtersOpen && "hidden sm:flex")}>
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
      </div>

      <div className="flex-1 overflow-hidden relative">
        {isFetching && (
          <div className="absolute inset-0 bg-white/60 z-10 flex items-center justify-center">
            <Loader2 className="h-5 w-5 animate-spin text-indigo-500" />
          </div>
        )}
        <ScrollArea className="h-full">
          {filteredContacts.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 text-gray-500">
              <User className="h-12 w-12 mb-3 text-gray-300" />
              <p className="text-sm">No hay contactos</p>
              <p className="text-xs text-gray-400 mt-1">
                {hasActiveFilters || debouncedSearch
                  ? 'No se encontraron resultados con estos filtros'
                  : 'No hay contactos disponibles'}
              </p>
            </div>
          ) : (
            <>
              <div className="sm:hidden divide-y divide-gray-100">
                {filteredContacts.map((contact) => {
                  const name = contact.displayName ||
                    [contact.firstName, contact.lastName].filter(Boolean).join(' ') ||
                    'Sin nombre';
                  return (
                    <div
                      key={contact.id}
                      className="p-3 hover:bg-gray-50 cursor-pointer active:bg-gray-100"
                      onClick={() => handleContactClick(contact)}
                      data-testid={`card-contact-${contact.id}`}
                    >
                      <div className="flex items-start gap-3">
                        <Avatar className="h-10 w-10 shrink-0">
                          <AvatarFallback className="bg-gray-100 text-gray-600 text-sm font-medium">
                            {name[0].toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2">
                            <p className="text-sm font-medium text-gray-900 truncate">{name}</p>
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
                      </div>
                    </div>
                  );
                })}
              </div>

              <table className="w-full hidden sm:table" data-testid="table-contacts">
                <thead className="bg-gray-50 border-b border-gray-200 sticky top-0 z-10">
                  <tr>
                    <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Nombre</th>
                    <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Teléfono</th>
                    <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Canales</th>
                    <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Estado</th>
                    <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Etapa</th>
                    <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Mensajes</th>
                    <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Última actividad</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filteredContacts.map((contact) => {
                    const name = contact.displayName ||
                      [contact.firstName, contact.lastName].filter(Boolean).join(' ') ||
                      'Sin nombre';
                    return (
                      <tr
                        key={contact.id}
                        className="hover:bg-gray-50 transition-colors cursor-pointer"
                        onClick={() => handleContactClick(contact)}
                        data-testid={`row-contact-${contact.id}`}
                      >
                        <td className="px-6 py-3">
                          <div className="flex items-center gap-3">
                            <Avatar className="h-8 w-8">
                              <AvatarFallback className="bg-gray-100 text-gray-600 text-xs font-medium">
                                {name[0].toUpperCase()}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <p className="text-sm font-medium text-gray-900" data-testid={`text-name-${contact.id}`}>{name}</p>
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
                              <span key={i} className="p-1" title={platform}>
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
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </>
          )}
        </ScrollArea>
      </div>

      <div className="px-4 sm:px-6 py-2.5 border-t bg-gray-50 flex items-center justify-between">
        <span className="text-xs text-gray-500" data-testid="text-contact-count">
          {filteredContacts.length === 0 ? 'Sin resultados' : `${filteredContacts.length} contacto${filteredContacts.length !== 1 ? 's' : ''}`}
          {page > 0 && ` — Página ${page + 1}`}
        </span>
        <div className="flex items-center gap-1.5">
          <Button
            variant="outline"
            size="sm"
            className="h-7 px-2 text-xs"
            disabled={page === 0}
            onClick={() => setPage(p => Math.max(0, p - 1))}
            data-testid="button-prev-page"
          >
            <ChevronLeft className="h-3.5 w-3.5 mr-0.5" />
            Anterior
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="h-7 px-2 text-xs"
            disabled={!hasMore}
            onClick={() => setPage(p => p + 1)}
            data-testid="button-next-page"
          >
            Siguiente
            <ChevronRight className="h-3.5 w-3.5 ml-0.5" />
          </Button>
        </div>
      </div>

      {isDetailOpen && selectedContact && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div 
            className="absolute inset-0 bg-black/20 hidden sm:block"
            onClick={() => { setIsDetailOpen(false); setDetailTab('profile'); }}
          />
          <div className="relative w-full sm:max-w-md bg-white sm:border-l animate-in slide-in-from-right sm:slide-in-from-right duration-200 flex flex-col">
            <div className="flex items-center justify-between px-4 sm:px-6 py-3 sm:py-4 border-b shrink-0">
              <div className="flex items-center gap-2">
                <Button 
                  variant="ghost" 
                  size="icon"
                  onClick={() => { setIsDetailOpen(false); setDetailTab('profile'); }}
                  className="h-8 w-8 sm:hidden"
                  data-testid="button-close-detail-mobile"
                >
                  <ChevronRight className="h-4 w-4 rotate-180" />
                </Button>
                <h2 className="text-base sm:text-lg font-semibold text-gray-900">Detalle</h2>
              </div>
              <Button 
                variant="ghost" 
                size="icon"
                onClick={() => { setIsDetailOpen(false); setDetailTab('profile'); }}
                className="h-8 w-8 hidden sm:flex"
                data-testid="button-close-detail"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
            
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
              {detailTab === 'profile' && (
                <div className="p-4 sm:p-6 space-y-4 sm:space-y-6">
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

                  <div className="space-y-3">
                    <h4 className="text-xs font-medium text-gray-500 uppercase tracking-wider">Información</h4>
                    
                    {(contactDetail?.email || selectedContact.email) && (
                      <div className="flex items-center gap-3 text-sm">
                        <Mail className="h-4 w-4 text-gray-400" />
                        <span className="text-gray-900">{contactDetail?.email || selectedContact.email}</span>
                      </div>
                    )}
                    
                    {(contactDetail?.phone || selectedContact.phone) && (
                      <div className="flex items-center gap-3 text-sm">
                        <Phone className="h-4 w-4 text-gray-400" />
                        <span className="text-gray-900">{contactDetail?.phone || selectedContact.phone}</span>
                      </div>
                    )}
                    
                    {(contactDetail?.city || contactDetail?.country || selectedContact.city || selectedContact.country) && (
                      <div className="flex items-center gap-3 text-sm">
                        <MapPin className="h-4 w-4 text-gray-400" />
                        <span className="text-gray-900">
                          {[contactDetail?.city || selectedContact.city, contactDetail?.country || selectedContact.country].filter(Boolean).join(', ')}
                        </span>
                      </div>
                    )}
                  </div>

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

                  {contactDetail?.customFields && (
                    <ExtractedDataSection customFields={contactDetail.customFields} />
                  )}

                  <div className="space-y-3">
                    <h4 className="text-xs font-medium text-gray-500 uppercase tracking-wider">Actividad</h4>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="p-3 bg-gray-50 rounded-lg">
                        <p className="text-2xl font-semibold text-gray-900">{contactDetail?.conversationCount || 0}</p>
                        <p className="text-xs text-gray-500">Conversaciones</p>
                      </div>
                      <div className="p-3 bg-gray-50 rounded-lg">
                        <p className="text-2xl font-semibold text-gray-900">{contactDetail?.totalMessages || selectedContact.totalMessages || 0}</p>
                        <p className="text-xs text-gray-500">Mensajes</p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

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
                                {msg.direction === 'outbound' ? 'Bot' : msg.author}
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

              {detailTab === 'journey' && (
                <div className="p-4">
                  <ConversationTimeline 
                    contactId={selectedContact.id}
                    maxEvents={20}
                    showSummary={true}
                    journeyApiUrl={`/api/public/contacts/${token}/detail/${selectedContact.id}/journey`}
                  />
                </div>
              )}
            </ScrollArea>
          </div>
        </div>
      )}
    </div>
  );
}
