import { Database } from 'bun:sqlite';

const dbPath = (process.env.DATABASE_URL ?? 'file:/data/ai.db').replace('file:', '');

export const db = new Database(dbPath, { create: true });

db.run('PRAGMA journal_mode=WAL');
db.run('PRAGMA foreign_keys=ON');

db.run(`
  CREATE TABLE IF NOT EXISTS conversations (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    title TEXT NOT NULL,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  )
`);

db.run(`
  CREATE TABLE IF NOT EXISTS messages (
    id TEXT PRIMARY KEY,
    conversation_id TEXT NOT NULL REFERENCES conversations(id),
    role TEXT NOT NULL CHECK(role IN ('USER', 'ASSISTANT')),
    content TEXT NOT NULL,
    created_at TEXT NOT NULL
  )
`);

db.run('CREATE INDEX IF NOT EXISTS idx_messages_conv ON messages(conversation_id, created_at)');
db.run('CREATE INDEX IF NOT EXISTS idx_conversations_user ON conversations(user_id, created_at DESC)');

export interface ConversationRow {
  id: string;
  user_id: string;
  title: string;
  created_at: string;
  updated_at: string;
}

export interface MessageRow {
  id: string;
  conversation_id: string;
  role: 'USER' | 'ASSISTANT';
  content: string;
  created_at: string;
}

export interface Conversation {
  id: string;
  userId: string;
  title: string;
  createdAt: string;
  updatedAt: string;
}

export interface Message {
  id: string;
  conversationId: string;
  role: 'USER' | 'ASSISTANT';
  content: string;
  createdAt: string;
}

function rowToConversation(row: ConversationRow): Conversation {
  return {
    id: row.id,
    userId: row.user_id,
    title: row.title,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function rowToMessage(row: MessageRow): Message {
  return {
    id: row.id,
    conversationId: row.conversation_id,
    role: row.role,
    content: row.content,
    createdAt: row.created_at,
  };
}

const insertConversation = db.prepare<ConversationRow, [string, string, string, string, string]>(
  'INSERT INTO conversations (id, user_id, title, created_at, updated_at) VALUES (?, ?, ?, ?, ?)'
);

const selectConversation = db.prepare<ConversationRow, [string]>('SELECT * FROM conversations WHERE id = ?');
const selectConversationByUser = db.prepare<ConversationRow, [string, string]>(
  'SELECT * FROM conversations WHERE id = ? AND user_id = ?'
);
const selectConversationsByUser = db.prepare<ConversationRow, [string]>(
  'SELECT * FROM conversations WHERE user_id = ? ORDER BY updated_at DESC'
);

const insertMessage = db.prepare<MessageRow, [string, string, string, string, string]>(
  'INSERT INTO messages (id, conversation_id, role, content, created_at) VALUES (?, ?, ?, ?, ?)'
);

const selectMessages = db.prepare<MessageRow, [string]>(
  'SELECT * FROM messages WHERE conversation_id = ? ORDER BY created_at ASC'
);

export function createConversation(id: string, userId: string, title: string): Conversation {
  const now = new Date().toISOString();
  insertConversation.run(id, userId, title, now, now);
  return rowToConversation(selectConversation.get(id)!);
}

export function findConversationByUser(id: string, userId: string): Conversation | null {
  const row = selectConversationByUser.get(id, userId);
  return row ? rowToConversation(row) : null;
}

export function listConversationsByUser(userId: string): Conversation[] {
  return selectConversationsByUser.all(userId).map(rowToConversation);
}

export function addMessage(id: string, conversationId: string, role: 'USER' | 'ASSISTANT', content: string): Message {
  const now = new Date().toISOString();
  insertMessage.run(id, conversationId, role, content, now);
  return rowToMessage(
    db.prepare<MessageRow, [string]>('SELECT * FROM messages WHERE id = ?').get(id)!
  );
}

export function getMessages(conversationId: string): Message[] {
  return selectMessages.all(conversationId).map(rowToMessage);
}

export function touchConversation(id: string): void {
  db.prepare('UPDATE conversations SET updated_at = ? WHERE id = ?').run(new Date().toISOString(), id);
}

export function dbHealthCheck(): boolean {
  try {
    db.prepare('SELECT 1').get();
    return true;
  } catch {
    return false;
  }
}
