import { ApolloServer } from '@apollo/server';
import { HeaderMap } from '@apollo/server';
import { createLogger, verifyToken } from '@movie-platform/shared';
import type { RequestContext } from '@movie-platform/shared';
import { schema } from './schema';
import { dbHealthCheck } from './db';

const logger = createLogger('users');
const PORT = Number(process.env.PORT ?? 4001);

// In-memory rate limiter: 30 requests/min per IP for auth operations
const rateLimits = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT = 30;
const RATE_WINDOW_MS = 60_000;

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const entry = rateLimits.get(ip);
  if (!entry || now > entry.resetAt) {
    rateLimits.set(ip, { count: 1, resetAt: now + RATE_WINDOW_MS });
    return true;
  }
  if (entry.count >= RATE_LIMIT) return false;
  entry.count++;
  return true;
}

// Clean up expired entries every 5 minutes to avoid memory leaks
setInterval(() => {
  const now = Date.now();
  for (const [ip, entry] of rateLimits) {
    if (now > entry.resetAt) rateLimits.delete(ip);
  }
}, 5 * 60_000);

const JWT_SECRET = process.env.JWT_SECRET ?? 'dev-secret-change-in-production';
const CORS_ORIGIN = process.env.CORS_ORIGIN ?? 'http://localhost:5173';

const corsHeaders = {
  'Access-Control-Allow-Origin': CORS_ORIGIN,
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

const server = new ApolloServer<RequestContext>({
  schema,
  introspection: process.env.NODE_ENV !== 'production',
  formatError: (err) => {
    logger.error({ code: err.extensions?.code, message: err.message }, 'graphql_error');
    return err;
  },
});

await server.start();

async function buildContext(req: Request): Promise<RequestContext> {
  const requestId = crypto.randomUUID();
  const authHeader = req.headers.get('Authorization');
  if (authHeader?.startsWith('Bearer ')) {
    const token = authHeader.slice(7);
    const payload = await verifyToken(token, JWT_SECRET);
    if (payload) {
      return { requestId, userId: payload.sub, username: payload.username, role: payload.role, logger };
    }
  }
  return { requestId, logger };
}

const bunServer = Bun.serve({
  port: PORT,
  async fetch(req: Request) {
    const url = new URL(req.url);

    if (url.pathname === '/health/live') {
      return new Response('ok', { status: 200 });
    }

    if (url.pathname === '/health/ready') {
      const healthy = dbHealthCheck();
      return new Response(healthy ? 'ok' : 'not ready', { status: healthy ? 200 : 503 });
    }

    if (url.pathname === '/graphql') {
      if (req.method === 'OPTIONS') {
        return new Response(null, { status: 204, headers: corsHeaders });
      }

      const ip = req.headers.get('X-Forwarded-For')?.split(',')[0].trim() ?? 'unknown';
      if (!checkRateLimit(ip)) {
        logger.warn({ ip }, 'rate_limit_exceeded');
        return new Response(JSON.stringify({ errors: [{ message: 'Too many requests. Try again in a minute.' }] }), {
          status: 429,
          headers: { 'Content-Type': 'application/json', ...corsHeaders },
        });
      }

      try {
        const body = await req.json();
        const httpResponse = await server.executeHTTPGraphQLRequest({
          httpGraphQLRequest: {
            method: req.method,
            headers: new HeaderMap(req.headers),
            search: url.search,
            body,
          },
          context: () => buildContext(req),
        });

        const responseBody = httpResponse.body.kind === 'complete'
          ? httpResponse.body.string
          : JSON.stringify({ errors: [{ message: 'Unexpected response body kind' }] });

        logger.info({ method: req.method, path: url.pathname }, 'request');

        return new Response(responseBody, {
          status: httpResponse.status ?? 200,
          headers: { 'Content-Type': 'application/json', ...corsHeaders },
        });
      } catch (err) {
        logger.error({ err }, 'request_error');
        return new Response(JSON.stringify({ errors: [{ message: 'Internal server error' }] }), {
          status: 500,
          headers: { 'Content-Type': 'application/json', ...corsHeaders },
        });
      }
    }

    return new Response('Not Found', { status: 404 });
  },
});

logger.info({ port: PORT }, 'users service started');

process.on('SIGTERM', async () => {
  logger.info({}, 'shutting down');
  await server.stop();
  bunServer.stop();
  process.exit(0);
});
