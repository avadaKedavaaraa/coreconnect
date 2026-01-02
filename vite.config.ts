
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    chunkSizeWarningLimit: 800,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules')) {
            // Group core React dependencies
            if (id.includes('react') || id.includes('react-dom') || id.includes('react-router-dom')) {
              return 'vendor-react';
            }
            // Isolate large libraries
            if (id.includes('@supabase')) {
              return 'vendor-supabase';
            }
            if (id.includes('@google/genai')) {
              return 'vendor-genai';
            }
            if (id.includes('dompurify')) {
              return 'vendor-utils';
            }
            // Allow other libraries (like lucide-react) to be split naturally 
            // by Vite/Rollup based on usage in lazy-loaded components
          }
        }
      }
    }
  },
  server: {
    port: 3000
  }
})
