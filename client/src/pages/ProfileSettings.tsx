import React, { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { Eye, EyeOff, Loader2, User, Mail, Shield, Key, ChevronRight } from 'lucide-react';
import {
  MobilePageHeader,
  MobileListRow,
  MobileListGroup,
  MobileSectionDivider,
  MobileContainer,
  MobileSpacer
} from '@/components/ui/mobile-primitives';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";

export function ProfileSettings() {
  const { user } = useAuth();
  const { toast } = useToast();
  
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (newPassword !== confirmPassword) {
      toast({
        title: "Error",
        description: "Las contraseñas nuevas no coinciden",
        variant: "destructive",
      });
      return;
    }

    if (newPassword.length < 6) {
      toast({
        title: "Error",
        description: "La nueva contraseña debe tener al menos 6 caracteres",
        variant: "destructive",
      });
      return;
    }

    setIsChangingPassword(true);
    try {
      const res = await fetch('/api/auth/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          currentPassword,
          newPassword,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Error al cambiar la contraseña');
      }

      toast({
        title: "Contraseña actualizada",
        description: "Tu contraseña ha sido cambiada correctamente",
      });
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsChangingPassword(false);
    }
  };

  const [showPasswordSheet, setShowPasswordSheet] = useState(false);

  return (
    <div className="flex-1 overflow-auto">
      {/* Mobile View */}
      <MobileContainer>
        <MobilePageHeader title="Profile" />
        
        <MobileSpacer size="sm" />
        
        <div className="md:hidden px-4 pb-4">
          <div className="flex items-center gap-3 p-4 bg-background rounded-xl border border-border">
            <Avatar className="h-14 w-14 border border-border">
              <AvatarFallback className="bg-gray-100 text-gray-600 text-lg font-medium">
                {user?.name?.substring(0, 2).toUpperCase() || 'US'}
              </AvatarFallback>
            </Avatar>
            <div>
              <p className="font-semibold text-foreground" data-testid="mobile-user-name">{user?.name || 'Usuario'}</p>
              <p className="text-sm text-muted-foreground">{user?.role === 'admin' ? 'Administrador' : 'Cliente'}</p>
            </div>
          </div>
        </div>
        
        <MobileSectionDivider title="Información" />
        <MobileListGroup>
          <MobileListRow
            icon={<Mail className="h-4 w-4 text-muted-foreground" />}
            title="Email"
            subtitle={user?.email || 'Sin email'}
            showChevron={false}
            testId="mobile-row-email"
          />
          <MobileListRow
            icon={<Shield className="h-4 w-4 text-muted-foreground" />}
            title="Rol"
            subtitle={user?.role === 'admin' ? 'Administrador' : 'Cliente'}
            showChevron={false}
            testId="mobile-row-role"
          />
        </MobileListGroup>
        
        <MobileSpacer size="md" />
        
        <MobileSectionDivider title="Seguridad" />
        <MobileListGroup>
          <MobileListRow
            icon={<Key className="h-4 w-4 text-muted-foreground" />}
            title="Cambiar Contraseña"
            subtitle="Actualiza tu contraseña de acceso"
            onClick={() => setShowPasswordSheet(true)}
            testId="mobile-row-password"
          />
        </MobileListGroup>
      </MobileContainer>

      {/* Mobile Password Sheet */}
      <Sheet open={showPasswordSheet} onOpenChange={setShowPasswordSheet}>
        <SheetContent side="bottom" className="md:hidden rounded-t-2xl h-[85vh]">
          <SheetHeader className="text-left">
            <SheetTitle>Cambiar Contraseña</SheetTitle>
          </SheetHeader>
          <form onSubmit={handleChangePassword} className="py-4 space-y-4">
            <div className="space-y-2">
              <Label htmlFor="mobileCurrentPassword" className="text-sm font-medium">Contraseña Actual</Label>
              <div className="relative">
                <Input
                  id="mobileCurrentPassword"
                  type={showCurrentPassword ? "text" : "password"}
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  placeholder="••••••••"
                  className="pr-10 h-12"
                  required
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute right-0 top-0 h-full px-3"
                  onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                >
                  {showCurrentPassword ? <EyeOff className="h-4 w-4 text-gray-400" /> : <Eye className="h-4 w-4 text-gray-400" />}
                </Button>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="mobileNewPassword" className="text-sm font-medium">Nueva Contraseña</Label>
              <div className="relative">
                <Input
                  id="mobileNewPassword"
                  type={showNewPassword ? "text" : "password"}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="••••••••"
                  className="pr-10 h-12"
                  required
                  minLength={6}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute right-0 top-0 h-full px-3"
                  onClick={() => setShowNewPassword(!showNewPassword)}
                >
                  {showNewPassword ? <EyeOff className="h-4 w-4 text-gray-400" /> : <Eye className="h-4 w-4 text-gray-400" />}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">Mínimo 6 caracteres</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="mobileConfirmPassword" className="text-sm font-medium">Confirmar Contraseña</Label>
              <Input
                id="mobileConfirmPassword"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="••••••••"
                className="h-12"
                required
                minLength={6}
              />
            </div>

            <div className="pt-4">
              <Button 
                type="submit" 
                disabled={isChangingPassword || !currentPassword || !newPassword || !confirmPassword}
                className="w-full h-12 bg-black hover:bg-gray-800"
              >
                {isChangingPassword ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Guardando...
                  </>
                ) : (
                  'Actualizar Contraseña'
                )}
              </Button>
            </div>
          </form>
        </SheetContent>
      </Sheet>

      {/* Desktop View */}
      <div className="hidden md:block p-6 max-w-4xl mx-auto">
        <div className="mb-6">
          <h1 className="text-xl font-semibold text-gray-900">Profile Settings</h1>
          <p className="text-sm text-gray-500 mt-1">Gestiona tu información personal y seguridad</p>
        </div>

        <Tabs defaultValue="personal" className="w-full">
          <TabsList className="w-full justify-start border-b rounded-none bg-transparent p-0 h-auto mb-6">
            <TabsTrigger 
              value="personal" 
              className="rounded-none border-b-2 border-transparent data-[state=active]:border-gray-900 data-[state=active]:bg-transparent px-4 py-2 text-sm"
              data-testid="tab-personal-info"
            >
              Información Personal
            </TabsTrigger>
            <TabsTrigger 
              value="password" 
              className="rounded-none border-b-2 border-transparent data-[state=active]:border-gray-900 data-[state=active]:bg-transparent px-4 py-2 text-sm"
              data-testid="tab-change-password"
            >
              Cambiar Contraseña
            </TabsTrigger>
          </TabsList>

          <TabsContent value="personal" className="mt-0">
            <div className="border border-gray-200 rounded-md">
              <div className="p-6 border-b border-gray-200">
                <div className="flex items-center gap-4">
                  <Avatar className="h-16 w-16 border border-gray-200">
                    <AvatarFallback className="bg-gray-100 text-gray-600 text-xl font-medium">
                      {user?.name?.substring(0, 2).toUpperCase() || 'US'}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="text-lg font-medium text-gray-900" data-testid="text-user-name">{user?.name || 'Usuario'}</p>
                    <p className="text-sm text-gray-500">{user?.role === 'admin' ? 'Administrador' : 'Cliente'}</p>
                  </div>
                </div>
              </div>

              <div className="divide-y divide-gray-200">
                <div className="p-6 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-900">Email</p>
                    <p className="text-sm text-gray-500 mt-1" data-testid="text-user-email">{user?.email || 'Sin email'}</p>
                  </div>
                </div>

                <div className="p-6 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-900">Rol</p>
                    <p className="text-sm text-gray-500 mt-1" data-testid="text-user-role">
                      {user?.role === 'admin' ? 'Administrador' : 'Cliente'}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="password" className="mt-0">
            <div className="border border-gray-200 rounded-md p-6">
              <form onSubmit={handleChangePassword} className="space-y-5 max-w-md">
                <div className="space-y-2">
                  <Label htmlFor="currentPassword" className="text-sm font-medium">Contraseña Actual</Label>
                  <div className="relative">
                    <Input
                      id="currentPassword"
                      type={showCurrentPassword ? "text" : "password"}
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      placeholder="••••••••"
                      className="pr-10 border-gray-200"
                      required
                      data-testid="input-current-password"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                      onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                      data-testid="toggle-current-password"
                    >
                      {showCurrentPassword ? <EyeOff className="h-4 w-4 text-gray-400" /> : <Eye className="h-4 w-4 text-gray-400" />}
                    </Button>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="newPassword" className="text-sm font-medium">Nueva Contraseña</Label>
                  <div className="relative">
                    <Input
                      id="newPassword"
                      type={showNewPassword ? "text" : "password"}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="••••••••"
                      className="pr-10 border-gray-200"
                      required
                      minLength={6}
                      data-testid="input-new-password"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                      onClick={() => setShowNewPassword(!showNewPassword)}
                      data-testid="toggle-new-password"
                    >
                      {showNewPassword ? <EyeOff className="h-4 w-4 text-gray-400" /> : <Eye className="h-4 w-4 text-gray-400" />}
                    </Button>
                  </div>
                  <p className="text-xs text-gray-500">Mínimo 6 caracteres</p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="confirmPassword" className="text-sm font-medium">Confirmar Nueva Contraseña</Label>
                  <Input
                    id="confirmPassword"
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="••••••••"
                    className="border-gray-200"
                    required
                    minLength={6}
                    data-testid="input-confirm-password"
                  />
                </div>

                <div className="pt-2">
                  <Button 
                    type="submit" 
                    disabled={isChangingPassword || !currentPassword || !newPassword || !confirmPassword}
                    className="bg-gray-900 hover:bg-gray-800"
                    data-testid="button-save-password"
                  >
                    {isChangingPassword ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Guardando...
                      </>
                    ) : (
                      'Actualizar Contraseña'
                    )}
                  </Button>
                </div>
              </form>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
