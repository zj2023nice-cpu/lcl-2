import { useState, useEffect, useRef, useCallback } from 'react';
import { Send, User, X } from 'lucide-react';
import Button from '@/components/UI/Button';
import { cn } from '@/lib/utils';

interface CommentInputProps {
  onSubmit: (content: string) => Promise<unknown>;
  placeholder?: string;
  replyTarget?: { userName: string } | null;
  onCancelReply?: () => void;
  autoFocus?: boolean;
  minHeight?: number;
  maxLength?: number;
}

function useDebouncedCallback<T extends (...args: unknown[]) => void>(
  callback: T,
  delay: number,
  dependencies: unknown[] = [],
): T {
  const timeoutRef = useRef<number | null>(null);
  const callbackRef = useRef(callback);

  useEffect(() => {
    callbackRef.current = callback;
  }, [callback]);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        window.clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return useCallback(
    ((...args: unknown[]) => {
      if (timeoutRef.current) {
        window.clearTimeout(timeoutRef.current);
      }
      timeoutRef.current = window.setTimeout(() => {
        callbackRef.current(...args);
      }, delay);
    }) as T,
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [delay, ...dependencies],
  );
}

export default function CommentInput({
  onSubmit,
  placeholder = '分享你对这条线路的想法...',
  replyTarget,
  onCancelReply,
  autoFocus = false,
  minHeight = 80,
  maxLength = 2000,
}: CommentInputProps) {
  const [content, setContent] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [localLen, setLocalLen] = useState(0);

  const debouncedSetLocalLen = useDebouncedCallback(
    (len: number) => setLocalLen(len),
    150,
    [],
  );

  useEffect(() => {
    if (autoFocus && textareaRef.current) {
      textareaRef.current.focus();
      const len = textareaRef.current.value.length;
      textareaRef.current.setSelectionRange(len, len);
    }
  }, [autoFocus]);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.max(minHeight, textareaRef.current.scrollHeight)}px`;
    }
  }, [content, minHeight]);

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value.slice(0, maxLength);
    setContent(val);
    debouncedSetLocalLen(val.length);
  };

  const handleSubmit = async () => {
    const trimmed = content.trim();
    if (!trimmed || isSubmitting) return;

    setIsSubmitting(true);
    try {
      await onSubmit(trimmed);
      setContent('');
      setLocalLen(0);
      if (onCancelReply) onCancelReply();
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <div
      className={cn(
        'rounded-xl border transition-all',
        replyTarget ? 'bg-theme-subtle/50 border-theme-border' : 'bg-theme-subtle border-theme-border',
        'focus-within:border-climbing-orange-500',
      )}
    >
      {replyTarget && (
        <div className="flex items-center justify-between px-4 py-2 border-b border-theme-border/60 bg-theme-card/50">
          <div className="flex items-center gap-2 text-sm text-theme-text-secondary">
            <span className="text-climbing-orange-400">回复</span>
            <span className="inline-flex items-center gap-1">
              <User size={12} />
              {replyTarget.userName}
            </span>
          </div>
          {onCancelReply && (
            <button
              onClick={onCancelReply}
              className="p-1 rounded hover:bg-theme-hover text-theme-text-muted hover:text-theme-text transition-colors"
            >
              <X size={14} />
            </button>
          )}
        </div>
      )}
      <div className="p-4">
        <textarea
          ref={textareaRef}
          value={content}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          placeholder={replyTarget ? `回复 ${replyTarget.userName}...` : placeholder}
          rows={3}
          style={{ minHeight: `${minHeight}px` }}
          className="w-full bg-transparent text-theme-text placeholder-theme-text-muted focus:outline-none resize-none text-sm leading-relaxed"
        />
        <div className="flex items-center justify-between mt-3 pt-3 border-t border-theme-border/50">
          <span className="text-xs text-theme-text-muted">
            Ctrl + Enter 快速发送
          </span>
          <div className="flex items-center gap-3">
            <span
              className={cn(
                'text-xs',
                localLen > maxLength * 0.9 ? 'text-orange-400' : 'text-theme-text-muted',
              )}
            >
              {localLen}/{maxLength}
            </span>
            <Button
              size="sm"
              onClick={handleSubmit}
              disabled={!content.trim() || isSubmitting}
              isLoading={isSubmitting}
            >
              <Send size={14} className="mr-1.5" />
              发布
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
