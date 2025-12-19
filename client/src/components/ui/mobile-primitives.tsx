import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useLocation } from 'wouter';

interface MobilePageHeaderProps {
  title: string;
  subtitle?: string;
  showBack?: boolean;
  backHref?: string;
  rightElement?: React.ReactNode;
  className?: string;
}

export function MobilePageHeader({ 
  title, 
  subtitle,
  showBack = false, 
  backHref,
  rightElement,
  className 
}: MobilePageHeaderProps) {
  const [, setLocation] = useLocation();
  
  const handleBack = () => {
    if (backHref) {
      setLocation(backHref);
    } else {
      window.history.back();
    }
  };

  return (
    <div className={cn("md:hidden sticky top-0 z-40 bg-background border-b border-border", className)}>
      <div className="flex items-center justify-between h-14 px-4">
        <div className="flex items-center gap-3 flex-1 min-w-0">
          {showBack && (
            <button 
              onClick={handleBack}
              className="flex items-center justify-center w-8 h-8 -ml-2 rounded-full hover:bg-muted active:bg-muted/80 transition-colors"
              data-testid="button-mobile-back"
            >
              <ChevronLeft className="h-5 w-5 text-foreground" />
            </button>
          )}
          <div className="flex-1 min-w-0">
            <h1 className="text-lg font-semibold text-foreground truncate" data-testid="text-mobile-page-title">
              {title}
            </h1>
            {subtitle && (
              <p className="text-xs text-muted-foreground truncate">{subtitle}</p>
            )}
          </div>
        </div>
        {rightElement && (
          <div className="flex items-center shrink-0">
            {rightElement}
          </div>
        )}
      </div>
    </div>
  );
}

interface MobileSectionDividerProps {
  title?: string;
  className?: string;
}

export function MobileSectionDivider({ title, className }: MobileSectionDividerProps) {
  return (
    <div className={cn("md:hidden", className)}>
      {title ? (
        <div className="px-4 py-3 bg-muted/30">
          <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
            {title}
          </h3>
        </div>
      ) : (
        <div className="h-2 bg-muted/30" />
      )}
    </div>
  );
}

interface MobileListRowProps {
  icon?: React.ReactNode;
  iconBgColor?: string;
  title: string;
  subtitle?: React.ReactNode;
  rightText?: string;
  rightElement?: React.ReactNode;
  showChevron?: boolean;
  onClick?: () => void;
  href?: string;
  disabled?: boolean;
  className?: string;
  testId?: string;
}

export function MobileListRow({
  icon,
  iconBgColor = "bg-muted",
  title,
  subtitle,
  rightText,
  rightElement,
  showChevron = true,
  onClick,
  href,
  disabled = false,
  className,
  testId
}: MobileListRowProps) {
  const [, setLocation] = useLocation();
  
  const handleClick = () => {
    if (disabled) return;
    if (href) {
      setLocation(href);
    } else if (onClick) {
      onClick();
    }
  };

  const isClickable = !disabled && (onClick || href);
  const hasInteractiveElement = !!rightElement && !onClick && !href;

  const content = (
    <>
      {icon && (
        <div className={cn(
          "flex items-center justify-center w-8 h-8 rounded-full shrink-0",
          iconBgColor
        )}>
          {icon}
        </div>
      )}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-foreground truncate">{title}</p>
        {subtitle && (
          <p className="text-xs text-muted-foreground truncate mt-0.5">{subtitle}</p>
        )}
      </div>
      <div className="flex items-center gap-2 shrink-0">
        {rightText && (
          <span className="text-sm text-muted-foreground">{rightText}</span>
        )}
        {rightElement}
        {showChevron && isClickable && (
          <ChevronRight className="h-4 w-4 text-muted-foreground" />
        )}
      </div>
    </>
  );

  if (hasInteractiveElement) {
    return (
      <div
        className={cn(
          "md:hidden w-full flex items-center gap-3 px-4 py-3 min-h-[56px] text-left",
          disabled && "opacity-50",
          className
        )}
        data-testid={testId}
      >
        {content}
      </div>
    );
  }

  return (
    <button
      onClick={handleClick}
      disabled={disabled}
      className={cn(
        "md:hidden w-full flex items-center gap-3 px-4 py-3 min-h-[56px] text-left transition-colors",
        isClickable && "hover:bg-muted/50 active:bg-muted",
        disabled && "opacity-50 cursor-not-allowed",
        !isClickable && "cursor-default",
        className
      )}
      data-testid={testId}
    >
      {content}
    </button>
  );
}

