import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const hfSpaceUrl = env.HF_SPACE_URL || env.VITE_API_URL || 'https://swayamprakashpatel-pharmforge-backend.hf.space'
  const hfSpaceToken = env.HF_SPACE_TOKEN

  return {
    plugins: [react()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
      },
    },
    server: {
      port: 5173,
      proxy: {
        '/api': {
          target: hfSpaceUrl,
          changeOrigin: true,
          headers: hfSpaceToken
            ? { Authorization: `Bearer ${hfSpaceToken}` }
            : undefined,
          // Keep existing /api routes as-is, but map /api/health to backend /health.
          rewrite: (requestPath) =>
            requestPath === '/api/health' ? '/health' : requestPath,
        },
      },
    },
  }
})
