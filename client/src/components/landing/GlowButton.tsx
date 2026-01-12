import { ArrowRight } from "lucide-react";

interface GlowButtonProps {
  children: React.ReactNode;
  href?: string;
  onClick?: () => void;
  showArrow?: boolean;
  className?: string;
}

export function GlowButton({ 
  children, 
  href, 
  onClick, 
  showArrow = true,
  className = "" 
}: GlowButtonProps) {
  const content = (
    <span className="btn-glow-content">
      <span>{children}</span>
      {showArrow && <ArrowRight className="w-5 h-5" />}
    </span>
  );

  if (href) {
    return (
      <a 
        href={href} 
        className={`btn-glow-animated ${className}`}
        data-testid="button-glow"
      >
        {content}
      </a>
    );
  }

  return (
    <button 
      onClick={onClick} 
      className={`btn-glow-animated ${className}`}
      data-testid="button-glow"
    >
      {content}
    </button>
  );
}
