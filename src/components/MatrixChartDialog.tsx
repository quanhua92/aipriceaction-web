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
  startDate: string | null
  endDate: string | null
  onClose: () => void
}

export function MatrixChartDialog({
  ticker,
  startDate,
  endDate,
  onClose,
}: MatrixChartDialogProps) {
  const isOpen = ticker !== null
  const settings = useChartSettings()

  // Use refs to avoid infinite loops in useEffect
  const previousDatesRef = useRef<{ start?: string; end?: string } | undefined>(undefined)
  const datesSetRef = useRef(false)

  // Manage global date state when dialog opens/closes
  useEffect(() => {
    if (isOpen && startDate && endDate && !datesSetRef.current) {
      // Save current global dates (only once when dialog opens)
      previousDatesRef.current = {
        start: settings.startDate,
        end: settings.endDate,
      }

      // Set dialog-specific dates
      settings.setStartDate(startDate)
      settings.setEndDate(endDate)
      datesSetRef.current = true
    }

    if (!isOpen && datesSetRef.current) {
      // Restore previous dates when dialog closes
      if (previousDatesRef.current) {
        settings.setStartDate(previousDatesRef.current.start)
        settings.setEndDate(previousDatesRef.current.end)
      }
      datesSetRef.current = false
    }
  }, [isOpen, startDate, endDate])
  // NOTE: settings NOT in dependencies to avoid infinite loop

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {ticker} - {startDate} to {endDate}
          </DialogTitle>
        </DialogHeader>

        {ticker && startDate && endDate && (
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
