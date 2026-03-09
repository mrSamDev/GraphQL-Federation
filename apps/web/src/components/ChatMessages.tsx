import { useEffect, useRef } from 'react';

interface Message {
  id: string;
  role: 'USER' | 'ASSISTANT';
  content: string;
  createdAt: string;
}

interface Props {
  messages: Message[];
  isThinking: boolean;
}

export function ChatMessages({ messages, isThinking }: Props) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isThinking]);

  if (messages.length === 0 && !isThinking) {
    return (
      <div className="flex flex-1 items-center justify-center text-sm text-text-faint">
        Ask me anything about movies — I can browse the catalog, recommend films, and add reviews for you.
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col gap-3 overflow-y-auto py-4">
      {messages.map((msg) =>
        msg.role === 'USER' ? (
          <div key={msg.id} className="flex justify-end">
            <div className="max-w-[75%] border-2 border-border bg-primary px-4 py-2.5 text-sm font-medium text-bg shadow-hard">
              {msg.content}
            </div>
          </div>
        ) : (
          <div key={msg.id} className="flex justify-start">
            <div className="max-w-[75%] border-2 border-border bg-surface px-4 py-2.5 text-sm text-text shadow-hard whitespace-pre-wrap">
              {msg.content}
            </div>
          </div>
        )
      )}

      {isThinking && (
        <div className="flex justify-start">
          <div className="border-2 border-border bg-surface px-4 py-2.5 text-sm text-text-muted shadow-hard">
            <span className="animate-pulse">Thinking…</span>
          </div>
        </div>
      )}

      <div ref={bottomRef} />
    </div>
  );
}
