import { buildSubgraphSchema } from '@apollo/subgraph';
import { gql } from 'graphql-tag';
import { z } from 'zod';
import { readFileSync } from 'fs';
import { GraphQLError } from 'graphql';
import {
  unauthenticatedError,
  forbiddenError,
  validationError,
  notFoundError,
} from '@movie-platform/shared';
import {
  createReview,
  findReviewById,
  findReviewRowById,
  findReviewsByMovie,
  findReviewsByUser,
  updateReview,
  deleteReview,
} from './db';
import type { RequestContext } from '@movie-platform/shared';
import type { Review } from './db';

const typeDefs = gql(readFileSync(new URL('./schema.graphql', import.meta.url).pathname, 'utf-8'));

const AddReviewInput = z.object({
  movieId: z.string().min(1),
  comment: z.string().min(1).max(2000),
  rating: z.number().int().min(1).max(5),
});

const UpdateReviewInput = z.object({
  comment: z.string().min(1).max(2000).optional(),
  rating: z.number().int().min(1).max(5).optional(),
});

const resolvers = {
  Query: {
    reviewsByMovie(_: unknown, { movieId }: { movieId: string }) {
      return findReviewsByMovie(movieId);
    },
    reviewsByUser(_: unknown, { userId }: { userId: string }) {
      return findReviewsByUser(userId);
    },
  },
  Mutation: {
    addReview(_: unknown, { input }: { input: unknown }, ctx: RequestContext) {
      if (!ctx.userId) throw unauthenticatedError();

      const result = AddReviewInput.safeParse(input);
      if (!result.success) throw validationError(result.error.issues[0].message);

      const { movieId, comment, rating } = result.data;
      const id = crypto.randomUUID();

      try {
        const review = createReview(id, movieId, ctx.userId, comment, rating);
        ctx.logger.info({ requestId: ctx.requestId, userId: ctx.userId, movieId, reviewId: id }, 'addReview');
        return review;
      } catch (err: unknown) {
        if (err instanceof Error && err.message.includes('UNIQUE constraint failed')) {
          throw new GraphQLError('You have already reviewed this movie', {
            extensions: { code: 'DUPLICATE_REVIEW' },
          });
        }
        throw err;
      }
    },
    updateReview(_: unknown, { id, input }: { id: string; input: unknown }, ctx: RequestContext) {
      if (!ctx.userId) throw unauthenticatedError();

      const row = findReviewRowById(id);
      if (!row) throw notFoundError('Review');
      if (row.user_id !== ctx.userId) throw forbiddenError();

      const result = UpdateReviewInput.safeParse(input);
      if (!result.success) throw validationError(result.error.issues[0].message);

      const updated = updateReview(id, result.data);
      ctx.logger.info({ requestId: ctx.requestId, userId: ctx.userId, reviewId: id }, 'updateReview');
      return updated;
    },
    deleteReview(_: unknown, { id }: { id: string }, ctx: RequestContext) {
      if (!ctx.userId) throw unauthenticatedError();

      const row = findReviewRowById(id);
      if (!row) throw notFoundError('Review');
      if (row.user_id !== ctx.userId) throw forbiddenError();

      const deleted = deleteReview(id);
      ctx.logger.info({ requestId: ctx.requestId, userId: ctx.userId, reviewId: id }, 'deleteReview');
      return deleted;
    },
  },
  Review: {
    __resolveReference(ref: { id: string }): Review | null {
      return findReviewById(ref.id);
    },
  },
};

export const schema = buildSubgraphSchema({ typeDefs, resolvers });
