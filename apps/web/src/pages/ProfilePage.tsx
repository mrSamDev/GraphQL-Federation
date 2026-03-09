import { useParams, Link, useNavigate } from 'react-router-dom';
import { useQuery } from '@apollo/client';
import { useAuth } from '../hooks/useAuth';
import { USER_PROFILE_QUERY } from '../gql/operations';

export function ProfilePage() {
  const { id } = useParams<{ id: string }>();
  const { user: currentUser } = useAuth();
  const navigate = useNavigate();

  const { data, loading, error } = useQuery(USER_PROFILE_QUERY, {
    variables: { userId: id, page: 1, pageSize: 20 },
    skip: !id,
  });

  if (loading) return <div className="py-[60px] text-center text-text-muted">Loading profile…</div>;

  if (error || !data?.userById) {
    return (
      <div className="py-[60px] text-center text-accent">
        User not found.{' '}
        <Link to="/" className="text-primary">
          Go home
        </Link>
      </div>
    );
  }

  const { userById: profile, moviesByUser, reviewsByUser } = data;
  const isOwnProfile = currentUser?.id === profile.id;
  const joined = new Date(profile.createdAt).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

  return (
    <div className="mx-auto max-w-[900px]">
      <div className="mb-7 flex items-center gap-5 rounded-[10px] border border-border-subtle bg-surface px-8 py-7">
        <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-border-subtle text-2xl font-bold text-text-bright">
          {profile.username[0].toUpperCase()}
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-2.5">
            <h1 className="text-[22px] font-semibold text-text-bright">{profile.username}</h1>
            {profile.role === 'ADMIN' && (
              <span className="rounded border border-[rgba(185,167,159,0.45)] bg-[rgba(185,167,159,0.16)] px-2 py-0.5 text-[11px] font-semibold text-accent">
                ADMIN
              </span>
            )}
            {isOwnProfile && (
              <span className="rounded border border-[rgba(165,173,186,0.45)] bg-[rgba(165,173,186,0.16)] px-2 py-0.5 text-[11px] text-primary">
                You
              </span>
            )}
          </div>
          <div className="mt-1 text-[13px] text-text-muted">Joined {joined}</div>
        </div>
        <div className="flex gap-6 text-center">
          <div>
            <div className="text-xl font-semibold text-text-bright">{moviesByUser.total}</div>
            <div className="text-xs text-text-muted">Movies</div>
          </div>
          <div>
            <div className="text-xl font-semibold text-text-bright">{reviewsByUser.length}</div>
            <div className="text-xs text-text-muted">Reviews</div>
          </div>
        </div>
      </div>

      <section className="mb-8">
        <h2 className="mb-3.5 text-base font-semibold text-text-bright">Movies Added</h2>
        {moviesByUser.movies.length === 0 ? (
          <div className="text-sm text-text-muted">No movies added yet.</div>
        ) : (
          <div className="grid grid-cols-[repeat(auto-fill,minmax(260px,1fr))] gap-3">
            {moviesByUser.movies.map((movie: { id: string; title: string; description: string | null; releaseYear: number | null; genres: string[] }) => (
              <div
                key={movie.id}
                onClick={() => navigate(`/movies/${movie.id}`)}
                className="cursor-pointer rounded-lg border border-border-subtle bg-surface px-4 py-3.5 transition-colors duration-150 hover:border-border"
              >
                <div className="mb-1 text-sm font-semibold text-text-bright">{movie.title}</div>
                {movie.releaseYear && <div className="mb-1.5 text-xs text-text-muted">{movie.releaseYear}</div>}
                {movie.description && <div className="line-clamp-2 text-xs leading-[1.5] text-text">{movie.description}</div>}
                <div className="mt-2 flex flex-wrap gap-1">
                  {movie.genres.slice(0, 3).map((g: string) => (
                    <span key={g} className="rounded bg-border-subtle px-[7px] py-0.5 text-[11px] text-text-muted">
                      {g}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <section>
        <h2 className="mb-3.5 text-base font-semibold text-text-bright">Reviews Written</h2>
        {reviewsByUser.length === 0 ? (
          <div className="text-sm text-text-muted">No reviews written yet.</div>
        ) : (
          <div className="flex flex-col gap-2.5">
            {reviewsByUser.map((review: { id: string; movie: { id: string }; comment: string; rating: number; createdAt: string }) => (
              <div key={review.id} className="flex items-start gap-3.5 rounded-lg border border-border-subtle bg-surface px-4 py-3.5">
                <div className="mt-0.5 flex shrink-0 gap-0.5">
                  {Array.from({ length: 5 }, (_, i) => (
                    <span key={i} className={i < review.rating ? 'text-[13px] text-accent' : 'text-[13px] text-border'}>
                      ★
                    </span>
                  ))}
                </div>
                <div className="flex-1">
                  <div className="text-[13px] leading-[1.5] text-text">{review.comment}</div>
                  <div className="mt-1.5 flex gap-3">
                    <span onClick={() => navigate(`/movies/${review.movie.id}`)} className="cursor-pointer text-xs text-primary">
                      View movie →
                    </span>
                    <span className="text-xs text-text-muted">
                      {new Date(review.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
