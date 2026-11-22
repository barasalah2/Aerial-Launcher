import { defineConfig } from 'vite'

import { onwarn } from './vite.base.config'

// https://vitejs.dev/config
export default defineConfig({
  build: {
    chunkSizeWarningLimit: 2000,
    rollupOptions: {
      onwarn,
    },
  },
})
