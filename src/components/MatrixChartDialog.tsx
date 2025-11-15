import * as React from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { TradingViewChart } from '@/components/charts/TradingViewChart'
import { Button } from '@/components/ui/button'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { useChartSettings } from '@/contexts/ChartSettingsContext'

interface MatrixChartDialogProps {
  ticker: string | null
  endDate: string | null
  onClose: () => void
  limit?: number
  tickerList?: string[]
  currentIndex?: number
}

export function MatrixChartDialog({
  ticker,
  endDate,
  onClose,
  limit = 128,
  tickerList,
  currentIndex = 0,
}: MatrixChartDialogProps) {
  const isOpen = ticker !== null
  const settings = useChartSettings()
  const [chartHeight, setChartHeight] = React.useState(600)
  const dialogContentRef = React.useRef<HTMLDivElement>(null)

  // Internal state for navigation when tickerList is provided
  const [internalIndex, setInternalIndex] = React.useState(currentIndex)
  const [internalTicker, setInternalTicker] = React.useState<string | null>(ticker)

  // Use refs to avoid infinite loops in useEffect
  const previousSettingsRef = React.useRef<{ start?: string; end?: string; limit: number } | undefined>(undefined)
  const settingsSetRef = React.useRef(false)

  // Update internal state when ticker prop changes
  React.useEffect(() => {
    setInternalTicker(ticker)
    if (ticker && tickerList) {
      const index = tickerList.indexOf(ticker)
      if (index !== -1) {
        setInternalIndex(index)
      }
    }
  }, [ticker, tickerList])

  // Get the current ticker to display
  const displayTicker = tickerList && tickerList.length > 0 ? tickerList[internalIndex] : internalTicker

  // Navigation functions
  const navigateToPrevious = React.useCallback(() => {
    if (!tickerList || tickerList.length === 0) return
    const newIndex = internalIndex === 0 ? tickerList.length - 1 : internalIndex - 1
    setInternalIndex(newIndex)
    setInternalTicker(tickerList[newIndex])
  }, [tickerList, internalIndex])

  const navigateToNext = React.useCallback(() => {
    if (!tickerList || tickerList.length === 0) return
    const newIndex = (internalIndex + 1) % tickerList.length
    setInternalIndex(newIndex)
    setInternalTicker(tickerList[newIndex])
  }, [tickerList, internalIndex])

  // Keyboard navigation
  React.useEffect(() => {
    if (!isOpen || !tickerList || tickerList.length === 0) return

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'ArrowLeft') {
        event.preventDefault()
        navigateToPrevious()
      } else if (event.key === 'ArrowRight') {
        event.preventDefault()
        navigateToNext()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [isOpen, tickerList, navigateToPrevious, navigateToNext])

  // Manage global chart settings when dialog opens/closes
  React.useEffect(() => {
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

  // Measure available height when dialog opens or window resizes
  React.useEffect(() => {
    if (!isOpen) return

    const updateHeight = () => {
      if (dialogContentRef.current) {
        const dialogHeight = dialogContentRef.current.clientHeight
        const headerElement = dialogContentRef.current.querySelector('[data-slot="header"]') as HTMLElement
        const headerHeight = headerElement?.offsetHeight || 50
        const gap = 8 // gap-2
        const padding = 12 * 2 // p-3 top + bottom

        let available = dialogHeight - headerHeight - gap - padding

        // Account for control bar (~32px) + space-y-4 gap (~16px) = 48px
        const CONTROL_BAR_HEIGHT = 48
        available -= CONTROL_BAR_HEIGHT

        // Account for navigation controls if ticker list is provided
        // Navigation height: ~48px (button height + padding + border)
        if (tickerList && tickerList.length > 0) {
          const NAVIGATION_HEIGHT = 48
          available -= NAVIGATION_HEIGHT
        }

        setChartHeight(Math.max(available, 300))
      }
    }

    // Use ResizeObserver for more reliable measurement
    const resizeObserver = new ResizeObserver(() => {
      updateHeight()
    })

    // Observe the dialog content element
    const timer = setTimeout(() => {
      if (dialogContentRef.current) {
        resizeObserver.observe(dialogContentRef.current)
        updateHeight()
      }
    }, 100)

    // Update on window resize
    window.addEventListener('resize', updateHeight)

    return () => {
      clearTimeout(timer)
      resizeObserver.disconnect()
      window.removeEventListener('resize', updateHeight)
    }
  }, [isOpen, tickerList])

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent ref={dialogContentRef} className="max-w-[98vw] w-[98vw] h-[95vh] h-[95dvh] p-3 gap-2 flex flex-col">
        <DialogHeader data-slot="header" className="flex-shrink-0 pb-2">
          <DialogTitle className="text-base">
            {displayTicker} - Last {limit} days ending {endDate}
          </DialogTitle>
        </DialogHeader>

        {displayTicker && endDate && (
          <div className="flex-1 min-h-0 w-full">
            <TradingViewChart
              ticker={displayTicker}
              height={chartHeight}
            />
          </div>
        )}

        {/* Navigation Controls - only show when tickerList is provided */}
        {tickerList && tickerList.length > 0 && (
          <div className="flex items-center justify-center gap-2 pt-2 border-t flex-shrink-0">
            <Button
              variant="outline"
              size="sm"
              onClick={navigateToPrevious}
              disabled={tickerList.length <= 1}
              className="h-8 px-3"
            >
              <ChevronLeft className="h-4 w-4 mr-1" />
              <span className="hidden sm:inline">Previous</span>
            </Button>

            <div className="px-3 py-1 text-sm font-medium bg-muted rounded-md min-w-[80px] text-center">
              {internalIndex + 1} / {tickerList.length}
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={navigateToNext}
              disabled={tickerList.length <= 1}
              className="h-8 px-3"
            >
              <span className="hidden sm:inline">Next</span>
              <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
