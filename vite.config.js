import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    host: true,
    // allow access via your local domains through Caddy
    allowedHosts: ['cbrt-ui.test','sso.test','vader-lab.test'],
    port: 5176,
    strictPort: true,
  },
})
