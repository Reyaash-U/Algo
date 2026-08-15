import { Link, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../lib/authContext.jsx';

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

  const handleLogout = async () => {
    await logout();
    navigate('/auth');
  };

  return (
    <nav className="flex items-center justify-between px-7 py-3.5 bg-slate-900/85 backdrop-blur-md sticky top-0 z-50 border-b border-white/10">
      <Link to="/" className="font-bold text-lg no-underline text-gray-100 flex items-center gap-2 tracking-tight">
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
                    ? 'text-white bg-white/10 border-b-2 border-violet-500'
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
                    ? 'text-white bg-white/10 border-b-2 border-violet-500'
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
        {isAuthenticated ? (
          <>
            <span className="text-xs text-gray-400 font-medium">
              👤 {user?.displayName}
            </span>
            <button
              onClick={handleLogout}
              className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-white/10 hover:bg-white/20 text-gray-200 border border-white/10 transition-all cursor-pointer"
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
