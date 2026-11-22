import type { AccountData } from '../../types/accounts'
import type { EpicGameEntry } from '../../types/games-launcher'
import type { LauncherErrorReason } from '../../types/preload'
import type { ScannedGame } from '../../lib/games-launcher/scanner'

import childProcess from 'node:child_process'
import { existsSync, readdirSync, statSync } from 'node:fs'
import path from 'node:path'

import { app } from 'electron'

import { ElectronAPIEventKeys } from '../../config/constants/main-process'

import { getLauncherExchangeCode } from '../../lib/epic/launcher-exchange'
import { scanEpicGames } from '../../lib/games-launcher/scanner'
import { parseCustomDisplayName } from '../../lib/utils'

import { MainWindow } from '../startup/windows/main'
import { Authentication } from './authentication'
import { eglv2ApiPath, isEglv2Running } from './eglv2'

export class GamesLauncher {
  static async scan(): Promise<EpicGameEntry[]> {
    return Promise.all(
      scanEpicGames().map(async ({ appName, displayName, exePath }) => {
        const icon = await app
          .getFileIcon(getIconExe(exePath), { size: 'large' })
          .catch(() => null)

        return {
          appName,
          displayName,
          icon: icon && !icon.isEmpty() ? icon.toDataURL() : undefined,
        }
      })
    )
  }

  /** Only the appName comes from the renderer, the exe comes from our own scan */
  static async launch(account: AccountData, appName: string) {
    let game: ScannedGame | undefined
    const sendResult = (status: boolean, reason?: LauncherErrorReason) => {
      MainWindow.instance.webContents.send(
        ElectronAPIEventKeys.GamesLauncherNotification,
        {
          account,
          gameName: game?.displayName ?? appName,
          reason,
          status,
        }
      )
    }

    try {
      game = scanEpicGames().find((entry) => entry.appName === appName)

      if (!game) {
        sendResult(false, 'game-not-found')

        return
      }

      // Games crash on Epic Games Launcher v2 unless it's running and
      // they get the -eglv2 args
      const isEglv2 = existsSync(eglv2ApiPath)

      if (isEglv2 && !(await isEglv2Running())) {
        sendResult(false, 'egl-not-running')

        return
      }

      const accessToken = await Authentication.verifyAccessToken(account)
      const exchangeCode = accessToken
        ? await getLauncherExchangeCode(accessToken)
        : null

      if (!exchangeCode) {
        sendResult(false, 'auth')

        return
      }

      const gameProcess = childProcess.spawn(
        game.exePath,
        [
          ...splitLaunchCommand(game.launchCommand),
          ...(isEglv2 ? ['-eglv2', `-eglv2apipath=${eglv2ApiPath}`] : []),
          '-AUTH_LOGIN=unused',
          `-AUTH_PASSWORD=${exchangeCode}`,
          '-AUTH_TYPE=exchangecode',
          `-epicapp=${game.appName}`,
          '-epicenv=Prod',
          '-EpicPortal',
          `-epicsandboxid=${game.namespace}`,
          `-epicusername=${parseCustomDisplayName(account)}`,
          `-epicuserid=${account.accountId}`,
        ],
        {
          cwd: path.dirname(game.exePath),
          detached: true,
          stdio: 'ignore',
        }
      )

      await new Promise((resolve, reject) => {
        gameProcess.once('spawn', resolve)
        gameProcess.once('error', reject)
      })
      gameProcess.unref()

      sendResult(true)
    } catch {
      sendResult(false)
    }
  }
}

/**
 * Splits a manifest LaunchCommand ("-foo -bar=\"a b\"") into arguments,
 * honouring double quotes
 */
function splitLaunchCommand(value?: string) {
  return (value?.match(/(?:[^\s"]+|"[^"]*")+/g) ?? []).map((part) =>
    part.replace(/"/g, '')
  )
}

/**
 * Some games launch through a small stub exe without an icon (e.g.
 * TheEscapists.exe next to TheEscapists_EFIGS.exe): use the largest
 * sibling exe sharing its name instead
 */
function getIconExe(exePath: string) {
  try {
    const stubMaxBytes = 1024 * 1024
    const exeSize = statSync(exePath).size

    if (exeSize > stubMaxBytes) {
      return exePath
    }

    const directory = path.dirname(exePath)
    const exeName = path.basename(exePath).toLowerCase()
    const baseName = path.basename(exePath, path.extname(exePath)).toLowerCase()
    const largest = readdirSync(directory)
      .filter((file) => {
        const lower = file.toLowerCase()

        return (
          lower.endsWith('.exe') &&
          lower.startsWith(baseName) &&
          lower !== exeName
        )
      })
      .map((file) => path.join(directory, file))
      .map((filePath) => ({ filePath, size: statSync(filePath).size }))
      .sort((a, b) => b.size - a.size)[0]

    return largest && largest.size > exeSize ? largest.filePath : exePath
  } catch {
    return exePath
  }
}
