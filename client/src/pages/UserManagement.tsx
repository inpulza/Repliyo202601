import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useLocation } from 'wouter';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { useToast } from '@/hooks/use-toast';
import { useIsMobile } from '@/hooks/use-mobile';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  MobilePageHeader,
  MobileListRow,
  MobileListGroup,
  MobileContainer,
  MobileSpacer,
} from '@/components/ui/mobile-primitives';
import {
  Loader2,
  Plus,
  MoreVertical,
  Search,
  Shield,
  User,
  UserX,
  UserCheck,
  KeyRound,
  Pencil,
  Trash2,
  Eye,
  EyeOff,
  Users,
  Mail,
  Building2,
} from 'lucide-react';

interface ManagedUser {
  id: string;
  email: string;
  name: string;
  role: 'admin' | 'client';
  brandId: string | null;
  status: string;
  createdAt: string;
  profileImageUrl: string | null;
}

interface Brand {
  id: string;
  name: string;
  status?: string;
}

export function UserManagement() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const isMobile = useIsMobile();

  const [users, setUsers] = useState<ManagedUser[]>([]);
  const [brands, setBrands] = useState<Brand[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isResetPasswordOpen, setIsResetPasswordOpen] = useState(false);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<ManagedUser | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const [formName, setFormName] = useState('');
  const [formEmail, setFormEmail] = useState('');
  const [formPassword, setFormPassword] = useState('');
  const [formRole, setFormRole] = useState<'admin' | 'client'>('client');
  const [formBrandId, setFormBrandId] = useState<string>('');
  const [formStatus, setFormStatus] = useState<string>('active');
  const [showPassword, setShowPassword] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);

  useEffect(() => {
    if (user && user.role !== 'admin') {
      setLocation('/app/inbox');
    }
  }, [user, setLocation]);

  if (user?.role !== 'admin') {
    return (
      <div className="flex h-full w-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-indigo-500" />
      </div>
    );
  }

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [usersRes, brandsRes] = await Promise.all([
        fetch('/api/users', { credentials: 'include' }),
        fetch('/api/brands', { credentials: 'include' }),
      ]);
      if (usersRes.ok) setUsers(await usersRes.json());
      if (brandsRes.ok) setBrands((await brandsRes.json()).filter((b: Brand) => b.status !== 'archived'));
    } catch {
      toast({ title: 'Error', description: 'No se pudieron cargar los datos', variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const resetForm = () => {
    setFormName('');
    setFormEmail('');
    setFormPassword('');
    setFormRole('client');
    setFormBrandId('');
    setFormStatus('active');
    setShowPassword(false);
  };

  const openCreate = () => {
    resetForm();
    setIsCreateOpen(true);
  };

  const openEdit = (u: ManagedUser) => {
    setSelectedUser(u);
    setFormName(u.name);
    setFormEmail(u.email);
    setFormRole(u.role);
    setFormBrandId(u.brandId || '');
    setFormStatus(u.status);
    setIsEditOpen(true);
  };

  const openResetPassword = (u: ManagedUser) => {
    setSelectedUser(u);
    setNewPassword('');
    setShowNewPassword(false);
    setIsResetPasswordOpen(true);
  };

  const openDeleteConfirm = (u: ManagedUser) => {
    setSelectedUser(u);
    setIsDeleteConfirmOpen(true);
  };

  const handleCreate = async () => {
    if (!formName || !formEmail || !formPassword) {
      toast({ title: 'Error', description: 'Nombre, email y contraseña son requeridos', variant: 'destructive' });
      return;
    }
    if (formRole === 'client' && !formBrandId) {
      toast({ title: 'Error', description: 'Debes asignar una marca al usuario cliente', variant: 'destructive' });
      return;
    }
    setIsSaving(true);
    try {
      const res = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          name: formName,
          email: formEmail,
          password: formPassword,
          role: formRole,
          brandId: formRole === 'client' ? formBrandId : null,
          status: 'active',
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Error al crear usuario');
      }
      toast({ title: 'Usuario creado', description: `Se creó la cuenta para ${formEmail}` });
      setIsCreateOpen(false);
      fetchData();
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    } finally {
      setIsSaving(false);
    }
  };

  const handleUpdate = async () => {
    if (!selectedUser) return;
    setIsSaving(true);
    try {
      const res = await fetch(`/api/users/${selectedUser.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          name: formName,
          email: formEmail,
          role: formRole,
          brandId: formRole === 'client' ? (formBrandId || null) : null,
          status: formStatus,
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Error al actualizar usuario');
      }
      toast({ title: 'Usuario actualizado', description: `Se actualizó la cuenta de ${formEmail}` });
      setIsEditOpen(false);
      fetchData();
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    } finally {
      setIsSaving(false);
    }
  };

  const handleResetPassword = async () => {
    if (!selectedUser || !newPassword) return;
    if (newPassword.length < 6) {
      toast({ title: 'Error', description: 'La contraseña debe tener al menos 6 caracteres', variant: 'destructive' });
      return;
    }
    setIsSaving(true);
    try {
      const res = await fetch(`/api/users/${selectedUser.id}/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ newPassword }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Error al resetear contraseña');
      }
      toast({ title: 'Contraseña reseteada', description: `La contraseña de ${selectedUser.email} fue actualizada` });
      setIsResetPasswordOpen(false);
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedUser) return;
    setIsSaving(true);
    try {
      const res = await fetch(`/api/users/${selectedUser.id}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Error al eliminar usuario');
      }
      toast({ title: 'Usuario eliminado', description: `Se eliminó la cuenta de ${selectedUser.email}` });
      setIsDeleteConfirmOpen(false);
      fetchData();
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    } finally {
      setIsSaving(false);
    }
  };

  const toggleStatus = async (u: ManagedUser) => {
    const newStatus = u.status === 'active' ? 'suspended' : 'active';
    try {
      const res = await fetch(`/api/users/${u.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ status: newStatus }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error);
      }
      toast({
        title: newStatus === 'suspended' ? 'Usuario suspendido' : 'Usuario activado',
        description: `${u.name} fue ${newStatus === 'suspended' ? 'suspendido' : 'activado'}`,
      });
      fetchData();
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    }
  };

  const getBrandName = (brandId: string | null) => {
    if (!brandId) return null;
    return brands.find(b => b.id === brandId)?.name || 'Marca desconocida';
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <Badge data-testid="badge-status-active" className="bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-50">Activo</Badge>;
      case 'suspended':
        return <Badge data-testid="badge-status-suspended" className="bg-red-50 text-red-700 border-red-200 hover:bg-red-50">Suspendido</Badge>;
      case 'pending':
        return <Badge data-testid="badge-status-pending" className="bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-50">Pendiente</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getRoleBadge = (role: string) => {
    if (role === 'admin') {
      return <Badge data-testid="badge-role-admin" className="bg-violet-50 text-violet-700 border-violet-200 hover:bg-violet-50"><Shield className="h-3 w-3 mr-1" />Admin</Badge>;
    }
    return <Badge data-testid="badge-role-client" variant="outline" className="text-gray-600"><User className="h-3 w-3 mr-1" />Cliente</Badge>;
  };

  const filteredUsers = users.filter(u =>
    u.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    u.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (getBrandName(u.brandId) || '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getInitials = (name: string) => name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);

  const UserFormContent = ({ isCreate }: { isCreate: boolean }) => (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="form-name">Nombre</Label>
        <Input
          id="form-name"
          data-testid="input-user-name"
          value={formName}
          onChange={e => setFormName(e.target.value)}
          placeholder="Nombre completo"
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="form-email">Email</Label>
        <Input
          id="form-email"
          data-testid="input-user-email"
          type="email"
          value={formEmail}
          onChange={e => setFormEmail(e.target.value)}
          placeholder="email@ejemplo.com"
        />
      </div>
      {isCreate && (
        <div className="space-y-2">
          <Label htmlFor="form-password">Contraseña</Label>
          <div className="relative">
            <Input
              id="form-password"
              data-testid="input-user-password"
              type={showPassword ? 'text' : 'password'}
              value={formPassword}
              onChange={e => setFormPassword(e.target.value)}
              placeholder="Mínimo 6 caracteres"
            />
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
              onClick={() => setShowPassword(!showPassword)}
              data-testid="button-toggle-password"
            >
              {showPassword ? <EyeOff className="h-4 w-4 text-gray-400" /> : <Eye className="h-4 w-4 text-gray-400" />}
            </Button>
          </div>
        </div>
      )}
      <div className="space-y-2">
        <Label htmlFor="form-role">Rol</Label>
        <Select value={formRole} onValueChange={(v: 'admin' | 'client') => setFormRole(v)}>
          <SelectTrigger data-testid="select-user-role">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="client">Cliente</SelectItem>
            <SelectItem value="admin">Admin</SelectItem>
          </SelectContent>
        </Select>
      </div>
      {formRole === 'client' && (
        <div className="space-y-2">
          <Label htmlFor="form-brand">Marca asignada</Label>
          <Select value={formBrandId} onValueChange={setFormBrandId}>
            <SelectTrigger data-testid="select-user-brand">
              <SelectValue placeholder="Seleccionar marca" />
            </SelectTrigger>
            <SelectContent>
              {brands.map(b => (
                <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}
      {!isCreate && (
        <div className="space-y-2">
          <Label htmlFor="form-status">Estado</Label>
          <Select value={formStatus} onValueChange={setFormStatus}>
            <SelectTrigger data-testid="select-user-status">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="active">Activo</SelectItem>
              <SelectItem value="suspended">Suspendido</SelectItem>
              <SelectItem value="pending">Pendiente</SelectItem>
            </SelectContent>
          </Select>
        </div>
      )}
    </div>
  );

  if (isLoading) {
    return (
      <div className="flex h-full w-full items-center justify-center" data-testid="loader-users">
        <Loader2 className="h-8 w-8 animate-spin text-indigo-500" />
      </div>
    );
  }

  if (isMobile) {
    return (
      <MobileContainer>
        <MobilePageHeader
          title="Gestión de Usuarios"
          subtitle={`${users.length} usuario${users.length !== 1 ? 's' : ''}`}
          rightAction={
            <Button size="sm" onClick={openCreate} data-testid="button-create-user">
              <Plus className="h-4 w-4 mr-1" />Nuevo
            </Button>
          }
        />

        <div className="px-4 pb-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              data-testid="input-search-users"
              className="pl-9"
              placeholder="Buscar usuarios..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
            />
          </div>
        </div>

        <MobileListGroup>
          {filteredUsers.map(u => (
            <MobileListRow
              key={u.id}
              data-testid={`row-user-${u.id}`}
              onClick={() => openEdit(u)}
              left={
                <Avatar className="h-10 w-10">
                  <AvatarFallback className={u.role === 'admin' ? 'bg-violet-100 text-violet-700' : 'bg-gray-100 text-gray-700'}>
                    {getInitials(u.name)}
                  </AvatarFallback>
                </Avatar>
              }
              right={
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8" data-testid={`button-menu-${u.id}`}>
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => openEdit(u)} data-testid={`menu-edit-${u.id}`}>
                      <Pencil className="h-4 w-4 mr-2" />Editar
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => openResetPassword(u)} data-testid={`menu-reset-${u.id}`}>
                      <KeyRound className="h-4 w-4 mr-2" />Resetear contraseña
                    </DropdownMenuItem>
                    {u.id !== user?.id && (
                      <>
                        <DropdownMenuItem onClick={() => toggleStatus(u)} data-testid={`menu-toggle-${u.id}`}>
                          {u.status === 'active' ? <UserX className="h-4 w-4 mr-2" /> : <UserCheck className="h-4 w-4 mr-2" />}
                          {u.status === 'active' ? 'Suspender' : 'Activar'}
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          onClick={() => openDeleteConfirm(u)}
                          className="text-red-600 focus:text-red-600"
                          data-testid={`menu-delete-${u.id}`}
                        >
                          <Trash2 className="h-4 w-4 mr-2" />Eliminar
                        </DropdownMenuItem>
                      </>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              }
            >
              <div className="flex flex-col min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-sm text-gray-900 truncate">{u.name}</span>
                  {getRoleBadge(u.role)}
                </div>
                <span className="text-xs text-gray-500 truncate">{u.email}</span>
                <div className="flex items-center gap-2 mt-1">
                  {getStatusBadge(u.status)}
                  {u.brandId && (
                    <span className="text-xs text-gray-400 flex items-center gap-1 truncate">
                      <Building2 className="h-3 w-3" />{getBrandName(u.brandId)}
                    </span>
                  )}
                </div>
              </div>
            </MobileListRow>
          ))}
        </MobileListGroup>

        {filteredUsers.length === 0 && (
          <div className="flex flex-col items-center justify-center py-12 text-center px-4" data-testid="empty-users">
            <Users className="h-12 w-12 text-gray-300 mb-3" />
            <p className="text-sm text-gray-500">{searchQuery ? 'No se encontraron usuarios' : 'No hay usuarios registrados'}</p>
          </div>
        )}

        <MobileSpacer />

        <Sheet open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <SheetContent side="bottom" className="h-[85vh] rounded-t-2xl">
            <SheetHeader>
              <SheetTitle>Crear Usuario</SheetTitle>
            </SheetHeader>
            <div className="mt-4 overflow-y-auto flex-1">
              <UserFormContent isCreate />
              <div className="mt-6 flex gap-3">
                <Button variant="outline" className="flex-1" onClick={() => setIsCreateOpen(false)} data-testid="button-cancel-create">Cancelar</Button>
                <Button className="flex-1" onClick={handleCreate} disabled={isSaving} data-testid="button-submit-create">
                  {isSaving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Plus className="h-4 w-4 mr-2" />}
                  Crear
                </Button>
              </div>
            </div>
          </SheetContent>
        </Sheet>

        <Sheet open={isEditOpen} onOpenChange={setIsEditOpen}>
          <SheetContent side="bottom" className="h-[85vh] rounded-t-2xl">
            <SheetHeader>
              <SheetTitle>Editar Usuario</SheetTitle>
            </SheetHeader>
            <div className="mt-4 overflow-y-auto flex-1">
              <UserFormContent isCreate={false} />
              <div className="mt-6 flex gap-3">
                <Button variant="outline" className="flex-1" onClick={() => setIsEditOpen(false)} data-testid="button-cancel-edit">Cancelar</Button>
                <Button className="flex-1" onClick={handleUpdate} disabled={isSaving} data-testid="button-submit-edit">
                  {isSaving && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                  Guardar
                </Button>
              </div>
            </div>
          </SheetContent>
        </Sheet>

        <Dialog open={isResetPasswordOpen} onOpenChange={setIsResetPasswordOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Resetear Contraseña</DialogTitle>
              <DialogDescription>
                Nueva contraseña para {selectedUser?.name} ({selectedUser?.email})
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="relative">
                <Input
                  data-testid="input-new-password"
                  type={showNewPassword ? 'text' : 'password'}
                  value={newPassword}
                  onChange={e => setNewPassword(e.target.value)}
                  placeholder="Mínimo 6 caracteres"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                  onClick={() => setShowNewPassword(!showNewPassword)}
                >
                  {showNewPassword ? <EyeOff className="h-4 w-4 text-gray-400" /> : <Eye className="h-4 w-4 text-gray-400" />}
                </Button>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsResetPasswordOpen(false)} data-testid="button-cancel-reset">Cancelar</Button>
              <Button onClick={handleResetPassword} disabled={isSaving || !newPassword} data-testid="button-submit-reset">
                {isSaving && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                Resetear
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={isDeleteConfirmOpen} onOpenChange={setIsDeleteConfirmOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Eliminar Usuario</DialogTitle>
              <DialogDescription>
                ¿Estás seguro de que deseas eliminar a {selectedUser?.name} ({selectedUser?.email})? Esta acción no se puede deshacer.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsDeleteConfirmOpen(false)} data-testid="button-cancel-delete">Cancelar</Button>
              <Button variant="destructive" onClick={handleDelete} disabled={isSaving} data-testid="button-confirm-delete">
                {isSaving && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                Eliminar
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </MobileContainer>
    );
  }

  return (
    <div className="h-full flex flex-col bg-gray-50/50">
      <div className="border-b border-gray-200 bg-white px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-lg font-semibold text-gray-900" data-testid="text-page-title">Gestión de Usuarios</h1>
            <p className="text-sm text-gray-500 mt-0.5">{users.length} usuario{users.length !== 1 ? 's' : ''} registrado{users.length !== 1 ? 's' : ''}</p>
          </div>
          <Button onClick={openCreate} data-testid="button-create-user">
            <Plus className="h-4 w-4 mr-2" />Crear Usuario
          </Button>
        </div>

        <div className="mt-4 relative max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            data-testid="input-search-users"
            className="pl-9"
            placeholder="Buscar por nombre, email o marca..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      <div className="flex-1 overflow-auto p-6">
        {filteredUsers.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center" data-testid="empty-users">
            <Users className="h-16 w-16 text-gray-200 mb-4" />
            <h3 className="text-base font-medium text-gray-600 mb-1">
              {searchQuery ? 'No se encontraron usuarios' : 'Sin usuarios'}
            </h3>
            <p className="text-sm text-gray-400">
              {searchQuery ? 'Intenta con otro término de búsqueda' : 'Crea el primer usuario para comenzar'}
            </p>
          </div>
        ) : (
          <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50/50">
                  <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-6 py-3">Usuario</th>
                  <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-6 py-3">Rol</th>
                  <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-6 py-3">Marca</th>
                  <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-6 py-3">Estado</th>
                  <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-6 py-3">Creado</th>
                  <th className="text-right text-xs font-medium text-gray-500 uppercase tracking-wider px-6 py-3">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredUsers.map(u => (
                  <tr key={u.id} className="hover:bg-gray-50/50 transition-colors" data-testid={`row-user-${u.id}`}>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <Avatar className="h-9 w-9">
                          <AvatarFallback className={u.role === 'admin' ? 'bg-violet-100 text-violet-700 text-xs' : 'bg-gray-100 text-gray-700 text-xs'}>
                            {getInitials(u.name)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-gray-900 truncate" data-testid={`text-user-name-${u.id}`}>{u.name}</p>
                          <p className="text-xs text-gray-500 truncate flex items-center gap-1">
                            <Mail className="h-3 w-3" />{u.email}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">{getRoleBadge(u.role)}</td>
                    <td className="px-6 py-4">
                      {u.brandId ? (
                        <span className="text-sm text-gray-700 flex items-center gap-1.5">
                          <Building2 className="h-3.5 w-3.5 text-gray-400" />
                          {getBrandName(u.brandId)}
                        </span>
                      ) : (
                        <span className="text-sm text-gray-400">—</span>
                      )}
                    </td>
                    <td className="px-6 py-4">{getStatusBadge(u.status)}</td>
                    <td className="px-6 py-4">
                      <span className="text-sm text-gray-500">
                        {new Date(u.createdAt).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' })}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8" data-testid={`button-menu-${u.id}`}>
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => openEdit(u)} data-testid={`menu-edit-${u.id}`}>
                            <Pencil className="h-4 w-4 mr-2" />Editar
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => openResetPassword(u)} data-testid={`menu-reset-${u.id}`}>
                            <KeyRound className="h-4 w-4 mr-2" />Resetear contraseña
                          </DropdownMenuItem>
                          {u.id !== user?.id && (
                            <>
                              <DropdownMenuItem onClick={() => toggleStatus(u)} data-testid={`menu-toggle-${u.id}`}>
                                {u.status === 'active' ? <UserX className="h-4 w-4 mr-2" /> : <UserCheck className="h-4 w-4 mr-2" />}
                                {u.status === 'active' ? 'Suspender' : 'Activar'}
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                onClick={() => openDeleteConfirm(u)}
                                className="text-red-600 focus:text-red-600"
                                data-testid={`menu-delete-${u.id}`}
                              >
                                <Trash2 className="h-4 w-4 mr-2" />Eliminar
                              </DropdownMenuItem>
                            </>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Crear Usuario</DialogTitle>
            <DialogDescription>
              Crea una cuenta de acceso para un cliente o administrador
            </DialogDescription>
          </DialogHeader>
          <UserFormContent isCreate />
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreateOpen(false)} data-testid="button-cancel-create">Cancelar</Button>
            <Button onClick={handleCreate} disabled={isSaving} data-testid="button-submit-create">
              {isSaving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Plus className="h-4 w-4 mr-2" />}
              Crear
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Editar Usuario</DialogTitle>
            <DialogDescription>
              Modifica los datos de {selectedUser?.name}
            </DialogDescription>
          </DialogHeader>
          <UserFormContent isCreate={false} />
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditOpen(false)} data-testid="button-cancel-edit">Cancelar</Button>
            <Button onClick={handleUpdate} disabled={isSaving} data-testid="button-submit-edit">
              {isSaving && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Guardar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isResetPasswordOpen} onOpenChange={setIsResetPasswordOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Resetear Contraseña</DialogTitle>
            <DialogDescription>
              Nueva contraseña para {selectedUser?.name} ({selectedUser?.email})
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="relative">
              <Input
                data-testid="input-new-password"
                type={showNewPassword ? 'text' : 'password'}
                value={newPassword}
                onChange={e => setNewPassword(e.target.value)}
                placeholder="Mínimo 6 caracteres"
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                onClick={() => setShowNewPassword(!showNewPassword)}
              >
                {showNewPassword ? <EyeOff className="h-4 w-4 text-gray-400" /> : <Eye className="h-4 w-4 text-gray-400" />}
              </Button>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsResetPasswordOpen(false)} data-testid="button-cancel-reset">Cancelar</Button>
            <Button onClick={handleResetPassword} disabled={isSaving || !newPassword} data-testid="button-submit-reset">
              {isSaving && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Resetear
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isDeleteConfirmOpen} onOpenChange={setIsDeleteConfirmOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Eliminar Usuario</DialogTitle>
            <DialogDescription>
              ¿Estás seguro de que deseas eliminar a {selectedUser?.name} ({selectedUser?.email})? Esta acción no se puede deshacer.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDeleteConfirmOpen(false)} data-testid="button-cancel-delete">Cancelar</Button>
            <Button variant="destructive" onClick={handleDelete} disabled={isSaving} data-testid="button-confirm-delete">
              {isSaving && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Eliminar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
