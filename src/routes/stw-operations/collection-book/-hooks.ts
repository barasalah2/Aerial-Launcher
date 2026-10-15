import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'

import { useAccountSelectorData } from '../../../components/selectors/accounts/hooks'

import {
  useGetCollectionBookActions,
  useGetCollectionBookData,
} from '../../../hooks/stw-operations/collection-book'
import { useGetAccounts } from '../../../hooks/accounts'

import { toast } from '../../../lib/notifications'
import type {
  CollectionBookItem,
  CollectionBookSectionId,
  CollectionBookSlotRequest,
  CollectionBookUpgradeRequest,
} from '../../../types/collection-book'

type CollectionBookPendingAction =
  | { type: 'slot'; request: CollectionBookSlotRequest }
  | { type: 'upgrade'; count: number; request: CollectionBookUpgradeRequest }

export function useCollectionBookPage() {
  const { t } = useTranslation(['stw-operations', 'general'])

  const { accountsArray } = useGetAccounts()
  const {
    accounts,
    tags,
    isLoading,
    isActing,
    data,
    lastResult,
    targetLevel,
  } = useGetCollectionBookData()
  const {
    updateAccounts,
    updateTags,
    updateLoading,
    updateActing,
    updateData,
    clearData,
    setLastResult,
    setTargetLevel,
  } = useGetCollectionBookActions()

  const {
    accounts: accountOptions,
    areThereAccounts,
    isSelectedEmpty,
    parsedSelectedAccounts,
    parsedSelectedTags,
    tags: tagOptions,
    getAccounts,
  } = useAccountSelectorData({
    selectedAccounts: accounts,
    selectedTags: tags,
  })

  const [pendingAction, setPendingAction] =
    useState<CollectionBookPendingAction | null>(null)

  const isDisabledForm =
    isSelectedEmpty || isLoading || isActing || !areThereAccounts

  const accountsData = useMemo(
    () =>
      accountsArray
        .filter((account) => data[account.accountId] !== undefined)
        .map((account) => data[account.accountId]),
    [accountsArray, data],
  )

  useEffect(() => {
    const responseListener =
      window.electronAPI.collectionBookResponseData(async (payload) => {
        updateData(payload)
      })
    const loadingListener =
      window.electronAPI.collectionBookLoadingDone(async () => {
        updateLoading(false)
      })
    const resultListener =
      window.electronAPI.collectionBookActionResult(async (result) => {
        updateActing(false)
        setLastResult(result)

        if (result.success) {
          if (result.upgraded) {
            toast(
              t('collection-book.toasts.upgraded', {
                count: result.upgraded,
                failed: result.failed ?? 0,
              }),
            )
          } else if (result.slotted) {
            toast(
              t('collection-book.toasts.slotted', {
                count: result.slotted,
              }),
            )
          } else {
            toast(t('collection-book.toasts.success'))
          }
        } else {
          const errorKey = `collection-book.toasts.error_${result.error ?? 'unknown'}`
          toast(
            t(errorKey, {
              defaultValue: t('collection-book.toasts.error', {
                context: result.error ?? 'unknown',
              }),
            }),
          )
        }
      })

    return () => {
      responseListener.removeListener()
      loadingListener.removeListener()
      resultListener.removeListener()
    }
  }, [t, updateActing, updateData, updateLoading, setLastResult])

  const handleLoad = () => {
    if (isDisabledForm) {
      if (isSelectedEmpty || !areThereAccounts) {
        toast(t('form.accounts.no-linked', { ns: 'general' }))
      }
      return
    }

    const selected = getAccounts()
    if (selected.length <= 0) {
      toast(t('form.accounts.no-linked', { ns: 'general' }))
      return
    }

    updateLoading(true)
    clearData()
    window.electronAPI.collectionBookRequestData(selected)
  }

  // Uses the same filter as the main process so the confirmation count matches
  const requestUpgrade = (
    request: CollectionBookUpgradeRequest,
    items: Array<CollectionBookItem>,
  ) => {
    const count = items.filter(
      (item) => item.level < targetLevel && item.level < item.maxLevel,
    ).length

    if (isActing || count <= 0) return

    setPendingAction({ type: 'upgrade', count, request })
  }

  const handleUpgradeAll = (accountId: string) => {
    requestUpgrade(
      { accountId, sectionId: 'all', targetLevel },
      data[accountId]?.items ?? [],
    )
  }

  const handleUpgradeSection = (
    accountId: string,
    sectionId: CollectionBookSectionId,
  ) => {
    requestUpgrade(
      { accountId, sectionId, targetLevel },
      (data[accountId]?.items ?? []).filter(
        (item) => item.sectionId === sectionId,
      ),
    )
  }

  const handleUpgradeItem = (
    accountId: string,
    item: CollectionBookItem,
  ) => {
    requestUpgrade({ accountId, itemIds: [item.itemId], targetLevel }, [
      item,
    ])
  }

  const handleSlotItems = (
    accountId: string,
    items: Array<CollectionBookItem>,
  ) => {
    const itemIds = items
      .filter((item) => !item.favorite)
      .map((item) => item.itemId)

    if (isActing || itemIds.length <= 0) return

    setPendingAction({ type: 'slot', request: { accountId, itemIds } })
  }

  const confirmPendingAction = () => {
    if (!pendingAction || isActing) return

    updateActing(true)

    if (pendingAction.type === 'slot') {
      window.electronAPI.collectionBookSlot(pendingAction.request)
    } else {
      window.electronAPI.collectionBookUpgrade(pendingAction.request)
    }

    setPendingAction(null)
  }

  const cancelPendingAction = () => {
    setPendingAction(null)
  }

  return {
    accountOptions,
    areThereAccounts,
    isDisabledForm,
    isLoading,
    isActing,
    isSelectedEmpty,
    parsedSelectedAccounts,
    parsedSelectedTags,
    tagOptions,
    accountsData,
    lastResult,
    targetLevel,
    pendingAction,

    updateAccounts,
    updateTags,
    setTargetLevel,
    handleLoad,
    handleUpgradeAll,
    handleUpgradeSection,
    handleUpgradeItem,
    handleSlotItems,
    confirmPendingAction,
    cancelPendingAction,
  }
}
