import React, { useState, useEffect, useRef } from 'react';
import { useLocation } from 'wouter';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Command, Loader2, Mail, Lock, Eye, EyeOff, User, ArrowLeft, CheckCircle2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/context/AuthContext';
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  type CarouselApi,
} from '@/components/ui/carousel';
import Autoplay from 'embla-carousel-autoplay';

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

function YouTubeIcon() {
  return (
    <svg className="w-6 h-6" viewBox="0 0 24 24">
      <path fill="#FF0000" d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
    </svg>
  );
}

function TikTokIcon() {
  return (
    <svg className="w-6 h-6" viewBox="0 0 24 24">
      <path fill="#000000" d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z"/>
    </svg>
  );
}

function InstagramIcon() {
  return (
    <svg className="w-5 h-5" viewBox="0 0 24 24">
      <defs>
        <linearGradient id="instagram-gradient-reg" x1="0%" y1="100%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#FFDC80"/>
          <stop offset="25%" stopColor="#F77737"/>
          <stop offset="50%" stopColor="#E1306C"/>
          <stop offset="75%" stopColor="#C13584"/>
          <stop offset="100%" stopColor="#833AB4"/>
        </linearGradient>
      </defs>
      <path fill="url(#instagram-gradient-reg)" d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
    </svg>
  );
}

function FacebookIcon() {
  return (
    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="#1877F2">
      <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
    </svg>
  );
}

function Slide1_Onboarding() {
  return (
    <div className="flex flex-col items-center justify-center h-full px-8">
      <div className="relative mb-8">
        <div className="w-64 h-64 bg-white/10 rounded-full flex items-center justify-center backdrop-blur-sm">
          <div className="w-48 h-48 bg-white/20 rounded-full flex items-center justify-center">
            <div className="w-32 h-32 bg-white rounded-full flex items-center justify-center shadow-2xl">
              <CheckCircle2 className="w-16 h-16 text-indigo-600" />
            </div>
          </div>
        </div>
        
        <FloatingIcon delay={0} position="-top-4 -left-6">
          <YouTubeIcon />
        </FloatingIcon>
        <FloatingIcon delay={0.5} position="-top-4 -right-6">
          <InstagramIcon />
        </FloatingIcon>
        <FloatingIcon delay={1} position="-bottom-4 -left-6">
          <TikTokIcon />
        </FloatingIcon>
        <FloatingIcon delay={1.5} position="-bottom-4 -right-6">
          <FacebookIcon />
        </FloatingIcon>
      </div>
      
      <h3 className="text-2xl font-bold text-white text-center mb-3">
        Únete a Repliyo
      </h3>
      <p className="text-indigo-100 text-center text-sm max-w-xs">
        Gestiona todas tus conversaciones de redes sociales en un solo lugar
      </p>
    </div>
  );
}

function Slide2_Features() {
  return (
    <div className="flex flex-col items-center justify-center h-full px-8">
      <div className="space-y-4 mb-8">
        {[
          { icon: '🤖', text: 'Respuestas automáticas con IA' },
          { icon: '📊', text: 'Análisis y métricas en tiempo real' },
          { icon: '🎯', text: 'CRM integrado para tu equipo' },
          { icon: '⚡', text: 'Notificaciones inteligentes' },
        ].map((feature, i) => (
          <div 
            key={i} 
            className="flex items-center gap-4 bg-white/10 backdrop-blur-sm rounded-xl px-6 py-4 animate-float"
            style={{ animationDelay: `${i * 0.2}s` }}
          >
            <span className="text-2xl">{feature.icon}</span>
            <span className="text-white font-medium">{feature.text}</span>
          </div>
        ))}
      </div>
      
      <h3 className="text-2xl font-bold text-white text-center mb-3">
        Todo lo que necesitas
      </h3>
      <p className="text-indigo-100 text-center text-sm max-w-xs">
        Herramientas potentes para escalar tu atención al cliente
      </p>
    </div>
  );
}

