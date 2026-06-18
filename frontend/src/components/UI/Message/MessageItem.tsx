import { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';
import type { Message } from '@/types';

interface MessageItemProps {
  message: Message;
  onClose: () => void;
  index: number;
}

const iconPaths: Record<Message['type'], string> = {
  success: 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z',
  error: 'M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z',
  warning: 'M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z',
  loading: 'M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15',
};

const colorStyles: Record<Message['type'], string> = {
  success: 'bg-green-500/20 border-green-500/40 text-green-400',
  error: 'bg-red-500/20 border-red-500/40 text-red-400',
  warning: 'bg-yellow-500/20 border-yellow-500/40 text-yellow-400',
  loading: 'bg-blue-500/20 border-blue-500/40 text-blue-400',
};

const iconColors: Record<Message['type'], string> = {
  success: 'text-green-400',
  error: 'text-red-400',
  warning: 'text-yellow-400',
  loading: 'text-blue-400',
};

export default function MessageItem({ message, onClose, index }: MessageItemProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [isExiting, setIsExiting] = useState(false);

  useEffect(() => {
    const timer = requestAnimationFrame(() => {
      setIsVisible(true);
    });
    return () => cancelAnimationFrame(timer);
  }, []);

  const handleClose = () => {
    setIsExiting(true);
    setTimeout(() => {
      onClose();
    }, 300);
  };

  return (
    <div
      className={cn(
        'flex items-center gap-3 px-4 py-3 rounded-lg border backdrop-blur-sm shadow-lg',
        'min-w-[320px] max-w-md',
        colorStyles[message.type],
        'transform transition-all duration-300 ease-out',
        isExiting
          ? 'opacity-0 -translate-y-4 scale-95'
          : isVisible
          ? 'opacity-100 translate-y-0 scale-100'
          : 'opacity-0 -translate-y-8 scale-95'
      )}
      style={{
        animation: isExiting ? 'none' : `slideIn 0.3s ease-out forwards`,
        animationDelay: `${index * 50}ms`,
      }}
    >
      <div className={cn('flex-shrink-0', iconColors[message.type])}>
        {message.type === 'loading' ? (
          <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
        ) : (
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d={iconPaths[message.type]} />
          </svg>
        )}
      </div>

      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-theme-text truncate">
          {message.content}
        </p>
      </div>

      {message.mergedCount > 1 && (
        <span className={cn(
          'flex-shrink-0 px-2 py-0.5 rounded-full text-xs font-medium',
          'bg-theme-card text-theme-text'
        )}>
          {message.mergedCount}
        </span>
      )}

      <button
        onClick={handleClose}
        className={cn(
          'flex-shrink-0 p-1 rounded transition-colors',
          'hover:bg-theme-hover text-theme-text-secondary hover:text-theme-text'
        )}
      >
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>

      <style>{`
        @keyframes slideIn {
          from {
            opacity: 0;
            transform: translateY(-20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </div>
  );
}
