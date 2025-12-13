import * as React from 'react'
import { Button } from '@/components/ui/button'
import { usePlayground } from './PlaygroundDataProvider'
import { useLogs } from '@/contexts/LogsContext'
import { Dices, Calendar, Edit, Share2 } from 'lucide-react'
import { format, parseISO } from 'date-fns'
import { useTranslation } from '@/hooks/useTranslation'
import { SelectTickerDialog } from '@/components/dialogs/SelectTickerDialog'
import { DateInput } from '@/components/DateInput'

export function PlaygroundInfoPanel() {
  const {
    playgroundData,
    visibleData,
    randomizeData,
    updateTicker,
    updateEndDate,
    setCurrentIndex,
    updateSecondaryTicker,
    toggleSecondaryChart
  } = usePlayground()
  const { info } = useLogs()
  const { t } = useTranslation()

  const {
    ticker,
    allData,
    currentIndex,
    endDate,
    isLoading,
    error,
    secondaryTicker,
    showSecondaryChart,
    secondaryIsLoading,
    secondaryError
  } = playgroundData

  // Format dates for display
  const startDate = allData.length > 0 ? allData[0].time?.split('T')[0] : ''
  const currentDataPoint = allData[currentIndex]
  const currentDate = currentDataPoint?.time?.split('T')[0] || ''

  // Handle randomize button click
  const handleRandomize = () => {
    info('[Playground] 🎲 User clicked randomize - generating new ticker and date...')
    randomizeData()
  }

  // Handle manual ticker selection
  const handleTickerSelect = (newTicker: string) => {
    info(`[Playground] 📊 User manually selected ticker: ${newTicker}`)
    updateTicker(newTicker)
  }

  // Handle manual date selection
  const handleDateChange = (newDate: string | undefined) => {
    if (newDate) {
      info(`[Playground] 📅 User manually selected end date: ${newDate}`)
      updateEndDate(newDate)
    }
  }

  // Handle manual current date selection (for navigation, not URL)
  const handleCurrentDateChange = (newDate: string | undefined) => {
    if (newDate && allData.length > 0) {
      // Find the index of the selected date
      const targetIndex = allData.findIndex(d => d.time?.split('T')[0] === newDate)

      if (targetIndex !== -1) {
        info(`[Playground] 📍 User manually navigated to date: ${newDate} (index ${targetIndex})`)
        setCurrentIndex(targetIndex)
      } else {
        info(`[Playground] ⚠️ Date ${newDate} not found in data range`)
      }
    }
  }

  // Handle secondary ticker selection
  const handleSecondaryTickerSelect = (newSecondaryTicker: string) => {
    // Default to VNINDEX if no ticker provided
    const ticker = newSecondaryTicker || 'VNINDEX'
    info(`[Playground] 📊 User manually selected secondary ticker: ${ticker}`)
    updateSecondaryTicker(ticker)
  }

  // Handle secondary chart visibility toggle
  const handleSecondaryChartToggle = () => {
    toggleSecondaryChart()
  }

  // Handle share URL copy
  const handleShare = async () => {
    const currentUrl = window.location.href
    try {
      await navigator.clipboard.writeText(currentUrl)
      info('[Playground] 📋 URL copied to clipboard')
    } catch (err) {
      // Fallback for older browsers
      const textArea = document.createElement('textarea')
      textArea.value = currentUrl
      document.body.appendChild(textArea)
      textArea.focus()
      textArea.select()
      try {
        document.execCommand('copy')
        info('[Playground] 📋 URL copied to clipboard')
      } catch (err) {
        info('[Playground] ❌ Failed to copy URL')
      }
      document.body.removeChild(textArea)
    }
  }

  // Get latest price for display
  const latestPrice = currentDataPoint?.close || 0

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b">
        <h3 className="text-sm font-semibold">{t('common.playground.info.title')}</h3>
        <Button
          variant="secondary"
          size="sm"
          onClick={handleShare}
          className="text-xs h-7"
          title="Copy current URL to clipboard"
        >
          <Share2 className="h-3.5 w-3.5 mr-1" />
          {t('common.playground.info.share')}
        </Button>
      </div>

      {/* Manual Controls Section */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {/* Ticker Selection */}
        <div className="space-y-2">
          <label className="text-xs text-muted-foreground">{t('common.playground.info.ticker')}</label>
          <SelectTickerDialog onSelectTicker={handleTickerSelect}>
            <Button
              variant="outline"
              disabled={isLoading}
              className="w-full justify-start font-mono text-sm"
            >
              <Edit className="h-3.5 w-3.5 mr-2 flex-shrink-0" />
              {ticker || 'Select ticker...'}
            </Button>
          </SelectTickerDialog>
        </div>

        {/* End Date Selection */}
        <div className="space-y-2">
          <label className="text-xs text-muted-foreground flex items-center gap-1">
            <Calendar className="h-3.5 w-3.5" />
            {t('common.playground.info.endDate')}
          </label>
          <DateInput
            value={endDate}
            onChange={handleDateChange}
            placeholder="YYYY-MM-DD"
            disabled={isLoading}
            clearable={false}
          />
        </div>

        {/* Current Date Selection */}
        <div className="space-y-2">
          <label className="text-xs text-muted-foreground flex items-center gap-1">
            <Calendar className="h-3.5 w-3.5" />
            {t('common.playground.info.currentDate')}
          </label>
          <DateInput
            value={currentDate}
            onChange={handleCurrentDateChange}
            placeholder="YYYY-MM-DD"
            disabled={isLoading}
            clearable={false}
          />
        </div>
      </div>

      {/* Secondary Chart Controls */}
      <div className="space-y-3">
        {/* Show/Hide Secondary Chart Checkbox */}
        <div className="flex items-center space-x-2">
          <input
            type="checkbox"
            id="show-secondary-chart"
            checked={showSecondaryChart}
            onChange={handleSecondaryChartToggle}
            disabled={isLoading}
            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
          />
          <label htmlFor="show-secondary-chart" className="text-sm text-muted-foreground">
            {t('common.playground.info.showSecondaryChart')}
          </label>
        </div>

        {/* Secondary Ticker Selection - Show when enabled */}
        {showSecondaryChart && (
          <div className="space-y-2">
            <label className="text-xs text-muted-foreground">{t('common.playground.info.secondaryTicker')}</label>
            <SelectTickerDialog onSelectTicker={handleSecondaryTickerSelect}>
              <Button
                variant="outline"
                disabled={secondaryIsLoading || isLoading}
                className="w-full justify-start font-mono text-sm"
              >
                <Edit className="h-3.5 w-3.5 mr-2 flex-shrink-0" />
                {secondaryTicker || 'VNINDEX'}
              </Button>
            </SelectTickerDialog>
          </div>
        )}

        {/* Secondary loading/error state */}
        {showSecondaryChart && (
          <div>
            {secondaryIsLoading && (
              <div className="text-center py-2">
                <p className="text-sm text-muted-foreground">{t('common.playground.info.secondaryLoading')}</p>
              </div>
            )}

            {secondaryError && (
              <div className="bg-destructive/10 border border-destructive/20 rounded-md p-3">
                <p className="text-xs text-destructive">{secondaryError}</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Loading/Error states */}
      {isLoading && (
        <div className="text-center py-2">
          <p className="text-sm text-muted-foreground">{t('common.playground.info.loadingData')}</p>
        </div>
      )}

      {error && (
        <div className="bg-destructive/10 border border-destructive/20 rounded-md p-3">
          <p className="text-xs text-destructive">{error}</p>
        </div>
      )}

      {/* Ticker info */}
      {!isLoading && !error && ticker && (
        <div className="space-y-3">
          {/* Current price */}
          {currentDataPoint && (
            <div>
              <p className="text-xs text-muted-foreground">{t('common.playground.info.currentPrice')}</p>
              <p className="text-lg font-mono">{latestPrice.toFixed(2)}</p>
            </div>
          )}

          {/* Date range */}
          <div>
            <p className="text-xs text-muted-foreground">{t('common.playground.info.dateRange')}</p>
            <p className="text-xs">
              {startDate && (
                <>
                  {startDate} → {currentDate}
                  <span className="text-muted-foreground ml-1">
                    ({currentIndex + 1} of {allData.length} {t('common.playground.info.days')})
                  </span>
                </>
              )}
            </p>
          </div>

          {/* Data availability */}
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div>
              <p className="text-muted-foreground">{t('common.playground.info.fetched')}</p>
              <p className="font-medium">{allData.length} {t('common.playground.info.days')}</p>
            </div>
            <div>
              <p className="text-muted-foreground">{t('common.playground.info.visible')}</p>
              <p className="font-medium">{visibleData.length} {t('common.playground.info.days')}</p>
            </div>
          </div>

          {/* Random controls */}
          <div>
            <Button
              size="sm"
              onClick={handleRandomize}
              disabled={isLoading}
              className="w-full text-xs bg-green-600 text-white hover:bg-green-700"
            >
              <Dices className="h-3.5 w-3.5 mr-2" />
              {t('common.playground.info.randomizeButton')}
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}