import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { labsRunnerDevPlugin } from './tools/labs-runner-dev-plugin'

const labsRunnerEnabled = process.env.VITE_SHOW_LABS === '1' && process.env.VITE_ENABLE_LAB_RUNNERS === '1'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), labsRunnerDevPlugin({ enabled: labsRunnerEnabled })],
  clearScreen: false,
  server: {
    host: '0.0.0.0',
    port: 1420,
    strictPort: true,
  },
  preview: {
    host: '0.0.0.0',
    port: 4173,
    strictPort: true,
  },
})
