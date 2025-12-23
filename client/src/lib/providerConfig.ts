import { 
  FaInstagram, 
  FaFacebookF, 
  FaTiktok, 
  FaYoutube, 
  FaLinkedinIn, 
  FaGoogle, 
  FaXTwitter 
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
};

export const DEFAULT_PROVIDER_CONFIG: ProviderConfig = {
  icon: Globe,
  label: 'Unknown',
  color: 'text-gray-500',
  bgColor: 'bg-gray-100',
  description: ''
};

export function getProviderConfig(provider: string): ProviderConfig {
  return PROVIDER_CONFIG[provider] || { 
    ...DEFAULT_PROVIDER_CONFIG, 
    label: provider 
  };
}
