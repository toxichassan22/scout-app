import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    target: 'es2018',
    cssCodeSplit: true,
    sourcemap: false,
    minify: 'esbuild',
    chunkSizeWarningLimit: 800,
    rollupOptions: {
      output: {
        manualChunks: {
          'react-vendor': ['react', 'react-dom', 'react-router-dom'],
          'ui-vendor': ['framer-motion', 'lucide-react'],
          'charts-vendor': ['recharts'],
          'qr-vendor': ['qrcode.react', 'react-qr-scanner'],
        },
      },
    },
  },
  server: {
    host: true,
    port: 5173,
    allowedHosts: true,
  },
  preview: {
    port: 4173,
  },
});
