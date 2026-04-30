import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig(({ command }) => ({
  base: command === 'build' ? '/choo-choo-chain/' : './',
  plugins: [react(), tailwindcss()],
  server: {
    host: true,
    open: true,
  },
  build: {
    emptyOutDir: true,
    sourcemap: true,
  },
}))
