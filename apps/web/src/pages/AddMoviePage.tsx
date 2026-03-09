import React, { useState } from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import { useMutation } from '@apollo/client';
import { ADD_MOVIE_MUTATION } from '../gql/operations';
import { useAuth } from '../hooks/useAuth';
import { ui } from '../styles/ui';

export function AddMoviePage() {
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [releaseYear, setReleaseYear] = useState('');
  const [genresInput, setGenresInput] = useState('');
  const [addMovie, { loading, error }] = useMutation(ADD_MOVIE_MUTATION);

  if (!isAuthenticated) return <Navigate to="/login" replace />;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const genres = genresInput.split(',').map(g => g.trim()).filter(Boolean);
    const { data } = await addMovie({
      variables: {
        input: {
          title,
          description: description || null,
          releaseYear: releaseYear ? parseInt(releaseYear, 10) : null,
          genres,
        },
      },
    });
    if (data?.addMovie) {
      navigate(`/movies/${data.addMovie.id}`);
    }
  }

  return (
    <div className="max-w-[540px]">
      <h1 className="mb-6 text-xl font-bold text-text-bright">Add movie</h1>
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div>
          <label className={ui.label}>Title</label>
          <input type="text" required maxLength={200} value={title} onChange={e => setTitle(e.target.value)} className={ui.input} />
        </div>
        <div>
          <label className={ui.label}>Description</label>
          <textarea maxLength={2000} rows={4} value={description} onChange={e => setDescription(e.target.value)} className={ui.textarea} />
        </div>
        <div>
          <label className={ui.label}>Release year</label>
          <input type="number" min={1888} max={2100} value={releaseYear} onChange={e => setReleaseYear(e.target.value)} className={ui.input} />
        </div>
        <div>
          <label className={ui.label}>
            Genres <span className={ui.labelHint}>(comma-separated)</span>
          </label>
          <input type="text" required value={genresInput} onChange={e => setGenresInput(e.target.value)} placeholder="Action, Drama, Sci-Fi" className={ui.input} />
        </div>
        {error && <p className={ui.errorBox}>{error.graphQLErrors[0]?.message ?? 'Failed to add movie'}</p>}
        <div className="mt-2 flex gap-3">
          <button type="submit" disabled={loading} className={ui.buttonPrimary}>
            {loading ? 'Adding...' : 'Add movie'}
          </button>
          <button type="button" onClick={() => navigate(-1)} className={ui.buttonSecondary}>
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}
