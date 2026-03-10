import { buildSubgraphSchema } from '@apollo/subgraph';
import { gql } from 'graphql-tag';
import { readFileSync } from 'fs';
import { unauthenticatedError, notFoundError } from '@movie-platform/shared';
import type { RequestContext } from '@movie-platform/shared';
import {
  createConversation,
  findConversationByUser,
  listConversationsByUser,
  addMessage,
  getMessages,
  touchConversation,
  countUserMessagesInLastHour,
  oldestUserMessageInLastHour,
  deleteConversation as dbDeleteConversation,
} from './db';
import { runAgent } from './agent';

const typeDefs = gql(readFileSync(new URL('./schema.graphql', import.meta.url).pathname, 'utf-8'));

interface AiContext extends RequestContext {
  token?: string;
}

const MAX_HISTORY = 20;
const HOURLY_LIMIT = 20;

function buildRateLimit(userId: string) {
  const used = countUserMessagesInLastHour(userId);
  const oldest = oldestUserMessageInLastHour(userId);
  const resetsAt = oldest
    ? new Date(new Date(oldest).getTime() + 60 * 60 * 1000).toISOString()
    : new Date(Date.now() + 60 * 60 * 1000).toISOString();
  return { used, limit: HOURLY_LIMIT, resetsAt };
}

const resolvers = {
  Query: {
    conversation(_: unknown, { id }: { id: string }, ctx: AiContext) {
      if (!ctx.userId) throw unauthenticatedError();
      const conv = findConversationByUser(id, ctx.userId);
      if (!conv) throw notFoundError('Conversation');
      return { ...conv, messages: getMessages(id) };
    },
    myConversations(_: unknown, __: unknown, ctx: AiContext) {
      if (!ctx.userId) throw unauthenticatedError();
      return listConversationsByUser(ctx.userId).map((c) => ({ ...c, messages: [] }));
    },
    myRateLimit(_: unknown, __: unknown, ctx: AiContext) {
      if (!ctx.userId) throw unauthenticatedError();
      return buildRateLimit(ctx.userId);
    },
  },
  Mutation: {
    async sendMessage(
      _: unknown,
      { input }: { input: { conversationId?: string; content: string } },
      ctx: AiContext
    ) {
      if (!ctx.userId) throw unauthenticatedError();

      const msgCount = countUserMessagesInLastHour(ctx.userId);
      if (msgCount >= HOURLY_LIMIT) throw new Error('Rate limit exceeded: 20 messages per hour');

      let conversationId = input.conversationId ?? null;

      if (!conversationId) {
        const id = crypto.randomUUID();
        createConversation(id, ctx.userId, input.content.slice(0, 60));
        conversationId = id;
      } else {
        const existing = findConversationByUser(conversationId, ctx.userId);
        if (!existing) throw notFoundError('Conversation');
      }

      addMessage(crypto.randomUUID(), conversationId, 'USER', input.content);

      const allMessages = getMessages(conversationId);
      const history = allMessages.slice(-MAX_HISTORY - 1, -1);

      const reply = await runAgent(input.content, history, ctx.token);

      const assistantMsg = addMessage(crypto.randomUUID(), conversationId, 'ASSISTANT', reply);
      touchConversation(conversationId);

      const conv = findConversationByUser(conversationId, ctx.userId)!;
      return {
        conversation: { ...conv, messages: getMessages(conversationId) },
        message: assistantMsg,
        rateLimit: buildRateLimit(ctx.userId),
      };
    },
    deleteConversation(_: unknown, { id }: { id: string }, ctx: AiContext) {
      if (!ctx.userId) throw unauthenticatedError();
      const deleted = dbDeleteConversation(id, ctx.userId);
      if (!deleted) throw notFoundError('Conversation');
      return true;
    },
  },
  Conversation: {
    __resolveReference(ref: { id: string }, ctx: AiContext) {
      if (!ctx.userId) return null;
      const conv = findConversationByUser(ref.id, ctx.userId);
      return conv ? { ...conv, messages: getMessages(ref.id) } : null;
    },
  },
};

export const schema = buildSubgraphSchema([{ typeDefs, resolvers }]);
