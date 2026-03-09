import { ChatGroq } from '@langchain/groq';
import { AgentExecutor, createToolCallingAgent } from 'langchain/agents';
import { ChatPromptTemplate, MessagesPlaceholder } from '@langchain/core/prompts';
import { HumanMessage, AIMessage } from '@langchain/core/messages';
import { buildTools } from './tools';
import type { Message } from './db';

const SYSTEM_PROMPT = `You are a helpful movie assistant for MovieDB, a platform where users discover, add, and review films.

You have access to tools to interact with the live catalog:
- list_movies: browse available movies (use this when asked about what's available)
- get_movie_details: get a movie's full info and reviews by ID
- add_movie: add a new movie (ONLY when the user explicitly asks you to add one)
- add_review: submit a review for a movie (ONLY when the user explicitly asks to leave a review)

Be conversational and concise. When recommending films, call list_movies first to use real catalog data — never invent movie IDs. Do not call add_movie or add_review unless the user explicitly requests it.`;

const prompt = ChatPromptTemplate.fromMessages([
  ['system', SYSTEM_PROMPT],
  new MessagesPlaceholder('chat_history'),
  ['human', '{input}'],
  new MessagesPlaceholder('agent_scratchpad'),
]);

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
  const tools = buildTools(token);

  const llm = new ChatGroq({
    model: 'llama-3.3-70b-versatile',
    temperature: 0.3,
    apiKey: process.env.GROQ_API_KEY,
  });

  const agent = createToolCallingAgent({ llm, tools, prompt });
  const executor = new AgentExecutor({ agent, tools, maxIterations: 5 });

  const result = await executor.invoke({
    input: userMessage,
    chat_history: toChainHistory(history),
  });

  return String(result.output);
}
