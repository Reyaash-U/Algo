import { Link, NavLink, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../lib/authContext.jsx';
import { useTheme } from '../../lib/themeContext.jsx';

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

  const handleLogout = async () => {
    await logout();
    navigate('/auth');
  };

  // Only show the theme toggle on Dashboard and Sheets pages (and sub-paths of sheets)
  const showToggle = location.pathname.startsWith('/dashboard') || location.pathname.startsWith('/sheets');

  return (
    <nav className={`flex items-center justify-between px-7 py-3.5 sticky top-0 z-50 transition-colors duration-300 ${
      showToggle && theme === 'light'
        ? 'bg-white border-b border-zinc-200 text-zinc-950'
        : 'bg-slate-900/85 backdrop-blur-md border-b border-white/10 text-gray-100'
    }`}>
      <Link to="/" className={`font-bold text-lg no-underline flex items-center gap-2 tracking-tight ${
        showToggle && theme === 'light' ? 'text-zinc-900' : 'text-gray-100'
      }`}>
        <span className="w-7 h-7 bg-gradient-to-br from-violet-600 to-cyan-500 rounded-lg flex items-center justify-center text-white font-extrabold text-xs shadow-md shadow-violet-500/50">
          AV
        </span>
        <span>AlgoVault</span>
      </Link>

      {isAuthenticated && (
        <div className="flex gap-5">
          {NAV_LINKS.map((l) => (
            <NavLink
              key={l.to}
              to={l.to}
              className={({ isActive }) =>
                `no-underline text-sm font-medium px-3 py-1.5 rounded-md transition-all ${
                  isActive
                    ? showToggle && theme === 'light'
                      ? 'text-zinc-950 bg-zinc-100 border-b-2 border-zinc-900'
                      : 'text-white bg-white/10 border-b-2 border-violet-500'
                    : showToggle && theme === 'light'
                    ? 'text-zinc-500 hover:text-zinc-900 hover:bg-zinc-100/50'
                    : 'text-gray-400 hover:text-white hover:bg-white/5'
                }`
              }
            >
              {l.label}
            </NavLink>
          ))}
          {user?.role === 'admin' && (
            <NavLink
              to="/admin"
              className={({ isActive }) =>
                `no-underline text-sm font-medium px-3 py-1.5 rounded-md transition-all ${
                  isActive
                    ? showToggle && theme === 'light'
                      ? 'text-zinc-950 bg-zinc-100 border-b-2 border-zinc-900'
                      : 'text-white bg-white/10 border-b-2 border-violet-500'
                    : showToggle && theme === 'light'
                    ? 'text-zinc-500 hover:text-zinc-900 hover:bg-zinc-100/50'
                    : 'text-gray-400 hover:text-white hover:bg-white/5'
                }`
              }
            >
              Admin
            </NavLink>
          )}
        </div>
      )}

      <div className="flex items-center gap-3">
        {showToggle && (
          <button
            onClick={toggleTheme}
            aria-label="Toggle Theme"
            className={`p-2 rounded-lg border transition-all cursor-pointer flex items-center justify-center ${
              theme === 'light'
                ? 'bg-zinc-100 border-zinc-200 hover:bg-zinc-200 text-zinc-900'
                : 'bg-white/10 border-white/10 hover:bg-white/20 text-gray-200'
            }`}
          >
            {theme === 'light' ? (
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364-6.364l-.707.707M6.343 17.657l-.707.707m0-12.728l.707.707m12.728 12.728l.707.707M12 8a4 4 0 100 8 4 4 0 000-8z" />
              </svg>
            ) : (
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
              </svg>
            )}
          </button>
        )}

        {isAuthenticated ? (
          <>
            <span className={`text-xs font-medium ${showToggle && theme === 'light' ? 'text-zinc-500' : 'text-gray-400'}`}>
              👤 {user?.displayName}
            </span>
            <button
              onClick={handleLogout}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg border transition-all cursor-pointer ${
                showToggle && theme === 'light'
                  ? 'bg-zinc-900 hover:bg-zinc-800 text-white border-zinc-900'
                  : 'bg-white/10 hover:bg-white/20 text-gray-200 border-white/10'
              }`}
            >
              Log out
            </button>
          </>
        ) : (
          <Link
            to="/auth"
            className="px-3.5 py-1.5 text-xs font-semibold rounded-lg bg-gradient-to-r from-violet-600 to-violet-700 hover:from-violet-500 hover:to-violet-600 text-white no-underline shadow-md shadow-violet-500/30 transition-all"
          >
            Log in
          </Link>
        )}
      </div>
    </nav>
  );
}
