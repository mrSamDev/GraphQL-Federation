import { ui } from '../styles/ui';

interface Props {
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  disabled: boolean;
}

export function ChatInput({ value, onChange, onSubmit, disabled }: Props) {
  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (!disabled && value.trim()) onSubmit();
    }
  }

  return (
    <div className="flex gap-3 border-t-2 border-border pt-4">
      <textarea
        className={`${ui.textarea} min-h-[44px] max-h-32 flex-1 resize-none`}
        placeholder="Ask about movies… (Enter to send, Shift+Enter for newline)"
        value={value}
        rows={1}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={handleKeyDown}
        disabled={disabled}
      />
      <button
        className={ui.buttonPrimary}
        onClick={onSubmit}
        disabled={disabled || !value.trim()}
      >
        Send
      </button>
    </div>
  );
}
