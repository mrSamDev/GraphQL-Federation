import { createLogger } from '@movie-platform/shared';
import { upsertMovies } from './db';

const logger = createLogger('search-sync');
const MOVIES_URL = process.env.MOVIES_SERVICE_URL ?? 'http://movies:4002';
const REVIEWS_URL = process.env.REVIEWS_SERVICE_URL ?? 'http://reviews:4003';
const SYNC_INTERVAL_MS = 30_000;

interface MovieSyncItem {
  id: string;
  title: string;
  description: string | null;
  genres: string[];
  releaseYear: number | null;
}

interface ReviewStat {
  movieId: string;
  avgRating: number | null;
  reviewCount: number;
}

export async function syncAll(): Promise<void> {
  const [moviesRes, statsRes] = await Promise.all([
    fetch(`${MOVIES_URL}/movies/sync`),
    fetch(`${REVIEWS_URL}/reviews/stats`),
  ]);

  if (!moviesRes.ok) throw new Error(`movies sync failed: ${moviesRes.status}`);
  if (!statsRes.ok) throw new Error(`reviews stats failed: ${statsRes.status}`);

  const movies: MovieSyncItem[] = await moviesRes.json();
  const stats: ReviewStat[] = await statsRes.json();

  const statsMap = new Map(stats.map(s => [s.movieId, { avgRating: s.avgRating, reviewCount: s.reviewCount }]));

  upsertMovies(movies, statsMap);
  logger.info({ movieCount: movies.length }, 'sync complete');
}

export function startSync(): void {
  // Initial sync at startup (non-blocking, with retry)
  syncAll().catch(err => logger.warn({ err: err instanceof Error ? err.message : String(err) }, 'initial sync failed - will retry'));

  setInterval(() => {
    syncAll().catch(err => logger.warn({ err: err instanceof Error ? err.message : String(err) }, 'sync failed'));
  }, SYNC_INTERVAL_MS);
}
