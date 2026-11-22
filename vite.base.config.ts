import type { UserConfig } from 'vite'

import path from 'node:path'
import { TanStackRouterVite } from '@tanstack/router-vite-plugin'

/**
 * Native modules can't be bundled, forge.config.ts copies them into the
 * package. Everything else is bundled: the Forge Vite plugin only packages
 * the .vite folder
 */
export const nativeModules = ['node-process-watcher']

/**
 * Shared by the main process and preload builds, the Forge Vite plugin
 * provides the rest (entry, output format and file names, defines)
 */
export const nodeBuildConfig: UserConfig = {
  build: {
    chunkSizeWarningLimit: 2000,
    rollupOptions: {
      external: nativeModules,
      onwarn(warning, warn) {
        // Suppress "Module level directives cause errors when bundled" warnings
        if (warning.code === 'MODULE_LEVEL_DIRECTIVE') {
          return
        }

        warn(warning)
      },
    },
  },
  plugins: [TanStackRouterVite()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
}
