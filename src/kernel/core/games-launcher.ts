import type { AccountData } from '../../types/accounts'
import type { EpicGameEntry } from '../../types/games-launcher'
import type { LauncherErrorReason } from '../../types/preload'
import type { ScannedGame } from '../../lib/games-launcher/scanner'

import childProcess from 'node:child_process'
import { existsSync } from 'node:fs'
import path from 'node:path'

import { ElectronAPIEventKeys } from '../../config/constants/main-process'

import { getLauncherExchangeCode } from '../../lib/epic/launcher-exchange'
import { scanEpicGames } from '../../lib/games-launcher/scanner'

import { MainWindow } from '../startup/windows/main'
import { Authentication } from './authentication'
import { eglv2ApiPath, isEglv2Running } from './eglv2'

export class GamesLauncher {
  static scan(): EpicGameEntry[] {
    return scanEpicGames().map(({ appName, displayName }) => ({
      appName,
      displayName,
    }))
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
          ...(isEglv2 ? ['-eglv2', `-eglv2apipath=${eglv2ApiPath}`] : []),
          '-AUTH_LOGIN=unused',
          `-AUTH_PASSWORD=${exchangeCode}`,
          '-AUTH_TYPE=exchangecode',
          `-epicapp=${game.appName}`,
          '-epicenv=Prod',
          '-EpicPortal',
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
