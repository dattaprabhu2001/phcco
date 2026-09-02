import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// The API runs as its own process on :4000. Proxying it here means the browser
// only ever talks to one origin in development, so no CORS and no absolute URLs
// baked into the client — the same relative /api paths work in production,
// where Express serves the built SPA itself.
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': { target: 'http://localhost:4000', changeOrigin: true },
      '/uploads': { target: 'http://localhost:4000', changeOrigin: true },
    },
  },
  build: { outDir: 'dist', emptyOutDir: true },
});
