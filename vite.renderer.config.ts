import { defineConfig } from 'vite'

// https://vitejs.dev/config
export default defineConfig({
  build: {
    chunkSizeWarningLimit: 2000,
    rollupOptions: {
      onwarn(warning, warn) {
        // Suppress "Module level directives cause errors when bundled" warnings
        if (warning.code === 'MODULE_LEVEL_DIRECTIVE') {
          return
        }

        warn(warning)
      },
    },
  },
})
