import '@testing-library/jest-dom/vitest'
import { cleanup } from '@testing-library/react'
import { afterEach } from 'vitest'

if (typeof window !== 'undefined' && typeof window.localStorage?.getItem !== 'function') {
  const values = new Map<string, string>()
  const storage: Storage = {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, String(value)),
    removeItem: (key) => values.delete(key),
    clear: () => values.clear(),
    key: (index) => [...values.keys()][index] ?? null,
    get length() {
      return values.size
    },
  }

  Object.defineProperty(window, 'localStorage', { configurable: true, value: storage })
}

afterEach(() => {
  cleanup()
})
