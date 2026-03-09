import { ApolloServer } from '@apollo/server';
import { HeaderMap } from '@apollo/server';
import { createLogger, verifyToken } from '@movie-platform/shared';
import type { RequestContext } from '@movie-platform/shared';
import { schema } from './schema';
import { dbHealthCheck } from './db';
import { startSync } from './sync';

const logger = createLogger('search');
const PORT = Number(process.env.PORT ?? 4004);
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
      return { requestId, userId: payload.sub, username: payload.username, logger };
    }
  }
  return { requestId, logger };
}

// Start polling sync from movies + reviews services
startSync();

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

logger.info({ port: PORT }, 'search service started');

process.on('SIGTERM', async () => {
  logger.info({}, 'shutting down');
  await server.stop();
  bunServer.stop();
  process.exit(0);
});
