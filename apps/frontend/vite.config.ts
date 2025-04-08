import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react()
  ],
  build: {
    outDir: '../../build/frontend'
  },
  server: {
    proxy: {
      "/api": "http://localhost:3000",
      "/map": {
        target: "http://localhost:8080",
        rewrite: (path) => path.replace(/^\/map/, ''),
      }
    }
  }
})
