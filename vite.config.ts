import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    // The 3D scene chunk (three.js) is lazy-loaded and ~250 kB gzipped; that's expected.
    chunkSizeWarningLimit: 1200,
  },
})
