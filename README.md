# MovieDB — GraphQL Federation Platform

A full-stack movie discovery and review platform built on **Apollo Federation v2**. Four independent GraphQL subgraph services compose into a single unified API, served by an Apollo Router gateway.

---

## Architecture

```
┌─────────────────────────────────────────────┐
│        React + Vite Frontend  :5173         │
│             Apollo Client 3                 │
└────────────────────┬────────────────────────┘
                     │ GraphQL HTTP
                     ▼
┌─────────────────────────────────────────────┐
│         Apollo Router Gateway  :4000        │
│        Federation v2 · Query Planning       │
└──┬──────────┬───────────┬───────────┬───────┘
   │          │           │           │   Federation Protocol
   ▼          ▼           ▼           ▼
┌──────┐ ┌────────┐ ┌─────────┐ ┌────────┐
│Users │ │ Movies │ │ Reviews │ │ Search │
│:4001 │ │  :4002 │ │  :4003  │ │  :4004 │
└──┬───┘ └───┬────┘ └────┬────┘ └───┬────┘
   │         │           │          │
[SQLite] [SQLite]    [SQLite]  [SQLite+FTS5]
```

Each subgraph is an independent Bun service with its own SQLite database. They share no code at runtime — only the federation protocol connects them.

---

## Services

| Service  | Port | Owns                          | Notes                          |
|----------|------|-------------------------------|--------------------------------|
| Users    | 4001 | `User`, `AuthPayload`         | JWT (HS256), bcryptjs          |
| Movies   | 4002 | `Movie`, genres               | Full CRUD, paginated list      |
| Reviews  | 4003 | `Review`, ratings             | Extends `Movie` with avgRating |
| Search   | 4004 | `SearchResult`, trending      | SQLite FTS5, polls every 30s   |
| Gateway  | 4000 | Supergraph (composed schema)  | Apollo Router binary           |
| Frontend | 5173 | React SPA                     | nginx in Docker, Vite in dev   |

---

## How GraphQL Federation Works

**Federation** lets you split a GraphQL schema across multiple services without a monolith.

1. **Each subgraph** defines its slice of the schema independently. The Users service defines `User`. The Reviews service defines `Review`.

2. **Entities** (`@key` directive) let subgraphs reference types from other services. Reviews extends `Movie` — defined in the Movies service — to add `avgRating` and `reviewCount`.

3. **Apollo Router** runs `rover supergraph compose` to merge all subgraph schemas into a single **supergraph SDL**. It uses this to build optimal query plans at request time.

4. **The client** sends one query to `:4000`. The router fetches from whichever subgraphs are needed, in parallel where possible, then merges the results.

```graphql
# One client query, three subgraphs involved:
query {
  movieById(id: "1") {   # → Movies service
    title
    avgRating            # → Reviews service (extends Movie)
    reviews {
      user { username }  # → Users service (entity resolution)
    }
  }
}
```

---

## Getting Started

### Prerequisites

- [Bun](https://bun.sh) ≥ 1.0
- [Docker + Docker Compose](https://docs.docker.com/compose/)
- [Rover CLI](https://www.apollographql.com/docs/rover/) (`npm i -g @apollo/rover`)

### Run locally

```bash
# 1. Compose the supergraph schema (file-based, no services needed)
bash compose-supergraph.sh

# 2. Build Docker images
docker compose build

# 3. Start everything
docker compose up
```

Frontend: http://localhost:5173
Gateway: http://localhost:4000/graphql

### Development (without Docker)

```bash
# Install all workspace deps
bun install

# Start a specific service
cd services/users && bun run dev   # :4001
cd services/movies && bun run dev  # :4002
```

---

## Project Structure

```
graphql/
├── apps/
│   └── web/                    # React + Vite frontend
├── services/
│   ├── users/                  # Auth subgraph
│   ├── movies/                 # Catalog subgraph
│   ├── reviews/                # Reviews subgraph
│   ├── search/                 # Search subgraph
│   └── gateway/                # Apollo Router config + supergraph
├── packages/
│   └── shared/                 # Shared: logger, jwt, errors, types
├── supergraph.yaml             # rover compose config (file-based)
├── compose-supergraph.sh       # Run before docker compose build
└── docker-compose.yml
```

---

## Key Federation Directives

| Directive    | Purpose                                                               |
|--------------|-----------------------------------------------------------------------|
| `@key`       | Marks an entity's primary key. Makes the type resolvable across subgraphs. |
| `@external`  | Field is owned by another subgraph, imported for local use.          |
| `@requires`  | This field needs fields from another subgraph to resolve.            |
| `@provides`  | Hints that this subgraph can provide certain fields for an entity.   |
| `@shareable` | Field can be resolved by multiple subgraphs.                         |

---

## Auth

- JWT signed with `HS256` using `JWT_SECRET` env var
- Verified in all subgraphs via the `jose` library (pure JS, Alpine-safe)
- Passwords hashed with `bcryptjs`
- Token passed as `Authorization: Bearer <token>` header

---

## Easter Eggs

- **Logo (header)** — click 5 times quickly for a secret toast
- **Konami code** — `↑ ↑ ↓ ↓ ← → ← → B A` anywhere on the page
- **Architecture page** — Matrix Mode toggle in the top-right corner
