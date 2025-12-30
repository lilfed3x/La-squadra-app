
// Fix: Explicitly import process from node:process to resolve TypeScript errors for Node.js globals
import process from 'node:process';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  // Carga variables de entorno del sistema (como las de Vercel)
  const env = loadEnv(mode, process.cwd(), '');
  
  return {
    plugins: [
      react()
    ],
    define: {
      // Mapeo de variables para que estén disponibles en el cliente
      'process.env.API_KEY': JSON.stringify(env.API_KEY || ''),
      'process.env.VITE_SUPABASE_URL': JSON.stringify(env.VITE_SUPABASE_URL || ''),
      'process.env.VITE_SUPABASE_ANON_KEY': JSON.stringify(env.VITE_SUPABASE_ANON_KEY || ''),
      'process.env.VITE_GOOGLE_CLIENT_ID': JSON.stringify(env.VITE_GOOGLE_CLIENT_ID || '')
    },
    server: {
      port: 3000,
      open: true
    },
    build: {
      outDir: 'dist',
      sourcemap: false,
      minify: 'esbuild',
      rollupOptions: {
        input: {
          main: './index.html',
        },
      },
    }
  };
});
