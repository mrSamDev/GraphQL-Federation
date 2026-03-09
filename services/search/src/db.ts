import { Database, type SQLQueryBindings } from 'bun:sqlite';

const dbPath = (process.env.DATABASE_URL ?? 'file:/data/search.db').replace('file:', '');

export const db = new Database(dbPath, { create: true });

db.run('PRAGMA journal_mode=WAL');

db.run(`
  CREATE TABLE IF NOT EXISTS movie_search_index (
    movie_id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT,
    genres_json TEXT NOT NULL DEFAULT '[]',
    release_year INTEGER,
    avg_rating REAL,
    review_count INTEGER NOT NULL DEFAULT 0,
    updated_at TEXT NOT NULL
  )
`);

// FTS5 for full-text search
try {
  db.run(`
    CREATE VIRTUAL TABLE IF NOT EXISTS movie_fts USING fts5(
      movie_id UNINDEXED,
      title,
      description,
      genres,
      content='movie_search_index',
      content_rowid='rowid'
    )
  `);
} catch {
  // FTS5 not available, will fall back to LIKE queries
}

export interface SearchRow {
  movie_id: string;
  title: string;
  description: string | null;
  genres_json: string;
  release_year: number | null;
  avg_rating: number | null;
  review_count: number;
  updated_at: string;
}

export interface MovieSearchResult {
  movieId: string;
  title: string;
  description: string | null;
  genres: string[];
  releaseYear: number | null;
  avgRating: number | null;
  reviewCount: number;
}

export function rowToResult(row: SearchRow): MovieSearchResult {
  return {
    movieId: row.movie_id,
    title: row.title,
    description: row.description,
    genres: JSON.parse(row.genres_json),
    releaseYear: row.release_year,
    avgRating: row.avg_rating,
    reviewCount: row.review_count,
  };
}

export function upsertMovies(
  movies: Array<{
    id: string;
    title: string;
    description: string | null;
    genres: string[];
    releaseYear: number | null;
  }>,
  statsMap: Map<string, { avgRating: number | null; reviewCount: number }>
) {
  const upsert = db.prepare(`
    INSERT INTO movie_search_index
      (movie_id, title, description, genres_json, release_year, avg_rating, review_count, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(movie_id) DO UPDATE SET
      title=excluded.title,
      description=excluded.description,
      genres_json=excluded.genres_json,
      release_year=excluded.release_year,
      avg_rating=excluded.avg_rating,
      review_count=excluded.review_count,
      updated_at=excluded.updated_at
  `);

  const now = new Date().toISOString();
  db.transaction(() => {
    for (const movie of movies) {
      const stats = statsMap.get(movie.id) ?? { avgRating: null, reviewCount: 0 };
      upsert.run(
        movie.id,
        movie.title,
        movie.description ?? null,
        JSON.stringify(movie.genres),
        movie.releaseYear ?? null,
        stats.avgRating ?? null,
        stats.reviewCount,
        now
      );
    }
  })();

  // Rebuild FTS index
  try {
    db.run("INSERT INTO movie_fts(movie_fts) VALUES('rebuild')");
  } catch {
    // FTS5 not available
  }
}

