
export interface SocialAccount {
  id: string;
  platform: 'facebook' | 'instagram' | 'tiktok' | 'youtube' | 'linkedin';
  accountName: string;
  avatarUrl: string;
  status: 'active' | 'expired' | 'connecting';
  capabilities: {
    comments: boolean;
    dms: boolean;
  };
}

// Datos de ejemplo para visualizar la UI
export const mockSocialAccounts: SocialAccount[] = [
  {
    id: 'acc_1',
    platform: 'instagram',
    accountName: 'Fortress Wellness',
    avatarUrl: 'https://images.unsplash.com/photo-1561758033-d8f3c660b13c?w=100&h=100&fit=crop', 
    status: 'active',
    capabilities: { comments: true, dms: true }
  },
  {
    id: 'acc_2',
    platform: 'tiktok',
    accountName: 'Dr. Joel',
    avatarUrl: 'https://images.unsplash.com/photo-1633332755192-727a05c4013d?w=100&h=100&fit=crop',
    status: 'active',
    capabilities: { comments: true, dms: false } // TikTok API limit
  },
  {
    id: 'acc_3',
    platform: 'facebook',
    accountName: 'Inpulza Marketing',
    avatarUrl: 'https://images.unsplash.com/photo-1572044162444-ad6021105507?w=100&h=100&fit=crop',
    status: 'active',
    capabilities: { comments: true, dms: true }
  }
];
