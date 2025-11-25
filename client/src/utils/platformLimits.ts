
import { Platform, MessageType } from '@/lib/mockData';

// Reference Data from Feature Spec
const LIMITS = {
  instagram: {
    comment: 2200,
    dm: 1000,
  },
  facebook: {
    comment: 8000,
    dm: 20000, // Virtualmente ilimitado
  },
  tiktok: {
    comment: 150,
    dm: 4000,
  },
  youtube: {
    comment: 10000,
    dm: 0, // N/A
  },
  linkedin: {
    comment: 1250,
    dm: 20000,
  },
  // Adding defaults for other platforms in mockData
  'google-business': {
    comment: 4096, // Standard GMB limit
    dm: 4096,
  },
  whatsapp: {
    comment: 0, // N/A
    dm: 65536,
  }
};

export function getCharacterLimit(platform: Platform, type: MessageType): number {
  // Normalize platform key if needed (mockData uses specific keys)
  // The mockData 'Platform' type includes: 'instagram' | 'tiktok' | 'facebook' | 'linkedin' | 'youtube' | 'google-business' | 'whatsapp'
  
  const platformLimits = LIMITS[platform as keyof typeof LIMITS];
  
  if (!platformLimits) {
    // Default fallback if platform not found
    return 2000;
  }

  const limit = platformLimits[type];
  
  // If limit is 0 or undefined, return a safe large number or specific logic
  // For this spec, we'll assume there's always a limit unless N/A, but let's handle safe defaults
  return limit || 2000;
}