export function searchWithFts(
  query: string,
  filters: {
    genres?: string[];
    minRating?: number;
    maxRating?: number;
    releaseYearFrom?: number;
    releaseYearTo?: number;
  },
  sort: string,
  page: number,
  pageSize: number
): { results: MovieSearchResult[]; total: number } {
  const params: SQLQueryBindings[] = [query];
  const filterClauses: string[] = [];

  if (filters.genres?.length) {
    filters.genres.forEach(g => {
      filterClauses.push(`m.genres_json LIKE ?`);
      params.push(`%"${g}"%`);
    });
  }
  if (filters.minRating != null) {
    filterClauses.push('m.avg_rating >= ?');
    params.push(filters.minRating);
  }
  if (filters.maxRating != null) {
    filterClauses.push('m.avg_rating <= ?');
    params.push(filters.maxRating);
  }
  if (filters.releaseYearFrom != null) {
    filterClauses.push('m.release_year >= ?');
    params.push(filters.releaseYearFrom);
  }
  if (filters.releaseYearTo != null) {
    filterClauses.push('m.release_year <= ?');
    params.push(filters.releaseYearTo);
  }

  const whereClause = filterClauses.length ? `AND ${filterClauses.join(' AND ')}` : '';

  const orderMap: Record<string, string> = {
    RELEVANCE: 'f.rank',
    RATING_DESC: 'm.avg_rating DESC NULLS LAST',
    RATING_ASC: 'm.avg_rating ASC NULLS LAST',
    NEWEST: 'm.release_year DESC NULLS LAST',
    OLDEST: 'm.release_year ASC NULLS LAST',
  };
  const orderBy = orderMap[sort] ?? 'f.rank';

  const baseSql = `
    FROM movie_fts f
    JOIN movie_search_index m ON f.movie_id = m.movie_id
    WHERE f.movie_fts MATCH ? ${whereClause}
  `;

  try {
    const countRow = db.prepare<{ count: number }, SQLQueryBindings[]>(`SELECT COUNT(*) as count ${baseSql}`).get(...params);
    const total = countRow?.count ?? 0;

    const rows = db.prepare<SearchRow, SQLQueryBindings[]>(
      `SELECT m.* ${baseSql} ORDER BY ${orderBy} LIMIT ? OFFSET ?`
    ).all(...params, pageSize, (page - 1) * pageSize);

    return { results: rows.map(rowToResult), total };
  } catch {
    // Fall back to LIKE search
    return searchWithLike(query, filters, sort, page, pageSize);
  }
}

export function searchWithLike(
  query: string | null,
  filters: {
    genres?: string[];
    minRating?: number;
    maxRating?: number;
    releaseYearFrom?: number;
    releaseYearTo?: number;
  },
  sort: string,
  page: number,
  pageSize: number
): { results: MovieSearchResult[]; total: number } {
  const params: SQLQueryBindings[] = [];
  const whereClauses: string[] = [];

  if (query) {
    whereClauses.push(`(title LIKE ? OR description LIKE ?)`);
    params.push(`%${query}%`, `%${query}%`);
  }
  if (filters.genres?.length) {
    filters.genres.forEach(g => {
      whereClauses.push(`genres_json LIKE ?`);
      params.push(`%"${g}"%`);
    });
  }
  if (filters.minRating != null) {
    whereClauses.push('avg_rating >= ?');
    params.push(filters.minRating);
  }
  if (filters.maxRating != null) {
    whereClauses.push('avg_rating <= ?');
    params.push(filters.maxRating);
  }
  if (filters.releaseYearFrom != null) {
    whereClauses.push('release_year >= ?');
    params.push(filters.releaseYearFrom);
  }
  if (filters.releaseYearTo != null) {
    whereClauses.push('release_year <= ?');
    params.push(filters.releaseYearTo);
  }

  const orderMap: Record<string, string> = {
    RATING_DESC: 'avg_rating DESC NULLS LAST',
    RATING_ASC: 'avg_rating ASC NULLS LAST',
    NEWEST: 'release_year DESC NULLS LAST',
    OLDEST: 'release_year ASC NULLS LAST',
    RELEVANCE: 'review_count DESC',
  };
  const orderBy = orderMap[sort] ?? 'review_count DESC';
  const whereStr = whereClauses.length ? `WHERE ${whereClauses.join(' AND ')}` : '';

  const countRow = db.prepare<{ count: number }, SQLQueryBindings[]>(
    `SELECT COUNT(*) as count FROM movie_search_index ${whereStr}`
  ).get(...params);
  const total = countRow?.count ?? 0;

  const rows = db.prepare<SearchRow, SQLQueryBindings[]>(
    `SELECT * FROM movie_search_index ${whereStr} ORDER BY ${orderBy} LIMIT ? OFFSET ?`
  ).all(...params, pageSize, (page - 1) * pageSize);

  return { results: rows.map(rowToResult), total };
}

export function getTrending(limit: number): MovieSearchResult[] {
  const rows = db.prepare<SearchRow, [number]>(
    'SELECT * FROM movie_search_index ORDER BY review_count DESC, avg_rating DESC LIMIT ?'
  ).all(limit);
  return rows.map(rowToResult);
}

export function dbHealthCheck(): boolean {
  try {
    db.prepare('SELECT 1').get();
    return true;
  } catch {
    return false;
  }
}
