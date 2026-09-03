import { defineConfig } from 'vite'

export default defineConfig({
  server: {
    host: true,
    hmr: false,
    watch: { usePolling: true },
    allowedHosts: true,
  },
})