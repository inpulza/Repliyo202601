import { getProviderConfig } from '@/lib/providerConfig';
import { cn } from '@/lib/utils';

interface PlatformIconProps {
  platform: string;
  size?: 'xs' | 'sm' | 'md' | 'lg';
  showBackground?: boolean;
  className?: string;
}

const sizeClasses = {
  xs: 'h-3 w-3',
  sm: 'h-4 w-4',
  md: 'h-5 w-5',
  lg: 'h-6 w-6',
};

const containerSizeClasses = {
  xs: 'h-5 w-5',
  sm: 'h-6 w-6',
  md: 'h-8 w-8',
  lg: 'h-10 w-10',
};

export function PlatformIcon({ 
  platform, 
  size = 'sm', 
  showBackground = false,
  className 
}: PlatformIconProps) {
  const config = getProviderConfig(platform);
  const Icon = config.icon;
  
  if (showBackground) {
    return (
      <div className={cn(
        "flex items-center justify-center rounded-full",
        config.bgColor,
        containerSizeClasses[size],
        className
      )}>
        <Icon className={cn(sizeClasses[size], config.color)} />
      </div>
    );
  }

  return (
    <Icon className={cn(sizeClasses[size], config.color, className)} />
  );
}

export function getPlatformColor(platform: string): string {
  return getProviderConfig(platform).color;
}

export function getPlatformLabel(platform: string): string {
  return getProviderConfig(platform).label;
}
