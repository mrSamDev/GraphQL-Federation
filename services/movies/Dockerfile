FROM oven/bun:1.3.0-alpine AS base
WORKDIR /app

FROM base AS deps
COPY bun.lock* package.json ./
COPY packages/shared/package.json packages/shared/package.json
COPY services/movies/package.json services/movies/package.json
COPY services/users/package.json services/users/package.json
COPY services/reviews/package.json services/reviews/package.json
COPY services/search/package.json services/search/package.json
COPY apps/web/package.json apps/web/package.json
RUN --mount=type=cache,target=/root/.bun/install/cache bun install

FROM base AS runtime
RUN addgroup -S app && adduser -S app -G app
COPY --from=deps /app/node_modules /app/node_modules
COPY --from=deps /app/services /app/services
COPY --from=deps /app/packages /app/packages
COPY . .
RUN mkdir -p /data && chown -R app:app /data /app
USER app
EXPOSE 4002
CMD ["bun", "run", "services/movies/src/index.ts"]
