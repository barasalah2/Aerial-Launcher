import type { EpicGameEntry } from '../../types/games-launcher'

import { existsSync, readdirSync, readFileSync } from 'node:fs'
import path from 'node:path'

import { getEglv2Installations } from '../../kernel/core/eglv2'

export type ScannedGame = EpicGameEntry & {
  exePath: string
}

type Eglv1Manifest = {
  AppName: string
  CatalogNamespace: string
  DisplayName: string
  InstallLocation: string
  LaunchExecutable: string
  bIsIncompleteInstall: boolean
}

/** Removed by Epic Games Launcher v2 */
const eglv1ManifestsPath = path.join(
  `${process.env.ProgramData}`,
  'Epic',
  'EpicGamesLauncher',
  'Data',
  'Manifests'
)

/**
 * fn: Fortnite and its content, it has its own launcher
 * ue: Unreal Engine and its plugins
 */
const excludedNamespaces = ['fn', 'ue']

export function scanEpicGames(): ScannedGame[] {
  const eglv2Installations = getEglv2Installations()
  const installations =
    eglv2Installations.length > 0
      ? eglv2Installations.map((installation) => ({
          appName: installation.artifactId,
          namespace: installation.namespace,
          displayName: path.basename(installation.dir),
          dir: installation.dir,
          launchExecutable: installation.launchExecutable ?? '',
          complete: installation.complete === true,
        }))
      : getEglv1Manifests().map((manifest) => ({
          appName: manifest.AppName,
          namespace: manifest.CatalogNamespace,
          displayName: manifest.DisplayName,
          dir: manifest.InstallLocation,
          launchExecutable: manifest.LaunchExecutable,
          complete: !manifest.bIsIncompleteInstall,
        }))

  return installations
    .filter(
      (installation) =>
        installation.launchExecutable &&
        installation.complete &&
        !excludedNamespaces.includes(installation.namespace)
    )
    .map((installation) => ({
      appName: installation.appName,
      displayName: installation.displayName,
      exePath: path.join(installation.dir, installation.launchExecutable),
    }))
    .filter((game) => existsSync(game.exePath))
    .sort((a, b) => a.displayName.localeCompare(b.displayName))
}

function getEglv1Manifests(): Eglv1Manifest[] {
  if (!existsSync(eglv1ManifestsPath)) {
    return []
  }

  return readdirSync(eglv1ManifestsPath)
    .filter((fileName) => fileName.endsWith('.item'))
    .map((fileName) =>
      JSON.parse(
        readFileSync(path.join(eglv1ManifestsPath, fileName), 'utf8')
      )
    )
}
