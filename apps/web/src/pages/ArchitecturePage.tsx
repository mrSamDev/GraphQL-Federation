import React, { useState } from 'react';
import { FederationDiagram } from '../components/FederationDiagram';

const HOW_IT_WORKS = [
  {
    step: '01',
    title: 'Client sends a GraphQL query',
    desc: 'The React app uses Apollo Client to send a single query to the Apollo Router gateway at :4000. The query can span multiple services — users, movies, reviews — in one request.',
  },
  {
    step: '02',
    title: 'Router builds a query plan',
    desc: 'Apollo Router parses the supergraph schema and generates an optimal query plan, deciding which subgraphs need to be called and in what order, minimizing round trips.',
  },
  {
    step: '03',
    title: 'Subgraphs resolve their slice',
    desc: 'Each subgraph owns its domain types. Entity references (@key directives) let subgraphs extend types defined elsewhere — Reviews extends Movie to add avgRating. The AI subgraph adds a LangChain agent layer on top, calling other services via tools rather than Federation queries.',
  },
  {
    step: '04',
    title: 'Router merges and returns',
    desc: 'The router stitches all subgraph responses into the shape the client requested. To the client, it looks like one unified API — the federation is transparent.',
  },
];

const TECH_STACK = [
  { label: 'Runtime', value: 'Bun — monorepo workspaces, native SQLite' },
  { label: 'Gateway', value: 'Apollo Router — Rust-based, Federation v2' },
  { label: 'Subgraphs', value: 'Apollo Server 4 + GraphQL Yoga patterns' },
  { label: 'Auth', value: 'HS256 JWT via jose (Alpine-safe), bcryptjs' },
  { label: 'Database', value: 'SQLite per service (bun:sqlite built-in)' },
  { label: 'Search', value: 'SQLite FTS5 + 30s sync polling from Movies/Reviews' },
  { label: 'AI Agent', value: 'LangChain + Groq llama-3.3-70b — tool-calling agent, SQLite conversation history' },
  { label: 'Frontend', value: 'React 18 + Vite + Apollo Client 3' },
  { label: 'Container', value: 'Docker Compose — nginx serves the SPA' },
];

function SectionTitle({ children }: { children: React.ReactNode }) {
  return <h2 className="mb-5 flex items-center gap-2.5 text-lg font-bold text-text-bright">{children}</h2>;
}

