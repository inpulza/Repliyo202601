import React from 'react';
import { CheckCircle2, User } from 'lucide-react';

export function FloatingIcon({ delay, children, position }: { delay: number; children: React.ReactNode; position: string }) {
  return (
    <div 
      className={`absolute ${position} bg-white rounded-2xl shadow-lg p-3 animate-float`}
      style={{ animationDelay: `${delay}s` }}
    >
      {children}
    </div>
  );
}

export function YouTubeIcon() {
  return (
    <svg className="w-6 h-6" viewBox="0 0 24 24">
      <path fill="#FF0000" d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
    </svg>
  );
}

export function TikTokIcon() {
  return (
    <svg className="w-6 h-6" viewBox="0 0 24 24">
      <path fill="#000000" d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z"/>
    </svg>
  );
}

export function TikTokIconWhite() {
  return (
    <svg className="w-5 h-5" viewBox="0 0 24 24">
      <path fill="#FFFFFF" d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z"/>
    </svg>
  );
}

export function InstagramIcon() {
  return (
    <svg className="w-5 h-5" viewBox="0 0 24 24">
      <defs>
        <linearGradient id="instagram-gradient-shared" x1="0%" y1="100%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#FFDC80"/>
          <stop offset="25%" stopColor="#F77737"/>
          <stop offset="50%" stopColor="#E1306C"/>
          <stop offset="75%" stopColor="#C13584"/>
          <stop offset="100%" stopColor="#833AB4"/>
        </linearGradient>
      </defs>
      <path fill="url(#instagram-gradient-shared)" d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
    </svg>
  );
}

export function InstagramIconWhite() {
  return (
    <svg className="w-5 h-5" viewBox="0 0 24 24">
      <path fill="#FFFFFF" d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
    </svg>
  );
}

export function FacebookIcon() {
  return (
    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="#1877F2">
      <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
    </svg>
  );
}

export function FacebookIconWhite() {
  return (
    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="#FFFFFF">
      <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
    </svg>
  );
}