function Slide3_GetStarted() {
  return (
    <div className="flex flex-col items-center justify-center h-full px-8">
      <div className="relative mb-8">
        <div className="w-80 h-56 bg-white rounded-xl shadow-2xl overflow-hidden">
          <div className="bg-gray-100 h-10 flex items-center px-4 gap-2">
            <div className="w-3 h-3 rounded-full bg-red-400" />
            <div className="w-3 h-3 rounded-full bg-yellow-400" />
            <div className="w-3 h-3 rounded-full bg-green-400" />
            <span className="ml-3 text-sm text-gray-500 font-medium">Dashboard</span>
          </div>
          <div className="p-4 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-500 to-violet-500 flex items-center justify-center">
                  <User className="w-5 h-5 text-white" />
                </div>
                <div>
                  <div className="h-2.5 bg-gray-200 rounded w-24 mb-1" />
                  <div className="h-2 bg-gray-100 rounded w-16" />
                </div>
              </div>
              <div className="px-3 py-1 bg-green-100 rounded-full">
                <span className="text-xs text-green-700 font-medium">Activo</span>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {[1, 2, 3].map(i => (
                <div key={i} className="bg-gray-50 rounded-lg p-3 text-center">
                  <div className="text-lg font-bold text-gray-800">{i * 12}</div>
                  <div className="text-xs text-gray-500">Mensajes</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
      
      <h3 className="text-2xl font-bold text-white text-center mb-3">
        Comienza en minutos
      </h3>
      <p className="text-indigo-100 text-center text-sm max-w-xs">
        Configura tu cuenta y conecta tus redes sociales rápidamente
      </p>
    </div>
  );
}

export default function Register() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { refreshAuth } = useAuth();
  
  const [step, setStep] = useState<'register' | 'verify'>('register');
  const [userId, setUserId] = useState<string | null>(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [name, setName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  
  const [verificationCode, setVerificationCode] = useState(['', '', '', '', '', '']);
  const [resendCooldown, setResendCooldown] = useState(0);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);
  
  const [api, setApi] = useState<CarouselApi>();
  const [current, setCurrent] = useState(0);

  useEffect(() => {
    if (!api) return;
    
    setCurrent(api.selectedScrollSnap());
    api.on("select", () => {
      setCurrent(api.selectedScrollSnap());
    });
  }, [api]);

  useEffect(() => {
    if (resendCooldown > 0) {
      const timer = setTimeout(() => setResendCooldown(resendCooldown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [resendCooldown]);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (password !== confirmPassword) {
      toast({
        title: "Error",
        description: "Las contraseñas no coinciden",
        variant: "destructive",
      });
      return;
    }

    if (password.length < 8) {
      toast({
        title: "Error",
        description: "La contraseña debe tener al menos 8 caracteres",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch('/api/auth/public-register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, name }),
      });

      const data = await response.json();

      if (!response.ok) {
        if (data.code === 'PENDING_VERIFICATION') {
          setUserId(data.userId);
          setStep('verify');
          toast({
            title: "Verificación pendiente",
            description: "Ya tienes un código de verificación. Revisa tu email.",
          });
          return;
        }
        throw new Error(data.error);
      }

      setUserId(data.userId);
      setStep('verify');
      setResendCooldown(60);
      toast({
        title: "Código enviado",
        description: "Revisa tu email para el código de verificación",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || 'Error al crear la cuenta',
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleCodeChange = (index: number, value: string) => {
    if (!/^\d*$/.test(value)) return;
    
    const newCode = [...verificationCode];
    newCode[index] = value.slice(-1);
    setVerificationCode(newCode);
    
    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
    
    if (newCode.every(d => d) && newCode.join('').length === 6) {
      handleVerify(newCode.join(''));
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !verificationCode[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const paste = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (paste.length === 6) {
      const newCode = paste.split('');
      setVerificationCode(newCode);
      handleVerify(paste);
    }
  };

  const handleVerify = async (code?: string) => {
    const codeToVerify = code || verificationCode.join('');
    if (codeToVerify.length !== 6) {
      toast({
        title: "Error",
        description: "Ingresa el código completo de 6 dígitos",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch('/api/auth/verify-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ userId, code: codeToVerify }),
      });

      const data = await response.json();

      if (!response.ok) {
        setVerificationCode(['', '', '', '', '', '']);
        inputRefs.current[0]?.focus();
        throw new Error(data.error);
      }

      toast({
        title: "¡Cuenta verificada!",
        description: "Bienvenido a Repliyo",
      });

      await refreshAuth();
      setLocation('/app/inbox');
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || 'Código inválido',
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendCode = async () => {
    if (resendCooldown > 0) return;

    setIsLoading(true);
    try {
      const response = await fetch('/api/auth/resend-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error);
      }

      setResendCooldown(60);
      setVerificationCode(['', '', '', '', '', '']);
      toast({
        title: "Código reenviado",
        description: "Revisa tu email para el nuevo código",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || 'Error al reenviar código',
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const slides = [Slide1_Onboarding, Slide2_Features, Slide3_GetStarted];

  return (
    <div className="min-h-screen flex">
      <div className="w-full lg:w-1/2 bg-gray-50 flex flex-col justify-center px-8 sm:px-16 lg:px-24 py-12">
        <div className="max-w-md w-full mx-auto">
          <div className="flex items-center gap-3 mb-10">
            <div className="h-10 w-10 bg-gradient-to-br from-indigo-500 to-violet-600 rounded-xl flex items-center justify-center shadow-lg">
              <Command className="h-5 w-5 text-white" />
            </div>
            <span className="text-xl font-bold text-gray-900">Repliyo</span>
          </div>

          {step === 'register' ? (
            <>
              <div className="mb-8">
                <h1 className="text-3xl font-bold text-gray-900 mb-2">
                  Crea tu cuenta
                </h1>
                <p className="text-gray-600">
                  Comienza a gestionar tus redes sociales de forma inteligente
                </p>
              </div>

              <form onSubmit={handleRegister} className="space-y-5">
                <div className="space-y-2">
                  <Label htmlFor="name" className="text-gray-700">Nombre</Label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                    <Input
                      id="name"
                      type="text"
                      placeholder="Tu nombre"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      required
                      disabled={isLoading}
                      className="h-12 pl-10 border-gray-300 focus-visible:ring-indigo-500"
                      data-testid="input-name"
                    />
                  </div>
                </div>

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
                      placeholder="Mínimo 8 caracteres"
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

                <div className="space-y-2">
                  <Label htmlFor="confirmPassword" className="text-gray-700">Confirmar Contraseña</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                    <Input
                      id="confirmPassword"
                      type={showConfirmPassword ? 'text' : 'password'}
                      placeholder="Repite tu contraseña"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      required
                      disabled={isLoading}
                      className="h-12 pl-10 pr-10 border-gray-300 focus-visible:ring-indigo-500"
                      data-testid="input-confirm-password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                      data-testid="button-toggle-confirm-password"
                    >
                      {showConfirmPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                    </button>
                  </div>
                </div>

                <Button 
                  type="submit" 
                  className="w-full h-12 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 text-white shadow-md font-medium text-base"
                  disabled={isLoading}
                  data-testid="button-register"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                      Creando cuenta...
                    </>
                  ) : (
                    'Crear Cuenta'
                  )}
                </Button>
              </form>

              <p className="mt-8 text-center text-gray-600">
                ¿Ya tienes una cuenta?{' '}
                <button
                  type="button"
                  className="text-indigo-600 hover:text-indigo-700 font-medium"
                  onClick={() => setLocation('/login')}
                  data-testid="link-login"
                >
                  Iniciar sesión
                </button>
              </p>
            </>
          ) : (
            <>
              <button
                type="button"
                onClick={() => setStep('register')}
                className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-6"
                data-testid="button-back"
              >
                <ArrowLeft className="h-4 w-4" />
                Volver
              </button>

              <div className="mb-8">
                <h1 className="text-3xl font-bold text-gray-900 mb-2">
                  Verifica tu email
                </h1>
                <p className="text-gray-600">
                  Enviamos un código de 6 dígitos a <span className="font-medium text-gray-900">{email}</span>
                </p>
              </div>

              <div className="space-y-6">
                <div className="flex justify-center gap-3" onPaste={handlePaste}>
                  {verificationCode.map((digit, index) => (
                    <Input
                      key={index}
                      ref={(el) => { inputRefs.current[index] = el; }}
                      type="text"
                      inputMode="numeric"
                      maxLength={1}
                      value={digit}
                      onChange={(e) => handleCodeChange(index, e.target.value)}
                      onKeyDown={(e) => handleKeyDown(index, e)}
                      disabled={isLoading}
                      className="w-12 h-14 text-center text-2xl font-bold border-gray-300 focus-visible:ring-indigo-500"
                      data-testid={`input-code-${index}`}
                    />
                  ))}
                </div>

                <Button 
                  type="button"
                  onClick={() => handleVerify()}
                  className="w-full h-12 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 text-white shadow-md font-medium text-base"
                  disabled={isLoading || verificationCode.some(d => !d)}
                  data-testid="button-verify"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                      Verificando...
                    </>
                  ) : (
                    'Verificar Código'
                  )}
                </Button>

                <div className="text-center">
                  <p className="text-gray-600 text-sm mb-2">
                    ¿No recibiste el código?
                  </p>
                  <button
                    type="button"
                    onClick={handleResendCode}
                    disabled={resendCooldown > 0 || isLoading}
                    className={`text-sm font-medium ${
                      resendCooldown > 0 
                        ? 'text-gray-400 cursor-not-allowed' 
                        : 'text-indigo-600 hover:text-indigo-700'
                    }`}
                    data-testid="button-resend"
                  >
                    {resendCooldown > 0 
                      ? `Reenviar en ${resendCooldown}s` 
                      : 'Reenviar código'
                    }
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-indigo-600 via-violet-600 to-purple-700 relative overflow-hidden items-center justify-center">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC4wNSI+PGNpcmNsZSBjeD0iMzAiIGN5PSIzMCIgcj0iMiIvPjwvZz48L2c+PC9zdmc+')] opacity-50" />
        
        <div className="w-full h-full flex flex-col items-center justify-center">
          <Carousel
            setApi={setApi}
            opts={{ loop: true }}
            plugins={[
              Autoplay({
                delay: 5000,
                stopOnInteraction: false,
              }),
            ]}
            className="w-full max-w-lg"
          >
            <CarouselContent>
              {slides.map((SlideComponent, index) => (
                <CarouselItem key={index}>
                  <div className="h-[520px] flex items-center justify-center">
                    <SlideComponent />
                  </div>
                </CarouselItem>
              ))}
            </CarouselContent>
          </Carousel>

          <div className="flex gap-2 mt-8" data-testid="carousel-dots">
            {slides.map((_, index) => (
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
      </div>

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
