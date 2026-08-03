import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../../lib/authContext.jsx';

// Wrap any route subtree that requires a logged-in user.
// Usage in routes/AppRouter.jsx:
//   <Route element={<ProtectedRoute />}>
//     <Route path="/vault" element={<VaultPage />} />
//   </Route>
export function ProtectedRoute({ adminOnly = false }) {
  const { user, booted, isAuthenticated } = useAuth();
  const location = useLocation();

  // Wait for the initial silent-refresh attempt before deciding — otherwise
  // a page refresh briefly bounces a logged-in user to /auth.
  if (!booted) return <div className="av-route-loading">Loading…</div>;

  if (!isAuthenticated) {
    return <Navigate to="/auth" replace state={{ from: location }} />;
  }

  if (adminOnly && user?.role !== 'admin') {
    return <Navigate to="/vault" replace />;
  }

  return <Outlet />;
}
