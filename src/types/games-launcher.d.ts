import type { AccountData } from './accounts'
import type { LauncherErrorReason } from './preload'

export type EpicGameEntry = {
  appName: string
  displayName: string
  /** Data URL of the game's exe icon */
  icon?: string
}

export type GamesLauncherNotificationPayload = {
  account: AccountData
  gameName: string
  reason?: LauncherErrorReason
  status: boolean
}
