import type { Rolldown, UserConfig } from 'vite'

import path from 'node:path'
import { TanStackRouterVite } from '@tanstack/router-vite-plugin'

/**
 * Native modules can't be bundled, forge.config.ts copies them into the
 * package. Everything else is bundled: the Forge Vite plugin only packages
 * the .vite folder
 */
export const nativeModules = ['node-process-watcher']

// Suppress "Module level directives cause errors when bundled" warnings
export function onwarn(
  warning: Rolldown.RolldownLog,
  warn: Rolldown.LoggingFunction,
): void {
  if (warning.code === 'MODULE_LEVEL_DIRECTIVE') {
    return
  }

  warn(warning)
}

/**
 * Main process and preload builds, on top of the Forge Vite plugin defaults
 */
export const nodeBuildConfig: UserConfig = {
  build: {
    chunkSizeWarningLimit: 2000,
    rollupOptions: {
      external: nativeModules,
      onwarn,
    },
  },
  plugins: [TanStackRouterVite()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
}
