import { apollo } from '@elysiajs/apollo';
import { cors } from '@elysiajs/cors';
import { Elysia } from 'elysia';
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

const app = new Elysia()
  .use(
    cors({
      origin: CORS_ORIGIN,
      methods: ['GET', 'POST', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization'],
    }),
  )
  .get('/health/live', 'ok')
  .get('/health/ready', ({ set }) => {
    const healthy = dbHealthCheck();
    if (!healthy) {
      set.status = 503;
      return 'not ready';
    }
    return 'ok';
  })
  .onBeforeHandle(({ request }) => {
    const url = new URL(request.url);
    if (url.pathname !== '/graphql' || request.method === 'OPTIONS') return;

    const ip = request.headers.get('X-Forwarded-For')?.split(',')[0].trim() ?? 'unknown';
    if (!checkRateLimit(ip)) {
      logger.warn({ ip }, 'rate_limit_exceeded');
      return new Response(JSON.stringify({ errors: [{ message: 'Too many requests. Try again in a minute.' }] }), {
        status: 429,
        headers: { 'Content-Type': 'application/json' },
      });
    }
  })
  .use(
    apollo({
      schema,
      introspection: process.env.NODE_ENV !== 'production',
      formatError: (err) => {
        logger.error({ code: err.extensions?.code, message: err.message }, 'graphql_error');
        return err;
      },
      context: async (ctx) => buildContext((ctx as { request: Request }).request),
    }),
  )
  .onAfterResponse(({ request }) => {
    const url = new URL(request.url);
    if (url.pathname === '/graphql') {
      logger.info({ method: request.method, path: url.pathname }, 'request');
    }
  })
  .listen(PORT);

logger.info({ port: PORT }, 'users service started');

process.on('SIGTERM', () => {
  logger.info({}, 'shutting down');
  app.stop();
  process.exit(0);
});
