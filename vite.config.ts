
// Fix: Explicitly import process from node:process to resolve TypeScript errors for Node.js globals
import process from 'node:process';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig(({ mode }) => {
  // Carga variables de entorno del sistema (como las de Vercel)
  const env = loadEnv(mode, process.cwd(), '');
  
  return {
    plugins: [
      react(),
      VitePWA({
        registerType: 'autoUpdate',
        injectRegister: 'auto', 
        includeAssets: ['favicon.ico', 'apple-touch-icon.png', 'pwa-icon.png'],
        manifestFilename: 'manifest.json', // Force output filename
        workbox: {
          globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'], 
          cleanupOutdatedCaches: true,
          clientsClaim: true,
          skipWaiting: true,
          runtimeCaching: [
            {
              urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
              handler: 'CacheFirst',
              options: {
                cacheName: 'google-fonts-cache',
                expiration: {
                  maxEntries: 10,
                  maxAgeSeconds: 60 * 60 * 24 * 365 // <== 365 days
                },
                cacheableResponse: {
                  statuses: [0, 200]
                }
              }
            }
          ]
        },
        devOptions: {
          enabled: true 
        },
        manifest: {
          id: '/', // CRITICAL for PWA recognition
          name: 'LA SQUADRA',
          short_name: 'La Squadra',
          description: 'Plataforma profesional de scouting de fútbol.',
          theme_color: '#0f172a',
          background_color: '#0f172a',
          display: 'standalone', // Enforces App Mode
          display_override: ['window-controls-overlay', 'standalone', 'minimal-ui'],
          orientation: 'portrait',
          start_url: '/',
          scope: '/',
          icons: [
            {
              src: 'pwa-icon.png',
              sizes: '192x192',
              type: 'image/png',
              purpose: 'any' // Standard icon
            },
            {
              src: 'pwa-icon.png',
              sizes: '192x192',
              type: 'image/png',
              purpose: 'maskable' // Android adaptive icon
            },
            {
              src: 'pwa-icon.png',
              sizes: '512x512',
              type: 'image/png',
              purpose: 'any'
            },
            {
              src: 'pwa-icon.png',
              sizes: '512x512',
              type: 'image/png',
              purpose: 'maskable'
            }
          ],
          shortcuts: [
            {
              name: "Base de Datos",
              short_name: "Jugadores",
              description: "Ver lista de jugadores",
              url: "/?mode=database",
              icons: [{ src: "pwa-icon.png", sizes: "192x192" }]
            }
          ],
          categories: ["sports", "productivity", "utilities"]
        }
      })
    ],
    define: {
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
      chunkSizeWarningLimit: 1000,
      rollupOptions: {
        input: {
          main: './index.html',
        },
        output: {
          manualChunks(id) {
            if (id.includes('node_modules')) {
              if (id.includes('@google/genai')) return 'genai';
              if (id.includes('recharts')) return 'recharts';
              if (id.includes('@supabase')) return 'supabase';
              if (id.includes('jspdf')) return 'jspdf';
              if (id.includes('xlsx')) return 'xlsx';
              if (id.includes('lucide-react')) return 'icons';
              return 'vendor';
            }
          }
        }
      },
    }
  };
});
