import { Link, NavLink, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../lib/authContext.jsx';
import { useTheme } from '../../lib/themeContext.jsx';
import { useState, useRef, useEffect } from 'react';
import { Settings } from 'lucide-react';

const NAV_LINKS = [
  { to: '/vault', label: 'Vault' },
  { to: '/revise', label: 'Revise' },
  { to: '/dashboard', label: 'Dashboard' },
  { to: '/sheets', label: 'Sheets' },
  { to: '/explore', label: 'Explore' },
];

export function Navbar() {
  const { user, isAuthenticated, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { theme, toggleTheme } = useTheme();
  
  // Mobile menu visibility
  const [isOpen, setIsOpen] = useState(false);

  // Dynamic active sliding tab tracker refs
  const [sliderStyle, setSliderStyle] = useState({ left: 0, width: 0, opacity: 0 });
  const navContainerRef = useRef(null);
  const activeLinkRef = useRef(null);

  const handleLogout = async () => {
    await logout();
    setIsOpen(false);
    navigate('/auth');
  };

  // Re-calculate the sliding tab selector style coordinates on active link change
  useEffect(() => {
    if (activeLinkRef.current && navContainerRef.current) {
      const activeRect = activeLinkRef.current.getBoundingClientRect();
      const containerRect = navContainerRef.current.getBoundingClientRect();
      setSliderStyle({
        left: activeRect.left - containerRect.left,
        width: activeRect.width,
        opacity: 1
      });
    } else {
      setSliderStyle((prev) => ({ ...prev, opacity: 0 }));
    }
  }, [location.pathname, isAuthenticated]);

  return (
    <div className={`sticky top-0 z-50 w-full px-4 py-3 md:px-8 transition-colors duration-300 ${
      theme === 'light' ? 'bg-transparent' : 'bg-transparent'
    }`}>
      {/* Floating Pill Outer Container */}
      <nav className={`max-w-7xl mx-auto flex items-center justify-between px-6 py-2.5 rounded-full border shadow-lg transition-all duration-300 ${
        theme === 'light'
          ? 'bg-white/80 backdrop-blur-lg border-zinc-200 text-zinc-950 shadow-zinc-200/50'
          : 'bg-zinc-950/80 backdrop-blur-lg border-zinc-800 text-white shadow-black/80'
      }`}>
        
        {/* Left branding */}
        <Link to="/" className="flex items-center gap-2.5 font-bold text-lg no-underline tracking-tight">
          <span className="w-8 h-8 bg-black dark:bg-white text-white dark:text-black rounded-full flex items-center justify-center font-black text-sm transition-transform duration-300 hover:rotate-12">
            AV
          </span>
          <span className={theme === 'light' ? 'text-zinc-900' : 'text-white'}>AlgoVault</span>
        </Link>

        {/* Center navigation items with sliding background pill */}
        {isAuthenticated && (
          <div 
            ref={navContainerRef}
            className="hidden md:flex items-center gap-1.5 relative"
            style={{ isolation: 'isolate' }}
          >
            {/* Sliding Highlight Pill */}
            <div 
              style={{
                position: 'absolute',
                top: 0,
                bottom: 0,
                left: `${sliderStyle.left}px`,
                width: `${sliderStyle.width}px`,
                opacity: sliderStyle.opacity,
                backgroundColor: theme === 'light' ? '#09090b' : '#ffffff',
                borderRadius: '9999px',
                zIndex: -1,
                transition: 'left 0.35s cubic-bezier(0.25, 1, 0.5, 1), width 0.35s cubic-bezier(0.25, 1, 0.5, 1), opacity 0.25s ease',
              }}
            />

            {NAV_LINKS.map((l) => {
              const isActive = location.pathname.startsWith(l.to);
              return (
                <NavLink
                  key={l.to}
                  to={l.to}
                  ref={isActive ? activeLinkRef : null}
                  className="no-underline text-xs font-semibold px-4 py-2 rounded-full transition-all duration-300 cursor-pointer select-none"
                  style={{
                    color: isActive 
                      ? (theme === 'light' ? '#ffffff' : '#09090b')
                      : (theme === 'light' ? '#52525b' : '#a1a1aa'),
                    transform: 'scale(1)',
                  }}
                >
                  {l.label}
                </NavLink>
              );
            })}
            
            {user?.role === 'admin' && (
              <NavLink
                to="/admin"
                ref={location.pathname.startsWith('/admin') ? activeLinkRef : null}
                className="no-underline text-xs font-semibold px-4 py-2 rounded-full transition-all duration-300 cursor-pointer select-none"
                style={{
                  color: location.pathname.startsWith('/admin')
                    ? (theme === 'light' ? '#ffffff' : '#09090b')
                    : (theme === 'light' ? '#52525b' : '#a1a1aa'),
                }}
              >
                Admin
              </NavLink>
            )}
          </div>
        )}

        {/* Right actions and utilities */}
        <div className="flex items-center gap-3">
          {/* Light/Dark Toggle */}
          <button
            onClick={toggleTheme}
            aria-label="Toggle Theme"
            className={`p-2 rounded-full border transition-all duration-300 cursor-pointer flex items-center justify-center hover:scale-105 active:scale-95 ${
              theme === 'light'
                ? 'bg-zinc-100 border-zinc-200 hover:bg-zinc-200 text-zinc-900'
                : 'bg-zinc-900 border-zinc-800 hover:bg-zinc-800 text-white'
            }`}
          >
            {theme === 'light' ? (
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364-6.364l-.707.707M6.343 17.657l-.707.707m0-12.728l.707.707m12.728 12.728l.707.707M12 8a4 4 0 100 8 4 4 0 000-8z" />
              </svg>
            ) : (
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
              </svg>
            )}
          </button>

          {/* User Display Info & Settings & Log out button */}
          {isAuthenticated ? (
            <div className="hidden md:flex items-center gap-2">
              <Link
                to="/settings"
                className="flex items-center gap-2 no-underline px-2.5 py-1.5 rounded-full transition-all hover:bg-zinc-100 dark:hover:bg-zinc-900"
                title="Account Settings"
              >
                <div
                  style={{
                    width: '26px',
                    height: '26px',
                    borderRadius: '50%',
                    overflow: 'hidden',
                    background: theme === 'light' ? '#e4e4e7' : '#27272a',
                    border: '1px solid var(--border-color)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '0.72rem',
                    fontWeight: 750,
                    color: 'var(--text-primary)',
                  }}
                >
                  {user?.avatarUrl ? (
                    <img src={user.avatarUrl} alt={user.displayName} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  ) : (
                    (user?.displayName || 'U').slice(0, 1).toUpperCase()
                  )}
                </div>
                <span className={`text-xs font-semibold ${theme === 'light' ? 'text-zinc-700' : 'text-zinc-300'}`}>
                  {user?.displayName}
                </span>
                <Settings size={14} className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200" />
              </Link>
              <button
                onClick={handleLogout}
                className="btn-mono-secondary"
                style={{ padding: '6px 14px', borderRadius: '9999px', fontSize: '0.75rem' }}
              >
                Log out
              </button>
            </div>
          ) : (
            <Link
              to="/auth"
              className="btn-mono-primary"
              style={{ padding: '6px 16px', borderRadius: '9999px', fontSize: '0.75rem', textDecoration: 'none' }}
            >
              Sign In
            </Link>
          )}

          {/* Hamburger Mobile Menu Toggle */}
          {isAuthenticated && (
            <button
              onClick={() => setIsOpen(!isOpen)}
              className="flex md:hidden p-2 rounded-full border transition-all duration-200 outline-none"
              style={{
                borderColor: theme === 'light' ? '#e4e4e7' : '#27272a',
                color: theme === 'light' ? '#09090b' : '#ffffff'
              }}
            >
              {isOpen ? (
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              ) : (
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16m-7 6h7" />
                </svg>
              )}
            </button>
          )}
        </div>
      </nav>

      {/* Drawer menu for Mobile devices */}
      {isOpen && isAuthenticated && (
        <div className="md:hidden mt-3 max-w-7xl mx-auto">
          <div className={`flex flex-col gap-2 p-4 rounded-3xl border shadow-lg transition-all duration-300 ${
            theme === 'light'
              ? 'bg-white border-zinc-200 text-zinc-950 shadow-zinc-200/50'
              : 'bg-zinc-950 border-zinc-800 text-white shadow-black/80'
          }`}>
            {NAV_LINKS.map((l) => (
              <Link
                key={l.to}
                to={l.to}
                onClick={() => setIsOpen(false)}
                className={`no-underline text-sm font-semibold px-4 py-2.5 rounded-full transition-all ${
                  location.pathname.startsWith(l.to)
                    ? (theme === 'light' ? 'bg-zinc-950 text-white' : 'bg-white text-zinc-950')
                    : (theme === 'light' ? 'hover:bg-zinc-100 text-zinc-500' : 'hover:bg-zinc-900 text-zinc-400')
                }`}
              >
                {l.label}
              </Link>
            ))}
            {user?.role === 'admin' && (
              <Link
                to="/admin"
                onClick={() => setIsOpen(false)}
                className={`no-underline text-sm font-semibold px-4 py-2.5 rounded-full transition-all ${
                  location.pathname.startsWith('/admin')
                    ? (theme === 'light' ? 'bg-zinc-950 text-white' : 'bg-white text-zinc-950')
                    : (theme === 'light' ? 'hover:bg-zinc-100 text-zinc-500' : 'hover:bg-zinc-900 text-zinc-400')
                }`}
              >
                Admin
              </Link>
            )}

            <Link
              to="/settings"
              onClick={() => setIsOpen(false)}
              className={`no-underline text-sm font-semibold px-4 py-2.5 rounded-full transition-all ${
                location.pathname.startsWith('/settings')
                  ? (theme === 'light' ? 'bg-zinc-950 text-white' : 'bg-white text-zinc-950')
                  : (theme === 'light' ? 'hover:bg-zinc-100 text-zinc-500' : 'hover:bg-zinc-900 text-zinc-400')
              }`}
            >
              Settings
            </Link>
            
            <div className={`mt-3 pt-3 border-t flex flex-col gap-3 px-4 ${
              theme === 'light' ? 'border-zinc-100' : 'border-zinc-800'
            }`}>
              <span className={`text-xs font-semibold ${theme === 'light' ? 'text-zinc-400' : 'text-zinc-500'}`}>
                Logged in as {user?.displayName}
              </span>
              <button
                onClick={handleLogout}
                className="btn-mono-secondary"
                style={{ padding: '8px 16px', borderRadius: '9999px', fontSize: '0.8rem', justifyContent: 'center' }}
              >
                Log out
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
