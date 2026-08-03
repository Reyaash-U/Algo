import { Link, useNavigate } from 'react-router-dom';
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
    <nav className="av-navbar">
      <Link to="/" className="av-navbar__brand">AlgoVault</Link>
      {isAuthenticated && (
        <div className="av-navbar__links">
          {NAV_LINKS.map((l) => (
            <Link key={l.to} to={l.to}>{l.label}</Link>
          ))}
          {user?.role === 'admin' && <Link to="/admin">Admin</Link>}
        </div>
      )}
      <div className="av-navbar__auth">
        {isAuthenticated ? (
          <>
            <span>{user?.displayName}</span>
            <button onClick={handleLogout}>Log out</button>
          </>
        ) : (
          <Link to="/auth">Log in</Link>
        )}
      </div>
    </nav>
  );
}
