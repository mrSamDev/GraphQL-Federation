import { Database } from 'bun:sqlite';

const dbPath = (process.env.DATABASE_URL ?? 'file:/data/reviews.db').replace('file:', '');

export const db = new Database(dbPath, { create: true });

db.run('PRAGMA journal_mode=WAL');
db.run('PRAGMA foreign_keys=ON');

db.run(`
  CREATE TABLE IF NOT EXISTS reviews (
    id TEXT PRIMARY KEY,
    movie_id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    comment TEXT NOT NULL,
    rating INTEGER NOT NULL CHECK(rating >= 1 AND rating <= 5),
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    UNIQUE(movie_id, user_id)
  )
`);

export interface ReviewRow {
  id: string;
  movie_id: string;
  user_id: string;
  comment: string;
  rating: number;
  created_at: string;
  updated_at: string;
}

export interface Review {
  id: string;
  movie: { __typename: 'Movie'; id: string };
  user: { __typename: 'User'; id: string };
  comment: string;
  rating: number;
  createdAt: string;
  updatedAt: string;
}

function rowToReview(row: ReviewRow): Review {
  return {
    id: row.id,
    movie: { __typename: 'Movie', id: row.movie_id },
    user: { __typename: 'User', id: row.user_id },
    comment: row.comment,
    rating: row.rating,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

const insertReview = db.prepare<ReviewRow, [string, string, string, string, number, string, string]>(
  'INSERT INTO reviews (id, movie_id, user_id, comment, rating, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)'
);

const getReviewById = db.prepare<ReviewRow, [string]>('SELECT * FROM reviews WHERE id = ?');
const getReviewsByMovie = db.prepare<ReviewRow, [string]>('SELECT * FROM reviews WHERE movie_id = ? ORDER BY created_at DESC');

export function createReview(
  id: string,
  movieId: string,
  userId: string,
  comment: string,
  rating: number
): Review {
  const now = new Date().toISOString();
  insertReview.run(id, movieId, userId, comment, rating, now, now);
  return rowToReview(getReviewById.get(id)!);
}

export function findReviewById(id: string): Review | null {
  const row = getReviewById.get(id);
  return row ? rowToReview(row) : null;
}

export function findReviewsByMovie(movieId: string): Review[] {
  return getReviewsByMovie.all(movieId).map(rowToReview);
}

export function findReviewsByUser(userId: string): Review[] {
  return db.prepare<ReviewRow, [string]>(
    'SELECT * FROM reviews WHERE user_id = ? ORDER BY created_at DESC'
  ).all(userId).map(rowToReview);
}

export function findReviewRowById(id: string): ReviewRow | null {
  return getReviewById.get(id) ?? null;
}

export function updateReview(
  id: string,
  fields: { comment?: string; rating?: number }
): Review | null {
  const existing = getReviewById.get(id);
  if (!existing) return null;

  const now = new Date().toISOString();
  db.prepare('UPDATE reviews SET comment=?, rating=?, updated_at=? WHERE id=?').run(
    fields.comment ?? existing.comment,
    fields.rating ?? existing.rating,
    now,
    id
  );
  return rowToReview(getReviewById.get(id)!);
}

export function deleteReview(id: string): boolean {
  const result = db.prepare('DELETE FROM reviews WHERE id = ?').run(id);
  return result.changes > 0;
}

export function getReviewStats(): { movieId: string; avgRating: number | null; reviewCount: number }[] {
  return db.prepare<{ movieId: string; avgRating: number | null; reviewCount: number }, []>(`
    SELECT movie_id as movieId, AVG(rating) as avgRating, COUNT(*) as reviewCount
    FROM reviews
    GROUP BY movie_id
  `).all();
}

export function dbHealthCheck(): boolean {
  try {
    db.prepare('SELECT 1').get();
    return true;
  } catch {
    return false;
  }
}
