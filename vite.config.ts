import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '.', '');
  return {
    plugins: [react()],
    define: {
      // Polyfill process.env to allow accessing API_KEY as currently written in the code
      'process.env': {
        API_KEY: env.API_KEY
      }
    },
    server: {
      port: 3000,
      open: true
    },
    build: {
      outDir: 'dist',
      // Ensure local assets like sw.js are handled if needed, though usually they go in public/
      rollupOptions: {
        input: {
          main: './index.html',
        },
      },
    }
  };
});