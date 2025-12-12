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
import { usePrefetchTicker } from '@/hooks/usePrefetchTicker'
import { useTranslation } from '@/hooks/useTranslation'

export type TitleGeneratorCallback = (ticker: string) => string | Promise<string>

interface ChartFullscreenDialogProps {
  ticker: string | null
  endDate?: string | null
  onClose: () => void
  tickerList?: string[]
  currentIndex?: number
  title?: string
  getTitle?: TitleGeneratorCallback
}

export function ChartFullscreenDialog({
  ticker,
  endDate,
  onClose,
  tickerList,
  currentIndex = 0,
  title,
  getTitle,
}: ChartFullscreenDialogProps) {
  const { t } = useTranslation()
  const isOpen = ticker !== null
  const [chartHeight, setChartHeight] = React.useState(600)
  const dialogContentRef = React.useRef<HTMLDivElement>(null)
  const { prefetchTickers } = usePrefetchTicker()

  // New state for dynamic title
  const [dynamicTitle, setDynamicTitle] = React.useState<string | null>(null)

  // Internal state for navigation when tickerList is provided
  const [internalIndex, setInternalIndex] = React.useState(currentIndex)
  const [internalTicker, setInternalTicker] = React.useState<string | null>(ticker)

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
  // If internalTicker is not in tickerList (user selected external ticker like crypto), use internalTicker directly
  const displayTicker = tickerList && tickerList.length > 0 && tickerList.includes(internalTicker ?? '')
    ? tickerList[internalIndex]
    : internalTicker

  // Update title when displayTicker changes
  React.useEffect(() => {
    if (!displayTicker || !getTitle) {
      setDynamicTitle(null)
      return
    }

    const updateTitle = async () => {
      try {
        const newTitle = await getTitle(displayTicker)
        setDynamicTitle(newTitle)
      } catch (error) {
        console.error('Error generating title:', error)
        setDynamicTitle(null)
      }
    }

    updateTitle()
  }, [displayTicker, getTitle])

  // Helper function to get tickers to prefetch with wraparound
  const getTickersToPrefetch = React.useCallback((fromIndex: number, direction: 'next' | 'prev', count: number): string[] => {
    if (!tickerList || tickerList.length === 0) return []

    const symbols: string[] = []
    const length = tickerList.length

    for (let i = 1; i <= count; i++) {
      let idx: number
      if (direction === 'next') {
        idx = (fromIndex + i) % length
      } else {
        idx = (fromIndex - i + length) % length
      }
      symbols.push(tickerList[idx])
    }

    return symbols
  }, [tickerList])

  // Navigation functions
  const navigateToPrevious = React.useCallback(() => {
    if (!tickerList || tickerList.length === 0) return
    const newIndex = internalIndex === 0 ? tickerList.length - 1 : internalIndex - 1
    setInternalIndex(newIndex)
    setInternalTicker(tickerList[newIndex])

    // Prefetch previous 2 tickers from new position (delayed 100ms)
    setTimeout(() => {
      const symbolsToPrefetch = getTickersToPrefetch(newIndex, 'prev', 2)
      prefetchTickers('ChartFullscreenDialog.prev', symbolsToPrefetch)
    }, 100)
  }, [tickerList, internalIndex, getTickersToPrefetch, prefetchTickers])

  const navigateToNext = React.useCallback(() => {
    if (!tickerList || tickerList.length === 0) return
    const newIndex = (internalIndex + 1) % tickerList.length
    setInternalIndex(newIndex)
    setInternalTicker(tickerList[newIndex])

    // Prefetch next 2 tickers from new position (delayed 100ms)
    setTimeout(() => {
      const symbolsToPrefetch = getTickersToPrefetch(newIndex, 'next', 2)
      prefetchTickers('ChartFullscreenDialog.next', symbolsToPrefetch)
    }, 100)
  }, [tickerList, internalIndex, getTickersToPrefetch, prefetchTickers])

  // Handle ticker change from chart control bar
  const handleTickerChange = React.useCallback((newTicker: string) => {
    if (!tickerList || tickerList.length === 0) {
      // No ticker list - just update internal ticker
      setInternalTicker(newTicker)
      return
    }

    // Check if new ticker is in the list
    const index = tickerList.indexOf(newTicker)
    if (index !== -1) {
      // Ticker found in list - jump to that index (stay in navigation mode)
      setInternalIndex(index)
      setInternalTicker(newTicker)
    } else {
      // Ticker not in list - switch to single-ticker mode
      setInternalTicker(newTicker)
      // Note: Navigation will still show, but displayTicker will use internalTicker
      // since it's not in the list at the current index
    }
  }, [tickerList])

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

  // Initial prefetch on dialog open - prefetch next and previous tickers
  // Delay 100ms to allow main ticker to load first
  React.useEffect(() => {
    if (!isOpen || !tickerList || tickerList.length === 0) return

    const timer = setTimeout(() => {
      // Prefetch next ticker
      const nextSymbols = getTickersToPrefetch(internalIndex, 'next', 1)
      // Prefetch previous ticker
      const prevSymbols = getTickersToPrefetch(internalIndex, 'prev', 1)

      // Combine and prefetch
      prefetchTickers('ChartFullscreenDialog.initial', [...nextSymbols, ...prevSymbols])
    }, 100)

    return () => clearTimeout(timer)
  }, [isOpen, tickerList, internalIndex, getTickersToPrefetch, prefetchTickers])

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

        // Account for chart control bar (~32px) + space-y-4 gap (~16px) = 48px
        const CHART_CONTROL_BAR_HEIGHT = 48
        available -= CHART_CONTROL_BAR_HEIGHT

        // Account for navigation controls if ticker list is provided
        // Navigation height: ~40px (button height + padding + border)
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
      <DialogContent ref={dialogContentRef} className="sm:max-w-[98vw] max-w-[98vw] w-[98vw] h-[90vh] h-[90dvh] p-2 gap-2 flex flex-col">
        <DialogHeader data-slot="header" className="flex-shrink-0">
          <DialogTitle className="text-base">
            {dynamicTitle || title || displayTicker}
            {endDate && ` - ${t('common.chart.ending')} ${endDate}`}
          </DialogTitle>
        </DialogHeader>

        {displayTicker && (
          <div className="flex-1 min-h-0 w-full overflow-y-auto">
            <TradingViewChart
              ticker={displayTicker}
              onTickerChange={handleTickerChange}
              height={chartHeight}
              showControls={true}
              endDateOverride={endDate}
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
              className="h-10 sm:h-8 px-6 sm:px-4"
            >
              <ChevronLeft className="h-4 w-4 mr-1" />
              <span className="hidden sm:inline">Previous</span>
            </Button>

            <div className="px-6 py-3 sm:px-4 sm:py-2 text-sm font-medium bg-muted rounded-md min-w-[90px] text-center">
              {internalIndex + 1} / {tickerList.length}
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={navigateToNext}
              disabled={tickerList.length <= 1}
              className="h-10 sm:h-8 px-6 sm:px-4"
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