export function ArchitecturePage() {
  const [matrixMode, setMatrixMode] = useState(false);

  return (
    <div className="max-w-[860px] transition-[filter] duration-[600ms]" style={matrixMode ? { filter: 'hue-rotate(90deg) saturate(2)' } : undefined}>
      <div className="mb-12">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <span className="text-2xl">⬡</span>
            <h1 className="m-0 text-[26px] font-extrabold tracking-[-0.5px] text-text-bright">Architecture</h1>
          </div>
          <button
            onClick={() => setMatrixMode(m => !m)}
            title="Toggle Matrix mode 🟢"
            className="rounded-md border border-border px-2.5 py-1 text-[11px] text-text-faint transition-colors duration-150 hover:border-primary hover:text-primary"
          >
            {matrixMode ? '⬛ Exit Matrix' : '🟢 Matrix Mode'}
          </button>
        </div>
        <p className="m-0 max-w-[640px] text-[15px] leading-[1.7] text-text-muted">
          MovieDB is a <strong className="text-text">GraphQL Federation</strong> platform — five independent subgraph
          services compose into a single unified API via Apollo Router. Each service owns its domain, its database,
          and its schema slice.
        </p>
      </div>

      <div className="mb-[52px] rounded-xl border border-border-subtle bg-bg px-6 py-7">
        <SectionTitle>🗺 System Topology</SectionTitle>
        <FederationDiagram />
      </div>

      <div className="mb-[52px]">
        <SectionTitle>⚡ How Federation Works</SectionTitle>
        <div className="flex flex-col gap-px">
          {HOW_IT_WORKS.map(({ step, title, desc }, i) => (
            <div
              key={step}
              className={[
                'card-stagger flex gap-5 py-[18px]',
                i < HOW_IT_WORKS.length - 1 ? 'border-b border-border-subtle' : '',
              ].join(' ')}
              style={{ animationDelay: `${i * 60}ms` }}
            >
              <div className="min-w-6 pt-0.5 text-[11px] font-extrabold tracking-[0.04em] text-primary-hover">{step}</div>
              <div>
                <div className="mb-1.5 text-sm font-semibold text-text-bright">{title}</div>
                <p className="m-0 text-[13px] leading-[1.7] text-text-muted">{desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="mb-[52px]">
        <SectionTitle>🛠 Tech Stack</SectionTitle>
        <div className="grid grid-cols-[repeat(auto-fill,minmax(360px,1fr))] gap-px">
          {TECH_STACK.map(({ label, value }, i) => (
            <div key={label} className="card-stagger flex gap-4 border-b border-border-subtle py-3" style={{ animationDelay: `${i * 40}ms` }}>
              <span className="min-w-20 shrink-0 text-[13px] text-text-faint">{label}</span>
              <span className="text-[13px] text-text">{value}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="mb-[52px] rounded-[10px] border border-border bg-surface p-6">
        <SectionTitle>🤖 AI Agent</SectionTitle>
        <p className="mb-4 text-[13px] leading-[1.7] text-text-muted">
          The AI service is a 5th Apollo Federation subgraph at <code className="rounded border border-border bg-border-subtle px-1.5 py-px text-[12px] text-primary">:4005</code> built with LangChain and Groq. It exposes <code className="rounded border border-border bg-border-subtle px-1.5 py-px text-[12px] text-primary">sendMessage</code> and <code className="rounded border border-border bg-border-subtle px-1.5 py-px text-[12px] text-primary">conversation</code> queries — no separate REST layer.
        </p>
        <div className="flex flex-col gap-3">
          {[
            { term: 'Model', def: 'Groq llama-3.3-70b-versatile with tool-calling. Falls back to llama-3.1-8b-instant. Max 5 agent iterations per message.' },
            { term: 'Tools', def: 'list_movies · search_movies · get_movie_details · add_movie · add_review · execute_graphql — each makes HTTP calls to the relevant subgraph.' },
            { term: 'History', def: 'SQLite per conversation via bun:sqlite. Up to 20 messages kept per conversation for context.' },
            { term: 'Rate limit', def: '20 user messages per hour per account. Tracked by counting messages in the last 60 minutes.' },
            { term: 'Auth', def: 'JWT required for sendMessage and deleteConversation. The Bearer token is forwarded to subgraph tool calls.' },
          ].map(({ term, def }) => (
            <div key={term} className="flex gap-4 text-[13px]">
              <code className="shrink-0 self-start whitespace-nowrap rounded border border-border bg-border-subtle px-1.5 py-px text-primary">
                {term}
              </code>
              <span className="leading-[1.6] text-text-muted">{def}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-[10px] border border-border bg-surface p-6">
        <SectionTitle>📖 Key Federation Concepts</SectionTitle>
        <div className="flex flex-col gap-3.5">
          {[
            { term: '@key', def: "Marks an entity's primary key. Allows other subgraphs to reference and extend the type." },
            { term: '@external', def: 'Marks fields owned by another subgraph, required to satisfy @key resolution.' },
            { term: '@requires', def: 'Declares fields from another subgraph needed to compute a local field.' },
            { term: 'Supergraph', def: 'The composed schema artifact generated by `rover supergraph compose`. Apollo Router uses it for query planning.' },
            { term: 'Entity', def: 'A type with @key that can be referenced across subgraph boundaries. e.g. Movie is referenced by Reviews.' },
          ].map(({ term, def }) => (
            <div key={term} className="flex gap-4 text-[13px]">
              <code className="shrink-0 self-start whitespace-nowrap rounded border border-border bg-border-subtle px-1.5 py-px text-primary">
                {term}
              </code>
              <span className="leading-[1.6] text-text-muted">{def}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
