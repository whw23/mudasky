/**
 * Vitest 测试配置。
 */

import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./tests/setup.ts'],
    include: ['tests/**/*.test.{ts,tsx}'],
    coverage: {
      provider: 'v8',
      include: ['components/**', 'lib/**', 'hooks/**', 'contexts/**'],
      exclude: ['**/*.test.*', '**/*.spec.*', 'e2e/**'],
      reporter: ['text', 'html'],
      reportsDirectory: '../test-results/vitest-coverage',
    },
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, '.'),
    },
  },
})
