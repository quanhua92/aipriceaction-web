import * as React from 'react'
import { Trash2, Bell } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useAlert } from '@/contexts/AlertContext'
import { useTranslation } from '@/hooks/useTranslation'
import { formatToVietnamDate, parseUTCISOString } from '@/lib/format'
import { ALERT_TYPES } from '@/lib/constants'
import type { Alert } from '@/lib/alert-storage'

export interface EditAlertDialogProps {
  children: React.ReactNode
  alert: Alert
  onAlertUpdated?: () => void
  onAlertDeleted?: () => void
}

export function EditAlertDialog({
  children,
  alert,
  onAlertUpdated,
  onAlertDeleted,
}: EditAlertDialogProps) {
  const { t } = useTranslation()
  const { updateAlert, deleteAlert } = useAlert()

  const [open, setOpen] = React.useState(false)
  const [targetPrice, setTargetPrice] = React.useState(String(alert.target_price))
  const [alertType, setAlertType] = React.useState<Alert['alert_type']>(alert.alert_type)
  const [showDeleteConfirm, setShowDeleteConfirm] = React.useState(false)
  const [error, setError] = React.useState('')

  // Reset state when dialog opens
  React.useEffect(() => {
    if (open) {
      setTargetPrice(String(alert.target_price))
      setAlertType(alert.alert_type)
      setShowDeleteConfirm(false)
      setError('')
    }
  }, [open, alert])

  const handleSave = () => {
    // Validate
    const target = Number(targetPrice)
    if (!targetPrice || isNaN(target)) {
      setError(t('dialogs.quickAddAlert.validation.required'))
      return
    }

    if (target <= 0) {
      setError(t('dialogs.quickAddAlert.validation.positive'))
      return
    }

    try {
      updateAlert(alert.id, {
        target_price: target,
        alert_type: alertType,
      })

      setOpen(false)
      if (onAlertUpdated) {
        onAlertUpdated()
      }
    } catch (err) {
      console.error('Failed to update alert:', err)
      setError('Failed to update alert')
    }
  }

  const handleDelete = () => {
    try {
      deleteAlert(alert.id)
      setOpen(false)
      if (onAlertDeleted) {
        onAlertDeleted()
      }
    } catch (err) {
      console.error('Failed to delete alert:', err)
    }
  }

  const handleCancel = () => {
    setOpen(false)
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {children}
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            {t('dialogs.editAlert.title')}: {alert.ticker}
          </DialogTitle>
          <DialogDescription>
            Modify or delete this price alert.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Created Date (Read-only) */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-muted-foreground">
              {t('dialogs.editAlert.created')}
            </label>
            <div className="px-3 py-2 rounded-md border bg-muted/30 text-sm">
              {formatToVietnamDate(parseUTCISOString(alert.created_at))}
            </div>
          </div>

          {/* Status (Read-only) */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-muted-foreground">
              {t('dialogs.editAlert.status')}
            </label>
            <div className="px-3 py-2 rounded-md border bg-muted/30">
              {alert.triggered ? (
                <span className="text-sm font-medium text-green-600 dark:text-green-500">
                  ✓ {t('widgets.basicAlert.status.triggered')}
                  {alert.triggered_at && (
                    <span className="text-xs text-muted-foreground ml-2">
                      ({formatToVietnamDate(parseUTCISOString(alert.triggered_at))})
                    </span>
                  )}
                </span>
              ) : (
                <span className="text-sm font-medium">
                  🔔 {t('widgets.basicAlert.status.active')}
                </span>
              )}
            </div>
          </div>

          {/* Target Price Input */}
          <div className="space-y-2">
            <label htmlFor="edit-target-price" className="text-sm font-medium">
              {t('dialogs.quickAddAlert.targetPrice')} *
            </label>
            <Input
              id="edit-target-price"
              type="number"
              value={targetPrice}
              onChange={(e) => {
                setTargetPrice(e.target.value)
                setError('')
              }}
              placeholder="e.g., 25000"
              step="any"
            />
            {error && (
              <p className="text-sm text-destructive">{error}</p>
            )}
          </div>

          {/* Alert Type Selector */}
          <div className="space-y-2">
            <label htmlFor="edit-alert-type" className="text-sm font-medium">
              {t('dialogs.quickAddAlert.alertType')}
            </label>
            <Select value={alertType} onValueChange={(value) => setAlertType(value as Alert['alert_type'])}>
              <SelectTrigger id="edit-alert-type">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALERT_TYPES.PRICE_HITS}>
                  {t('widgets.basicAlert.alertTypes.price_hits')}
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <DialogFooter className="flex-col sm:flex-col gap-2">
          <div className="flex gap-2 w-full">
            <Button variant="outline" onClick={handleCancel} className="flex-1">
              {t('dialogs.quickAddAlert.cancel')}
            </Button>
            <Button onClick={handleSave} className="flex-1">
              {t('dialogs.quickAddAlert.save')}
            </Button>
          </div>

          {/* Delete Alert Section */}
          <div className="w-full border-t pt-2">
            {!showDeleteConfirm ? (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowDeleteConfirm(true)}
                className="w-full text-destructive hover:text-destructive hover:bg-destructive/10"
              >
                <Trash2 className="h-3.5 w-3.5 mr-2" />
                {t('common.alerts.deleteAlert')}
              </Button>
            ) : (
              <div className="space-y-2">
                <p className="text-xs text-center text-muted-foreground">
                  {t('dialogs.editAlert.deleteConfirm')}
                </p>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowDeleteConfirm(false)}
                    className="flex-1"
                  >
                    {t('dialogs.quickAddAlert.cancel')}
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={handleDelete}
                    className="flex-1"
                  >
                    Delete
                  </Button>
                </div>
              </div>
            )}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
