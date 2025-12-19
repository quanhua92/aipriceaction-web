import * as React from 'react'
import { TradingViewChart } from '@/components/charts/TradingViewChart'
import { usePlayground } from './PlaygroundDataProvider'
import { Loader2, AlertCircle, Rows, Columns } from 'lucide-react'
import { Interval } from '@/lib/api-client'
import { useTranslation } from '@/hooks/useTranslation'
import { TickerProvider } from '@/contexts/TickerContext'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

export function PlaygroundChart() {
  const {
    playgroundData,
    visibleData,
    viewportRange,
    secondaryVisibleData,
    secondaryViewportRange,
    setCurrentIndex
  } = usePlayground()
  const { t } = useTranslation()

  // State for chart layout and height with localStorage persistence
  const [chartLayout, setChartLayout] = React.useState<'vertical' | 'horizontal'>(() => {
    return (localStorage.getItem('playground-chart-layout') as 'vertical' | 'horizontal') || 'vertical'
  })
  const [chartHeight, setChartHeight] = React.useState<number>(() => {
    const saved = localStorage.getItem('playground-chart-height')
    return saved ? Number(saved) : (typeof window !== 'undefined' && window.innerWidth >= 768 ? 500 : 400)
  })

  // Handle height change with re-render trigger
  const handleHeightChange = (newHeight: number) => {
    setChartHeight(newHeight)
    localStorage.setItem('playground-chart-height', newHeight.toString())
    // Trigger re-render by briefly changing index
    const currentIndex = playgroundData.currentIndex
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1)
      setTimeout(() => setCurrentIndex(currentIndex), 50)
    } else if (playgroundData.allData.length > 1) {
      setCurrentIndex(1)
      setTimeout(() => setCurrentIndex(0), 50)
    }
  }

  // Handle layout change
  const handleLayoutChange = (newLayout: 'vertical' | 'horizontal') => {
    setChartLayout(newLayout)
    localStorage.setItem('playground-chart-layout', newLayout)
  }

  // Get current visible date (last day in visible range)
  const currentEndDate = visibleData.length > 0
    ? visibleData[visibleData.length - 1]?.time?.split('T')[0]
    : null

  // Get start date (first day in visible range)
  const currentStartDate = visibleData.length > 0
    ? visibleData[0]?.time?.split('T')[0]
    : null

  
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
    height: chartHeight,  // Pass the selected height
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
    height: chartHeight,  // Pass the selected height
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
        <div className="flex items-center justify-center" style={{ height: chartHeight }}>
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
        <div className="flex items-center justify-center" style={{ height: chartHeight }}>
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

  // Chart controls
  const renderLayoutControls = () => (
    <div className="flex items-center gap-2 hidden md:flex">
      <Button
        variant={chartLayout === 'vertical' ? 'default' : 'outline'}
        size="sm"
        onClick={() => handleLayoutChange('vertical')}
        className="flex items-center gap-2"
      >
        <Rows className="h-4 w-4" />
      </Button>
      <Button
        variant={chartLayout === 'horizontal' ? 'default' : 'outline'}
        size="sm"
        onClick={() => handleLayoutChange('horizontal')}
        className="flex items-center gap-2"
      >
        <Columns className="h-4 w-4" />
      </Button>
    </div>
  )

  const renderHeightSelector = () => (
    <Select value={chartHeight.toString()} onValueChange={(value) => handleHeightChange(Number(value))}>
      <SelectTrigger size="sm" className="w-24">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="200">200px</SelectItem>
        <SelectItem value="300">300px</SelectItem>
        <SelectItem value="400">400px</SelectItem>
        <SelectItem value="500">500px</SelectItem>
        <SelectItem value="600">600px</SelectItem>
        <SelectItem value="700">700px</SelectItem>
        <SelectItem value="800">800px</SelectItem>
        <SelectItem value="900">900px</SelectItem>
        <SelectItem value="1000">1000px</SelectItem>
      </SelectContent>
    </Select>
  )

  // Render charts
  return (
    <div>
      {/* Chart controls */}
      <div className="flex items-center justify-end gap-4 pb-4">
        {/* Layout controls - only show when secondary chart is visible */}
        {shouldShowSecondary && renderLayoutControls()}

        {/* Height selector - always show */}
        {renderHeightSelector()}
      </div>

      {/* Charts container */}
      <div className={chartLayout === 'horizontal' ? 'grid grid-cols-1 lg:grid-cols-2 gap-4' : ''}>
        {shouldShowSecondary && (
          <TradingViewChart {...secondaryChartProps} />
        )}
        <TradingViewChart {...primaryChartProps} />
      </div>
    </div>
  )
}