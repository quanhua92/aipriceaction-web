import { useEffect, useRef } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { TradingViewChart } from '@/components/charts/TradingViewChart'
import { useChartSettings } from '@/contexts/ChartSettingsContext'

interface MatrixChartDialogProps {
  ticker: string | null
  endDate: string | null
  onClose: () => void
  limit?: number
}

export function MatrixChartDialog({
  ticker,
  endDate,
  onClose,
  limit = 128,
}: MatrixChartDialogProps) {
  const isOpen = ticker !== null
  const settings = useChartSettings()

  // Use refs to avoid infinite loops in useEffect
  const previousSettingsRef = useRef<{ start?: string; end?: string; limit: number } | undefined>(undefined)
  const settingsSetRef = useRef(false)

  // Manage global chart settings when dialog opens/closes
  useEffect(() => {
    if (isOpen && endDate && !settingsSetRef.current) {
      // Save current global settings (only once when dialog opens)
      previousSettingsRef.current = {
        start: settings.startDate,
        end: settings.endDate,
        limit: settings.limit,
      }

      // Set dialog-specific settings: use endDate + limit to fetch historical data
      settings.setStartDate(undefined) // Let API calculate start based on limit
      settings.setEndDate(endDate)
      settings.setLimit(limit)
      settingsSetRef.current = true
    }

    if (!isOpen && settingsSetRef.current) {
      // Restore previous settings when dialog closes
      if (previousSettingsRef.current) {
        settings.setStartDate(previousSettingsRef.current.start)
        settings.setEndDate(previousSettingsRef.current.end)
        settings.setLimit(previousSettingsRef.current.limit)
      }
      settingsSetRef.current = false
    }
  }, [isOpen, endDate, limit])
  // NOTE: settings NOT in dependencies to avoid infinite loop

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {ticker} - Last {limit} days ending {endDate}
          </DialogTitle>
        </DialogHeader>

        {ticker && endDate && (
          <div className="mt-4">
            <TradingViewChart
              ticker={ticker}
              height={600}
            />
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
