import { buildSubgraphSchema } from '@apollo/subgraph';
import { gql } from 'graphql-tag';
import { z } from 'zod';
import { readFileSync } from 'fs';
import {
  unauthenticatedError,
  forbiddenError,
  validationError,
  notFoundError,
} from '@movie-platform/shared';
import { createMovie, findMovieById, listMovies, updateMovie, deleteMovie, moviesByUser } from './db';
import type { RequestContext } from '@movie-platform/shared';
import type { Movie } from './db';

const typeDefs = gql(readFileSync(new URL('./schema.graphql', import.meta.url).pathname, 'utf-8'));

const AddMovieInput = z.object({
  title: z.string().min(1).max(200),
  description: z.string().max(2000).optional().nullable(),
  releaseYear: z.number().int().min(1888).max(2100).optional().nullable(),
  genres: z.array(z.string().min(1).max(50)).min(1).max(20),
});

const UpdateMovieInput = z.object({
  title: z.string().min(1).max(200).optional(),
  description: z.string().max(2000).optional().nullable(),
  releaseYear: z.number().int().min(1888).max(2100).optional().nullable(),
  genres: z.array(z.string().min(1).max(50)).min(1).max(20).optional(),
});

const resolvers = {
  Query: {
    movieById(_: unknown, { id }: { id: string }) {
      return findMovieById(id);
    },
    listMovies(
      _: unknown,
      { page = 1, pageSize = 20 }: { page?: number; pageSize?: number }
    ) {
      const clampedPageSize = Math.min(pageSize, 100);
      const { movies, total } = listMovies(page, clampedPageSize);
      return { movies, total, page, pageSize: clampedPageSize };
    },
    moviesByUser(
      _: unknown,
      { userId, page = 1, pageSize = 20 }: { userId: string; page?: number; pageSize?: number }
    ) {
      const clampedPageSize = Math.min(pageSize, 100);
      const { movies, total } = moviesByUser(userId, page, clampedPageSize);
      return { movies, total, page, pageSize: clampedPageSize };
    },
  },
  Mutation: {
    addMovie(_: unknown, { input }: { input: unknown }, ctx: RequestContext) {
      if (!ctx.userId) throw unauthenticatedError();
      const result = AddMovieInput.safeParse(input);
      if (!result.success) throw validationError(result.error.issues[0].message);

      const { title, description, releaseYear, genres } = result.data;
      const id = crypto.randomUUID();
      const movie = createMovie(id, title, description ?? null, releaseYear ?? null, genres, ctx.userId);
      ctx.logger.info({ requestId: ctx.requestId, userId: ctx.userId, movieId: id }, 'addMovie');
      return movie;
    },
    updateMovie(_: unknown, { id, input }: { id: string; input: unknown }, ctx: RequestContext) {
      if (!ctx.userId) throw unauthenticatedError();

      const existing = findMovieById(id);
      if (!existing) throw notFoundError('Movie');
      if (existing.createdBy.id !== ctx.userId) throw forbiddenError();

      const result = UpdateMovieInput.safeParse(input);
      if (!result.success) throw validationError(result.error.issues[0].message);

      const updated = updateMovie(id, result.data);
      ctx.logger.info({ requestId: ctx.requestId, userId: ctx.userId, movieId: id }, 'updateMovie');
      return updated;
    },
    deleteMovie(_: unknown, { id }: { id: string }, ctx: RequestContext) {
      if (!ctx.userId) throw unauthenticatedError();

      const existing = findMovieById(id);
      if (!existing) throw notFoundError('Movie');
      if (existing.createdBy.id !== ctx.userId && ctx.role !== 'ADMIN') throw forbiddenError();

      const deleted = deleteMovie(id);
      ctx.logger.info({ requestId: ctx.requestId, userId: ctx.userId, movieId: id }, 'deleteMovie');
      return deleted;
    },
  },
  Movie: {
    __resolveReference(ref: { id: string }): Movie | null {
      return findMovieById(ref.id);
    },
  },
};

export const schema = buildSubgraphSchema({ typeDefs, resolvers });
