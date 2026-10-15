import type { WorldInfo } from '../../../../types/data/advanced-mode/world-info'

import { Collection } from '@discordjs/collection'
import { create } from 'zustand'

export type WorldInfoState = {
  data: WorldInfo
  hasError: boolean
  isFetching: boolean
  isReloading: boolean

  setWorldInfoData: (value: WorldInfo, hasError: boolean) => void
  updateWorldInfoLoading: (
    key: 'isFetching' | 'isReloading',
    value: boolean
  ) => void
}

export const useWorldInfoStore = create<WorldInfoState>()((set) => ({
  data: new Collection(),
  hasError: false,
  isFetching: false,
  isReloading: false,

  setWorldInfoData: (data, hasError) => set({ data, hasError }),
  updateWorldInfoLoading: (key, value) => set({ [key]: value }),
}))
