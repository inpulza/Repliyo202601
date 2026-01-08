import * as React from "react";
import { cn } from "@/lib/utils";

export interface PromptEditorHandle {
  insertVariable: (text: string) => void;
  focus: () => void;
}

interface PromptEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  minHeight?: string;
  maxHeight?: string;
  disabled?: boolean;
  "data-testid"?: string;
}

export const PromptEditor = React.forwardRef<PromptEditorHandle, PromptEditorProps>(
  ({ value, onChange, placeholder, className, minHeight = "180px", maxHeight = "70vh", disabled, "data-testid": testId }, ref) => {
    const textareaRef = React.useRef<HTMLTextAreaElement>(null);
    const overlayRef = React.useRef<HTMLDivElement>(null);
    
    const syncScroll = React.useCallback(() => {
      if (overlayRef.current && textareaRef.current) {
        overlayRef.current.scrollTop = textareaRef.current.scrollTop;
        overlayRef.current.scrollLeft = textareaRef.current.scrollLeft;
      }
    }, []);

    React.useEffect(() => {
      syncScroll();
    }, [value, syncScroll]);

    const insertVariable = React.useCallback((text: string) => {
      const textarea = textareaRef.current;
      if (!textarea) return;
      
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const currentValue = value || '';
      
      const newValue = currentValue.substring(0, start) + text + currentValue.substring(end);
      onChange(newValue);
      
      setTimeout(() => {
        textarea.focus();
        const newCursorPos = start + text.length;
        textarea.setSelectionRange(newCursorPos, newCursorPos);
      }, 0);
    }, [value, onChange]);

    React.useImperativeHandle(ref, () => ({
      insertVariable,
      focus: () => textareaRef.current?.focus(),
    }), [insertVariable]);

    const renderHighlightedContent = () => {
      if (!value) return null;
      
      const regex = /(\{\{[^}]+\}\})/g;
      const parts = value.split(regex);
      
      return parts.map((part, index) => {
        if (regex.test(part)) {
          regex.lastIndex = 0;
          return (
            <span
              key={index}
              className="inline-flex items-center rounded bg-primary/15 px-1 text-primary font-medium"
              style={{ 
                margin: '0 1px',
                lineHeight: 'inherit',
              }}
            >
              {part}
            </span>
          );
        }
        return <span key={index}>{part}</span>;
      });
    };

    return (
      <div className="relative">
        <div
          ref={overlayRef}
          className={cn(
            "absolute inset-0 pointer-events-none overflow-auto whitespace-pre-wrap break-words font-mono text-sm p-3 text-transparent",
            className
          )}
          style={{ 
            minHeight, 
            maxHeight,
            wordBreak: 'break-word',
          }}
          aria-hidden="true"
        >
          {renderHighlightedContent()}
        </div>
        <textarea
          ref={textareaRef}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onScroll={syncScroll}
          placeholder={placeholder}
          disabled={disabled}
          className={cn(
            "flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-base shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 md:text-sm font-mono resize-y",
            className
          )}
          style={{ 
            minHeight, 
            maxHeight,
            background: 'transparent',
            color: 'transparent',
            caretColor: 'currentColor',
          }}
          data-testid={testId}
        />
      </div>
    );
  }
);

PromptEditor.displayName = "PromptEditor";
