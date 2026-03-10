interface Conversation {
  id: string;
  title: string;
  updatedAt: string;
}

interface Props {
  conversations: Conversation[];
  activeId: string | null;
  onSelect: (id: string) => void;
  onNew: () => void;
  onDelete: (id: string) => void;
}

function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

export function ConversationList({ conversations, activeId, onSelect, onNew, onDelete }: Props) {
  return (
    <div className="flex w-56 shrink-0 flex-col gap-2 border-r-2 border-border pr-3">
      <button
        onClick={onNew}
        className="border-2 border-border bg-primary px-3 py-2 text-[13px] font-bold text-white shadow-[3px_3px_0_#111827] transition-transform active:translate-x-[2px] active:translate-y-[2px] active:shadow-none"
      >
        + New chat
      </button>

      <div className="flex flex-col gap-1 overflow-y-auto">
        {conversations.map((c) => (
          <div key={c.id} className="group relative">
            <button
              onClick={() => onSelect(c.id)}
              className={`w-full border-2 border-border px-3 py-2 text-left text-[12px] font-medium transition-transform active:translate-x-px active:translate-y-px ${
                c.id === activeId
                  ? 'bg-primary text-white shadow-[2px_2px_0_#111827]'
                  : 'bg-surface text-text hover:bg-bg'
              }`}
            >
              <div className="truncate pr-4">{c.title}</div>
              <div className="mt-0.5 text-[11px] opacity-60">{relativeTime(c.updatedAt)}</div>
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); onDelete(c.id); }}
              className="absolute right-1 top-1 hidden border border-border bg-surface px-1 text-[10px] font-bold text-text-muted hover:border-accent hover:text-accent group-hover:block"
              title="Delete"
            >
              ×
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
