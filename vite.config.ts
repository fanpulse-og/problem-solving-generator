import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

// base './' keeps asset paths relative, so the same build works on
// GitHub Pages (sub-path), Netlify and Vercel without changes.
export default defineConfig({
  base: './',
  plugins: [react()],
  build: { chunkSizeWarningLimit: 800 },
  test: { globals: true, environment: 'node', testTimeout: 120000 },
});
