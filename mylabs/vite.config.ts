import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// GitHub Pages deploys at https://<user>.github.io/<repo>/
// Change `base` below to match your repo name.
// For user/organization pages (at https://<user>.github.io), set base to '/'
export default defineConfig({
  plugins: [react()],
  base: './',
  build: {
    outDir: 'dist',
    sourcemap: false,
    chunkSizeWarningLimit: 1200,
    rollupOptions: {
      output: {
        manualChunks: {
          recharts: ['recharts'],
          pdf: ['@react-pdf/renderer'],
          motion: ['framer-motion'],
        },
      },
    },
  },
})
