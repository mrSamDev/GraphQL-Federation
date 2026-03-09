import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useMutation } from '@apollo/client';
import { LOGIN_MUTATION } from '../gql/operations';
import { useAuth } from '../hooks/useAuth';
import { ui } from '../styles/ui';

export function LoginPage() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loginMutation, { loading, error }] = useMutation(LOGIN_MUTATION);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const { data } = await loginMutation({ variables: { email, password } });
    if (data?.login) {
      login(data.login.token, data.login.refreshToken, data.login.user);
      navigate('/');
    }
  }

  return (
    <div className="mx-auto my-12 max-w-[360px]">
      <h1 className="mb-6 text-xl font-bold text-text-bright">Sign in</h1>
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div>
          <label className={ui.label}>Email</label>
          <input type="email" required value={email} onChange={e => setEmail(e.target.value)} className={ui.input} />
        </div>
        <div>
          <label className={ui.label}>Password</label>
          <input type="password" required value={password} onChange={e => setPassword(e.target.value)} className={ui.input} />
        </div>
        {error && <p className={ui.errorBox}>{error.graphQLErrors[0]?.message ?? 'Sign in failed'}</p>}
        <button type="submit" disabled={loading} className={ui.buttonPrimaryFull}>
          {loading ? 'Signing in...' : 'Sign in'}
        </button>
      </form>
      <p className="mt-5 text-center text-[13px] text-text-muted">
        No account?{' '}
        <Link to="/register" className="font-semibold text-primary">
          Sign up
        </Link>
      </p>
    </div>
  );
}
