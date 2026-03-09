import { Link } from 'react-router-dom';
import { StarRating } from './StarRating';

interface Props {
  id: string;
  title: string;
  description?: string | null;
  releaseYear?: number | null;
  genres: string[];
  avgRating?: number | null;
  reviewCount?: number;
  username?: string;
  animationDelay?: number;
}

export function MovieCard({ id, title, description, releaseYear, genres, avgRating, reviewCount, username, animationDelay = 0 }: Props) {
  return (
    <Link
      to={`/movies/${id}`}
      className="card-stagger block border-2 border-border bg-surface p-4 shadow-hard transition-[box-shadow,transform] duration-100 hover:-translate-x-px hover:-translate-y-px hover:shadow-hard-lg"
      style={{ animationDelay: `${animationDelay}ms` }}
    >
      <div className="flex items-start justify-between gap-2">
        <span className="text-[15px] font-bold text-text-bright">{title}</span>
        {releaseYear && <span className="shrink-0 whitespace-nowrap text-[13px] text-text-muted">{releaseYear}</span>}
      </div>

      {description && <p className="line-clamp-2 mt-1.5 text-[13px] leading-[1.5] text-text-muted">{description}</p>}

      <div className="mt-2.5 flex flex-wrap items-center gap-3">
        <div className="flex flex-wrap gap-1">
          {genres.map(g => (
            <span key={g} className="border-2 border-border px-[7px] py-[2px] text-[11px] font-semibold tracking-[0.02em] text-text-muted">
              {g}
            </span>
          ))}
        </div>
        {avgRating != null && (
          <div className="ml-auto flex items-center gap-1">
            <StarRating rating={avgRating} size={13} />
            <span className="text-xs text-text-muted">{reviewCount ?? 0}</span>
          </div>
        )}
      </div>

      {username && <p className="mt-2 text-xs text-text-faint">by {username}</p>}
    </Link>
  );
}
