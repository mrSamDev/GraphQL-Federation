import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation } from '@apollo/client';
import { useAuth } from '../hooks/useAuth';
import { ChatMessages } from '../components/ChatMessages';
import { ChatInput } from '../components/ChatInput';
import { SEND_MESSAGE_MUTATION } from '../gql/operations';

interface Message {
  id: string;
  role: 'USER' | 'ASSISTANT';
  content: string;
  createdAt: string;
}

export function ChatPage() {
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isThinking, setIsThinking] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [sendMessage] = useMutation(SEND_MESSAGE_MUTATION);

  if (!isAuthenticated) {
    navigate('/login');
    return null;
  }

  async function handleSubmit() {
    const content = input.trim();
    if (!content || isThinking) return;

    const optimisticMsg: Message = {
      id: `optimistic-${Date.now()}`,
      role: 'USER',
      content,
      createdAt: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, optimisticMsg]);
    setInput('');
    setIsThinking(true);
    setError(null);

    try {
      const { data } = await sendMessage({
        variables: {
          input: { content, conversationId },
        },
      });

      const { conversation, message } = data.sendMessage;
      setConversationId(conversation.id);
      setMessages((prev) => [
        ...prev.filter((m) => m.id !== optimisticMsg.id),
        { ...optimisticMsg, id: `user-${Date.now()}` },
        message,
      ]);
    } catch (err: unknown) {
      setMessages((prev) => prev.filter((m) => m.id !== optimisticMsg.id));
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setIsThinking(false);
    }
  }

  return (
    <div className="flex h-[calc(100vh-7.5rem)] flex-col">
      <div className="mb-4 border-b-2 border-border pb-4">
        <h1 className="text-xl font-extrabold tracking-tight text-text-bright">AI Movie Assistant</h1>
        <p className="mt-0.5 text-[13px] text-text-muted">Powered by Groq · llama3-70b</p>
      </div>

      <ChatMessages messages={messages} isThinking={isThinking} />

      {error && (
        <div className="mb-3 border-2 border-border bg-surface px-3 py-2 text-[13px] font-medium text-accent">
          {error}
        </div>
      )}

      <ChatInput
        value={input}
        onChange={setInput}
        onSubmit={handleSubmit}
        disabled={isThinking}
      />
    </div>
  );
}
