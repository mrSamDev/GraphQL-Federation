import { useState, useCallback, useContext, createContext } from 'react';
import { useApolloClient } from '@apollo/client';

export interface AuthUser {
  id: string;
  username: string;
  email: string;
  role: string;
}

interface AuthContextValue {
  token: string | null;
  user: AuthUser | null;
  isAuthenticated: boolean;
  login: (token: string, refreshToken: string, user: AuthUser) => void;
  logout: () => void;
  getRefreshToken: () => string | null;
  updateTokens: (token: string, refreshToken: string, user: AuthUser) => void;
}

export const AuthContext = createContext<AuthContextValue | null>(null);

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}

export function useAuthProvider() {
  const [token, setToken] = useState<string | null>(() => localStorage.getItem('token'));
  const [user, setUser] = useState<AuthUser | null>(() => {
    const stored = localStorage.getItem('user');
    return stored ? JSON.parse(stored) : null;
  });
  const client = useApolloClient();

  const login = useCallback((newToken: string, newRefreshToken: string, newUser: AuthUser) => {
    localStorage.setItem('token', newToken);
    localStorage.setItem('refreshToken', newRefreshToken);
    localStorage.setItem('user', JSON.stringify(newUser));
    setToken(newToken);
    setUser(newUser);
  }, []);

  const updateTokens = useCallback((newToken: string, newRefreshToken: string, newUser: AuthUser) => {
    localStorage.setItem('token', newToken);
    localStorage.setItem('refreshToken', newRefreshToken);
    localStorage.setItem('user', JSON.stringify(newUser));
    setToken(newToken);
    setUser(newUser);
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem('token');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('user');
    setToken(null);
    setUser(null);
    client.clearStore();
  }, [client]);

  const getRefreshToken = useCallback(() => localStorage.getItem('refreshToken'), []);

  return { token, user, isAuthenticated: Boolean(token), login, logout, getRefreshToken, updateTokens };
}
