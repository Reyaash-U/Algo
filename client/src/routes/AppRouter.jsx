import { Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ProtectedRoute } from '../components/shared/ProtectedRoute.jsx';
import { Navbar } from '../components/shared/Navbar.jsx';
import { SkeletonCard } from '../components/shared/Skeleton.jsx';
import { useTheme } from '../lib/themeContext.jsx';

// Each route is its own chunk — keeps the initial bundle under Vite's 500KB
// warning by deferring recharts/prism-heavy pages (Dashboard, Vault) until
// they're actually navigated to.
const AuthPage = lazy(() => import('../features/auth/AuthPage.jsx').then((m) => ({ default: m.AuthPage })));
const VaultPage = lazy(() => import('../features/vault/VaultPage.jsx').then((m) => ({ default: m.VaultPage })));
const NoteDetailPage = lazy(() => import('../features/vault/NoteDetailPage.jsx').then((m) => ({ default: m.NoteDetailPage })));
const NoteFormPage = lazy(() => import('../features/vault/NoteFormPage.jsx').then((m) => ({ default: m.NoteFormPage })));
const RevisePage = lazy(() => import('../features/revise/RevisePage.jsx').then((m) => ({ default: m.RevisePage })));
const DashboardPage = lazy(() => import('../features/dashboard/DashboardPage.jsx').then((m) => ({ default: m.DashboardPage })));
const SheetsPage = lazy(() => import('../features/sheets/SheetsPage.jsx').then((m) => ({ default: m.SheetsPage })));
const SheetDetailPage = lazy(() => import('../features/sheets/SheetDetailPage.jsx').then((m) => ({ default: m.SheetDetailPage })));
const ExplorePage = lazy(() => import('../features/explore/ExplorePage.jsx').then((m) => ({ default: m.ExplorePage })));
const AdminPage = lazy(() => import('../features/admin/AdminPage.jsx').then((m) => ({ default: m.AdminPage })));

function RouteFallback() {
  return (
    <div style={{ maxWidth: '800px', margin: '0 auto' }}>
      <SkeletonCard />
    </div>
  );
}

export function AppRouter() {
  const { theme } = useTheme();

  return (
    <BrowserRouter>
      <Navbar />
      <main className={`av-main av-theme-${theme}`}>
        <Suspense fallback={<RouteFallback />}>
        <Routes>
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="/auth" element={<AuthPage />} />

          <Route element={<ProtectedRoute />}>
            <Route path="/vault" element={<VaultPage />} />
            <Route path="/note/new" element={<NoteFormPage />} />
            <Route path="/note/:id/edit" element={<NoteFormPage />} />
            <Route path="/note/:id" element={<NoteDetailPage />} />
            <Route path="/revise" element={<RevisePage />} />
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/sheets" element={<SheetsPage />} />
            <Route path="/sheets/:id" element={<SheetDetailPage />} />
            <Route path="/explore" element={<ExplorePage />} />
          </Route>

          <Route element={<ProtectedRoute adminOnly />}>
            <Route path="/admin" element={<AdminPage />} />
          </Route>

          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
        </Suspense>
      </main>
    </BrowserRouter>
  );
}
