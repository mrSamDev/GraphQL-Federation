import { Database } from 'bun:sqlite';

const dbPath = (process.env.DATABASE_URL ?? 'file:/data/movies.db').replace('file:', '');

export const db = new Database(dbPath, { create: true });

db.run('PRAGMA journal_mode=WAL');
db.run('PRAGMA foreign_keys=ON');

db.run(`
  CREATE TABLE IF NOT EXISTS movies (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT,
    release_year INTEGER,
    genres_json TEXT NOT NULL DEFAULT '[]',
    created_by_user_id TEXT NOT NULL,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  )
`);

export interface MovieRow {
  id: string;
  title: string;
  description: string | null;
  release_year: number | null;
  genres_json: string;
  created_by_user_id: string;
  created_at: string;
  updated_at: string;
}

export interface Movie {
  id: string;
  title: string;
  description: string | null;
  releaseYear: number | null;
  genres: string[];
  createdBy: { __typename: 'User'; id: string };
  createdAt: string;
  updatedAt: string;
}

function rowToMovie(row: MovieRow): Movie {
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    releaseYear: row.release_year,
    genres: JSON.parse(row.genres_json),
    createdBy: { __typename: 'User', id: row.created_by_user_id },
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

const insertMovie = db.prepare<MovieRow, [string, string, string | null, number | null, string, string, string, string]>(
  'INSERT INTO movies (id, title, description, release_year, genres_json, created_by_user_id, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
);

const getMovieById = db.prepare<MovieRow, [string]>('SELECT * FROM movies WHERE id = ?');
const countMovies = db.prepare<{ count: number }, []>('SELECT COUNT(*) as count FROM movies');

export function createMovie(
  id: string,
  title: string,
  description: string | null,
  releaseYear: number | null,
  genres: string[],
  userId: string
): Movie {
  const now = new Date().toISOString();
  insertMovie.run(id, title, description ?? null, releaseYear ?? null, JSON.stringify(genres), userId, now, now);
  return rowToMovie(getMovieById.get(id)!);
}

export function findMovieById(id: string): Movie | null {
  const row = getMovieById.get(id);
  return row ? rowToMovie(row) : null;
}

export function listMovies(page: number, pageSize: number): { movies: Movie[]; total: number } {
  const offset = (page - 1) * pageSize;
  const rows = db.prepare<MovieRow, [number, number]>('SELECT * FROM movies ORDER BY created_at DESC LIMIT ? OFFSET ?').all(pageSize, offset);
  const total = (countMovies.get() as { count: number }).count;
  return { movies: rows.map(rowToMovie), total };
}

export function updateMovie(
  id: string,
  fields: { title?: string; description?: string | null; releaseYear?: number | null; genres?: string[] }
): Movie | null {
  const existing = getMovieById.get(id);
  if (!existing) return null;

  const now = new Date().toISOString();
  db.prepare(
    'UPDATE movies SET title=?, description=?, release_year=?, genres_json=?, updated_at=? WHERE id=?'
  ).run(
    fields.title ?? existing.title,
    fields.description !== undefined ? fields.description : existing.description,
    fields.releaseYear !== undefined ? fields.releaseYear : existing.release_year,
    fields.genres ? JSON.stringify(fields.genres) : existing.genres_json,
    now,
    id
  );
  return rowToMovie(getMovieById.get(id)!);
}

export function deleteMovie(id: string): boolean {
  const result = db.prepare('DELETE FROM movies WHERE id = ?').run(id);
  return result.changes > 0;
}

export function moviesByUser(userId: string, page: number, pageSize: number): { movies: Movie[]; total: number } {
  const offset = (page - 1) * pageSize;
  const rows = db.prepare<MovieRow, [string, number, number]>(
    'SELECT * FROM movies WHERE created_by_user_id = ? ORDER BY created_at DESC LIMIT ? OFFSET ?'
  ).all(userId, pageSize, offset);
  const { count } = db.prepare<{ count: number }, [string]>(
    'SELECT COUNT(*) as count FROM movies WHERE created_by_user_id = ?'
  ).get(userId) as { count: number };
  return { movies: rows.map(rowToMovie), total: count };
}

export function getAllMoviesRaw(): MovieRow[] {
  return db.prepare<MovieRow, []>('SELECT * FROM movies').all();
}

export function dbHealthCheck(): boolean {
  try {
    db.prepare('SELECT 1').get();
    return true;
  } catch {
    return false;
  }
}
