import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
  ],
  server: {
    port: 5173,
  },
  // No `preserveSymlinks`: the linked @algovault/shared workspace package must resolve to its
  // real path (../shared). Kept as a node_modules path, Vite serves it like a third-party
  // dependency with an immutable one-year cache, so edits to the shared API contract never
  // reach the browser until its cache is cleared.
  optimizeDeps: {
    exclude: ['@algovault/shared'],
  },
});
