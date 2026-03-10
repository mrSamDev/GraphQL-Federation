import React, { useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useQuery, useMutation } from '@apollo/client';
import {
  MOVIE_DETAIL_QUERY,
  ADD_REVIEW_MUTATION,
  UPDATE_MOVIE_MUTATION,
  DELETE_MOVIE_MUTATION,
} from '../gql/operations';
import { ReviewCard } from '../components/ReviewCard';
import { StarRating } from '../components/StarRating';
import { useAuth } from '../hooks/useAuth';

const INPUT_CLASS = 'w-full rounded-md border border-border bg-bg px-2.5 py-[7px] text-[13px] text-text outline-none focus:border-primary';

export function MovieDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { user, isAuthenticated } = useAuth();
  const navigate = useNavigate();

  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const [reviewError, setReviewError] = useState('');
  const [isEditingMovie, setIsEditingMovie] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const [editDesc, setEditDesc] = useState('');
  const [editYear, setEditYear] = useState('');
  const [editGenres, setEditGenres] = useState('');

  const { data, loading, error } = useQuery(MOVIE_DETAIL_QUERY, { variables: { id } });

  const [addReview, { loading: submitting }] = useMutation(ADD_REVIEW_MUTATION, {
    refetchQueries: [{ query: MOVIE_DETAIL_QUERY, variables: { id } }],
    optimisticResponse: {
      addReview: {
        __typename: 'Review',
        id: `temp-${Date.now()}`,
        comment,
        rating,
        createdAt: new Date().toISOString(),
        user: { __typename: 'User', id: user?.id ?? '', username: user?.username ?? '' },
      },
    },
    onError: err => setReviewError(err.graphQLErrors[0]?.message ?? 'Failed to submit review'),
  });

  const [updateMovie, { loading: updating }] = useMutation(UPDATE_MOVIE_MUTATION, {
    refetchQueries: [{ query: MOVIE_DETAIL_QUERY, variables: { id } }],
    onCompleted: () => setIsEditingMovie(false),
  });

  const [deleteMovie, { loading: deleting }] = useMutation(DELETE_MOVIE_MUTATION, {
    onCompleted: () => navigate('/'),
  });

  async function handleReviewSubmit(e: React.FormEvent) {
    e.preventDefault();
    setReviewError('');
    if (rating === 0) {
      setReviewError('Please select a rating');
      return;
    }
    await addReview({ variables: { input: { movieId: id, comment, rating } } });
    setComment('');
    setRating(0);
  }

  function startEditMovie() {
    setEditTitle(movie.title);
    setEditDesc(movie.description ?? '');
    setEditYear(movie.releaseYear?.toString() ?? '');
    setEditGenres(movie.genres.join(', '));
    setIsEditingMovie(true);
  }

  function handleMovieEditSubmit(e: React.FormEvent) {
    e.preventDefault();
    updateMovie({
      variables: {
        id,
        input: {
          title: editTitle,
          description: editDesc || null,
          releaseYear: editYear ? parseInt(editYear) : null,
          genres: editGenres.split(',').map(g => g.trim()).filter(Boolean),
        },
      },
    });
  }

  if (loading) return <p className="text-[13px] text-text-muted">Loading...</p>;
  if (error || !data?.movieById) {
    return (
      <div>
        <p className="text-sm text-accent">Movie not found.</p>
        <Link to="/" className="mt-2 inline-block text-[13px] text-primary">
          Back to movies
        </Link>
      </div>
    );
  }

  const movie = data.movieById;
  const reviews = data.reviewsByMovie ?? [];
  const avgRating = reviews.length > 0 ? reviews.reduce((s: number, r: { rating: number }) => s + r.rating, 0) / reviews.length : null;
  const hasReviewed = reviews.some((r: { user: { id: string } }) => r.user?.id === user?.id);
  const isOwner = user?.id === movie.createdBy?.id;
  const isAdmin = user?.role === 'ADMIN';
  const canDelete = isOwner || isAdmin;

  const description = movie.description
    ? movie.description.slice(0, 155)
    : `${movie.releaseYear ?? ''} · ${movie.genres.join(', ')}`.trim();

  return (
    <div className="max-w-[800px]">
      <Helmet>
        <title>{movie.title} — MovieDB</title>
        <meta name="description" content={description} />
        <meta property="og:type" content="article" />
        <meta property="og:title" content={`${movie.title} — MovieDB`} />
        <meta property="og:description" content={description} />
      </Helmet>
      <Link to="/" className="mb-5 inline-block text-[13px] text-primary">
        ← Movies
      </Link>

      <div className="mb-8">
        {isEditingMovie ? (
          <form onSubmit={handleMovieEditSubmit} className="rounded-lg border border-border bg-surface p-5">
            <div className="grid gap-3">
              <div>
                <label className="mb-1 block text-xs text-text-muted">Title</label>
                <input required value={editTitle} onChange={e => setEditTitle(e.target.value)} className={INPUT_CLASS} />
              </div>
              <div>
                <label className="mb-1 block text-xs text-text-muted">Description</label>
                <textarea rows={3} value={editDesc} onChange={e => setEditDesc(e.target.value)} className={INPUT_CLASS} />
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-xs text-text-muted">Year</label>
                  <input type="number" value={editYear} onChange={e => setEditYear(e.target.value)} min={1888} max={2100} className={INPUT_CLASS} />
                </div>
                <div>
                  <label className="mb-1 block text-xs text-text-muted">Genres (comma-separated)</label>
                  <input required value={editGenres} onChange={e => setEditGenres(e.target.value)} className={INPUT_CLASS} />
                </div>
              </div>
            </div>
            <div className="mt-4 flex gap-2">
              <button type="submit" disabled={updating} className="rounded-md border border-border bg-success px-4 py-1 text-[13px] font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60">
                {updating ? 'Saving…' : 'Save'}
              </button>
              <button type="button" onClick={() => setIsEditingMovie(false)} className="rounded-md border border-border px-4 py-1 text-[13px] text-text-muted">
                Cancel
              </button>
            </div>
          </form>
        ) : (
          <>
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <h1 className="text-[22px] font-bold leading-[1.3] text-text-bright">{movie.title}</h1>
                {movie.releaseYear && <span className="mt-1 block text-sm text-text-muted">{movie.releaseYear}</span>}
              </div>
              <div className="flex shrink-0 items-center gap-2.5">
                {avgRating !== null && (
                  <div className="flex items-center gap-2">
                    <StarRating rating={avgRating} size={18} />
                    <span className="text-[13px] text-text-muted">
                      {avgRating.toFixed(1)} ({reviews.length})
                    </span>
                  </div>
                )}
                {isOwner && (
                  <button onClick={startEditMovie} className="rounded-md border border-border px-3 py-1 text-xs text-text-muted transition-colors hover:border-primary hover:text-primary">
                    Edit
                  </button>
                )}
                {canDelete && (
                  <button
                    onClick={() => {
                      if (confirm('Delete this movie?')) deleteMovie({ variables: { id } });
                    }}
                    disabled={deleting}
                    className="rounded-md border border-border px-3 py-1 text-xs text-accent transition-[background,border-color] hover:border-accent hover:bg-error-bg disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Delete
                  </button>
                )}
              </div>
            </div>
            <div className="mt-3 flex flex-wrap gap-1.5">
              {movie.genres.map((g: string) => (
                <span key={g} className="rounded border border-border px-2 py-[3px] text-xs text-text-muted">
                  {g}
                </span>
              ))}
            </div>
            {movie.description && <p className="mt-4 text-sm leading-[1.7] text-text">{movie.description}</p>}
            <p className="mt-3 text-xs text-text-faint">Added by {movie.createdBy?.username}</p>
          </>
        )}
      </div>

      <div className="border-t border-border-subtle pt-6">
        <p className="mb-5 text-[15px] font-semibold text-text-bright">
          Reviews {reviews.length > 0 && <span className="text-[13px] font-normal text-text-muted">({reviews.length})</span>}
        </p>

        {isAuthenticated && !hasReviewed && (
          <form onSubmit={handleReviewSubmit} className="mb-7 rounded-lg border border-border bg-surface p-4">
            <div className="mb-3">
              <label className="mb-2 block text-[13px] text-text-muted">Rating</label>
              <StarRating rating={rating} size={24} onChange={setRating} />
            </div>
            <div className="mb-3">
              <label className="mb-1.5 block text-[13px] text-text-muted">Comment</label>
              <textarea required maxLength={2000} rows={3} value={comment} onChange={e => setComment(e.target.value)} className="w-full resize-y rounded-md border border-border bg-bg px-3 py-2 text-sm text-text outline-none focus:border-primary" />
            </div>
            {reviewError && <p className="mb-2.5 text-[13px] text-accent">{reviewError}</p>}
            <button type="submit" disabled={submitting} className="rounded-md border border-border bg-success px-4 py-1.5 text-[13px] font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60">
              {submitting ? 'Submitting...' : 'Submit review'}
            </button>
          </form>
        )}

        {!isAuthenticated && (
          <p className="mb-6 text-[13px] text-text-muted">
            <Link to="/login" className="text-primary">
              Sign in
            </Link>{' '}
            to leave a review.
          </p>
        )}

        {reviews.length === 0 && <p className="text-sm text-text-muted">No reviews yet.</p>}

        {reviews.map((r: { id: string; user: { id: string; username: string }; comment: string; rating: number; createdAt: string }) => (
          <ReviewCard key={r.id} id={r.id} userId={r.user?.id} username={r.user?.username} comment={r.comment} rating={r.rating} createdAt={r.createdAt} currentUserId={user?.id} movieId={id!} />
        ))}
      </div>
    </div>
  );
}
