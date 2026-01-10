import React, { useState, useEffect } from 'react';
import { useLocation } from 'wouter';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Command, Loader2, Mail, Lock, Eye, EyeOff } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/context/AuthContext';
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  type CarouselApi,
} from '@/components/ui/carousel';
import Autoplay from 'embla-carousel-autoplay';

const carouselSlides = [
  {
    title: "Conecta con todas tus aplicaciones",
    description: "Todo lo que necesitas en un dashboard fácil de personalizar",
    icons: ['slack', 'google', 'meta', 'instagram']
  },
  {
    title: "Automatiza tus respuestas",
    description: "IA inteligente que responde por ti mientras descansas",
    icons: ['bot', 'message', 'zap', 'clock']
  },
  {
    title: "CRM integrado",
    description: "Gestiona tus contactos y conversaciones en un solo lugar",
    icons: ['users', 'inbox', 'chart', 'target']
  }
];

function FloatingIcon({ delay, children, position }: { delay: number; children: React.ReactNode; position: string }) {
  return (
    <div 
      className={`absolute ${position} bg-white rounded-2xl shadow-lg p-3 animate-float`}
      style={{ animationDelay: `${delay}s` }}
    >
      {children}
    </div>
  );
}

function DashboardMockup() {
  return (
    <div className="relative w-72 h-48 bg-white rounded-xl shadow-2xl overflow-hidden">
      <div className="bg-gray-100 h-8 flex items-center px-3 gap-1.5">
        <div className="w-2.5 h-2.5 rounded-full bg-red-400" />
        <div className="w-2.5 h-2.5 rounded-full bg-yellow-400" />
        <div className="w-2.5 h-2.5 rounded-full bg-green-400" />
      </div>
      <div className="p-3 space-y-2">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-400 to-violet-500" />
          <div className="flex-1 space-y-1">
            <div className="h-2 bg-gray-200 rounded w-3/4" />
            <div className="h-2 bg-gray-100 rounded w-1/2" />
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-pink-400 to-rose-500" />
          <div className="flex-1 space-y-1">
            <div className="h-2 bg-gray-200 rounded w-2/3" />
            <div className="h-2 bg-gray-100 rounded w-1/3" />
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-emerald-400 to-teal-500" />
          <div className="flex-1 space-y-1">
            <div className="h-2 bg-gray-200 rounded w-4/5" />
            <div className="h-2 bg-gray-100 rounded w-2/5" />
          </div>
        </div>
      </div>
    </div>
  );
}

function CarouselSlide({ slide }: { slide: typeof carouselSlides[0] }) {
  return (
    <div className="flex flex-col items-center justify-center h-full px-8">
      <div className="relative mb-12">
        <DashboardMockup />
        <FloatingIcon delay={0} position="top-0 -right-8">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
            <span className="text-white text-xs font-bold">#</span>
          </div>
        </FloatingIcon>
        <FloatingIcon delay={0.5} position="-left-10 top-1/4">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-red-500 to-orange-500 flex items-center justify-center">
            <svg className="w-4 h-4 text-white" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2z"/>
            </svg>
          </div>
        </FloatingIcon>
        <FloatingIcon delay={1} position="bottom-4 -right-12">
          <div className="w-8 h-8 rounded-full flex items-center justify-center">
            <svg className="w-6 h-6" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
          </div>
        </FloatingIcon>
        <FloatingIcon delay={1.5} position="-bottom-4 -left-6">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-600 to-blue-700 flex items-center justify-center">
            <svg className="w-4 h-4 text-white" viewBox="0 0 24 24" fill="currentColor">
              <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
            </svg>
          </div>
        </FloatingIcon>
      </div>
      <h3 className="text-2xl font-bold text-white text-center mb-3">
        {slide.title}
      </h3>
      <p className="text-indigo-100 text-center text-sm max-w-xs">
        {slide.description}
      </p>
    </div>
  );
}

