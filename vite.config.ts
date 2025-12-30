
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
      'process.env.VITE_SUPABASE_ANON_KEY': JSON.stringify(env.VITE_SUPABASE_ANON_KEY || '')
    },
    server: {
      port: 3000,
      open: true
    },
    build: {
      outDir: 'dist',
      sourcemap: false,
      minify: 'esbuild',
      // Aumentamos el límite de advertencia a 1000 kB (1 MB)
      chunkSizeWarningLimit: 1000,
      rollupOptions: {
        input: {
          main: './index.html',
        },
        output: {
          // Estrategia de división de código manual para optimizar la carga
          manualChunks(id) {
            if (id.includes('node_modules')) {
              // Separar librerías grandes en sus propios archivos (chunks)
              if (id.includes('@google/genai')) {
                return 'genai';
              }
              if (id.includes('recharts')) {
                return 'recharts';
              }
              if (id.includes('@supabase')) {
                return 'supabase';
              }
              if (id.includes('jspdf')) {
                return 'jspdf';
              }
              if (id.includes('xlsx')) {
                return 'xlsx';
              }
              if (id.includes('lucide-react')) {
                return 'icons';
              }
              // El resto de dependencias van a un archivo vendor común
              return 'vendor';
            }
          }
        }
      },
    }
  };
});
