import { configDefaults, defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    chunkSizeWarningLimit: 700,
  },
  test: {
    environment: 'jsdom',
    // Reuse the environment per worker while keeping a separate VM for each test file.
    pool: 'vmThreads',
    exclude: [...configDefaults.exclude, 'tests/e2e/**'],
    setupFiles: './src/test/setup.ts',
    testTimeout: 15_000,
  },
})
