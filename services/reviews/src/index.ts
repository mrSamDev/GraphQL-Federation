import { apollo } from '@elysiajs/apollo';
import { cors } from '@elysiajs/cors';
import { Elysia } from 'elysia';
import { createLogger, verifyToken } from '@movie-platform/shared';
import type { RequestContext } from '@movie-platform/shared';
import { schema } from './schema';
import { dbHealthCheck, getReviewStats } from './db';

const logger = createLogger('reviews');
const PORT = Number(process.env.PORT ?? 4003);
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
  .get('/reviews/stats', () => getReviewStats())
  .use(
    apollo({
      schema,
      introspection: process.env.NODE_ENV !== 'production',
      formatError: (err) => {
        logger.error({ code: err.extensions?.code, message: err.message }, 'graphql_error');
        return err;
      },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      context: (async ({ request }: any) => buildContext(request as Request)) as any,
    }),
  )
  .onAfterResponse(({ request }) => {
    const url = new URL(request.url);
    if (url.pathname === '/graphql') {
      logger.info({ method: request.method, path: url.pathname }, 'request');
    }
  })
  .listen(PORT);

logger.info({ port: PORT }, 'reviews service started');

process.on('SIGTERM', () => {
  logger.info({}, 'shutting down');
  app.stop();
  process.exit(0);
});
