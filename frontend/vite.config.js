import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    host: true,        // Listen on all network interfaces
    port: 5173,        // Optional: specify a port (default is 5173)
    strictPort: false, // If true, Vite will fail if the port is busy
  },
})
