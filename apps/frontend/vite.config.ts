import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

const base = process.env.VITE_BASE_PATH ?? '/';

export default defineConfig({
  base,
  plugins: [react()],
  server: {
    host: '0.0.0.0',
    port: 5173
  },
  build: {
    target: 'es2022',
    sourcemap: process.env.SOURCE_MAP === 'true',
    chunkSizeWarningLimit: 1500
  }
});
