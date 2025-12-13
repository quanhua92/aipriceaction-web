import * as React from 'react'
import { TradingViewChart } from '@/components/charts/TradingViewChart'
import { usePlayground } from './PlaygroundDataProvider'
import { Loader2, AlertCircle } from 'lucide-react'
import { Interval } from '@/lib/api-client'
import { useTranslation } from '@/hooks/useTranslation'

export function PlaygroundChart() {
  const { playgroundData, visibleData, viewportRange } = usePlayground()
  const { t } = useTranslation()

  // Get current visible date (last day in visible range)
  const currentEndDate = visibleData.length > 0
    ? visibleData[visibleData.length - 1]?.time
    : null

  // Get start date (first day in visible range)
  const currentStartDate = visibleData.length > 0
    ? visibleData[0]?.time
    : null

  // When currentIndex changes, we want to scroll to the latest visible date
  const [prevIndex, setPrevIndex] = React.useState(playgroundData.currentIndex)
  const scrollToLatest = playgroundData.currentIndex !== prevIndex
  React.useEffect(() => {
    setPrevIndex(playgroundData.currentIndex)
  }, [playgroundData.currentIndex])

  if (playgroundData.isLoading) {
    return (
      <div className="h-[400px] flex items-center justify-center">
        <div className="flex items-center gap-2 text-muted-foreground">
          <Loader2 className="h-6 w-6 animate-spin" />
          <span>{t('common.playground.info.loadingData')}</span>
        </div>
      </div>
    )
  }

  if (playgroundData.error) {
    return (
      <div className="h-[400px] flex items-center justify-center">
        <div className="flex items-center gap-2 text-destructive">
          <AlertCircle className="h-6 w-6" />
          <span>{playgroundData.error}</span>
        </div>
      </div>
    )
  }

  if (!visibleData.length) {
    return (
      <div className="h-[400px] flex items-center justify-center">
        <p className="text-muted-foreground">{t('common.noDataAvailable')}</p>
      </div>
    )
  }

  return (
    <div className="h-[400px]">
      <TradingViewChart
        ticker={playgroundData.ticker}
        interval={Interval.Daily}
        endDateOverride={currentEndDate}
        showControls={true}
        height={400}
        viewportSizeOverride={viewportRange.to - viewportRange.from}
        scrollToLatest={scrollToLatest}

        // Pass cached daily data
        cacheData={visibleData}
        cacheMetadata={{
          symbol: playgroundData.ticker,
          interval: Interval.Daily,
          startDate: currentStartDate || '',
          endDate: currentEndDate || '',
          mode: 'vn'
        }}
      />
    </div>
  )
}