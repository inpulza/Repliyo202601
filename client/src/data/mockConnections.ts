
export interface SocialAccount {
  id: string;
  platform: 'facebook' | 'instagram' | 'tiktok' | 'youtube' | 'linkedin' | 'google-business' | 'whatsapp' | 'twitter' | 'pinterest';
  accountName: string;
  avatarUrl: string;
  status: 'active' | 'expired' | 'connecting';
  capabilities: {
    comments: boolean;
    dms: boolean;
    reviews?: boolean;
  };
}

// Datos de ejemplo para visualizar la UI
// Todas las cuentas pertenecen al mismo cliente ("Burger King Local")
export const mockSocialAccounts: SocialAccount[] = [
  {
    id: 'acc_1',
    platform: 'instagram',
    accountName: '@burgerking_local',
    avatarUrl: 'https://images.unsplash.com/photo-1561758033-d8f3c660b13c?w=100&h=100&fit=crop', 
    status: 'active',
    capabilities: { comments: true, dms: true }
  },
  {
    id: 'acc_3',
    platform: 'facebook',
    accountName: 'Burger King Local',
    avatarUrl: 'https://images.unsplash.com/photo-1561758033-d8f3c660b13c?w=100&h=100&fit=crop',
    status: 'active',
    capabilities: { comments: true, dms: true }
  },
  {
    id: 'acc_4',
    platform: 'google-business',
    accountName: 'Burger King Downtown',
    avatarUrl: 'https://images.unsplash.com/photo-1561758033-d8f3c660b13c?w=100&h=100&fit=crop',
    status: 'active',
    capabilities: { comments: false, dms: false, reviews: true }
  },
  {
    id: 'acc_5',
    platform: 'whatsapp',
    accountName: '+1 (555) 012-3456',
    avatarUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/6/6b/WhatsApp.svg/479px-WhatsApp.svg.png',
    status: 'active',
    capabilities: { comments: false, dms: true }
  },
  {
    id: 'acc_6',
    platform: 'tiktok',
    accountName: '@burgerking_vibe',
    avatarUrl: 'https://images.unsplash.com/photo-1561758033-d8f3c660b13c?w=100&h=100&fit=crop',
    status: 'active',
    capabilities: { comments: true, dms: false }
  }
];
