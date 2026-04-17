import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { usePlayground } from './PlaygroundDataProvider'
import { useLogs } from '@/contexts/LogsContext'
import { useChartSettings } from '@/contexts/ChartSettingsContext'
import { Dices, Calendar, Edit, Share2, X } from 'lucide-react'
import { useTranslation } from '@/hooks/useTranslation'
import { SafeLocalStorage } from '@/lib/localStorage'
import { SelectTickerDialog } from '@/components/dialogs/SelectTickerDialog'
import { DateInput } from '@/components/DateInput'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { PLAYGROUND_INTERVALS, PLAYGROUND_LIMITS, isIntradayInterval, type PlaygroundInterval, type PlaygroundLimit } from './hooks/usePlaygroundData'

// localStorage key for secondary chart visibility
const SECONDARY_CHART_VISIBLE_KEY = 'playground-secondary-chart-visible'
// localStorage key for smart random toggle
const SMART_RANDOM_KEY = 'playground-smart-random'
// localStorage key for random ticker toggle
const RANDOM_TICKER_KEY = 'playground-random-ticker'

export function PlaygroundInfoPanel() {
  const {
    playgroundData,
    visibleData,
    randomizeData,
    updateTicker,
    updateEndDate,
    setCurrentIndex,
    updateSecondaryTicker,
    toggleSecondaryChart,
    setShowSecondaryChart,
    updateInterval,
    updateLimit,
    showAlertLines,
    setShowAlertLines,
    showChartLines,
    setShowChartLines,
  } = usePlayground()
  const { info } = useLogs()
  const { setInterval: setGlobalInterval } = useChartSettings()
  const { t } = useTranslation()

  // Smart random toggle state, persisted to localStorage
  const [smartRandom, setSmartRandom] = useState<boolean>(() => {
    const stored = SafeLocalStorage.getItem(SMART_RANDOM_KEY)
    return stored === null ? true : stored === 'true'
  })

  // Persist smart random toggle to localStorage
  const handleSmartRandomChange = (checked: boolean) => {
    setSmartRandom(checked)
    SafeLocalStorage.setItem(SMART_RANDOM_KEY, String(checked))
  }

  // Random ticker toggle state, persisted to localStorage
  const [randomTicker, setRandomTicker] = useState<boolean>(() => {
    const stored = SafeLocalStorage.getItem(RANDOM_TICKER_KEY)
    return stored === null ? true : stored === 'true'
  })

  // Persist random ticker toggle to localStorage
  const handleRandomTickerChange = (checked: boolean) => {
    setRandomTicker(checked)
    SafeLocalStorage.setItem(RANDOM_TICKER_KEY, String(checked))
  }

  // Initialize secondary chart visibility from localStorage on mount - run only once
  useEffect(() => {
    const stored = SafeLocalStorage.getItem(SECONDARY_CHART_VISIBLE_KEY)
    if (stored !== null) {
      const isVisible = stored === 'true'
      setShowSecondaryChart(isVisible)
      info(`[Playground] 📊 Restored secondary chart visibility from localStorage: ${isVisible}`)
    }
  }, []) // Empty dependency array - run only on mount

  // Save secondary chart visibility to localStorage whenever it changes
  useEffect(() => {
    const { showSecondaryChart } = playgroundData
    SafeLocalStorage.setItem(SECONDARY_CHART_VISIBLE_KEY, showSecondaryChart.toString())
    info(`[Playground] 💾 Saved secondary chart visibility to localStorage: ${showSecondaryChart}`)
  }, [playgroundData.showSecondaryChart])

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
    info(`[Playground] 🎲 User clicked randomize (randomTicker=${randomTicker}, smartRandom=${smartRandom})`)
    randomizeData(randomTicker ? smartRandom : false, randomTicker)
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

  // Handle end date reset to today's date
  const handleEndDateReset = () => {
    const today = new Date().toISOString().split('T')[0]
    info(`[Playground] 📅 User reset end date to today: ${today}`)
    handleDateChange(today)
  }

  // Handle current date reset to end of data
  const handleCurrentDateReset = () => {
    if (allData.length > 0) {
      const endIndex = allData.length - 1
      info(`[Playground] ⏭️ User reset current date to end (index ${endIndex})`)
      setCurrentIndex(endIndex)
    }
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

  // Label for bars vs days based on interval
  const barsLabel = isIntradayInterval(playgroundData.interval)
    ? t('common.playground.info.bars')
    : t('common.playground.info.days')

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
      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
        {/* Ticker Selection */}
        <div className="space-y-2">
          <label className="text-xs text-muted-foreground">{t('common.playground.info.ticker')}</label>
          <SelectTickerDialog onSelectTicker={handleTickerSelect} endDate={currentDate}>
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

        {/* Interval Selection */}
        <div className="space-y-2">
          <label className="text-xs text-muted-foreground">{t('common.playground.info.interval')}</label>
          <Select
            value={playgroundData.interval}
            onValueChange={(value) => {
              const newInterval = value as PlaygroundInterval
              info(`[Playground] User changed interval to ${newInterval}`)
              updateInterval(newInterval)
              setGlobalInterval(newInterval as import('@/lib/api-client').Interval)
            }}
            disabled={isLoading}
          >
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {PLAYGROUND_INTERVALS.map(iv => (
                <SelectItem key={iv} value={iv}>{iv}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Limit Selection */}
          <label className="text-xs text-muted-foreground">{t('common.playground.info.limit')}</label>
          <Select
            value={String(playgroundData.limit)}
            onValueChange={(value) => {
              const newLimit = Number(value) as PlaygroundLimit
              info(`[Playground] User changed limit to ${newLimit}`)
              updateLimit(newLimit)
            }}
            disabled={isLoading}
          >
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {PLAYGROUND_LIMITS.map(lim => (
                <SelectItem key={lim} value={String(lim)}>{lim}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* End Date Selection */}
        <div className="space-y-2">
          <label className="text-xs text-muted-foreground flex items-center gap-1">
            <Calendar className="h-3.5 w-3.5" />
            {t('common.playground.info.endDate')}
          </label>
          <div className="flex gap-2">
            <DateInput
              value={endDate}
              onChange={handleDateChange}
              placeholder="YYYY-MM-DD"
              clearable={false}
              className="flex-1"
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleEndDateReset}
              disabled={isLoading}
              title="Reset to today"
              className="px-2"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Current Date Selection */}
        <div className="space-y-2">
          <label className="text-xs text-muted-foreground flex items-center gap-1">
            <Calendar className="h-3.5 w-3.5" />
            {t('common.playground.info.currentDate')}
          </label>
          <div className="flex gap-2">
            <DateInput
              value={currentDate}
              onChange={handleCurrentDateChange}
              placeholder="YYYY-MM-DD"
              clearable={false}
              className="flex-1"
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleCurrentDateReset}
              disabled={isLoading || allData.length === 0}
              title="Jump to end"
              className="px-2"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Secondary Chart Controls */}
      <div className="space-y-3">
        {/* Show/Hide Alert Lines Checkbox */}
        <div className="flex items-center space-x-2">
          <input
            type="checkbox"
            id="show-alert-lines"
            checked={showAlertLines}
            onChange={(e) => setShowAlertLines(e.target.checked)}
            disabled={isLoading}
            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
          />
          <label htmlFor="show-alert-lines" className="text-sm text-muted-foreground">
            {t('common.playground.info.showAlertLines')}
          </label>
        </div>

        {/* Show/Hide Chart Lines Checkbox */}
        <div className="flex items-center space-x-2">
          <input
            type="checkbox"
            id="show-chart-lines"
            checked={showChartLines}
            onChange={(e) => setShowChartLines(e.target.checked)}
            disabled={isLoading}
            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
          />
          <label htmlFor="show-chart-lines" className="text-sm text-muted-foreground">
            {t('common.playground.info.showChartLines')}
          </label>
        </div>

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
            <SelectTickerDialog onSelectTicker={handleSecondaryTickerSelect} endDate={currentDate}>
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
                    ({currentIndex + 1} of {allData.length} {barsLabel})
                  </span>
                </>
              )}
            </p>
          </div>

          {/* Data availability */}
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div>
              <p className="text-muted-foreground">{t('common.playground.info.fetched')}</p>
              <p className="font-medium">{allData.length} {barsLabel}</p>
            </div>
            <div>
              <p className="text-muted-foreground">{t('common.playground.info.visible')}</p>
              <p className="font-medium">{visibleData.length} {barsLabel}</p>
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
              {randomTicker ? t('common.playground.info.randomizeButton') : t('common.playground.info.randomizeButtonDateOnly')}
            </Button>
            <div className="flex items-center space-x-2 mt-3">
              <input
                type="checkbox"
                id="random-ticker"
                checked={randomTicker}
                onChange={(e) => handleRandomTickerChange(e.target.checked)}
                disabled={isLoading}
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <label htmlFor="random-ticker" className="text-xs text-muted-foreground">
                {t('common.playground.info.randomTicker')}
              </label>
            </div>
            <div className="flex items-center space-x-2 mt-3">
              <input
                type="checkbox"
                id="smart-random"
                checked={smartRandom}
                onChange={(e) => handleSmartRandomChange(e.target.checked)}
                disabled={isLoading || !randomTicker}
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <label htmlFor="smart-random" className="text-xs text-muted-foreground">
                {t('common.playground.info.smartRandom')}
              </label>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}