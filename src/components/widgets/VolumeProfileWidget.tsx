import * as React from 'react'
import { ChevronDown, ChevronLeft, ChevronRight, Star, HelpCircle, CalendarRange, Bell, Info } from 'lucide-react'
import { formatPrice, formatVolume, formatPercent } from '@/lib/format'
import { SelectTickerDialog } from '@/components/dialogs/SelectTickerDialog'
import { QuickAddWatchListDialog } from '@/components/dialogs/QuickAddWatchListDialog'
import { QuickAddAlertDialog } from '@/components/dialogs/QuickAddAlertDialog'
import { Skeleton } from '@/components/ui/skeleton'
import { Button } from '@/components/ui/button'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { DateInput } from '@/components/DateInput'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { getVolumeProfile } from '@/lib/api-client'
import { useTranslation } from '@/hooks/useTranslation'
import { useAPI } from '@/contexts/APIContext'
import { useChartSettings } from '@/contexts/ChartSettingsContext'
import { getTickerMode } from '@/lib/ticker-utils'
import type { VolumeProfileData, PriceLevelVolume } from '@/lib/api-client'

interface VolumeProfileWidgetProps {
  initialTicker?: string
  ticker?: string
  initialDate?: string // YYYY-MM-DD, default today
  date?: string
  onTickerChange?: (ticker: string) => void
  onDateChange?: (date: string) => void
  maxHeight?: string // e.g. "400px", "calc(100vh - 200px)"
  // Date range mode props
  initialStartDate?: string
  initialEndDate?: string
  startDate?: string
  endDate?: string
  onStartDateChange?: (date: string) => void
  onEndDateChange?: (date: string) => void
}

function getTodayDate(): string {
  const now = new Date()
  return now.toISOString().split('T')[0]
}

