import type { ForgeConfig } from '@electron-forge/shared-types'

import { cpSync } from 'node:fs'
import path from 'node:path'

import { MakerSquirrel } from '@electron-forge/maker-squirrel'
import { FusesPlugin } from '@electron-forge/plugin-fuses'
import { VitePlugin } from '@electron-forge/plugin-vite'
import { FuseV1Options, FuseVersion } from '@electron/fuses'

import {
  repositoryOwner,
  repositoryRawURL,
} from './src/config/about/links'
import { nativeModules } from './vite.base.config'

const config: ForgeConfig = {
  packagerConfig: {
    asar: true,
    icon: 'icon-transparent.ico',
  },
  rebuildConfig: {},
  hooks: {
    // The Vite plugin only packages the .vite folder: add the native modules
    // left out of the bundle, so they get rebuilt for Electron.
    // node-process-watcher builds against node-addon-api without declaring it
    async packageAfterCopy(_forgeConfig, buildPath) {
      for (const name of [...nativeModules, 'node-addon-api']) {
        cpSync(
          path.join(__dirname, 'node_modules', name),
          path.join(buildPath, 'node_modules', name),
          { recursive: true },
        )
      }
    },
  },
  makers: [
    new MakerSquirrel({
      iconUrl: `${repositoryRawURL}/icon-transparent.ico`,
      setupIcon: 'icon-transparent.ico',
    }),
  ],
  plugins: [
    new VitePlugin({
      hotRestart: true,
      build: [
        {
          entry: 'src/kernel/main.ts',
          config: 'vite.main.config.ts',
        },
        {
          entry: 'src/kernel/preload.ts',
          config: 'vite.preload.config.ts',
          target: 'preload',
        },
      ],
      renderer: [
        {
          name: 'main_window',
          config: 'vite.renderer.config.ts',
        },
      ],
    }),
    // Fuses are used to enable/disable various Electron functionality
    // at package time, before code signing the application
    new FusesPlugin({
      version: FuseVersion.V1,
      [FuseV1Options.RunAsNode]: false,
      [FuseV1Options.EnableCookieEncryption]: true,
      [FuseV1Options.EnableNodeOptionsEnvironmentVariable]: false,
      [FuseV1Options.EnableNodeCliInspectArguments]: false,
      [FuseV1Options.EnableEmbeddedAsarIntegrityValidation]: true,
      [FuseV1Options.OnlyLoadAppFromAsar]: true,
    }),
  ],
  publishers: [
    {
      name: '@electron-forge/publisher-github',
      config: {
        draft: true,
        generateReleaseNotes: true,
        prerelease: false,
        repository: {
          owner: repositoryOwner,
          name: 'Aerial-Launcher',
        },
      },
    },
  ],
}

export default config