export function Slide1_JoinRepliyo() {
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

export function Slide2_ConnectApps() {
  return (
    <div className="flex flex-col items-center justify-center h-full px-8">
      <div className="relative mb-8">
        <div className="relative w-80 h-56 bg-white rounded-xl shadow-2xl overflow-hidden">
          <div className="bg-gray-100 h-10 flex items-center px-4 gap-2">
            <div className="w-3 h-3 rounded-full bg-red-400" />
            <div className="w-3 h-3 rounded-full bg-yellow-400" />
            <div className="w-3 h-3 rounded-full bg-green-400" />
            <span className="ml-3 text-sm text-gray-500 font-medium">Inbox Unificado</span>
          </div>
          <div className="p-4 space-y-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-pink-500 to-rose-500 flex items-center justify-center">
                <InstagramIconWhite />
              </div>
              <div className="flex-1 space-y-1.5">
                <div className="h-2.5 bg-gray-200 rounded w-3/4" />
                <div className="h-2 bg-gray-100 rounded w-1/2" />
              </div>
              <div className="w-2 h-2 rounded-full bg-green-400" />
            </div>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center">
                <FacebookIconWhite />
              </div>
              <div className="flex-1 space-y-1.5">
                <div className="h-2.5 bg-gray-200 rounded w-2/3" />
                <div className="h-2 bg-gray-100 rounded w-1/3" />
              </div>
              <div className="w-2 h-2 rounded-full bg-amber-400" />
            </div>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-black flex items-center justify-center">
                <TikTokIconWhite />
              </div>
              <div className="flex-1 space-y-1.5">
                <div className="h-2.5 bg-gray-200 rounded w-4/5" />
                <div className="h-2 bg-gray-100 rounded w-2/5" />
              </div>
              <div className="w-2 h-2 rounded-full bg-green-400" />
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
        Conecta con todas tus redes
      </h3>
      <p className="text-indigo-100 text-center text-sm max-w-xs">
        Instagram, Facebook, YouTube, TikTok y más en un solo lugar
      </p>
    </div>
  );
}

export function Slide3_AutomateResponses() {
  return (
    <div className="flex flex-col items-center justify-center h-full px-8">
      <div className="relative mb-8">
        <div className="relative w-80 h-64 bg-white rounded-xl shadow-2xl overflow-hidden">
          <div className="bg-gray-100 h-10 flex items-center px-4 gap-2">
            <div className="w-3 h-3 rounded-full bg-red-400" />
            <div className="w-3 h-3 rounded-full bg-yellow-400" />
            <div className="w-3 h-3 rounded-full bg-green-400" />
            <div className="ml-3 flex items-center gap-2">
              <div className="w-6 h-6 rounded-full bg-gradient-to-br from-pink-400 to-rose-500" />
              <span className="text-sm text-gray-600 font-medium">María García</span>
            </div>
          </div>
          <div className="p-4 space-y-3">
            <div className="flex justify-start">
              <div className="bg-gray-100 rounded-2xl rounded-tl-sm px-4 py-2.5 max-w-[80%]">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-5 h-5 rounded-full bg-gray-300" />
                  <span className="text-xs text-gray-600 font-medium">María García</span>
                </div>
                <div className="space-y-1.5">
                  <div className="h-2 bg-gray-200 rounded w-full" />
                  <div className="h-2 bg-gray-200 rounded w-3/4" />
                </div>
              </div>
            </div>
            <div className="flex justify-end">
              <div className="bg-gradient-to-r from-indigo-500 to-violet-500 rounded-2xl rounded-tr-sm px-4 py-2.5 max-w-[80%]">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-1.5">
                    <svg className="w-3.5 h-3.5 text-white" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/>
                    </svg>
                    <span className="text-xs text-white font-medium">Respuesta IA</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <div className="w-1.5 h-1.5 rounded-full bg-green-300 animate-pulse" />
                    <span className="text-[10px] text-indigo-200">2s</span>
                  </div>
                </div>
                <div className="space-y-1.5">
                  <div className="h-2 bg-white/30 rounded w-full" />
                  <div className="h-2 bg-white/30 rounded w-4/5" />
                  <div className="h-2 bg-white/30 rounded w-2/3" />
                </div>
              </div>
            </div>
          </div>
        </div>
        
        <FloatingIcon delay={0} position="-top-4 -left-6">
          <div className="w-12 h-10 bg-gray-50 rounded-lg flex flex-col justify-center px-2 gap-1">
            <div className="h-1.5 bg-gray-200 rounded w-full" />
            <div className="h-1.5 bg-gray-200 rounded w-2/3" />
          </div>
        </FloatingIcon>
        <FloatingIcon delay={0.5} position="-top-4 -right-6">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-violet-400 to-purple-500 flex items-center justify-center">
            <svg className="w-5 h-5 text-white" viewBox="0 0 24 24" fill="currentColor">
              <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/>
            </svg>
          </div>
        </FloatingIcon>
        <FloatingIcon delay={1} position="-bottom-4 -right-6">
          <div className="w-12 h-10 bg-gray-50 rounded-lg flex flex-col justify-center px-2 gap-1">
            <div className="h-1.5 bg-green-200 rounded w-full" />
            <div className="h-1.5 bg-green-200 rounded w-1/2" />
          </div>
        </FloatingIcon>
      </div>
      
      <h3 className="text-2xl font-bold text-white text-center mb-3">
        Automatiza tus respuestas
      </h3>
      <p className="text-indigo-100 text-center text-sm max-w-xs">
        IA inteligente que responde por ti mientras descansas
      </p>
    </div>
  );
}

export function Slide4_IntegratedCRM() {
  return (
    <div className="flex flex-col items-center justify-center h-full px-8">
      <div className="relative mb-8">
        <div className="relative w-80 h-56 bg-white rounded-xl shadow-2xl overflow-hidden">
          <div className="bg-gradient-to-r from-indigo-500 to-violet-500 h-10 flex items-center px-4 gap-2">
            <div className="flex -space-x-2">
              <div className="w-7 h-7 rounded-full bg-pink-400 border-2 border-white" />
              <div className="w-7 h-7 rounded-full bg-blue-400 border-2 border-white" />
              <div className="w-7 h-7 rounded-full bg-green-400 border-2 border-white" />
              <div className="w-7 h-7 rounded-full bg-amber-400 border-2 border-white" />
            </div>
            <span className="text-white text-sm font-medium ml-2">+127 contactos</span>
          </div>
          <div className="p-4 space-y-2.5">
            <div className="flex items-center gap-3 p-2.5 bg-indigo-50 rounded-lg">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-rose-400 to-pink-500 flex items-center justify-center text-white text-sm font-bold">
                MC
              </div>
              <div className="flex-1">
                <div className="text-sm font-medium text-gray-800">María Castro</div>
                <div className="text-xs text-gray-500">Interesado en Premium</div>
              </div>
              <div className="flex items-center gap-1.5">
                <InstagramIcon />
                <div className="w-2.5 h-2.5 rounded-full bg-green-400" />
              </div>
            </div>
            <div className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-gray-50">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-400 to-cyan-500 flex items-center justify-center text-white text-sm font-bold">
                JL
              </div>
              <div className="flex-1">
                <div className="text-sm font-medium text-gray-800">Juan López</div>
                <div className="text-xs text-gray-500">Nuevo mensaje</div>
              </div>
              <div className="flex items-center gap-1.5">
                <FacebookIcon />
                <div className="w-2.5 h-2.5 rounded-full bg-amber-400" />
              </div>
            </div>
          </div>
        </div>
        
        <FloatingIcon delay={0} position="-top-4 -left-6">
          <div className="w-12 h-12 bg-gray-50 rounded-lg flex flex-col justify-center items-center gap-1">
            <div className="w-6 h-6 rounded-full bg-gray-200" />
            <div className="h-1 bg-gray-200 rounded w-8" />
          </div>
        </FloatingIcon>
        <FloatingIcon delay={0.5} position="-top-4 -right-6">
          <div className="w-14 h-10 bg-gray-50 rounded-lg flex items-center justify-center gap-1.5 px-2">
            <div className="w-3 h-3 rounded-full bg-emerald-300" />
            <div className="flex-1 space-y-1">
              <div className="h-1.5 bg-emerald-200 rounded w-full" />
              <div className="h-1 bg-gray-200 rounded w-2/3" />
            </div>
          </div>
        </FloatingIcon>
        <FloatingIcon delay={1} position="-bottom-4 -right-6">
          <div className="w-12 h-10 bg-gray-50 rounded-lg flex flex-col justify-center px-2 gap-1">
            <div className="flex gap-1">
              <div className="w-2 h-4 bg-violet-200 rounded-sm" />
              <div className="w-2 h-6 bg-violet-300 rounded-sm" />
              <div className="w-2 h-3 bg-violet-200 rounded-sm" />
            </div>
          </div>
        </FloatingIcon>
        <FloatingIcon delay={1.5} position="-bottom-4 -left-6">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center">
            <svg className="w-5 h-5 text-white" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
            </svg>
          </div>
        </FloatingIcon>
      </div>
      
      <h3 className="text-2xl font-bold text-white text-center mb-3">
        CRM integrado
      </h3>
      <p className="text-indigo-100 text-center text-sm max-w-xs">
        Gestiona tus contactos y conversaciones en un solo lugar
      </p>
    </div>
  );
}

export function Slide5_Features() {
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

export function Slide6_GetStarted() {
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

export const carouselSlides = [
  Slide1_JoinRepliyo,
  Slide2_ConnectApps,
  Slide3_AutomateResponses,
  Slide4_IntegratedCRM,
  Slide5_Features,
  Slide6_GetStarted,
];
