import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { labsRunnerDevPlugin } from './tools/labs-runner-dev-plugin'

const labsRunnerEnabled = process.env.VITE_SHOW_LABS === '1' && process.env.VITE_ENABLE_LAB_RUNNERS === '1'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), labsRunnerDevPlugin({ enabled: labsRunnerEnabled })],
  clearScreen: false,
  build: {
    manifest: true,
    // Vendor chunks are intentionally larger than app chunks; app chunk budgets
    // are enforced by tools/report-bundle-size.mjs.
    chunkSizeWarningLimit: 1800,
    rollupOptions: {
      output: {
        manualChunks(id) {
          const normalizedId = id.replace(/\\/g, '/');
          if (!normalizedId.includes('/node_modules/')) {
            return undefined;
          }

          if (
            normalizedId.includes('/node_modules/react/')
            || normalizedId.includes('/node_modules/react-dom/')
          ) {
            return 'vendor-react';
          }

          if (normalizedId.includes('/node_modules/mathlive/')) {
            return 'vendor-mathlive';
          }

          if (normalizedId.includes('/node_modules/@cortex-js/compute-engine/')) {
            return 'vendor-compute-engine';
          }

          if (normalizedId.includes('/node_modules/@tauri-apps/')) {
            return 'vendor-tauri';
          }

          if (normalizedId.includes('/node_modules/zod/')) {
            return 'vendor-zod';
          }

          return 'vendor';
        },
      },
    },
  },
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
