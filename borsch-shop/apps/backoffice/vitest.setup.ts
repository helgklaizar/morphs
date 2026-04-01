import '@testing-library/jest-dom/vitest'
import { cleanup } from '@testing-library/react'
import { afterEach, vi } from 'vitest'

// mock alert for tests
global.alert = vi.fn()

// mock Tauri APIs
vi.mock('@tauri-apps/api/core', () => ({
  invoke: vi.fn().mockResolvedValue(true),
}))

vi.mock('@tauri-apps/plugin-sql', () => ({
  default: {
    load: vi.fn().mockResolvedValue({
      execute: vi.fn().mockResolvedValue(true),
      select: vi.fn().mockResolvedValue([]),
    }),
  },
}))

// clean up after each test
afterEach(() => {
  cleanup()
  vi.clearAllMocks()
})
