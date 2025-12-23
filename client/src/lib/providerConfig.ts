import { 
  FaInstagram, 
  FaFacebookF, 
  FaTiktok, 
  FaYoutube, 
  FaLinkedinIn, 
  FaGoogle, 
  FaXTwitter,
  FaWhatsapp,
  FaPinterest
} from 'react-icons/fa6';
import { Globe } from 'lucide-react';

export interface ProviderConfig {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  color: string;
  bgColor: string;
  description: string;
}

export const PROVIDER_CONFIG: Record<string, ProviderConfig> = {
  'INSTAGRAM': { 
    icon: FaInstagram, 
    label: 'Instagram', 
    color: 'text-pink-500', 
    bgColor: 'bg-pink-50',
    description: 'DMs y comentarios'
  },
  'FACEBOOK': { 
    icon: FaFacebookF, 
    label: 'Facebook', 
    color: 'text-blue-600', 
    bgColor: 'bg-blue-50',
    description: 'Páginas y comentarios'
  },
  'TIKTOKBUSINESS': { 
    icon: FaTiktok, 
    label: 'TikTok', 
    color: 'text-black', 
    bgColor: 'bg-gray-100',
    description: 'Comentarios de videos'
  },
  'YOUTUBE': { 
    icon: FaYoutube, 
    label: 'YouTube', 
    color: 'text-red-600', 
    bgColor: 'bg-red-50',
    description: 'Comentarios del canal'
  },
  'LINKEDIN': { 
    icon: FaLinkedinIn, 
    label: 'LinkedIn', 
    color: 'text-blue-700', 
    bgColor: 'bg-blue-50',
    description: 'Páginas de empresa'
  },
  'GMB': { 
    icon: FaGoogle, 
    label: 'Google Business', 
    color: 'text-blue-500', 
    bgColor: 'bg-blue-50',
    description: 'Reseñas y Q&A'
  },
  'twitter': { 
    icon: FaXTwitter, 
    label: 'X / Twitter', 
    color: 'text-gray-800', 
    bgColor: 'bg-gray-100',
    description: 'Posts y menciones'
  },
  'WHATSAPP': { 
    icon: FaWhatsapp, 
    label: 'WhatsApp Business', 
    color: 'text-green-600', 
    bgColor: 'bg-green-50',
    description: 'Mensajería empresarial'
  },
  'PINTEREST': { 
    icon: FaPinterest, 
    label: 'Pinterest', 
    color: 'text-red-700', 
    bgColor: 'bg-red-50',
    description: 'Tableros de negocio'
  },
};

export const DEFAULT_PROVIDER_CONFIG: ProviderConfig = {
  icon: Globe,
  label: 'Unknown',
  color: 'text-gray-500',
  bgColor: 'bg-gray-100',
  description: ''
};

export function getProviderConfig(provider: string): ProviderConfig {
  const normalized = provider.toUpperCase();
  return PROVIDER_CONFIG[normalized] || PROVIDER_CONFIG[provider] || { 
    ...DEFAULT_PROVIDER_CONFIG, 
    label: provider 
  };
}

export const ALL_AVAILABLE_PROVIDERS = [
  'INSTAGRAM',
  'FACEBOOK', 
  'TIKTOKBUSINESS',
  'YOUTUBE',
  'LINKEDIN',
  'GMB',
  'twitter',
  'WHATSAPP',
  'PINTEREST'
] as const;

export function normalizeProvider(provider: string): string {
  return provider.toUpperCase();
}

export function getUnconnectedProviders(connectedProviders: string[]): string[] {
  const normalizedConnected = connectedProviders.map(p => normalizeProvider(p));
  return ALL_AVAILABLE_PROVIDERS.filter(p => !normalizedConnected.includes(normalizeProvider(p)));
}
