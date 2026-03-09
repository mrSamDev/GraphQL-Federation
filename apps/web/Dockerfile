FROM oven/bun:1.3.0-alpine AS deps
WORKDIR /app
COPY bun.lock* package.json ./
COPY apps/web/package.json apps/web/package.json
RUN --mount=type=cache,target=/root/.bun/install/cache bun install

FROM deps AS build
COPY . .
RUN bun run --cwd apps/web build

FROM nginx:1.27-alpine AS runtime
COPY apps/web/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/apps/web/dist /usr/share/nginx/html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
