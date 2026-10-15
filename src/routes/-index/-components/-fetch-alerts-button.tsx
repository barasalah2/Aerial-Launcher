import { UpdateIcon } from '@radix-ui/react-icons'
import { useTranslation } from 'react-i18next'

import { Button } from '../../../components/ui/button'

import {
  useWorldInfo,
  useWorldInfoActions,
} from '../../../hooks/advanced-mode/world-info'

import { cn } from '../../../lib/utils'

export function FetchAlertsButton() {
  const { t } = useTranslation(['alerts'])

  const { hasError, isFetching, isReloading } = useWorldInfo()
  const { updateWorldInfoLoading } = useWorldInfoActions()

  const fetchAlerts = () => {
    updateWorldInfoLoading('isReloading', true)
    window.electronAPI.requestHomeWorldInfo()
  }

  return (
    <div className="flex gap-3 items-center ml-auto">
      {hasError && (
        <span className="text-destructive text-sm">
          {t('results.fetch-error')}
        </span>
      )}
      <Button
        variant="secondary"
        onClick={fetchAlerts}
        disabled={isFetching || isReloading}
      >
        <span
          className={cn({
            'animate-spin': isReloading,
          })}
        >
          <UpdateIcon className="size-4" />
        </span>
      </Button>
    </div>
  )
}
