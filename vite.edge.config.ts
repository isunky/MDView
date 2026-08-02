import { resolve } from 'node:path'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  root: resolve(__dirname, 'edge'),
  base: './',
  publicDir: resolve(__dirname, 'edge/public'),
  plugins: [react()],
  build: {
    outDir: resolve(__dirname, 'dist-edge'),
    emptyOutDir: true,
    rollupOptions: {
      input: {
        app: resolve(__dirname, 'edge/index.html'),
        background: resolve(__dirname, 'edge/background.ts'),
      },
      output: {
        entryFileNames: (chunk) => chunk.name === 'background' ? 'background.js' : 'assets/[name]-[hash].js',
        chunkFileNames: 'assets/[name]-[hash].js',
        assetFileNames: 'assets/[name]-[hash][extname]',
      },
    },
  },
})
