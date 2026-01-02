
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    chunkSizeWarningLimit: 1000,
    rollupOptions: {
      output: {
        manualChunks: {
          'vendor-react': ['react', 'react-dom'],
          'vendor-utils': ['@supabase/supabase-js', '@google/genai', 'dompurify'],
          'vendor-icons': ['lucide-react'] 
        }
      }
    }
  },
  server: {
    port: 3000
  }
})
