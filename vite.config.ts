import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import { loadEnv } from 'vite'
import { apiBase } from './src/api/client'

export default defineConfig(({ command, mode }) => {
  if (command === 'build') {
    const env = loadEnv(mode, process.cwd(), 'VITE_')
    const configured = process.env.VITE_API_BASE_URL ?? env.VITE_API_BASE_URL
    const base = apiBase(configured || '')
    if (
      !base.startsWith('https:') ||
      ['localhost', '127.0.0.1', '[::1]'].includes(new URL(base).hostname)
    )
      throw new Error('Set VITE_API_BASE_URL to the deployed HTTPS API before building.')
  }
  return {
    plugins: [react()],
    test: { environment: 'jsdom', setupFiles: ['./tests/setup.ts'], restoreMocks: true },
  }
})
