import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Конфигурация, которая запрещает Vite изолировать глобальный объект window
export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      external: [],
    }
  },
  define: {
    // Явно прокидываем глобальный контекст браузера
    global: 'window',
  }
})

