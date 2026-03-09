import { Database } from 'bun:sqlite';

const dbPath = (process.env.DATABASE_URL ?? 'file:/data/users.db').replace('file:', '');

export const db = new Database(dbPath, { create: true });

db.run('PRAGMA journal_mode=WAL');
db.run('PRAGMA foreign_keys=ON');

db.run(`
  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    username TEXT UNIQUE NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'USER',
    created_at TEXT NOT NULL
  )
`);

// Migrate existing databases that lack the role column
try {
  db.run("ALTER TABLE users ADD COLUMN role TEXT NOT NULL DEFAULT 'USER'");
} catch {
  // Column already exists
}

export interface UserRow {
  id: string;
  username: string;
  email: string;
  password_hash: string;
  role: string;
  created_at: string;
}

const insertUser = db.prepare<UserRow, [string, string, string, string, string]>(
  'INSERT INTO users (id, username, email, password_hash, created_at) VALUES (?, ?, ?, ?, ?)'
);

const getUserById = db.prepare<UserRow, [string]>('SELECT * FROM users WHERE id = ?');
const getUserByEmail = db.prepare<UserRow, [string]>('SELECT * FROM users WHERE email = ?');

export function createUser(id: string, username: string, email: string, passwordHash: string): UserRow {
  const now = new Date().toISOString();
  insertUser.run(id, username, email, passwordHash, now);
  return getUserById.get(id)!;
}

export function updateUserRole(id: string, role: string): UserRow | null {
  db.prepare('UPDATE users SET role = ? WHERE id = ?').run(role, id);
  return getUserById.get(id) ?? null;
}

export function findUserById(id: string): UserRow | null {
  return getUserById.get(id) ?? null;
}

export function findUserByEmail(email: string): UserRow | null {
  return getUserByEmail.get(email) ?? null;
}

db.run(`
  CREATE TABLE IF NOT EXISTS refresh_tokens (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    token_hash TEXT NOT NULL UNIQUE,
    expires_at TEXT NOT NULL,
    revoked INTEGER NOT NULL DEFAULT 0
  )
`);

export interface RefreshTokenRow {
  id: string;
  user_id: string;
  token_hash: string;
  expires_at: string;
  revoked: number;
}

export function storeRefreshToken(userId: string, tokenHash: string, expiresAt: string): void {
  const id = crypto.randomUUID();
  db.prepare('INSERT INTO refresh_tokens (id, user_id, token_hash, expires_at) VALUES (?, ?, ?, ?)')
    .run(id, userId, tokenHash, expiresAt);
}

export function findRefreshToken(tokenHash: string): RefreshTokenRow | null {
  return db.prepare<RefreshTokenRow, [string]>(
    'SELECT * FROM refresh_tokens WHERE token_hash = ? AND revoked = 0'
  ).get(tokenHash) ?? null;
}

export function revokeRefreshToken(tokenHash: string): void {
  db.prepare('UPDATE refresh_tokens SET revoked = 1 WHERE token_hash = ?').run(tokenHash);
}

export function dbHealthCheck(): boolean {
  try {
    db.prepare('SELECT 1').get();
    return true;
  } catch {
    return false;
  }
}
