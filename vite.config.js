import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// IMPORTANT: base must be absolute '/' for BrowserRouter deep links
// (/portal/:token, /invoices/:id). Relative './' breaks asset URLs on nested paths
// (browser requests /portal/assets/* → blank page). Capacitor serves from host root too.
export default defineConfig({
  plugins: [react()],
  base: process.env.VITE_BASE || '/',
  build: {
    outDir: 'dist',
    sourcemap: false,
    chunkSizeWarningLimit: 1200,
  },
  server: {
    port: 5173,
    host: true,
  },
  preview: {
    port: 4173,
    host: true,
  },
})
