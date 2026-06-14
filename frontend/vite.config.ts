import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/auth': { target: 'http://localhost:3001', changeOrigin: true },
      '/transactions': { target: 'http://localhost:3001', changeOrigin: true },
      '/goals': { target: 'http://localhost:3001', changeOrigin: true },
      '/dashboard': { target: 'http://localhost:3001', changeOrigin: true },
      '/simulator': { target: 'http://localhost:3001', changeOrigin: true },
      '/chat': { target: 'http://localhost:3001', changeOrigin: true },
      '/tax': { target: 'http://localhost:3001', changeOrigin: true },
    },
  },
})
