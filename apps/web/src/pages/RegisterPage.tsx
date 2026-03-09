import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useMutation } from '@apollo/client';
import { REGISTER_MUTATION } from '../gql/operations';
import { useAuth } from '../hooks/useAuth';
import { ui } from '../styles/ui';

export function RegisterPage() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [registerMutation, { loading, error }] = useMutation(REGISTER_MUTATION);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const { data } = await registerMutation({ variables: { username, email, password } });
    if (data?.register) {
      login(data.register.token, data.register.refreshToken, data.register.user);
      navigate('/');
    }
  }

  return (
    <div className="mx-auto my-12 max-w-[360px]">
      <h1 className="mb-6 text-xl font-bold text-text-bright">Create account</h1>
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div>
          <label className={ui.label}>Username</label>
          <input type="text" required value={username} onChange={e => setUsername(e.target.value)} className={ui.input} />
        </div>
        <div>
          <label className={ui.label}>Email</label>
          <input type="email" required value={email} onChange={e => setEmail(e.target.value)} className={ui.input} />
        </div>
        <div>
          <label className={ui.label}>Password</label>
          <input type="password" required minLength={8} value={password} onChange={e => setPassword(e.target.value)} className={ui.input} />
        </div>
        {error && <p className={ui.errorBox}>{error.graphQLErrors[0]?.message ?? 'Registration failed'}</p>}
        <button type="submit" disabled={loading} className={ui.buttonPrimaryFull}>
          {loading ? 'Creating account...' : 'Create account'}
        </button>
      </form>
      <p className="mt-5 text-center text-[13px] text-text-muted">
        Already have an account?{' '}
        <Link to="/login" className="font-semibold text-primary">
          Sign in
        </Link>
      </p>
    </div>
  );
}
