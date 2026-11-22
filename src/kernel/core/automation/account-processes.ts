import type { MatchmakingTrack } from '../../../types/data/advanced-mode/matchmaking'
import type { AccountData } from '../../../types/accounts'
import type { MatchMakingData } from '../../../types/events'

import { PartyState } from '../../../config/fortnite/events'

import { AccountsManager } from '../../../kernel/startup/accounts'
import { Automation } from '../../../kernel/startup/automation'
import { SettingsManager } from '../../../kernel/startup/settings'
import { Authentication } from '../authentication'
import { ClaimRewards } from '../claim-rewards'
import { Party } from '../party'

import { findPlayer } from '../../../services/endpoints/matchmaking'
import { MCPStorageTransfer } from '../mcp/storage-transfer'

export class AccountProcess {
  private _accountId: string
  private account: AccountData

  private _matchmaking: MatchMakingData = {
    partyState: null,
    started: false,
  }
  private _startedTracking = false
  private _lastRemoteStartedState: boolean | null = null

  private missionIntervalId: NodeJS.Timeout | null = null
  private missionTimeout: NodeJS.Timeout | null = null
  private tickInProgress = false

  constructor(config: { accessToken: string; account: AccountData }) {
    this._accountId = config.account.accountId
    this.account = config.account
  }

  get accountId() {
    return this._accountId
  }

  get matchmaking() {
    return this._matchmaking
  }

  get startedTracking() {
    return this._startedTracking
  }

  setMatchmaking(
    config: Partial<{
      partyState: PartyState | null
      started: boolean
    }> | null,
  ) {
    if (config === null) {
      this._matchmaking.partyState = null
      this._matchmaking.started = false

      return
    }

    if (config.partyState !== undefined) {
      this._matchmaking.partyState = config.partyState
    }

    if (config.started !== undefined) {
      this._matchmaking.started = config.started
    }
  }

  setStartedTracking(value: boolean) {
    this._startedTracking = value
  }

  preInit(
    config?: Partial<{
      timeout: number
    }>,
  ) {
    if (this.missionTimeout) {
      clearTimeout(this.missionTimeout)

      this.missionTimeout = null
    }

    this.missionTimeout = setTimeout(() => {
      this.initMissionInterval()
    }, config?.timeout ?? 10_000) // 10 seconds
  }

  async initMissionInterval() {
    if (this.missionIntervalId) {
      return
    }

    const settings = await SettingsManager.getData()
    const missionInterval = Automation.parseMissionInterval(
      settings.missionInterval,
    )

    this.missionIntervalId = setInterval(async () => {
      // Requests can take longer than the interval (rate limits, slow
      // network). Skip overlapping ticks instead of stacking requests.
      if (this.tickInProgress) {
        return
      }

      this.tickInProgress = true

      try {
        await this.missionTick()
      } catch (error) {
        // A failed request (429, network error, etc.) must not kill the
        // tracking loop; the next tick simply tries again
        console.error(
          `[Automation] Mission check failed for ${this.accountId}:`,
          error,
        )
      } finally {
        this.tickInProgress = false
      }
    }, missionInterval * 1_000)
  }

  private async missionTick() {
    const currentAccount = AccountsManager.getAccountById(this.accountId)
    const automationAccount = Automation.getAccountById(this.accountId)

    if (!currentAccount || !automationAccount) {
      this.clearMissionIntervalId()
      this._lastRemoteStartedState = null
      return
    }

    const accessToken =
      await Authentication.verifyAccessToken(currentAccount)

    if (!accessToken) {
      this.clearMissionIntervalId()
      this._lastRemoteStartedState = null
      return
    }

    const response = await findPlayer({
      accessToken,
      accountId: currentAccount.accountId,
    })
    const responseData = response.data
    const matchmacking: MatchmakingTrack | undefined = responseData?.[0]

    const isEmptyArray =
      Array.isArray(responseData) && responseData.length === 0
    let remoteStarted: boolean | undefined = undefined

    if (isEmptyArray) {
      remoteStarted = false
    } else {
      remoteStarted = matchmacking?.started
    }

    if (remoteStarted === undefined) {
      return
    }

    const lastStateWasInMission = this._lastRemoteStartedState === true
    const currentStateIsInLobby = remoteStarted === false

    if (lastStateWasInMission && currentStateIsInLobby) {
      if (
        automationAccount.actions.kick ||
        automationAccount.actions.claim
      ) {
        this.clearMissionIntervalId()
        const accounts = [...AccountsManager.getAccounts().values()]

        // Claim before kicking; a failed step must not skip the next one or
        // the re-arm below (that silently stopped automation until restart)
        if (automationAccount.actions.claim) {
          await (
            automationAccount.actions.claimParty
              ? Party.claimPartyMembers(currentAccount, accounts, {
                  useGlobalNotification: true,
                })
              : ClaimRewards.start([currentAccount], true)
          ).catch((error) => {
            console.error(`[Automation] Claim failed for ${this.accountId}:`, error)
          })
        }

        if (automationAccount.actions.kick) {
          await Party.kickPartyMembers(currentAccount, accounts, false, {
            useGlobalNotification: true,
          }).catch((error) => {
            console.error(`[Automation] Kick failed for ${this.accountId}:`, error)
          })
        }

        this.preInit({ timeout: 1_000 })

        this.setMatchmaking({
          partyState: PartyState.MATCHMAKING,
          started: false,
        })

        this._lastRemoteStartedState = remoteStarted
        return
      }
    }

    if (remoteStarted !== this._matchmaking.started) {
      this.setMatchmaking({
        started: remoteStarted,
        partyState: remoteStarted
          ? PartyState.POST_MATCHMAKING
          : PartyState.MATCHMAKING,
      })
    }

    this._lastRemoteStartedState = remoteStarted

    if (
      !(
        automationAccount.actions.kick || automationAccount.actions.claim
      ) &&
      automationAccount.actions.transferMats === true
    ) {
      if (!remoteStarted) {
        this.clearMissionIntervalId()
        MCPStorageTransfer.buildingMaterials(currentAccount).catch(
          (error) => {
            console.error(
              `[Automation] Materials transfer failed for ${this.accountId}:`,
              error,
            )
          },
        )
      }
    }
  }

  async checkMatchAtStartUp() {
    try {
      const accessToken = await Authentication.verifyAccessToken(
        this.account,
      )

      if (!accessToken) {
        this._lastRemoteStartedState = null
        return
      }

      const responseData = await findPlayer({
        accessToken,
        accountId: this.account.accountId,
      })
      const data = responseData.data
      const matchmacking: MatchmakingTrack | undefined = data?.[0]

      const isEmptyArray = Array.isArray(data) && data.length === 0
      const remoteStarted: boolean | undefined = isEmptyArray
        ? false
        : matchmacking?.started

      if (remoteStarted === undefined) {
        this._lastRemoteStartedState = null
        return
      }

      this.setMatchmaking({
        partyState: remoteStarted
          ? PartyState.POST_MATCHMAKING
          : PartyState.MATCHMAKING,
        started: remoteStarted,
      })

      this._lastRemoteStartedState = remoteStarted
      this.initMissionInterval()

      // eslint-disable-next-line @typescript-eslint/no-unused-vars
    } catch (error) {
      //
    }
  }

  clearMissionIntervalId() {
    this._startedTracking = false
    this.setMatchmaking(null)
    this._lastRemoteStartedState = null

    if (this.missionIntervalId) {
      clearInterval(this.missionIntervalId)
    }

    if (this.missionTimeout) {
      clearTimeout(this.missionTimeout)
    }

    this.missionIntervalId = null
    this.missionTimeout = null
  }
}