export function VolumeProfileWidget({
  initialTicker = 'VNINDEX',
  ticker,
  initialDate,
  date,
  onTickerChange,
  onDateChange,
  maxHeight,
  initialStartDate,
  initialEndDate,
  startDate,
  endDate,
  onStartDateChange,
  onEndDateChange,
}: VolumeProfileWidgetProps) {
  const { t } = useTranslation()
  const { tickers: stockTickers, cryptoTickers, globalTickers, getTickers, ema } = useAPI()
  const { startDate: globalStartDate, endDate: globalEndDate } = useChartSettings()
  const [selectedTicker, setSelectedTicker] = React.useState(ticker ?? initialTicker)
  const [selectedDate, setSelectedDate] = React.useState(date ?? initialDate ?? globalEndDate ?? null)
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)
  const [profileData, setProfileData] = React.useState<VolumeProfileData | null>(null)
  const [dailyData, setDailyData] = React.useState<any | null>(null)
  const [bins, setBins] = React.useState(10)

  // Date range mode state
  const [isRangeMode, setIsRangeMode] = React.useState(false)
  const [selectedStartDate, setSelectedStartDate] = React.useState(startDate ?? initialStartDate ?? globalStartDate ?? getTodayDate())
  const [selectedEndDate, setSelectedEndDate] = React.useState(endDate ?? initialEndDate ?? globalEndDate ?? getTodayDate())

  // Determine mode for price formatting
  const currentMode = React.useMemo(() => {
    return getTickerMode(selectedTicker, stockTickers, globalTickers, cryptoTickers)
  }, [selectedTicker, stockTickers, cryptoTickers, globalTickers])
  const priceFormatData = { mode: currentMode as 'vn' | 'crypto', symbol: selectedTicker }

  // Refs for values only needed inside fetch (avoid re-fetching when they change)
  const stockTickersRef = React.useRef(stockTickers)
  stockTickersRef.current = stockTickers
  const cryptoTickersRef = React.useRef(cryptoTickers)
  cryptoTickersRef.current = cryptoTickers
  const globalTickersRef = React.useRef(globalTickers)
  globalTickersRef.current = globalTickers
  const getTickersRef = React.useRef(getTickers)
  getTickersRef.current = getTickers

  // Fetch last trading day for default date if not provided
  React.useEffect(() => {
    if (selectedDate !== null) return // Already have a date

    let cancelled = false

    async function fetchLastTradingDay() {
      try {
        const mode = getTickerMode(selectedTicker, stockTickersRef.current, globalTickersRef.current, cryptoTickersRef.current)
        const response = await getTickersRef.current('VolumeProfileWidget.lastTradingDay', { symbol: selectedTicker, limit: 1, end_date: globalEndDate, mode, ema: ema || undefined })

        console.log(`[VolumeProfileWidget] Response:`, response)
        console.log(`[VolumeProfileWidget] Response[${selectedTicker}]:`, response[selectedTicker])

        if (!cancelled && response[selectedTicker] && response[selectedTicker].length > 0) {
          const latestBar = response[selectedTicker][0]
          const latestDate = latestBar.time.split('T')[0]
          console.log(`[VolumeProfileWidget] Setting selectedDate to last trading day: ${latestDate}`)
          setSelectedDate(latestDate)
        } else if (!cancelled) {
          console.log(`[VolumeProfileWidget] No data found, falling back to today: ${getTodayDate()}`)
          setSelectedDate(getTodayDate())
        }
      } catch (err) {
        if (!cancelled) {
          console.error(`[VolumeProfileWidget] Fetch failed:`, err)
          setSelectedDate(getTodayDate())
        }
      }
    }

    fetchLastTradingDay()

    return () => {
      cancelled = true
    }
  }, [selectedTicker, selectedDate, globalEndDate, ema])

  // Sync with external ticker prop
  React.useEffect(() => {
    if (ticker !== undefined && ticker !== selectedTicker) {
      setSelectedTicker(ticker)
    }
  }, [ticker, selectedTicker])

  // Sync with external date prop
  React.useEffect(() => {
    if (date !== undefined && date !== selectedDate) {
      setSelectedDate(date)
    }
  }, [date, selectedDate])

  // Sync with external start/end date props
  React.useEffect(() => {
    if (startDate !== undefined && startDate !== selectedStartDate) {
      setSelectedStartDate(startDate)
    }
  }, [startDate, selectedStartDate])

  React.useEffect(() => {
    if (endDate !== undefined && endDate !== selectedEndDate) {
      setSelectedEndDate(endDate)
    }
  }, [endDate, selectedEndDate])

  // Sync with global ChartSettingsContext dates (one-way: global → widget)
  React.useEffect(() => {
    if (globalStartDate && globalStartDate !== selectedStartDate) {
      setSelectedStartDate(globalStartDate)
    }
  }, [globalStartDate])

  React.useEffect(() => {
    if (globalEndDate && globalEndDate !== selectedEndDate) {
      setSelectedEndDate(globalEndDate)
    }
  }, [globalEndDate])

  // For single-date mode, sync with globalEndDate
  React.useEffect(() => {
    if (globalEndDate && !isRangeMode && globalEndDate !== selectedDate) {
      setSelectedDate(globalEndDate)
    }
  }, [globalEndDate, isRangeMode])

  // Fetch volume profile data
  React.useEffect(() => {
    if (!selectedDate) return // Wait for date to be set

    let cancelled = false

    async function fetchData() {
      setLoading(true)
      setError(null)
      setDailyData(null) // Reset daily data

      try {
        // Determine mode (crypto vs stock vs yahoo)
        const mode = getTickerMode(selectedTicker, stockTickersRef.current, globalTickersRef.current, cryptoTickersRef.current)

        // Use date range params if in range mode, otherwise single date
        const params = isRangeMode
          ? { symbol: selectedTicker, start_date: selectedStartDate, end_date: selectedEndDate, bins, mode }
          : { symbol: selectedTicker, date: selectedDate!, bins, mode }

        console.log(`[VolumeProfileWidget] Fetching volume profile with date: ${selectedDate}`)

        const response = await getVolumeProfile(params)

        if (!cancelled) {
          setProfileData(response.data)

          // If no volume profile data and in single-day mode, fetch daily data as fallback
          if (!response.data && !isRangeMode) {
            console.log(`[VolumeProfileWidget] No volume profile data, fetching daily data as fallback`)
            try {
              const dailyResponse = await getTickersRef.current('VolumeProfileWidget.dailyFallback', {
                symbol: selectedTicker,
                end_date: selectedDate!,
                limit: 1,
                mode,
                ema: ema || undefined,
              })

              if (!cancelled && dailyResponse[selectedTicker] && dailyResponse[selectedTicker].length > 0) {
                setDailyData(dailyResponse[selectedTicker][0])
                console.log(`[VolumeProfileWidget] Daily fallback data:`, dailyResponse[selectedTicker][0])
              }
            } catch (dailyErr) {
              console.error(`[VolumeProfileWidget] Failed to fetch daily fallback:`, dailyErr)
              // Don't set error, just leave dailyData as null
            }
          }
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to fetch volume profile')
          setProfileData(null)
        }
      } finally {
        if (!cancelled) {
          setLoading(false)
        }
      }
    }

    fetchData()

    return () => {
      cancelled = true
    }
  }, [selectedTicker, selectedDate, selectedStartDate, selectedEndDate, isRangeMode, bins])

  const handleSelectTicker = (newTicker: string) => {
    setSelectedTicker(newTicker)
    onTickerChange?.(newTicker)
  }

  const handlePrevDate = () => {
    if (!selectedDate) return
    const current = new Date(selectedDate)
    current.setDate(current.getDate() - 1)
    const newDate = current.toISOString().split('T')[0]
    setSelectedDate(newDate)
    onDateChange?.(newDate)
  }

  const handleNextDate = () => {
    if (!selectedDate) return
    const current = new Date(selectedDate)
    current.setDate(current.getDate() + 1)
    const newDate = current.toISOString().split('T')[0]
    setSelectedDate(newDate)
    onDateChange?.(newDate)
  }

  // Loading state
  if (loading) {
    return (
      <div className="border rounded-lg p-4 bg-card">
        <div className="flex items-center justify-between mb-4">
          <div>
            <Skeleton className="h-6 w-20 mb-2" />
            <Skeleton className="h-3 w-24" />
          </div>
          <div className="text-right">
            <Skeleton className="h-4 w-32 mb-2 ml-auto" />
            <Skeleton className="h-3 w-24 ml-auto" />
          </div>
        </div>
        <div className="space-y-2">
          {[...Array(8)].map((_, i) => (
            <Skeleton key={i} className="h-8 w-full" />
          ))}
        </div>
      </div>
    )
  }

  // Render error or no data content (used inside main layout)
  const renderContent = () => {
    if (error) {
      return (
        <div className="text-center text-destructive py-8">
          <p className="text-sm">{error}</p>
        </div>
      )
    }

    if (!profileData) {
      // If we have daily data as fallback (single-day mode only)
      if (dailyData && !isRangeMode) {
        const changeAmount = dailyData.close - dailyData.open
        const changePercent = (changeAmount / dailyData.open) * 100
        const isPositive = changeAmount >= 0

        return (
          <>
            {/* Info banner */}
            <div className="flex items-start gap-2 p-3 mb-4 bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded">
              <Info className="h-4 w-4 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
              <div className="text-xs text-blue-900 dark:text-blue-100">
                <p className="font-semibold mb-1">{t('common.volumeProfile.noMinuteData')}</p>
                <p className="text-blue-700 dark:text-blue-300">{t('common.volumeProfile.showingDailySummary')}</p>
              </div>
            </div>

            {/* Daily OHLCV Summary */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground uppercase tracking-wide">{t('common.volumeProfile.dailyOpen')}</p>
                <p className="text-sm font-semibold">{formatPrice(dailyData.open, priceFormatData)}</p>
              </div>
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground uppercase tracking-wide">{t('common.volumeProfile.dailyHigh')}</p>
                <p className="text-sm font-semibold">{formatPrice(dailyData.high, priceFormatData)}</p>
              </div>
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground uppercase tracking-wide">{t('common.volumeProfile.dailyLow')}</p>
                <p className="text-sm font-semibold">{formatPrice(dailyData.low, priceFormatData)}</p>
              </div>
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground uppercase tracking-wide">{t('common.volumeProfile.dailyClose')}</p>
                <p className="text-sm font-semibold">{formatPrice(dailyData.close, priceFormatData)}</p>
              </div>
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground uppercase tracking-wide">{t('common.volumeProfile.dailyVolume')}</p>
                <p className="text-sm font-semibold">{formatVolume(dailyData.volume)}</p>
              </div>
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground uppercase tracking-wide">{t('common.volumeProfile.dailyChange')}</p>
                <p className={`text-sm font-semibold ${isPositive ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                  {isPositive ? '+' : ''}{formatPrice(changeAmount, priceFormatData)} ({isPositive ? '+' : ''}{formatPercent(changePercent)})
                </p>
              </div>
            </div>
          </>
        )
      }

      // No data at all
      return (
        <div className="text-center text-muted-foreground py-8">
          <p className="text-sm font-semibold mb-2">{t('common.volumeProfile.noDataAvailable')}</p>
          <p className="text-xs">{t('common.volumeProfile.noDataDescription')}</p>
        </div>
      )
    }

    const { poc, value_area, profile, total_volume } = profileData
    const maxVolume = Math.max(...profile.map((p) => p.volume))

    return (
      <>
        {/* Summary Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4 pb-4 border-b">
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground uppercase tracking-wide">{t('common.volumeProfile.poc')}</p>
            <p className="text-sm font-semibold text-amber-600 dark:text-amber-500">
              {formatPrice(poc.price, priceFormatData)}
            </p>
          </div>
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground uppercase tracking-wide">{t('common.volumeProfile.vaLow')}</p>
            <p className="text-sm font-semibold">{formatPrice(value_area.low, priceFormatData)}</p>
          </div>
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground uppercase tracking-wide">{t('common.volumeProfile.vaHigh')}</p>
            <p className="text-sm font-semibold">{formatPrice(value_area.high, priceFormatData)}</p>
          </div>
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground uppercase tracking-wide">{t('common.volumeProfile.totalVol')}</p>
            <p className="text-sm font-semibold">{formatVolume(total_volume)}</p>
          </div>
        </div>

        {/* Volume Profile Bars - 600px mobile, maxHeight prop for desktop (default 300px) */}
        <div
          className="space-y-1 overflow-y-auto max-h-[600px] md:max-h-[var(--desktop-max-height)]"
          style={{ ['--desktop-max-height' as string]: maxHeight ?? '300px' }}
        >
          {profile.map((level) => (
            <VolumeProfileRow
              key={level.price}
              level={level}
              maxVolume={maxVolume}
              priceFormatData={priceFormatData}
              poc={poc}
              valueArea={value_area}
            />
          ))}
        </div>
      </>
    )
  }

  return (
    <div className="border rounded-lg p-4 bg-card">
      {/* Header */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-1">
          <SelectTickerDialog onSelectTicker={handleSelectTicker} defaultSectionFilter="stocks">
            <div className="text-lg font-bold hover:bg-muted/50 transition-colors duration-200 inline-flex items-center cursor-pointer px-1 -ml-1">
              {selectedTicker}
              <ChevronDown className="ml-1 h-4 w-4 opacity-60" />
            </div>
          </SelectTickerDialog>
          <QuickAddWatchListDialog ticker={selectedTicker}>
            <Button variant="ghost" size="sm" className="h-6 w-6 p-0 hover:bg-muted/50">
              <Star className="h-3.5 w-3.5" />
              <span className="sr-only">Add to watchlist</span>
            </Button>
          </QuickAddWatchListDialog>
          <QuickAddAlertDialog ticker={selectedTicker}>
            <Button variant="ghost" size="sm" className="h-6 w-6 p-0 hover:bg-muted/50">
              <Bell className="h-3.5 w-3.5" />
              <span className="sr-only">Add price alert</span>
            </Button>
          </QuickAddAlertDialog>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant={isRangeMode ? 'default' : 'ghost'}
            size="sm"
            className="h-6 w-6 p-0 hover:bg-muted/50"
            onClick={() => setIsRangeMode(!isRangeMode)}
            title={isRangeMode ? t('common.volumeProfile.singleDay') : t('common.volumeProfile.dateRange')}
          >
            <CalendarRange className="h-3.5 w-3.5" />
          </Button>
          <Select value={String(bins)} onValueChange={(v) => setBins(Number(v))}>
            <SelectTrigger className="w-16 h-7 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="10">10</SelectItem>
              <SelectItem value="20">20</SelectItem>
              <SelectItem value="50">50</SelectItem>
            </SelectContent>
          </Select>
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="ghost" size="sm" className="h-6 w-6 p-0 hover:bg-muted/50">
                <HelpCircle className="h-3.5 w-3.5 text-muted-foreground" />
                <span className="sr-only">Help</span>
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-80 text-sm" align="end">
              <div className="space-y-3">
                <h4 className="font-semibold">{t('common.volumeProfile.help.title')}</h4>
                <p className="text-muted-foreground text-xs">{t('common.volumeProfile.help.description')}</p>
                <div className="space-y-2 text-xs">
                  <p><span className="font-medium text-amber-600">●</span> {t('common.volumeProfile.help.poc')}</p>
                  <p><span className="font-medium text-blue-600">●</span> {t('common.volumeProfile.help.valueArea')}</p>
                  <p>{t('common.volumeProfile.help.totalVolume')}</p>
                  <p><span className="font-medium text-green-600">●</span> {t('common.volumeProfile.help.hvn')}</p>
                  <p><span className="font-medium text-slate-500">●</span> {t('common.volumeProfile.help.lvn')}</p>
                  <p className="text-muted-foreground">{t('common.volumeProfile.help.colors')}</p>
                  <p className="text-muted-foreground">{t('common.volumeProfile.help.dateMode')}</p>
                </div>
              </div>
            </PopoverContent>
          </Popover>
        </div>
      </div>

      {/* Date Navigation Row */}
      <div className="flex items-center justify-center gap-1 mb-4">
        {isRangeMode ? (
          // Date range mode
          <>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm" className="h-8 text-xs font-mono">
                  {selectedStartDate}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-2" align="center">
                <DateInput
                  value={selectedStartDate}
                  onChange={(val) => {
                    if (val) {
                      setSelectedStartDate(val)
                      onStartDateChange?.(val)
                    }
                  }}
                  clearable={false}
                />
              </PopoverContent>
            </Popover>
            <span className="text-xs text-muted-foreground">→</span>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm" className="h-8 text-xs font-mono">
                  {selectedEndDate}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-2" align="center">
                <DateInput
                  value={selectedEndDate}
                  onChange={(val) => {
                    if (val) {
                      setSelectedEndDate(val)
                      onEndDateChange?.(val)
                    }
                  }}
                  clearable={false}
                />
              </PopoverContent>
            </Popover>
          </>
        ) : (
          // Single date mode
          <>
            <Button variant="outline" size="sm" className="h-8 w-8 p-0" onClick={handlePrevDate}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm" className="h-8 font-mono">
                  {selectedDate}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-2" align="center">
                <DateInput
                  value={selectedDate || undefined}
                  onChange={(val) => {
                    setSelectedDate(val || null)
                    if (val) onDateChange?.(val)
                  }}
                  clearable={false}
                />
              </PopoverContent>
            </Popover>
            <Button variant="outline" size="sm" className="h-8 w-8 p-0" onClick={handleNextDate}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </>
        )}
      </div>

      {renderContent()}
    </div>
  )
}

interface VolumeProfileRowProps {
  level: PriceLevelVolume
  maxVolume: number
  poc: { price: number; volume: number; percentage: number }
  valueArea: { low: number; high: number; volume: number; percentage: number }
  priceFormatData: { mode: 'vn' | 'crypto'; symbol: string }
}

function VolumeProfileRow({ level, maxVolume, poc, valueArea, priceFormatData }: VolumeProfileRowProps) {
  const isPOC = Math.abs(level.price - poc.price) < 0.01
  const inVA = level.price >= valueArea.low && level.price <= valueArea.high
  const isHVN = level.percentage >= 3.0
  const isLVN = level.percentage < 1.0

  // Calculate bar width
  const barWidth = (level.volume / maxVolume) * 100
  const displayWidth = Math.max(level.volume > 0 ? 2 : 0, barWidth)

  // Determine bar color
  let barColor = 'bg-gray-400'
  if (isPOC) {
    barColor = 'bg-amber-500'
  } else if (isHVN) {
    barColor = 'bg-green-500'
  } else if (isLVN) {
    barColor = 'bg-slate-500'
  }

  // Background for value area
  const bgClass = inVA ? 'bg-blue-50 dark:bg-blue-950/30' : ''

  return (
    <div className={`py-1.5 px-2 rounded ${bgClass} hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors`}>
      {/* Row 1: Price + Bar */}
      <div className="flex items-center gap-2">
        <div
          className={`w-20 text-xs font-mono text-right font-semibold ${isPOC ? 'text-amber-700 dark:text-amber-400' : 'text-gray-700 dark:text-gray-300'}`}
        >
          {formatPrice(level.price, priceFormatData)}
        </div>
        <div className="flex-1 relative h-5">
          <div
            className={`${barColor} h-full rounded transition-all`}
            style={{ width: `${displayWidth}%` }}
          />
        </div>
      </div>
      {/* Row 2: Volume/Percentage + Badges */}
      <div className="flex items-center justify-between mt-1 text-xs text-gray-500 dark:text-gray-400 pl-22">
        <span>
          {formatVolume(level.volume)} ({formatPercent(level.percentage)})
        </span>
        <span className="flex items-center gap-1">
          {isPOC && (
            <>
              <span className="text-amber-600 mr-1">⭐</span>
              <span className="px-1.5 py-0.5 bg-amber-100 dark:bg-amber-900/50 text-amber-700 dark:text-amber-400 rounded font-semibold">
                POC
              </span>
            </>
          )}
        </span>
      </div>
    </div>
  )
}