interface MobileListGroupProps {
  children: React.ReactNode;
  className?: string;
}

export function MobileListGroup({ children, className }: MobileListGroupProps) {
  return (
    <div className={cn("md:hidden bg-background divide-y divide-border", className)}>
      {children}
    </div>
  );
}

interface MobileStatCardProps {
  icon?: React.ReactNode;
  iconColor?: string;
  label: string;
  value: string | number;
  subtitle?: string;
  trend?: {
    value: string;
    isPositive: boolean;
  };
  className?: string;
  testId?: string;
}

export function MobileStatCard({
  icon,
  iconColor = "text-muted-foreground",
  label,
  value,
  subtitle,
  trend,
  className,
  testId
}: MobileStatCardProps) {
  return (
    <div 
      className={cn(
        "md:hidden bg-background border border-border rounded-xl p-4",
        className
      )}
      data-testid={testId}
    >
      <div className="flex items-start justify-between mb-2">
        <span className="text-xs font-medium text-muted-foreground">{label}</span>
        {icon && <span className={iconColor}>{icon}</span>}
      </div>
      <div className="flex items-baseline gap-2">
        <span className="text-2xl font-bold text-foreground">{value}</span>
        {trend && (
          <span className={cn(
            "text-xs font-medium",
            trend.isPositive ? "text-green-600" : "text-red-500"
          )}>
            {trend.value}
          </span>
        )}
      </div>
      {subtitle && (
        <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>
      )}
    </div>
  );
}

interface MobileStatGridProps {
  children: React.ReactNode;
  columns?: 1 | 2;
  className?: string;
}

export function MobileStatGrid({ children, columns = 2, className }: MobileStatGridProps) {
  return (
    <div className={cn(
      "md:hidden grid gap-3 px-4",
      columns === 2 ? "grid-cols-2" : "grid-cols-1",
      className
    )}>
      {children}
    </div>
  );
}

interface MobileCardProps {
  children: React.ReactNode;
  className?: string;
  noPadding?: boolean;
}

export function MobileCard({ children, className, noPadding = false }: MobileCardProps) {
  return (
    <div className={cn(
      "md:hidden bg-background border border-border rounded-xl overflow-hidden",
      !noPadding && "p-4",
      className
    )}>
      {children}
    </div>
  );
}

interface MobileCardHeaderProps {
  title: string;
  subtitle?: string;
  icon?: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
}

export function MobileCardHeader({ title, subtitle, icon, action, className }: MobileCardHeaderProps) {
  return (
    <div className={cn("flex items-center justify-between mb-3", className)}>
      <div className="flex items-center gap-2">
        {icon && <span className="text-muted-foreground">{icon}</span>}
        <div>
          <h3 className="text-sm font-semibold text-foreground">{title}</h3>
          {subtitle && <p className="text-xs text-muted-foreground">{subtitle}</p>}
        </div>
      </div>
      {action}
    </div>
  );
}

interface MobileContainerProps {
  children: React.ReactNode;
  className?: string;
}

export function MobileContainer({ children, className }: MobileContainerProps) {
  return (
    <div className={cn("md:hidden flex flex-col min-h-full pb-20", className)}>
      {children}
    </div>
  );
}

export function MobileSpacer({ size = 'md' }: { size?: 'sm' | 'md' | 'lg' }) {
  const sizeClasses = {
    sm: 'h-2',
    md: 'h-4',
    lg: 'h-6'
  };
  return <div className={cn("md:hidden", sizeClasses[size])} />;
}
