import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQuery, useLazyQuery } from '@apollo/client';
import { useAuth } from '../hooks/useAuth';
import { ChatMessages } from '../components/ChatMessages';
import { ChatInput } from '../components/ChatInput';
import { ConversationList } from '../components/ConversationList';
import {
  SEND_MESSAGE_MUTATION,
  MY_CONVERSATIONS_QUERY,
  MY_RATE_LIMIT_QUERY,
  DELETE_CONVERSATION_MUTATION,
  CONVERSATION_QUERY,
} from '../gql/operations';

interface Message {
  id: string;
  role: 'USER' | 'ASSISTANT';
  content: string;
  createdAt: string;
}

interface RateLimit {
  used: number;
  limit: number;
  resetsAt: string;
}

export function ChatPage() {
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isThinking, setIsThinking] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [rateLimit, setRateLimit] = useState<RateLimit | null>(null);
  const [showSidebar, setShowSidebar] = useState(false);

  const { data: convData, refetch: refetchConversations } = useQuery(MY_CONVERSATIONS_QUERY, {
    skip: !isAuthenticated,
  });

  useQuery(MY_RATE_LIMIT_QUERY, {
    skip: !isAuthenticated,
    onCompleted(data) {
      setRateLimit(data.myRateLimit);
    },
  });

  const [loadConversation] = useLazyQuery(CONVERSATION_QUERY, {
    onCompleted(data) {
      const conv = data.conversation;
      setConversationId(conv.id);
      setMessages(conv.messages);
    },
  });

  const [sendMessage] = useMutation(SEND_MESSAGE_MUTATION);
  const [deleteConversation] = useMutation(DELETE_CONVERSATION_MUTATION);

  if (!isAuthenticated) {
    navigate('/login');
    return null;
  }

  function handleNewChat() {
    setConversationId(null);
    setMessages([]);
    setError(null);
  }

  async function handleDeleteConversation(id: string) {
    await deleteConversation({ variables: { id } });
    if (id === conversationId) handleNewChat();
    refetchConversations();
  }

  function handleSelectConversation(id: string) {
    if (id === conversationId) return;
    setMessages([]);
    setError(null);
    setShowSidebar(false);
    loadConversation({ variables: { id } });
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
        variables: { input: { content, conversationId } },
      });

      const { conversation, message, rateLimit: rl } = data.sendMessage;
      setConversationId(conversation.id);
      setMessages((prev) => [
        ...prev.filter((m) => m.id !== optimisticMsg.id),
        { ...optimisticMsg, id: `user-${Date.now()}` },
        message,
      ]);
      setRateLimit(rl);
      refetchConversations();
    } catch (err: unknown) {
      setMessages((prev) => prev.filter((m) => m.id !== optimisticMsg.id));
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setIsThinking(false);
    }
  }

  const conversations = convData?.myConversations ?? [];

  function chatHeader(showChatsButton: boolean) {
    return (
      <div className="mb-4 border-b-2 border-border pb-4">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div className="flex items-center gap-3">
            {showChatsButton && (
              <button
                onClick={() => setShowSidebar(true)}
                className="border-2 border-border bg-bg px-2 py-1 text-[13px] font-medium text-text-muted hover:text-text"
              >
                ☰ Chats
              </button>
            )}
            <div>
              <h1 className="text-xl font-extrabold tracking-tight text-text-bright">AI Movie Assistant</h1>
              <p className="mt-0.5 text-[13px] text-text-muted">Powered by Groq · llama3-70b</p>
            </div>
          </div>
          {rateLimit && (
            <div className={`border-2 border-border px-2 py-1 text-[11px] font-bold tabular-nums ${
              rateLimit.used >= rateLimit.limit
                ? 'bg-accent text-white'
                : rateLimit.used >= rateLimit.limit - 5
                ? 'bg-yellow-100 text-yellow-800'
                : 'bg-surface text-text-muted'
            }`}>
              {rateLimit.used} / {rateLimit.limit} msgs
              <span className="ml-1 font-normal opacity-70">
                · resets {new Date(rateLimit.resetsAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>
          )}
        </div>
      </div>
    );
  }

  function chatContent() {
    return (
      <>
        <ChatMessages messages={messages} isThinking={isThinking} />
        {error && (
          <div className="mb-3 border-2 border-border bg-surface px-3 py-2 text-[13px] font-medium text-accent">
            {error}
          </div>
        )}
        <ChatInput value={input} onChange={setInput} onSubmit={handleSubmit} disabled={isThinking} />
      </>
    );
  }

  return (
    <div className="flex h-[calc(100vh-7.5rem)]">
      {/* Mobile: one panel at a time */}
      <div className="flex flex-1 flex-col sm:hidden">
        {showSidebar ? (
          <ConversationList
            conversations={conversations}
            activeId={conversationId}
            onSelect={handleSelectConversation}
            onNew={() => { handleNewChat(); setShowSidebar(false); }}
            onDelete={handleDeleteConversation}
            onClose={() => setShowSidebar(false)}
          />
        ) : (
          <div className="flex flex-1 flex-col">
            {chatHeader(true)}
            {chatContent()}
          </div>
        )}
      </div>

      {/* Desktop: two columns */}
      <div className="hidden flex-1 gap-4 sm:flex">
        <ConversationList
          conversations={conversations}
          activeId={conversationId}
          onSelect={handleSelectConversation}
          onNew={handleNewChat}
          onDelete={handleDeleteConversation}
        />
        <div className="flex flex-1 flex-col">
          {chatHeader(false)}
          {chatContent()}
        </div>
      </div>
    </div>
  );
}
