import { ChatGroq } from '@langchain/groq';
import { AgentExecutor, createToolCallingAgent } from 'langchain/agents';
import { ChatPromptTemplate, MessagesPlaceholder } from '@langchain/core/prompts';
import { HumanMessage, AIMessage } from '@langchain/core/messages';
import { buildTools } from './tools';
import { fetchSchemaSDL } from './introspection';
import type { Message } from './db';

function chooseModel(input: string): string {
  const lower = input.toLowerCase();
  const needsStrong =
    lower.includes('add') ||
    lower.includes('review') ||
    lower.includes('create') ||
    lower.includes('graphql');
  if (!needsStrong && input.length < 120) return 'llama-3.1-8b-instant';
  return 'llama-3.3-70b-versatile';
}

function buildSystemPrompt(schemaSDL: string): string {
  const base = `You are a helpful movie assistant for MovieDB, a platform where users discover, add, and review films.

Tool priority (use the first tool that fits):
1. list_movies — browsing the catalog, asking what movies exist
2. search_movies — finding a movie by title or keyword (never invent IDs)
3. get_movie_details — full info + reviews for a known movieId
4. add_movie — ONLY when user explicitly asks to add a movie
5. add_review — ONLY when user explicitly asks to submit a review
6. execute_graphql — last resort for operations not covered above

Rules:
- Always call a tool when the user's question requires live data.
- Never answer from memory when a tool can fetch the answer.
- Never invent movie IDs. Use search_movies to resolve a title to an ID first.
- If a tool returns an error, read the message, fix arguments, and retry once.
- Be conversational and concise.`;

  if (!schemaSDL) return base;

  return `${base}

Available GraphQL operations (for use with execute_graphql):
${schemaSDL}`;
}

function buildPrompt(systemPrompt: string): ChatPromptTemplate {
  return ChatPromptTemplate.fromMessages([
    ['system', systemPrompt],
    new MessagesPlaceholder('chat_history'),
    ['human', '{input}'],
    new MessagesPlaceholder('agent_scratchpad'),
  ]);
}

function toChainHistory(messages: Message[]) {
  return messages.map((m) =>
    m.role === 'USER' ? new HumanMessage(m.content) : new AIMessage(m.content)
  );
}

export async function runAgent(
  userMessage: string,
  history: Message[],
  token?: string
): Promise<string> {
  const [tools, schemaSDL] = await Promise.all([
    Promise.resolve(buildTools(token)),
    fetchSchemaSDL(),
  ]);

  const llm = new ChatGroq({
    model: chooseModel(userMessage),
    temperature: 0.3,
    maxTokens: 512,
    apiKey: process.env.GROQ_API_KEY,
  });

  const prompt = buildPrompt(buildSystemPrompt(schemaSDL));
  const agent = createToolCallingAgent({ llm, tools, prompt });
  const executor = new AgentExecutor({ agent, tools, maxIterations: 5 });

  let result: Record<string, unknown>;
  try {
    result = await executor.invoke({
      input: userMessage,
      chat_history: toChainHistory(history),
    });
  } catch (err) {
    console.error('[agent] executor error:', err);
    return 'Sorry, I ran into an issue processing your request. Could you try rephrasing?';
  }

  return String(result.output);
}
