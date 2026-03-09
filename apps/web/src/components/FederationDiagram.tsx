import { useState } from 'react';

const SERVICES = [
  { name: 'Users', port: 4001, color: '#9aa7b8', bg: '#2a313a', types: ['User', 'AuthPayload'], desc: 'Auth, JWT, bcrypt' },
  { name: 'Movies', port: 4002, color: '#9aad9b', bg: '#263129', types: ['Movie', 'Genre'], desc: 'Catalog, CRUD' },
  { name: 'Reviews', port: 4003, color: '#b79b95', bg: '#312725', types: ['Review', 'Rating'], desc: 'Ratings, reviews' },
  { name: 'Search', port: 4004, color: '#a89fb6', bg: '#2d2a35', types: ['SearchResult'], desc: 'FTS5, trending' },
];

function ServiceNode({ name, port, color, bg, types, desc, active, onHover }: {
  name: string;
  port: number;
  color: string;
  bg: string;
  types: string[];
  desc: string;
  active: boolean;
  onHover: (v: boolean) => void;
}) {
  return (
    <div
      onMouseEnter={() => onHover(true)}
      onMouseLeave={() => onHover(false)}
      className="min-w-[130px] flex-1 cursor-default rounded-lg border border-border bg-surface px-3 py-3.5 text-center shadow-[0_2px_6px_rgba(0,0,0,0.2)] transition-all duration-200"
      style={
        active
          ? {
              background: bg,
              borderColor: color,
              transform: 'translateY(-3px)',
              boxShadow: `0 8px 24px rgba(0,0,0,0.4), 0 0 0 1px ${color}22`,
            }
          : undefined
      }
    >
      <div className="mb-1 text-[11px] font-bold uppercase tracking-[0.05em]" style={{ color }}>
        :{port}
      </div>
      <div className="mb-1 text-sm font-bold text-text-bright">{name}</div>
      <div className="mb-2 text-[11px] text-text-muted">{desc}</div>
      <div className="flex flex-wrap justify-center gap-0.5">
        {types.map(t => (
          <span
            key={t}
            className="rounded-[3px] border border-border bg-border-subtle px-[5px] py-px text-[10px] text-text-muted transition-all duration-200"
            style={active ? { background: `${color}22`, color, borderColor: `${color}44` } : undefined}
          >
            {t}
          </span>
        ))}
      </div>
      <div className="mt-2 text-[10px] text-text-faint">SQLite</div>
    </div>
  );
}

export function FederationDiagram() {
  const [activeService, setActiveService] = useState<string | null>(null);

  return (
    <div>
      <div className="flex justify-center">
        <div className="min-w-[200px] rounded-lg border border-border bg-surface px-6 py-2.5 text-center">
          <div className="mb-0.5 text-[11px] uppercase tracking-[0.05em] text-text-muted">Browser</div>
          <div className="text-sm font-bold text-text-bright">React + Apollo Client</div>
          <div className="mt-0.5 text-[11px] text-text-muted">:5173</div>
        </div>
      </div>

      <div className="flex flex-col items-center py-1.5">
        <div className="h-4 w-px bg-border" />
        <div className="my-0.5 text-[11px] tracking-[0.03em] text-text-muted">GraphQL HTTP</div>
        <div className="h-4 w-px bg-border" />
        <div className="text-[10px] leading-none text-border">▼</div>
      </div>

      <div className="flex justify-center">
        <div className="animate-gql-ping min-w-[220px] rounded-lg border border-primary-hover bg-surface-hover px-7 py-3 text-center">
          <div className="mb-1 text-[11px] font-bold uppercase tracking-[0.06em] text-primary">Gateway · :4000</div>
          <div className="text-[15px] font-bold text-text-bright">Apollo Router</div>
          <div className="mt-1 text-[11px] text-text-muted">Query planning · Federation v2</div>
        </div>
      </div>

      <div className="flex justify-center py-1.5">
        <div className="h-3.5 w-px bg-border" />
        <div className="relative top-3.5 text-[10px] leading-none text-border">▼</div>
      </div>

      <div className="mb-2 flex items-center gap-2">
        <div className="h-px flex-1 bg-border-subtle" />
        <span className="whitespace-nowrap text-[11px] text-text-faint">Federation Subgraphs</span>
        <div className="h-px flex-1 bg-border-subtle" />
      </div>

      <div className="flex flex-wrap gap-2.5">
        {SERVICES.map(s => (
          <ServiceNode
            key={s.name}
            {...s}
            active={activeService === s.name}
            onHover={v => setActiveService(v ? s.name : null)}
          />
        ))}
      </div>

      <p className="mt-3 text-center text-[11px] text-text-faint">
        Hover a subgraph to explore · All services communicate via Apollo Federation protocol
      </p>
    </div>
  );
}
