import { useContext } from 'react';
import { MessageContext } from './MessageContext';
import MessageItem from './MessageItem';

export default function MessageContainer() {
  const context = useContext(MessageContext);

  if (!context) {
    return null;
  }

  const { messages, remove } = context;

  return (
    <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 flex flex-col gap-2 pointer-events-none">
      {messages.map((message, index) => (
        <div key={message.id} className="pointer-events-auto">
          <MessageItem
            message={message}
            onClose={() => remove(message.id)}
            index={index}
          />
        </div>
      ))}
    </div>
  );
}
