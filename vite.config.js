import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  base: './',            // relative asset paths, so the build works from any folder/host
  server: { host: true }, // also reachable from a phone on the same Wi-Fi
  build: { chunkSizeWarningLimit: 2000 }, // three.js is big; that's expected
})
