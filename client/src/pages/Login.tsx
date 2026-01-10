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

function TikTokIconWhite() {
  return (
    <svg className="w-5 h-5" viewBox="0 0 24 24">
      <path fill="#FFFFFF" d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z"/>
    </svg>
  );
}

function InstagramIconWhite() {
  return (
    <svg className="w-5 h-5" viewBox="0 0 24 24">
      <path fill="#FFFFFF" d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
    </svg>
  );
}

function FacebookIconWhite() {
  return (
    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="#FFFFFF">
      <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
    </svg>
  );
}

function GoogleIcon() {
  return (
    <svg className="w-5 h-5" viewBox="0 0 24 24">
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
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

function InstagramIcon() {
  return (
    <svg className="w-5 h-5" viewBox="0 0 24 24">
      <defs>
        <linearGradient id="instagram-gradient" x1="0%" y1="100%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#FFDC80"/>
          <stop offset="25%" stopColor="#F77737"/>
          <stop offset="50%" stopColor="#E1306C"/>
          <stop offset="75%" stopColor="#C13584"/>
          <stop offset="100%" stopColor="#833AB4"/>
        </linearGradient>
      </defs>
      <path fill="url(#instagram-gradient)" d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
    </svg>
  );
}

function MetaIcon() {
  return (
    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="#0081FB">
      <path d="M12 2C6.477 2 2 6.477 2 12c0 5.013 3.693 9.153 8.505 9.876V14.65H8.031v-2.629h2.474v-1.749c0-2.896 1.411-4.167 3.818-4.167 1.153 0 1.762.086 2.051.124v2.294h-1.642c-1.022 0-1.379.969-1.379 2.061v1.437h2.995l-.406 2.629h-2.588v7.247C18.235 21.236 22 17.062 22 12c0-5.523-4.477-10-10-10z"/>
    </svg>
  );
}

function Slide1_ConnectApps() {
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

function Slide2_AutomateResponses() {
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
              <div className="bg-gray-100 rounded-2xl rounded-tl-sm px-4 py-2.5 max-w-[90%]">
                <p className="text-sm text-gray-700">Hola! ¿Tienen disponibilidad para mañana?</p>
                <span className="text-xs text-gray-400 mt-1 block">10:32 AM</span>
              </div>
            </div>
            <div className="flex justify-end">
              <div className="bg-gradient-to-r from-indigo-500 to-violet-500 rounded-2xl rounded-tr-sm px-3 py-2 max-w-[85%]">
                <div className="flex items-center gap-1 mb-0.5">
                  <svg className="w-3 h-3 text-indigo-200" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/>
                  </svg>
                  <span className="text-[10px] text-indigo-200 font-medium">Respuesta IA</span>
                </div>
                <p className="text-xs text-white leading-relaxed">¡Hola María! Sí, tenemos disponibilidad mañana. ¿Qué horario te conviene?</p>
                <span className="text-[10px] text-indigo-200 mt-0.5 block">10:32 AM · Automático</span>
              </div>
            </div>
            <div className="flex items-center justify-center">
              <div className="flex items-center gap-2 bg-green-50 px-3 py-1.5 rounded-full">
                <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                <span className="text-xs text-green-600 font-medium">Respondido en 2 segundos</span>
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

function Slide3_IntegratedCRM() {
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

  const slides = [Slide1_ConnectApps, Slide2_AutomateResponses, Slide3_IntegratedCRM];

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
              <GoogleIcon />
              <span className="ml-2">Google</span>
            </Button>
            <Button
              type="button"
              variant="outline"
              className="h-12 border-gray-300 hover:bg-gray-100 font-medium"
              onClick={() => handleSocialLogin('Facebook')}
              data-testid="button-facebook-login"
            >
              <FacebookIcon />
              <span className="ml-2">Facebook</span>
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

          {/* Carousel Dots */}
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

      {/* CSS for floating animation */}
      <style>{`
        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-10px); }
        }
        .animate-float {
          animation: float 3s ease-in-out infinite;
        }
        .animate-pulse-slow {
          animation: pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite;
        }
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.8; }
        }
      `}</style>
    </div>
  );
}
