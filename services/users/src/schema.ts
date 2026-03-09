import { buildSubgraphSchema } from '@apollo/subgraph';
import { gql } from 'graphql-tag';
import { z } from 'zod';
import { readFileSync } from 'fs';
import { unauthenticatedError, forbiddenError, validationError, notFoundError } from '@movie-platform/shared';
import { createUser, findUserById, findUserByEmail, updateUserRole, storeRefreshToken, findRefreshToken, revokeRefreshToken } from './db';
import { hashPassword, comparePassword, signToken, generateRefreshToken, hashRefreshToken, REFRESH_TOKEN_EXPIRES_DAYS } from './auth';
import type { RequestContext } from '@movie-platform/shared';

const typeDefs = gql(readFileSync(new URL('./schema.graphql', import.meta.url).pathname, 'utf-8'));

const RegisterInput = z.object({
  username: z.string().min(3).max(30).regex(/^[a-zA-Z0-9_]+$/, 'Username must be alphanumeric with underscores'),
  email: z.string().email().max(255),
  password: z.string().min(8).max(100)
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number')
    .regex(/[^a-zA-Z0-9]/, 'Password must contain at least one special character'),
});

function makeRefreshExpiry(): string {
  const d = new Date();
  d.setDate(d.getDate() + REFRESH_TOKEN_EXPIRES_DAYS);
  return d.toISOString();
}

function issueTokens(user: { id: string; username: string; email: string; role: string }) {
  const token = signToken(user.id, user.username, user.email, user.role);
  const refreshToken = generateRefreshToken();
  storeRefreshToken(user.id, hashRefreshToken(refreshToken), makeRefreshExpiry());
  return { token, refreshToken, user };
}

const resolvers = {
  Query: {
    me(_: unknown, __: unknown, ctx: RequestContext) {
      if (!ctx.userId) return null;
      return findUserById(ctx.userId);
    },
    userById(_: unknown, { id }: { id: string }) {
      return findUserById(id);
    },
  },
  Mutation: {
    async register(_: unknown, args: { username: string; email: string; password: string }, ctx: RequestContext) {
      const result = RegisterInput.safeParse(args);
      if (!result.success) throw validationError(result.error.issues[0].message);

      const { username, email, password } = result.data;
      const existing = findUserByEmail(email);
      if (existing) throw validationError('Email already registered');

      const passwordHash = await hashPassword(password);
      const id = crypto.randomUUID();
      const user = createUser(id, username, email, passwordHash);
      ctx.logger.info({ requestId: ctx.requestId, userId: user.id }, 'register');
      return issueTokens(user);
    },
    async login(_: unknown, { email, password }: { email: string; password: string }, ctx: RequestContext) {
      const user = findUserByEmail(email);
      if (!user) throw unauthenticatedError();

      const valid = await comparePassword(password, user.password_hash);
      if (!valid) throw unauthenticatedError();

      ctx.logger.info({ requestId: ctx.requestId, userId: user.id }, 'login');
      return issueTokens(user);
    },
    refreshToken(_: unknown, { token }: { token: string }) {
      const tokenHash = hashRefreshToken(token);
      const stored = findRefreshToken(tokenHash);
      if (!stored || new Date(stored.expires_at) < new Date()) throw unauthenticatedError();

      const user = findUserById(stored.user_id);
      if (!user) throw unauthenticatedError();

      // Rotate: revoke old, issue new
      revokeRefreshToken(tokenHash);
      return issueTokens(user);
    },
    logout(_: unknown, { refreshToken }: { refreshToken: string }) {
      revokeRefreshToken(hashRefreshToken(refreshToken));
      return true;
    },
    promoteToAdmin(_: unknown, { userId }: { userId: string }, ctx: RequestContext) {
      if (!ctx.userId) throw unauthenticatedError();
      if (ctx.role !== 'ADMIN') throw forbiddenError();
      const user = findUserById(userId);
      if (!user) throw notFoundError('User');
      return updateUserRole(userId, 'ADMIN');
    },
  },
  User: {
    createdAt(user: { created_at: string }) {
      return user.created_at;
    },
    __resolveReference(ref: { id: string }) {
      return findUserById(ref.id);
    },
  },
};

export const schema = buildSubgraphSchema([{ typeDefs, resolvers }]);
