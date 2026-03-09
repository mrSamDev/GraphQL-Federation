import React, { useState } from 'react';
import { useMutation } from '@apollo/client';
import { StarRating } from './StarRating';
import { DELETE_REVIEW_MUTATION, UPDATE_REVIEW_MUTATION, MOVIE_DETAIL_QUERY } from '../gql/operations';

interface Props {
  id: string;
  username: string;
  userId: string;
  comment: string;
  rating: number;
  createdAt: string;
  currentUserId?: string;
  movieId: string;
  animationDelay?: number;
}

export function ReviewCard({ id, username, userId, comment, rating, createdAt, currentUserId, movieId, animationDelay = 0 }: Props) {
  const [isEditing, setIsEditing] = useState(false);
  const [editComment, setEditComment] = useState(comment);
  const [editRating, setEditRating] = useState(rating);

  const refetchQuery = { query: MOVIE_DETAIL_QUERY, variables: { id: movieId } };

  const [deleteReview, { loading: deleting }] = useMutation(DELETE_REVIEW_MUTATION, {
    refetchQueries: [refetchQuery],
  });

  const [updateReview, { loading: saving }] = useMutation(UPDATE_REVIEW_MUTATION, {
    refetchQueries: [refetchQuery],
    onCompleted: () => setIsEditing(false),
  });

  const isOwner = currentUserId === userId;
  const date = new Date(createdAt).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
  const initials = username.slice(0, 2).toUpperCase();

  function handleSaveEdit(e: React.FormEvent) {
    e.preventDefault();
    updateReview({ variables: { id, input: { comment: editComment, rating: editRating } } });
  }

  function handleCancelEdit() {
    setEditComment(comment);
    setEditRating(rating);
    setIsEditing(false);
  }

  return (
    <div className="card-stagger border-b border-border-subtle py-4" style={{ animationDelay: `${animationDelay}ms` }}>
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2.5">
          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-border bg-border-subtle text-[11px] font-bold text-primary">
            {initials}
          </div>
          <span className="text-sm font-semibold text-text-bright">{username}</span>
          {!isEditing && <StarRating rating={rating} size={13} />}
          <span className="text-xs text-text-faint">{date}</span>
        </div>

        {isOwner && !isEditing && (
          <div className="flex gap-1.5">
            <button
              onClick={() => setIsEditing(true)}
              className="rounded-md border border-border px-2 py-0.5 text-xs text-text-muted transition-colors duration-150 hover:border-primary hover:text-primary"
            >
              Edit
            </button>
            <button
              onClick={() => deleteReview({ variables: { id } })}
              disabled={deleting}
              className="rounded-md border border-border px-2 py-0.5 text-xs text-accent transition-[background,border-color] duration-150 hover:border-accent hover:bg-error-bg disabled:cursor-not-allowed disabled:opacity-50"
            >
              Delete
            </button>
          </div>
        )}
      </div>

      {isEditing ? (
        <form onSubmit={handleSaveEdit} className="mt-3 pl-[38px]">
          <div className="mb-2.5">
            <StarRating rating={editRating} size={20} onChange={setEditRating} />
          </div>
          <textarea
            required
            maxLength={2000}
            rows={3}
            value={editComment}
            onChange={e => setEditComment(e.target.value)}
            className="w-full resize-y rounded-md border border-border bg-bg px-3 py-2 text-sm text-text"
          />
          <div className="mt-2 flex gap-2">
            <button
              type="submit"
              disabled={saving}
              className="rounded-md border border-border px-3.5 py-1 text-[13px] font-semibold text-bg bg-success disabled:cursor-not-allowed disabled:opacity-60"
            >
              {saving ? 'Saving…' : 'Save'}
            </button>
            <button
              type="button"
              onClick={handleCancelEdit}
              className="rounded-md border border-border px-3.5 py-1 text-[13px] text-text-muted"
            >
              Cancel
            </button>
          </div>
        </form>
      ) : (
        <p className="mt-2.5 pl-[38px] text-sm leading-[1.65] text-text">{comment}</p>
      )}
    </div>
  );
}
