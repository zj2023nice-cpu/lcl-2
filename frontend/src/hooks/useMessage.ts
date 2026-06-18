import { useContext } from 'react';
import { MessageContext } from '@/components/UI/Message/MessageContext';
import type { MessageContextType } from '@/types';

export function useMessage(): MessageContextType {
  const context = useContext(MessageContext);

  if (!context) {
    throw new Error('useMessage must be used within a MessageProvider');
  }

  return context;
}
