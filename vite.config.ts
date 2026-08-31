import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig} from 'vite';

export default defineConfig(() => {
  return {
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      port: 3000,
      host: '0.0.0.0',
      hmr: process.env.DISABLE_HMR !== 'true',
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
    build: {
      outDir: 'dist',
      emptyOutDir: true,
      cssMinify: true,
      minify: 'esbuild',
      chunkSizeWarningLimit: 2000,
      rollupOptions: {
        output: {
          manualChunks(id) {
            if (id.includes('node_modules')) {
              if (id.includes('jspdf') || id.includes('fflate')) {
                return 'vendor-pdf';
              }
              if (id.includes('xlsx')) {
                return 'vendor-excel';
              }
              if (id.includes('@supabase')) {
                return 'vendor-supabase';
              }
              if (id.includes('react') || id.includes('react-dom') || id.includes('motion') || id.includes('framer-motion') || id.includes('lucide-react') || id.includes('recharts') || id.includes('use-sync-external-store')) {
                return 'vendor-react';
              }
              return 'vendor-libs';
            }
          }
        }
      }
    }
  };
});
