import type { AccountData } from '../../types/accounts'
import type { LauncherErrorReason } from '../../types/preload'

import childProcess from 'node:child_process'
import { existsSync } from 'node:fs'
import path from 'node:path'
import { promisify } from 'node:util'

import { ElectronAPIEventKeys } from '../../config/constants/main-process'
import { launcherAppClient2 } from '../../config/fortnite/clients'

import { MainWindow } from '../startup/windows/main'
import { DataDirectory } from '../startup/data-directory'
import { Authentication } from './authentication'
// import { Manifest } from './manifest'

import {
  getAccessTokenUsingExchangeCode,
  getExchangeCodeUsingAccessToken,
} from '../../services/endpoints/oauth'

const execFile = promisify(childProcess.execFile)

export class FortniteLauncher {
  static async start(account: AccountData) {
    const sendError = (reason?: LauncherErrorReason) => {
      MainWindow.instance.webContents.send(
        ElectronAPIEventKeys.LauncherNotification,
        {
          account,
          reason,
          status: false,
        }
      )
    }

    try {
      // const manifest = Manifest.get()

      // if (!manifest) {
      //   sendError()

      //   return
      // }

      const { settings } = await DataDirectory.getSettingsFile()

      if (!existsSync(path.join(settings.path, 'FortniteLauncher.exe'))) {
        sendError('game-not-found')

        return
      }

      // Epic Games Launcher v2 replaced EOSH; Fortnite fails with "Pak is
      // invalid" unless EGL v2 is running and it gets the -eglv2 args
      const eglv2ApiPath = path.join(
        `${process.env.LOCALAPPDATA}`,
        'com.epicgames.eglv2',
        'api.json'
      )
      const isEglv2 = existsSync(eglv2ApiPath)

      if (isEglv2) {
        const { stdout } = await execFile('tasklist', [
          '/FI',
          'IMAGENAME eq EpicGamesLauncher.exe',
          '/NH',
        ])

        if (!stdout.includes('EpicGamesLauncher.exe')) {
          sendError('egl-not-running')

          return
        }
      }

      const accessToken = await Authentication.verifyAccessToken(account)

      if (!accessToken) {
        sendError('auth')

        return
      }

      const accountExchangeCode =
        await getExchangeCodeUsingAccessToken(accessToken)

      if (!accountExchangeCode.data.code) {
        sendError('auth')

        return
      }

      const launcherAccessToken = await getAccessTokenUsingExchangeCode(
        accountExchangeCode.data.code,
        {
          headers: {
            Authorization: `basic ${launcherAppClient2.auth}`,
          },
        }
      )

      if (!launcherAccessToken.data.access_token) {
        sendError('auth')

        return
      }

      const launcherExchangeCode = await getExchangeCodeUsingAccessToken(
        launcherAccessToken.data.access_token
      )

      if (!launcherExchangeCode.data.code) {
        sendError('auth')

        return
      }

      const command = [
        'start',
        '""',
        'FortniteLauncher.exe',
        ...(isEglv2
          ? ['-eglv2', `-eglv2apipath="${eglv2ApiPath}"`]
          : []),
        // `${manifest.LaunchCommand}`,
        '-AUTH_LOGIN=unused',
        `-AUTH_PASSWORD=${launcherExchangeCode.data.code}`,
        '-AUTH_TYPE=exchangecode',
        '-epicapp=Fortnite',
        '-epicenv=Prod',
        '-EpicPortal',
        // '-steamimportavailable',
        `-epicusername="${account.displayName}"`,
        `-epicuserid=${account.accountId}`,
        // '-epiclocale=en',
        // '-epicsandboxid=fn',
      ].join(' ')

      childProcess.exec(command, {
        cwd: settings.path,
      })

      MainWindow.instance.webContents.send(
        ElectronAPIEventKeys.LauncherNotification,
        {
          account,
          status: true,
        }
      )

      return

      // eslint-disable-next-line @typescript-eslint/no-unused-vars
    } catch (error) {
      //
    }

    sendError()
  }
}
