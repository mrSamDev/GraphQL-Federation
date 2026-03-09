import { buildSubgraphSchema } from '@apollo/subgraph';
import { gql } from 'graphql-tag';
import { readFileSync } from 'fs';
import { getTrending, searchWithFts, searchWithLike } from './db';
import type { RequestContext } from '@movie-platform/shared';

const typeDefs = gql(readFileSync(new URL('./schema.graphql', import.meta.url).pathname, 'utf-8'));

type SearchFilters = {
  genres?: string[];
  minRating?: number;
  maxRating?: number;
  releaseYearFrom?: number;
  releaseYearTo?: number;
};

const resolvers = {
  Query: {
    searchMovies(
      _: unknown,
      {
        query,
        filters = {},
        sort = 'RELEVANCE',
        page = 1,
        pageSize = 20,
      }: {
        query?: string;
        filters?: SearchFilters;
        sort?: string;
        page?: number;
        pageSize?: number;
      },
      ctx: RequestContext
    ) {
      const clampedPageSize = Math.min(pageSize, 100);
      ctx.logger.info({ requestId: ctx.requestId, query, sort, page }, 'searchMovies');

      if (query) {
        const { results, total } = searchWithFts(query, filters, sort, page, clampedPageSize);
        return { results, total, page, pageSize: clampedPageSize };
      }

      const { results, total } = searchWithLike(null, filters, sort, page, clampedPageSize);
      return { results, total, page, pageSize: clampedPageSize };
    },
    trendingMovies(_: unknown, { limit = 10 }: { limit?: number }, ctx: RequestContext) {
      ctx.logger.info({ requestId: ctx.requestId, limit }, 'trendingMovies');
      return getTrending(Math.min(limit, 50));
    },
  },
};

export const schema = buildSubgraphSchema({ typeDefs, resolvers });
