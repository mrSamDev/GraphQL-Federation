import { useEffect, useState } from 'react';
import { Link, Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { ui } from '../styles/ui';

function HamburgerIcon({ open }: { open: boolean }) {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden>
      {open ? (
        <>
          <line x1="4" y1="4" x2="16" y2="16" stroke="currentColor" strokeWidth="2" />
          <line x1="16" y1="4" x2="4" y2="16" stroke="currentColor" strokeWidth="2" />
        </>
      ) : (
        <>
          <line x1="3" y1="5" x2="17" y2="5" stroke="currentColor" strokeWidth="2" />
          <line x1="3" y1="10" x2="17" y2="10" stroke="currentColor" strokeWidth="2" />
          <line x1="3" y1="15" x2="17" y2="15" stroke="currentColor" strokeWidth="2" />
        </>
      )}
    </svg>
  );
}

const KONAMI = ['ArrowUp', 'ArrowUp', 'ArrowDown', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'ArrowLeft', 'ArrowRight', 'b', 'a'];

const NAV_LINKS = [
  { to: '/', label: 'Movies' },
  { to: '/architecture', label: 'Architecture' },
];

export function Layout() {
  const { user, isAuthenticated, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [keyBuffer, setKeyBuffer] = useState<string[]>([]);
  const [directorsCut, setDirectorsCut] = useState(false);
  const [logoClicks, setLogoClicks] = useState(0);
  const [secretToast, setSecretToast] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      setKeyBuffer(prev => {
        const next = [...prev, e.key].slice(-KONAMI.length);
        if (next.join(',') === KONAMI.join(',')) {
          setDirectorsCut(true);
          setTimeout(() => setDirectorsCut(false), 5000);
        }
        return next;
      });
    }

    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, []);

  useEffect(() => {
    setMobileMenuOpen(false);
  }, [location.pathname]);

  function handleLogoClick() {
    const next = logoClicks + 1;
    setLogoClicks(next);
    if (next >= 5) {
      setSecretToast(true);
      setLogoClicks(0);
      setTimeout(() => setSecretToast(false), 3500);
    }
  }

  function handleLogout() {
    logout();
    navigate('/');
  }

  const navLinks = [
    ...NAV_LINKS,
    ...(isAuthenticated ? [
      { to: '/my-movies', label: 'My Movies' },
      { to: '/movies/add', label: 'Add Movie' },
      { to: '/chat', label: 'AI Chat' },
    ] : []),
  ];

  return (
    <div className="flex min-h-screen flex-col">
      {directorsCut && (
        <div className="animate-directors-cut pointer-events-none fixed inset-0 z-[9999] flex items-center justify-center bg-[rgba(165,173,186,0.08)]">
          <div className="text-2xl font-bold text-primary-hover">🎬 Director&apos;s Cut</div>
        </div>
      )}

      {secretToast && (
        <div className="animate-pop-in fixed left-1/2 top-[68px] z-[1000] whitespace-nowrap border-2 border-border bg-surface px-5 py-2.5 text-[13px] font-semibold text-primary shadow-hard">
          ✨ Built with GraphQL Federation + Apollo Router + Vite
        </div>
      )}

      <header className="sticky top-0 z-10 border-b-2 border-border bg-surface">
        <div className="flex h-14 items-center gap-8 px-6">
          <button onClick={handleLogoClick} title="Click 5× for a secret…" className="flex items-center gap-1.75 p-0 text-[15px] font-extrabold tracking-[-0.5px] text-text-bright">
            <span className="inline-block h-2 w-2 shrink-0 bg-accent" />
            MovieDB
          </button>

          {/* Desktop nav */}
          <nav className="hidden flex-1 items-center gap-5 sm:flex">
            {navLinks.map(({ to, label }) => {
              const active = location.pathname === to || (to !== '/' && location.pathname.startsWith(to));
              return (
                <Link
                  key={to}
                  to={to}
                  className={[
                    'border-b-2 border-transparent pb-0.5 text-sm font-medium text-text-muted transition-colors duration-100 hover:text-text',
                    active ? 'border-border font-bold text-text-bright hover:text-text-bright' : '',
                  ].join(' ')}
                >
                  {label}
                </Link>
              );
            })}
          </nav>

          {/* Desktop auth */}
          <div className="hidden items-center gap-3 sm:flex">
            {isAuthenticated ? (
              <>
                <Link to={`/users/${user?.id}`} className="text-[13px] font-medium text-text-muted hover:text-text">
                  {user?.username}
                </Link>
                <button onClick={handleLogout} className={ui.subtleButton}>
                  Sign out
                </button>
              </>
            ) : (
              <>
                <Link to="/login" className="text-[13px] font-medium text-text-muted hover:text-text">
                  Sign in
                </Link>
                <Link
                  to="/register"
                  className="border-2 border-border bg-primary px-3 py-1 text-[13px] font-bold text-bg shadow-hard transition-[box-shadow,transform] duration-100 hover:shadow-hard-lg active:translate-x-0.5 active:translate-y-0.5 active:shadow-none"
                >
                  Sign up
                </Link>
              </>
            )}
          </div>

          {/* Mobile hamburger */}
          <button
            onClick={() => setMobileMenuOpen((v) => !v)}
            className="ml-auto border-2 border-border bg-surface p-1.5 text-text sm:hidden"
            aria-label={mobileMenuOpen ? 'Close menu' : 'Open menu'}
          >
            <HamburgerIcon open={mobileMenuOpen} />
          </button>
        </div>

        {/* Mobile dropdown */}
        {mobileMenuOpen && (
          <div className="border-t-2 border-border bg-surface px-6 pb-4 pt-3 sm:hidden">
            <nav className="flex flex-col gap-1">
              {navLinks.map(({ to, label }) => {
                const active = location.pathname === to || (to !== '/' && location.pathname.startsWith(to));
                return (
                  <Link
                    key={to}
                    to={to}
                    className={[
                      'border-2 border-transparent px-3 py-2.5 text-sm font-medium text-text-muted',
                      active ? 'border-border bg-bg font-bold text-text-bright' : 'hover:text-text',
                    ].join(' ')}
                  >
                    {label}
                  </Link>
                );
              })}
            </nav>
            <div className="mt-3 flex flex-col gap-2 border-t-2 border-border pt-3">
              {isAuthenticated ? (
                <>
                  <Link to={`/users/${user?.id}`} className="px-3 py-2 text-[13px] font-medium text-text-muted">
                    {user?.username}
                  </Link>
                  <button onClick={handleLogout} className="border-2 border-border bg-bg px-3 py-2 text-left text-[13px] font-medium text-text-muted hover:text-text">
                    Sign out
                  </button>
                </>
              ) : (
                <>
                  <Link to="/login" className="border-2 border-border bg-bg px-3 py-2 text-[13px] font-medium text-text-muted">
                    Sign in
                  </Link>
                  <Link to="/register" className="border-2 border-border bg-primary px-3 py-2 text-center text-[13px] font-bold text-bg shadow-hard">
                    Sign up
                  </Link>
                </>
              )}
            </div>
          </div>
        )}
      </header>

      <main key={location.pathname} className="page-enter mx-auto w-full max-w-[1200px] flex-1 px-6 py-8">
        <Outlet />
      </main>

      <footer className="flex items-center justify-between border-t-2 border-border bg-surface px-6 py-3.5 text-xs text-text-faint">
        <span>MovieDB · GraphQL Federation Platform</span>
        <Link to="/architecture" className="font-medium text-text-muted hover:text-text">
          View Architecture ↗
        </Link>
        <span title="Try the Konami code: ↑↑↓↓←→←→BA">↑↑↓↓←→←→BA 🎬</span>
      </footer>
    </div>
  );
}
