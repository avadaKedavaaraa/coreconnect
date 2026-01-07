import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    chunkSizeWarningLimit: 1000,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules')) {
            if (id.includes('react') || id.includes('react-dom') || id.includes('react-router-dom')) {
              return 'vendor-react';
            }
            if (id.includes('@supabase')) {
              return 'vendor-supabase';
            }
            if (id.includes('@google/genai')) {
              return 'vendor-genai';
            }
          }
        }
      },
      // IMPORTANT: Exclude backend-only dependencies from the frontend bundle to prevent build errors
      external: [
        'express', 
        'crypto', 
        'fs', 
        'path', 
        'os', 
        'url', 
        'http', 
        'https', 
        'stream', 
        'zlib', 
        'events', 
        'util', 
        'net',
        'express-rate-limit', 
        'helmet', 
        'hpp', 
        'cors', 
        'cookie-parser', 
        'multer', 
        'serverless-http',
        'node:crypto',
        'node:buffer'
      ]
    }
  },
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
        secure: false
      }
    }
  }
})