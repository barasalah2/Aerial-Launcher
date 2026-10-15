import type { IpcRendererEvent } from 'electron'
import type { AccountData } from '../../types/accounts'
import type {
  EpicGameEntry,
  GamesLauncherNotificationPayload,
} from '../../types/games-launcher'

import { ipcRenderer } from 'electron'

import { ElectronAPIEventKeys } from '../../config/constants/main-process'

export function gamesLauncherScan() {
  return ipcRenderer.invoke(
    ElectronAPIEventKeys.GamesLauncherScan
  ) as Promise<EpicGameEntry[]>
}

export function gamesLauncherStart(account: AccountData, appName: string) {
  ipcRenderer.send(
    ElectronAPIEventKeys.GamesLauncherStart,
    account,
    appName
  )
}

export function onGamesLauncherNotification(
  callback: (data: GamesLauncherNotificationPayload) => Promise<void>
) {
  const customCallback = (
    _: IpcRendererEvent,
    data: GamesLauncherNotificationPayload
  ) => {
    callback(data).catch(() => {})
  }
  const rendererInstance = ipcRenderer.on(
    ElectronAPIEventKeys.GamesLauncherNotification,
    customCallback
  )

  return {
    removeListener: () =>
      rendererInstance.removeListener(
        ElectronAPIEventKeys.GamesLauncherNotification,
        customCallback
      ),
  }
}
