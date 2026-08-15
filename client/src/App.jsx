import { QueryClientProvider } from '@tanstack/react-query';
import { queryClient } from './lib/queryClient.js';
import { AuthProvider } from './lib/authContext.jsx';
import { ThemeProvider } from './lib/themeContext.jsx';
import { ToastProvider } from './components/shared/Toast.jsx';
import { AppRouter } from './routes/AppRouter.jsx';

// Provider order matters: QueryClient before Auth (auth's refresh call uses
// the api client, not React Query, so this is mostly about consistency),
// Toast innermost since it has no dependents.
export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <AuthProvider>
          <ToastProvider>
            <AppRouter />
          </ToastProvider>
        </AuthProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}
