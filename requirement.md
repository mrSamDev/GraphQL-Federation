# Movie Platform MVP Requirements (Bun + GraphQL Federation + React + SQLite)

## 1. Objective
Build a production-oriented MVP for a movie discovery and discussion platform using a Bun-based monorepo, React frontend, and GraphQL Federation backend.

The MVP must allow users to:
- Add a movie
- Comment/review a movie
- Search movies
- Browse movie details and recent activity

## 2. Architecture Overview
- Monorepo package manager/runtime: `bun`
- Frontend: `React` (Vite + TypeScript)
- API style: `GraphQL Federation` (Apollo subgraphs + Apollo Router)
- Services: independently deployable Bun services
- Databases: one `SQLite` database per service
- Containerization: Docker + Docker Compose
- Environment: local and production-like profiles

## 3. Monorepo Structure
```
/apps
  /web                 # React app (UI)
/services
  /gateway             # Apollo Router config + startup
  /users               # User subgraph + users.db
  /movies              # Movie subgraph + movies.db
  /reviews             # Reviews/comments subgraph + reviews.db
  /search              # Search subgraph + search.db (denormalized/index data)
/packages
  /shared              # Shared types, utilities, validation helpers
  /config              # Shared lint/tsconfig
/docker
  /router
```

## 4. Service Responsibilities

### 4.1 Users Service
- Owns user identity data.
- Provides user entity resolution for federation.
- SQLite DB: `users.db`
- Tables (minimum):
  - `users(id, username, email, created_at)`

### 4.2 Movies Service
- Owns movie catalog records.
- Supports create/list/get movie.
- SQLite DB: `movies.db`
- Tables:
  - `movies(id, title, description, release_year, genres_json, created_by_user_id, created_at, updated_at)`

### 4.3 Reviews Service
- Owns comments/reviews and ratings linked to movies.
- SQLite DB: `reviews.db`
- Tables:
  - `reviews(id, movie_id, user_id, comment, rating, created_at, updated_at)`

### 4.4 Search Service
- Owns search index/projection for fast query and filtering.
- Receives events from movies/reviews service (or polling sync in MVP).
- SQLite DB: `search.db`
- Tables:
  - `movie_search_index(movie_id, title, description, genres_json, release_year, avg_rating, review_count, updated_at)`

### 4.5 Gateway Service
- Apollo Router entrypoint.
- Composes subgraphs into supergraph.
- Handles auth propagation, query limits, observability hooks.

## 5. MVP Functional Requirements

### 5.1 Auth (MVP-level)
- Simple JWT-based auth.
- Access token required for create/update mutations.
- Anonymous users can browse and search.

### 5.2 Movie Features
- `addMovie` mutation: authenticated users can create movies.
- `updateMovie` mutation (owner/admin only).
- `movieById` query.
- `listMovies` query with pagination.

### 5.3 Comment/Review Features
- `addReview` mutation with rating (1-5) and comment.
- `updateReview` / `deleteReview` for owner/admin.
- `reviewsByMovie(movieId)` query.
- Duplicate review policy for MVP: one review per user per movie (enforced in DB unique constraint).

### 5.4 Search Features
- `searchMovies(query, filters, sort, pagination)` query.
- Filters: genre, release year range, min rating.
- Sort: relevance, latest, top-rated.

### 5.5 Additional MVP Feature
- `trendingMovies` query based on recent review velocity + average rating.

## 6. Non-Functional Requirements (Production-Oriented)
- Strong input validation (zod or equivalent).
- Structured logs (JSON) with request IDs.
- Health endpoints: `/health/live`, `/health/ready`.
- Graceful shutdown handling (SIGTERM).
- Timeouts and bounded concurrency for downstream calls.
- Query depth/complexity guardrails at gateway.
- CORS configured explicitly for UI origin.
- Secrets/config via environment variables only.
- Database migrations managed and repeatable.
- Basic rate limiting at gateway.

## 7. Data & Consistency
- Each service owns its own SQLite database and schema.
- No cross-service direct DB access.
- Cross-service joins only via federation.
- Search index consistency model: eventual consistency (acceptable for MVP).

## 8. API Contract (High-Level)

### Core GraphQL operations
- `Mutation.addMovie(input)`
- `Mutation.addReview(input)`
- `Query.movieById(id)`
- `Query.listMovies(page, pageSize)`
- `Query.searchMovies(query, filters, page, pageSize)`
- `Query.trendingMovies(limit)`

### Entity federation keys
- `User @key(fields: "id")`
- `Movie @key(fields: "id")`
- `Review @key(fields: "id")`

## 9. UI Requirements (React)
- Pages:
  - Login/Register (MVP simple)
  - Movie list + search/filter/sort
  - Movie details (movie info + comments)
  - Add movie form
- Components:
  - Search bar with debounce
  - Movie cards
  - Rating/comment form
  - Pagination controls
- UX:
  - Optimistic UI for review add
  - Clear error states and retries
  - Mobile-first responsive layout

## 10. Security Requirements
- JWT verification at gateway and/or subgraphs.
- Authorization checks in mutation resolvers.
- Input sanitization and max lengths for text fields.
- Password hashing (argon2 or bcrypt) if local auth is included.
- Disable GraphQL introspection in production unless explicitly enabled.

## 11. Observability Requirements
- Metrics: request latency, error rate, resolver timing.
- Logs: include `requestId`, `userId`, `operationName`.
- Tracing-ready design (OpenTelemetry-compatible hooks).

## 12. Testing Requirements
- Unit tests for services and schema resolvers.
- Integration tests per service with temp SQLite DB.
- End-to-end tests through gateway for critical flows:
  - add movie -> add review -> search movie

## 13. Delivery Milestones
1. Monorepo bootstrap and shared tooling
2. Users/movies/reviews/search subgraphs with SQLite
3. Federation composition with Apollo Router
4. React UI integration
5. Hardening: auth, logging, limits, Docker production profile

## 14. Definition of Done (MVP)
- User can create movie, comment/review it, and search it from UI.
- All services run with Docker Compose.
- Each service uses isolated SQLite DB.
- Federation works via single GraphQL endpoint.
- Basic auth, validation, logs, health checks are implemented.
