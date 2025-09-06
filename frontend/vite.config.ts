import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  // Load env file based on `mode` in the current working directory.
  // Set the third parameter to '' to load all env regardless of the `VITE_` prefix.
  const env = loadEnv(mode, process.cwd(), '')

  return {
    plugins: [react()],
    optimizeDeps: {
      exclude: ['*.php'],
    },
    build: {
      rollupOptions: {
       // external: [/.*\.php$/],
      },
    },
    server: {
      proxy: {
        // Proxy /backend requests to the PHP development server.
        // The backend server URL is loaded from the .env file (e.g., VITE_API_BASE_URL=http://localhost:8000)
        '/backend': {
          target: env.VITE_API_BASE_URL,
          changeOrigin: true,
        },
      },
    },
  }
})
