import React from 'react';
import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import { Layout } from './components/Layout';
import { MovieListPage } from './pages/MovieListPage';
import { MovieDetailPage } from './pages/MovieDetailPage';
import { AddMoviePage } from './pages/AddMoviePage';
import { LoginPage } from './pages/LoginPage';
import { RegisterPage } from './pages/RegisterPage';
import { ArchitecturePage } from './pages/ArchitecturePage';
import { ProfilePage } from './pages/ProfilePage';
import { AuthContext, useAuthProvider } from './hooks/useAuth';

const router = createBrowserRouter([
  {
    path: '/',
    element: <Layout />,
    children: [
      { index: true, element: <MovieListPage /> },
      { path: 'movies/add', element: <AddMoviePage /> },
      { path: 'movies/:id', element: <MovieDetailPage /> },
      { path: 'login', element: <LoginPage /> },
      { path: 'register', element: <RegisterPage /> },
      { path: 'architecture', element: <ArchitecturePage /> },
      { path: 'users/:id', element: <ProfilePage /> },
    ],
  },
]);

function AuthProvider({ children }: { children: React.ReactNode }) {
  const auth = useAuthProvider();
  return <AuthContext.Provider value={auth}>{children}</AuthContext.Provider>;
}

export default function App() {
  return (
    <AuthProvider>
      <RouterProvider router={router} />
    </AuthProvider>
  );
}
