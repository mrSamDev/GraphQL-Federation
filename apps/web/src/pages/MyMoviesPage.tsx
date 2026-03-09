import { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useQuery } from '@apollo/client';
import { MOVIES_BY_USER_QUERY } from '../gql/operations';
import { useAuth } from '../hooks/useAuth';
import { MovieCard } from '../components/MovieCard';

const PAGE_SIZE = 20;

export function MyMoviesPage() {
  const { user, isAuthenticated } = useAuth();
  const [page, setPage] = useState(1);

  const { data, loading, error } = useQuery(MOVIES_BY_USER_QUERY, {
    variables: { userId: user?.id, page, pageSize: PAGE_SIZE },
    skip: !user?.id,
  });

  if (!isAuthenticated) return <Navigate to="/login" replace />;

  const movies = data?.moviesByUser?.movies ?? [];
  const total = data?.moviesByUser?.total ?? 0;
  const totalPages = Math.ceil(total / PAGE_SIZE);

  return (
    <div>
      <h1 className="mb-6 text-xl font-bold text-text-bright">My Movies</h1>

      {loading && <p className="text-[13px] text-text-muted">Loading...</p>}

      {error && (
        <p className="text-[13px] text-accent">Failed to load your movies.</p>
      )}

      {!loading && !error && (
        <>
          <div className="grid grid-cols-[repeat(auto-fill,minmax(280px,1fr))] gap-3">
            {movies.map((m: { id: string; title: string; description?: string | null; releaseYear?: number | null; genres: string[] }) => (
              <MovieCard key={m.id} {...m} />
            ))}
          </div>

          {movies.length === 0 && (
            <p className="py-12 text-center text-sm text-text-muted">You haven&apos;t added any movies yet.</p>
          )}

          {totalPages > 1 && (
            <div className="mt-8 flex items-center justify-center gap-2">
              <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page <= 1} className="rounded-md border border-border bg-surface px-3 py-1.5 text-[13px] text-text disabled:cursor-not-allowed disabled:opacity-40">
                Previous
              </button>
              <span className="text-[13px] text-text-muted">{page} / {totalPages}</span>
              <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page >= totalPages} className="rounded-md border border-border bg-surface px-3 py-1.5 text-[13px] text-text disabled:cursor-not-allowed disabled:opacity-40">
                Next
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
