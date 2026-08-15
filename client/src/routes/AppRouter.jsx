import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ProtectedRoute } from '../components/shared/ProtectedRoute.jsx';
import { Navbar } from '../components/shared/Navbar.jsx';
import { useTheme } from '../lib/themeContext.jsx';

// Feature pages — placeholders now, each feature dev fills theirs in.
import { AuthPage } from '../features/auth/AuthPage.jsx';
import { VaultPage } from '../features/vault/VaultPage.jsx';
import { NoteDetailPage } from '../features/vault/NoteDetailPage.jsx';
import { RevisePage } from '../features/revise/RevisePage.jsx';
import { DashboardPage } from '../features/dashboard/DashboardPage.jsx';
import { SheetsPage } from '../features/sheets/SheetsPage.jsx';
import { SheetDetailPage } from '../features/sheets/SheetDetailPage.jsx';
import { ExplorePage } from '../features/explore/ExplorePage.jsx';
import { AdminPage } from '../features/admin/AdminPage.jsx';

export function AppRouter() {
  const { theme } = useTheme();

  return (
    <BrowserRouter>
      <Navbar />
      <main className={`av-main av-theme-${theme}`}>
        <Routes>
          <Route path="/" element={<Navigate to="/vault" replace />} />
          <Route path="/auth" element={<AuthPage />} />

          <Route element={<ProtectedRoute />}>
            <Route path="/vault" element={<VaultPage />} />
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

          <Route path="*" element={<Navigate to="/vault" replace />} />
        </Routes>
      </main>
    </BrowserRouter>
  );
}