export function Login() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { refreshAuth } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [api, setApi] = useState<CarouselApi>();
  const [current, setCurrent] = useState(0);

  useEffect(() => {
    if (!api) return;

    setCurrent(api.selectedScrollSnap());
    api.on('select', () => {
      setCurrent(api.selectedScrollSnap());
    });
  }, [api]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
        credentials: 'include',
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Login failed');
      }

      const user = await response.json();
      
      toast({
        title: "¡Bienvenido!",
        description: `Sesión iniciada como ${user.name}`,
      });

      await refreshAuth();
      setLocation('/inbox');
    } catch (error: any) {
      console.error('Login error:', error);
      toast({
        title: "Error de Login",
        description: error.message || 'Credenciales inválidas',
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSocialLogin = (provider: string) => {
    toast({
      title: "Próximamente",
      description: `Login con ${provider} estará disponible pronto`,
    });
  };

  return (
    <div className="min-h-screen flex">
      {/* Left Panel - Login Form */}
      <div className="w-full lg:w-1/2 bg-gray-50 flex flex-col justify-center px-8 sm:px-16 lg:px-24 py-12">
        <div className="max-w-md w-full mx-auto">
          {/* Logo */}
          <div className="flex items-center gap-3 mb-10">
            <div className="h-10 w-10 bg-gradient-to-br from-indigo-500 to-violet-600 rounded-xl flex items-center justify-center shadow-lg">
              <Command className="h-5 w-5 text-white" />
            </div>
            <span className="text-xl font-bold text-gray-900">Repliyo</span>
          </div>

          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              Inicia sesión en tu cuenta
            </h1>
            <p className="text-gray-600">
              ¡Bienvenido de nuevo! Selecciona un método para iniciar sesión:
            </p>
          </div>

          {/* Social Login Buttons */}
          <div className="grid grid-cols-2 gap-4 mb-6">
            <Button
              type="button"
              variant="outline"
              className="h-12 border-gray-300 hover:bg-gray-100 font-medium"
              onClick={() => handleSocialLogin('Google')}
              data-testid="button-google-login"
            >
              <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              Google
            </Button>
            <Button
              type="button"
              variant="outline"
              className="h-12 border-gray-300 hover:bg-gray-100 font-medium"
              onClick={() => handleSocialLogin('Facebook')}
              data-testid="button-facebook-login"
            >
              <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24" fill="#1877F2">
                <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
              </svg>
              Facebook
            </Button>
          </div>

          {/* Divider */}
          <div className="relative mb-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-300" />
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-4 bg-gray-50 text-gray-500">
                o continúa con email
              </span>
            </div>
          </div>

          {/* Login Form */}
          <form onSubmit={handleLogin} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-gray-700">Email</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                <Input
                  id="email"
                  type="email"
                  placeholder="tu@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  disabled={isLoading}
                  className="h-12 pl-10 border-gray-300 focus-visible:ring-indigo-500"
                  data-testid="input-email"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className="text-gray-700">Contraseña</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  disabled={isLoading}
                  className="h-12 pl-10 pr-10 border-gray-300 focus-visible:ring-indigo-500"
                  data-testid="input-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  data-testid="button-toggle-password"
                >
                  {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
            </div>

            {/* Remember me & Forgot Password */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Checkbox
                  id="remember"
                  checked={rememberMe}
                  onCheckedChange={(checked) => setRememberMe(checked as boolean)}
                  data-testid="checkbox-remember"
                />
                <Label htmlFor="remember" className="text-sm text-gray-600 cursor-pointer">
                  Recordarme
                </Label>
              </div>
              <button
                type="button"
                className="text-sm text-indigo-600 hover:text-indigo-700 font-medium"
                onClick={() => toast({ title: "Próximamente", description: "Recuperación de contraseña estará disponible pronto" })}
                data-testid="link-forgot-password"
              >
                ¿Olvidaste tu contraseña?
              </button>
            </div>

            {/* Submit Button */}
            <Button 
              type="submit" 
              className="w-full h-12 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 text-white shadow-md font-medium text-base"
              disabled={isLoading}
              data-testid="button-login"
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  Iniciando sesión...
                </>
              ) : (
                'Iniciar Sesión'
              )}
            </Button>
          </form>

          {/* Register Link */}
          <p className="mt-8 text-center text-gray-600">
            ¿No tienes una cuenta?{' '}
            <button
              type="button"
              className="text-indigo-600 hover:text-indigo-700 font-medium"
              onClick={() => setLocation('/register')}
              data-testid="link-register"
            >
              Crear una cuenta
            </button>
          </p>
        </div>
      </div>

      {/* Right Panel - Carousel */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-indigo-600 via-violet-600 to-purple-700 relative overflow-hidden">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC4wNSI+PGNpcmNsZSBjeD0iMzAiIGN5PSIzMCIgcj0iMiIvPjwvZz48L2c+PC9zdmc+')] opacity-50" />
        
        <Carousel
          setApi={setApi}
          opts={{ loop: true }}
          plugins={[
            Autoplay({
              delay: 5000,
              stopOnInteraction: false,
            }),
          ]}
          className="w-full h-full"
        >
          <CarouselContent className="h-full">
            {carouselSlides.map((slide, index) => (
              <CarouselItem key={index} className="h-full flex items-center justify-center">
                <CarouselSlide slide={slide} />
              </CarouselItem>
            ))}
          </CarouselContent>
        </Carousel>

        {/* Carousel Dots */}
        <div className="absolute bottom-12 left-1/2 -translate-x-1/2 flex gap-2" data-testid="carousel-dots">
          {carouselSlides.map((_, index) => (
            <button
              key={index}
              onClick={() => api?.scrollTo(index)}
              className={`w-2.5 h-2.5 rounded-full transition-all duration-300 ${
                current === index
                  ? 'bg-white w-6'
                  : 'bg-white/40 hover:bg-white/60'
              }`}
              data-testid={`carousel-dot-${index}`}
            />
          ))}
        </div>
      </div>

      {/* CSS for floating animation */}
      <style>{`
        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-10px); }
        }
        .animate-float {
          animation: float 3s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
}
