import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

const BACKEND_URL = 'http://a8063dc3c9b654fd98b239ad5a38b583-93b581fdf50f6b28.elb.ap-southeast-1.amazonaws.com'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/patients': {
        target: BACKEND_URL,
        changeOrigin: true,
      },
      '/logs': {
        target: BACKEND_URL,
        changeOrigin: true,
      },
    },
  },
})
