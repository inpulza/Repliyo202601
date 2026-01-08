import * as React from "react";
import { cn } from "@/lib/utils";

const promptEditorStyles = `
  .prompt-editor-textarea {
    color: transparent !important;
    -webkit-text-fill-color: transparent !important;
  }
  .prompt-editor-textarea::selection {
    background-color: hsl(var(--primary) / 0.3);
    color: transparent !important;
    -webkit-text-fill-color: transparent !important;
  }
  .prompt-editor-textarea::-moz-selection {
    background-color: hsl(var(--primary) / 0.3);
    color: transparent !important;
  }
`;

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

interface TokenRange {
  start: number;
  end: number;
  text: string;
}

function getVariableRanges(text: string): TokenRange[] {
  const regex = /\{\{[^}]+\}\}/g;
  const ranges: TokenRange[] = [];
  let match;
  while ((match = regex.exec(text)) !== null) {
    ranges.push({
      start: match.index,
      end: match.index + match[0].length,
      text: match[0],
    });
  }
  return ranges;
}

function findTokenAtPosition(ranges: TokenRange[], position: number): TokenRange | null {
  for (const range of ranges) {
    if (position > range.start && position <= range.end) {
      return range;
    }
  }
  return null;
}

function findTokenBeforePosition(ranges: TokenRange[], position: number): TokenRange | null {
  for (const range of ranges) {
    if (range.end === position) {
      return range;
    }
  }
  return null;
}

function findTokenAfterPosition(ranges: TokenRange[], position: number): TokenRange | null {
  for (const range of ranges) {
    if (range.start === position) {
      return range;
    }
  }
  return null;
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

    const handleKeyDown = React.useCallback((e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      const textarea = textareaRef.current;
      if (!textarea) return;

      const currentValue = value || '';
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const ranges = getVariableRanges(currentValue);

      if (e.key === 'Backspace') {
        if (start === end) {
          const tokenBefore = findTokenBeforePosition(ranges, start);
          const tokenAt = findTokenAtPosition(ranges, start);
          const tokenToDelete = tokenAt || tokenBefore;
          
          if (tokenToDelete) {
            e.preventDefault();
            const newValue = currentValue.substring(0, tokenToDelete.start) + currentValue.substring(tokenToDelete.end);
            onChange(newValue);
            setTimeout(() => {
              textarea.focus();
              textarea.setSelectionRange(tokenToDelete.start, tokenToDelete.start);
            }, 0);
            return;
          }
        } else {
          for (const range of ranges) {
            if ((start < range.end && end > range.start)) {
              e.preventDefault();
              let deleteStart = start;
              let deleteEnd = end;
              for (const r of ranges) {
                if (start < r.end && end > r.start) {
                  deleteStart = Math.min(deleteStart, r.start);
                  deleteEnd = Math.max(deleteEnd, r.end);
                }
              }
              const newValue = currentValue.substring(0, deleteStart) + currentValue.substring(deleteEnd);
              onChange(newValue);
              setTimeout(() => {
                textarea.focus();
                textarea.setSelectionRange(deleteStart, deleteStart);
              }, 0);
              return;
            }
          }
        }
      }

      if (e.key === 'Delete') {
        if (start === end) {
          const tokenAfter = findTokenAfterPosition(ranges, start);
          const tokenAt = findTokenAtPosition(ranges, start);
          const tokenToDelete = tokenAt || tokenAfter;
          
          if (tokenToDelete) {
            e.preventDefault();
            const newValue = currentValue.substring(0, tokenToDelete.start) + currentValue.substring(tokenToDelete.end);
            onChange(newValue);
            setTimeout(() => {
              textarea.focus();
              textarea.setSelectionRange(tokenToDelete.start, tokenToDelete.start);
            }, 0);
            return;
          }
        } else {
          for (const range of ranges) {
            if ((start < range.end && end > range.start)) {
              e.preventDefault();
              let deleteStart = start;
              let deleteEnd = end;
              for (const r of ranges) {
                if (start < r.end && end > r.start) {
                  deleteStart = Math.min(deleteStart, r.start);
                  deleteEnd = Math.max(deleteEnd, r.end);
                }
              }
              const newValue = currentValue.substring(0, deleteStart) + currentValue.substring(deleteEnd);
              onChange(newValue);
              setTimeout(() => {
                textarea.focus();
                textarea.setSelectionRange(deleteStart, deleteStart);
              }, 0);
              return;
            }
          }
        }
      }
    }, [value, onChange]);

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
              className="inline-flex items-center justify-center rounded-md bg-primary/20 px-1.5 py-0.5 text-primary font-medium text-xs"
              style={{ 
                margin: '0 2px',
                verticalAlign: 'middle',
                lineHeight: '1.4',
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
        <style>{promptEditorStyles}</style>
        <div
          ref={overlayRef}
          className={cn(
            "absolute inset-0 pointer-events-none overflow-auto whitespace-pre-wrap break-words font-mono text-sm p-3",
            className
          )}
          style={{ 
            minHeight, 
            maxHeight,
            wordBreak: 'break-word',
            lineHeight: '1.8',
            color: 'inherit',
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
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          disabled={disabled}
          className={cn(
            "prompt-editor-textarea flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-base shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 md:text-sm font-mono resize-y",
            className
          )}
          style={{ 
            minHeight, 
            maxHeight,
            background: 'transparent',
            color: 'transparent',
            caretColor: 'hsl(var(--foreground))',
            lineHeight: '1.8',
            WebkitTextFillColor: 'transparent',
            textShadow: 'none',
          }}
          data-testid={testId}
        />
      </div>
    );
  }
);

PromptEditor.displayName = "PromptEditor";
