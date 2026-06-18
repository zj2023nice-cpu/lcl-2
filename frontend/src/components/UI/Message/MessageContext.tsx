import React, { createContext, useCallback, useRef, useState, useMemo, useEffect } from 'react';
import type { Message, MessageType, MessageContextType } from '@/types';

function generateMessageId(): string {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
}

const MAX_VISIBLE_MESSAGES = 5;

const DEFAULT_DURATIONS: Record<MessageType, number> = {
  success: 3000,
  error: 4000,
  warning: 3500,
  loading: 0,
};

export const MessageContext = createContext<MessageContextType | null>(null);

interface MessageProviderProps {
  children: React.ReactNode;
}

export function MessageProvider({ children }: MessageProviderProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const timersRef = useRef<Map<string, number>>(new Map());

  const clearTimer = useCallback((id: string) => {
    const timer = timersRef.current.get(id);
    if (timer) {
      window.clearTimeout(timer);
      timersRef.current.delete(id);
    }
  }, []);

  const setAutoRemove = useCallback((id: string, duration: number) => {
    clearTimer(id);
    if (duration > 0) {
      const timer = window.setTimeout(() => {
        setMessages((prev) => prev.filter((m) => m.id !== id));
        timersRef.current.delete(id);
      }, duration);
      timersRef.current.set(id, timer);
    }
  }, [clearTimer]);

  const remove = useCallback((id: string) => {
    clearTimer(id);
    setMessages((prev) => prev.filter((m) => m.id !== id));
  }, [clearTimer]);

  const clearAll = useCallback(() => {
    timersRef.current.forEach((_, id) => clearTimer(id));
    timersRef.current.clear();
    setMessages([]);
  }, [clearTimer]);

  const addMessage = useCallback(
    (type: MessageType, content: string, duration?: number): string => {
      const id = generateMessageId();
      const actualDuration = duration ?? DEFAULT_DURATIONS[type];
      const newMessage: Message = {
        id,
        type,
        content,
        duration: actualDuration,
        createdAt: Date.now(),
        mergedCount: 1,
      };

      setMessages((prev) => {
        let updated = [...prev, newMessage];

        if (updated.length > MAX_VISIBLE_MESSAGES) {
          const sameTypeMessages = updated.filter((m) => m.type === type && m.id !== id);

          if (sameTypeMessages.length > 0) {
            const earliest = sameTypeMessages.reduce((a, b) =>
              a.createdAt < b.createdAt ? a : b
            );

            updated = updated.map((m) => {
              if (m.id === earliest.id) {
                return {
                  ...m,
                  mergedCount: m.mergedCount + 1,
                  createdAt: Date.now(),
                };
              }
              return m;
            });

            updated = updated.filter((m) => m.id !== id);
            clearTimer(earliest.id);
            setAutoRemove(earliest.id, earliest.duration ?? DEFAULT_DURATIONS[type]);
          } else {
            const oldest = updated.reduce((a, b) => (a.createdAt < b.createdAt ? a : b));
            updated = updated.filter((m) => m.id !== oldest.id);
            clearTimer(oldest.id);
          }
        }

        return updated;
      });

      setAutoRemove(id, actualDuration);

      return id;
    },
    [clearTimer, setAutoRemove]
  );

  const success = useCallback(
    (content: string, duration?: number) => addMessage('success', content, duration),
    [addMessage]
  );

  const error = useCallback(
    (content: string, duration?: number) => addMessage('error', content, duration),
    [addMessage]
  );

  const warning = useCallback(
    (content: string, duration?: number) => addMessage('warning', content, duration),
    [addMessage]
  );

  const loading = useCallback(
    (content: string, duration?: number) => addMessage('loading', content, duration),
    [addMessage]
  );

  useEffect(() => {
    return () => {
      timersRef.current.forEach((_, id) => clearTimer(id));
      timersRef.current.clear();
    };
  }, [clearTimer]);

  const value = useMemo(
    () => ({
      messages,
      success,
      error,
      warning,
      loading,
      remove,
      clearAll,
    }),
    [messages, success, error, warning, loading, remove, clearAll]
  );

  return <MessageContext.Provider value={value}>{children}</MessageContext.Provider>;
}
