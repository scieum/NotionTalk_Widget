import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      // 개발 시 연동 계층(apps/server)으로 프록시
      '/api': 'http://localhost:8787',
    },
  },
})
