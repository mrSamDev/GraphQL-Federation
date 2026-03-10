import React, { useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { useQuery } from '@apollo/client';
import { MovieCard } from '../components/MovieCard';
import { SearchBar } from '../components/SearchBar';
import { LIST_MOVIES_QUERY, SEARCH_MOVIES_QUERY, TRENDING_MOVIES_QUERY } from '../gql/operations';

const SORT_OPTIONS = [
  { value: 'RELEVANCE', label: 'Relevance' },
  { value: 'RATING_DESC', label: 'Highest rated' },
  { value: 'RATING_ASC', label: 'Lowest rated' },
  { value: 'NEWEST', label: 'Newest' },
  { value: 'OLDEST', label: 'Oldest' },
];

const PAGE_SIZE = 20;
const FILTER_INPUT_CLASS = 'w-[120px] rounded-md border border-border bg-surface px-2.5 py-[7px] text-[13px] text-text outline-none focus:border-primary';

export function MovieListPage() {
  const [query, setQuery] = useState('');
  const [sort, setSort] = useState('RELEVANCE');
  const [page, setPage] = useState(1);
  const [minRating, setMinRating] = useState('');
  const [genreFilter, setGenreFilter] = useState('');
  const [releaseYearFrom, setReleaseYearFrom] = useState('');

  const isSearchMode = Boolean(query || minRating || genreFilter || releaseYearFrom);

  const searchFilters = {
    ...(minRating ? { minRating: parseFloat(minRating) } : {}),
    ...(genreFilter ? { genres: [genreFilter.trim()] } : {}),
    ...(releaseYearFrom ? { releaseYearFrom: parseInt(releaseYearFrom, 10) } : {}),
  };

  const searchResult = useQuery(SEARCH_MOVIES_QUERY, {
    variables: { query: query || undefined, filters: searchFilters, sort, page, pageSize: PAGE_SIZE },
    skip: !isSearchMode,
  });

  const listResult = useQuery(LIST_MOVIES_QUERY, {
    variables: { page, pageSize: PAGE_SIZE },
    skip: isSearchMode,
  });

  const trendingResult = useQuery(TRENDING_MOVIES_QUERY, {
    variables: { limit: 5 },
    skip: isSearchMode,
  });

  function handleSearch(val: string) {
    setQuery(val);
    setPage(1);
  }

  function handleSortChange(e: React.ChangeEvent<HTMLSelectElement>) {
    setSort(e.target.value);
    setPage(1);
  }

  const loading = isSearchMode ? searchResult.loading : listResult.loading;
  const error = isSearchMode ? searchResult.error : listResult.error;

  const movies = isSearchMode
    ? (searchResult.data?.searchMovies?.results ?? []).map((r: { movieId: string; title: string; description?: string | null; releaseYear?: number | null; genres: string[]; avgRating?: number | null; reviewCount: number }) => ({
        id: r.movieId,
        title: r.title,
        description: r.description,
        releaseYear: r.releaseYear,
        genres: r.genres,
        avgRating: r.avgRating,
        reviewCount: r.reviewCount,
      }))
    : (listResult.data?.listMovies?.movies ?? []).map((m: { id: string; title: string; description?: string | null; releaseYear?: number | null; genres: string[]; createdBy?: { username: string } }) => ({
        id: m.id,
        title: m.title,
        description: m.description,
        releaseYear: m.releaseYear,
        genres: m.genres,
        username: m.createdBy?.username,
      }));

  const total = isSearchMode ? searchResult.data?.searchMovies?.total ?? 0 : listResult.data?.listMovies?.total ?? 0;

  const totalPages = Math.ceil(total / PAGE_SIZE);
  const trending = trendingResult.data?.trendingMovies ?? [];

  return (
    <div>
      <Helmet>
        <title>MovieDB — Discover Movies</title>
        <meta name="description" content="Browse, search, and review movies. Find trending films and hidden gems." />
        <meta property="og:title" content="MovieDB — Discover Movies" />
        <meta property="og:description" content="Browse, search, and review movies. Find trending films and hidden gems." />
        <meta property="og:type" content="website" />
      </Helmet>
      <div className="mb-6 flex flex-wrap gap-3">
        <div className="min-w-[200px] flex-1 basis-[240px]">
          <SearchBar value={query} onChange={handleSearch} />
        </div>
        <input type="text" placeholder="Genre" value={genreFilter} onChange={e => { setGenreFilter(e.target.value); setPage(1); }} className={FILTER_INPUT_CLASS} />
        <input type="number" placeholder="From year" value={releaseYearFrom} min={1888} max={2100} onChange={e => { setReleaseYearFrom(e.target.value); setPage(1); }} className={FILTER_INPUT_CLASS} />
        <input type="number" placeholder="Min rating" value={minRating} min={1} max={5} step={0.5} onChange={e => { setMinRating(e.target.value); setPage(1); }} className={FILTER_INPUT_CLASS} />
        <select value={sort} onChange={handleSortChange} className="rounded-md border border-border bg-surface px-2.5 py-[7px] text-[13px] text-text outline-none focus:border-primary">
          {SORT_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
      </div>

      {!isSearchMode && trending.length > 0 && (
        <div className="mb-8">
          <p className="mb-3 text-[13px] font-semibold text-text-muted">Trending</p>
          <div className="grid grid-cols-[repeat(auto-fill,minmax(220px,1fr))] gap-3">
            {trending.map((m: { movieId: string; title: string; description?: string | null; releaseYear?: number | null; genres: string[]; avgRating?: number | null; reviewCount: number }) => (
              <MovieCard key={m.movieId} id={m.movieId} title={m.title} description={m.description} releaseYear={m.releaseYear} genres={m.genres} avgRating={m.avgRating} reviewCount={m.reviewCount} />
            ))}
          </div>
        </div>
      )}

      {error && (
        <div className="mb-4 rounded-md border border-error-border bg-error-bg p-3 text-[13px] text-accent">
          Failed to load movies.{' '}
          <button onClick={() => (isSearchMode ? searchResult.refetch() : listResult.refetch())} className="text-primary">
            Retry
          </button>
        </div>
      )}

      {loading && <p className="text-[13px] text-text-muted">Loading...</p>}

      {!loading && !error && (
        <>
          <div className="grid grid-cols-[repeat(auto-fill,minmax(280px,1fr))] gap-3">
            {movies.map((m: { id: string; title: string; description?: string | null; releaseYear?: number | null; genres: string[]; avgRating?: number | null; reviewCount?: number; username?: string }) => (
              <MovieCard key={m.id} {...m} />
            ))}
          </div>

          {movies.length === 0 && <p className="py-12 text-center text-sm text-text-muted">No movies found.</p>}

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
