interface Props {
  rating: number;
  max?: number;
  onChange?: (rating: number) => void;
  size?: number;
}

export function StarRating({ rating, max = 5, onChange, size = 16 }: Props) {
  return (
    <span className="inline-flex gap-0.5">
      {Array.from({ length: max }, (_, i) => {
        const filled = i < Math.round(rating);
        return (
          <span
            key={i}
            onClick={() => onChange?.(i + 1)}
            style={{ fontSize: `${size}px` }}
            className={[
              'inline-block select-none leading-none transition-[transform,color] duration-120',
              filled ? 'text-accent' : 'text-border',
              onChange ? 'cursor-pointer hover:scale-135' : 'cursor-default',
            ].join(' ')}
          >
            ★
          </span>
        );
      })}
    </span>
  );
}
