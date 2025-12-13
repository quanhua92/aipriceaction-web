import * as React from 'react'
import { TradingViewChart } from '@/components/charts/TradingViewChart'
import { usePlayground } from './PlaygroundDataProvider'
import { Loader2, AlertCircle } from 'lucide-react'
import { Interval } from '@/lib/api-client'
import { useTranslation } from '@/hooks/useTranslation'
import { TickerProvider } from '@/contexts/TickerContext'

export function PlaygroundChart() {
  const {
    playgroundData,
    visibleData,
    viewportRange,
    secondaryVisibleData,
    secondaryViewportRange
  } = usePlayground()
  const { t } = useTranslation()

  // Get current visible date (last day in visible range)
  const currentEndDate = visibleData.length > 0
    ? visibleData[visibleData.length - 1]?.time?.split('T')[0]
    : null

  // Get start date (first day in visible range)
  const currentStartDate = visibleData.length > 0
    ? visibleData[0]?.time?.split('T')[0]
    : null

  // When currentIndex changes, we want to scroll to the latest visible date
  const [prevIndex, setPrevIndex] = React.useState(playgroundData.currentIndex)
  const scrollToLatest = playgroundData.currentIndex !== prevIndex
  React.useEffect(() => {
    setPrevIndex(playgroundData.currentIndex)
  }, [playgroundData.currentIndex])

  // Check if we should show the secondary chart
  const shouldShowSecondary = playgroundData.showSecondaryChart && playgroundData.secondaryTicker

  // Charts will use their natural height since page scrolls vertically

  // Early returns (after all hooks are defined)
  if (playgroundData.isLoading) {
    return (
      <div className="min-h-[400px] flex items-center justify-center">
        <div className="flex items-center gap-2 text-muted-foreground">
          <Loader2 className="h-6 w-6 animate-spin" />
          <span>{t('common.playground.info.loadingData')}</span>
        </div>
      </div>
    )
  }

  if (playgroundData.error) {
    return (
      <div className="min-h-[400px] flex items-center justify-center">
        <div className="flex items-center gap-2 text-destructive">
          <AlertCircle className="h-6 w-6" />
          <span>{playgroundData.error}</span>
        </div>
      </div>
    )
  }

  if (!visibleData.length) {
    return (
      <div className="min-h-[400px] flex items-center justify-center">
        <p className="text-muted-foreground">{t('common.noDataAvailable')}</p>
      </div>
    )
  }

  const primaryChartProps = {
    ticker: playgroundData.ticker,
    endDateOverride: currentEndDate,
    showControls: true,
    viewportSizeOverride: viewportRange.to - viewportRange.from,
    scrollToLatest: scrollToLatest,
    cacheData: visibleData,
    cacheMetadata: {
      symbol: playgroundData.ticker,
      interval: Interval.Daily,
      startDate: currentStartDate || '',
      endDate: currentEndDate || '',
      mode: 'vn'
    },
  }

  // Secondary chart props
  const secondaryChartProps = {
    ticker: playgroundData.secondaryTicker!,
    endDateOverride: currentEndDate,
    showControls: true, // Show controls on secondary chart
    viewportSizeOverride: secondaryViewportRange.to - secondaryViewportRange.from,
    scrollToLatest: scrollToLatest,
    cacheData: secondaryVisibleData,
    cacheMetadata: {
      symbol: playgroundData.secondaryTicker!,
      interval: Interval.Daily,
      startDate: currentStartDate || '',
      endDate: currentEndDate || '',
      mode: 'vn'
    },
  }

  // Show loading state for secondary chart
  if (shouldShowSecondary && playgroundData.secondaryIsLoading && secondaryVisibleData.length === 0) {
    return (
      <>
        <div className="min-h-[200px] flex items-center justify-center">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Loader2 className="h-6 w-6 animate-spin" />
            <span>{t('common.playground.info.secondaryLoading')}</span>
          </div>
        </div>
        <div className="h-4" />
        <TradingViewChart {...primaryChartProps} />
      </>
    )
  }

  // Show error state for secondary chart but still show primary
  if (shouldShowSecondary && playgroundData.secondaryError && secondaryVisibleData.length === 0) {
    return (
      <>
        <div className="min-h-[200px] flex items-center justify-center">
          <div className="flex items-center gap-2 text-destructive">
            <AlertCircle className="h-6 w-6" />
            <span>{playgroundData.secondaryError}</span>
          </div>
        </div>
        <div className="h-4" />
        <TradingViewChart {...primaryChartProps} />
      </>
    )
  }

  // Render charts
  return (
    <div>
      {shouldShowSecondary && (
        <>
          <TradingViewChart {...secondaryChartProps} />
          <div className="h-4" />
        </>
      )}
      <TradingViewChart {...primaryChartProps} />
    </div>
  )
}