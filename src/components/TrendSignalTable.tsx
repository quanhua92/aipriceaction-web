import * as React from 'react'
import { ChevronLeft, ChevronRight, ChevronDown, ChevronUp, MoreVertical } from 'lucide-react'
import { useAPI } from '@/contexts/APIContext'
import { useRefresh } from '@/contexts/RefreshContext'
import { useTranslation } from '@/hooks/useTranslation'
import {
  calculateHistoricalSignals,
  groupSignalsByDate,
  type HistoricalSignalData,
  type TickerSignalHistory,
  type IntervalType
} from '@/lib/trendsignal-utils'
import { formatToVietnamDate, parseUTCISOString } from '@/lib/format'
import { format } from 'date-fns'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { ChartFullscreenDialog, TitleGeneratorCallback } from './ChartFullscreenDialog'

interface TrendSignalTableProps {
  tickers?: string[]          // Optional: Multiple tickers to analyze
  ticker?: string             // Optional: Single ticker to analyze
  maxDays?: number           // Default 40, for API fetch
  buyPeriod?: number         // Default 20
  sellPeriod?: number        // Default 10
  interval?: IntervalType    // '1H' | '1D'
  endDate?: string           // Optional: End date for API fetch
  shouldOpenFullscreen?: boolean  // Default false: Allow ticker clicks to open dialog
}

export function TrendSignalTable({
  tickers,
  ticker,
  maxDays = 40,
  buyPeriod = 20,
  sellPeriod = 10,
  interval = '1D',
  endDate,
  shouldOpenFullscreen = false
}: TrendSignalTableProps) {
  // Internal memoization of tickers array to prevent future bugs
  const internalTickers = React.useMemo(() => {
    if (tickers) {
      return tickers
    }
    if (ticker) {
      return [ticker]
    }
    return []
  }, [tickers, ticker])
  const { tickerGroups, loading: apiLoading, getTickers, cryptoTickerGroups } = useAPI()
  const { lastRefresh } = useRefresh()
  const { t, language } = useTranslation()

  // State management
  const [selectedInterval, setSelectedInterval] = React.useState<IntervalType>(interval)
  const [selectedBuyPeriod, setSelectedBuyPeriod] = React.useState<number>(buyPeriod)
  const [selectedSellPeriod, setSelectedSellPeriod] = React.useState<number>(sellPeriod)
  const [signalHistories, setSignalHistories] = React.useState<TickerSignalHistory[]>([])
  const [loading, setLoading] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)

  // Dialog state for chart viewing
  const [dialogTicker, setDialogTicker] = React.useState<string | null>(null)

  // Date collapse state (only for multiple tickers)
  const [openDates, setOpenDates] = React.useState<Set<string>>(new Set())

  // Fetch and calculate historical signals
  React.useEffect(() => {
    if (internalTickers.length === 0 || loading) {
      if (internalTickers.length === 0) setSignalHistories([])
      return
    }

    let isMounted = true

    const fetchHistoricalSignals = async () => {
      setLoading(true)
      setError(null)

      try {
        // Always fetch all tickers to leverage browser cache
        const response = await getTickers('TrendSignalTable.fetch', {
          symbol: undefined, // Fetch ALL tickers for cache efficiency
          interval: selectedInterval === '1H' ? '1H' : '1D',
          end_date: endDate, // Will be undefined if not provided, API will default to latest
          limit: maxDays,
          mode: 'vn'
        })

        if (!isMounted) return

        // Calculate historical signals only for the specified tickers
        const histories = calculateHistoricalSignals(
          internalTickers,
          response,
          tickerGroups,
          cryptoTickerGroups,
          selectedBuyPeriod,
          selectedSellPeriod
        )

        if (isMounted) {
          setSignalHistories(histories)
        }
      } catch (err) {
        if (isMounted) {
          console.error('Failed to fetch historical trend signals:', err)
          setError('Failed to load historical trend signals')
        }
      } finally {
        if (isMounted) {
          setLoading(false)
        }
      }
    }

    fetchHistoricalSignals()

    return () => {
      isMounted = false
    }
  }, [internalTickers, selectedInterval, selectedBuyPeriod, selectedSellPeriod, lastRefresh, maxDays, endDate])

  // Flatten all signals for navigation
  const allSignals = React.useMemo(() => {
    return signalHistories.flatMap(history => history.signals)
  }, [signalHistories])

  // Sort signals by date (most recent first)
  const sortedSignals = React.useMemo(() => {
    return [...allSignals].sort((a, b) => b.date.localeCompare(a.date))
  }, [allSignals])

  // Group signals by date for multiple tickers view
  const signalsByDate = React.useMemo(() => {
    if (internalTickers.length <= 1) return {}
    return groupSignalsByDate(sortedSignals)
  }, [sortedSignals, internalTickers.length])

  // Get all tickers for navigation
  const allTickersForNavigation = internalTickers

  // Find current ticker index in the list
  const currentTickerIndex = React.useMemo(() => {
    if (!dialogTicker) return 0
    const index = allTickersForNavigation.indexOf(dialogTicker)
    return index !== -1 ? index : 0
  }, [dialogTicker, allTickersForNavigation])

  // Event handlers
  const handleSignalClick = (signal: HistoricalSignalData) => {
    if (shouldOpenFullscreen) {
      setDialogTicker(signal.ticker)
    }
  }

  const handleCloseDialog = () => {
    setDialogTicker(null)
  }

  // getTitle callback for ChartFullscreenDialog
  const getChartTitle = React.useCallback((ticker: string): string => {
    // Find the latest signal data for this ticker
    const tickerHistory = signalHistories.find(h => h.ticker === ticker)
    if (!tickerHistory || tickerHistory.signals.length === 0) {
      return ticker
    }

    const latestSignal = tickerHistory.signals[tickerHistory.signals.length - 1]

    // Create custom title with signal reason
    let customTitle = latestSignal.ticker
    if (latestSignal.signal && latestSignal.strength !== undefined && latestSignal.strength !== null) {
      if (latestSignal.signal === 'BUY' && latestSignal.previousHigh) {
        customTitle += ` - ${t('common.trendSignal.buy')} - ${t('common.trendSignal.above', {
          price: latestSignal.previousHigh.toLocaleString()
        })} ${Math.abs(latestSignal.strength).toFixed(1)}%`
      } else if (latestSignal.signal === 'SELL' && latestSignal.previousLow) {
        customTitle += ` - ${t('common.trendSignal.sell')} - ${t('common.trendSignal.below', {
          price: latestSignal.previousLow.toLocaleString()
        })} ${Math.abs(latestSignal.strength).toFixed(1)}%`
      }
    }

    return customTitle
  }, [signalHistories, t])

  const toggleDate = (date: string) => {
    setOpenDates((prev) => {
      const next = new Set(prev)
      if (next.has(date)) {
        next.delete(date)
      } else {
        next.add(date)
      }
      return next
    })
  }

  const expandAllDates = () => {
    const allDates = new Set(Object.keys(signalsByDate))
    setOpenDates(allDates)
  }

  const collapseAllDates = () => {
    setOpenDates(new Set())
  }

  if (apiLoading) {
    return (
      <div className="p-8 text-center">
        <p>Loading market data...</p>
      </div>
    )
  }

  return (
    <>
      <div>
  
        {/* Control Bar - Row 1: Interval and Actions */}
        <div className="flex items-center gap-2 mb-3 shrink-0 px-3">
          {/* Interval Selector */}
          <div className="flex gap-1">
            {(['1H', '1D'] as const).map((int) => (
              <Button
                key={int}
                variant={selectedInterval === int ? 'outline' : 'ghost'}
                size="sm"
                onClick={() => setSelectedInterval(int)}
                className={`h-8 px-3 text-xs ${
                  selectedInterval === int
                    ? 'border border-primary text-primary'
                    : ''
                }`}
              >
                {int}
              </Button>
            ))}
          </div>

          {/* Spacer to push actions to the right */}
          <div className="flex-1"></div>

          {/* Date Actions Menu (only for multiple tickers) */}
          {internalTickers.length > 1 && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={expandAllDates}>
                  {t('common.matrix.expandAll')}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={collapseAllDates}>
                  {t('common.matrix.collapseAll')}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>

        {/* Control Bar - Row 2: Buy and Sell Period Selectors */}
        <div className="flex items-center gap-2 mb-3 shrink-0 px-3">
          {/* Buy Period Selector */}
          <Select value={selectedBuyPeriod.toString()} onValueChange={(v) => setSelectedBuyPeriod(parseInt(v))}>
            <SelectTrigger className="w-40 h-8 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {[5, 10, 15, 20, 25, 30].map((n) => (
                <SelectItem key={n} value={n.toString()}>
                  {t('common.trendSignal.buy')}: {t('common.trendSignal.peak')} {n} {selectedInterval === '1D' ? t('common.trendSignal.days') : t('common.trendSignal.hours')}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Sell Period Selector */}
          <Select value={selectedSellPeriod.toString()} onValueChange={(v) => setSelectedSellPeriod(parseInt(v))}>
            <SelectTrigger className="w-40 h-8 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {[5, 10, 15, 20].map((n) => (
                <SelectItem key={n} value={n.toString()}>
                  {t('common.trendSignal.sell')}: {t('common.trendSignal.bottom')} {n} {selectedInterval === '1D' ? t('common.trendSignal.days') : t('common.trendSignal.hours')}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          {loading && (
            <div className="text-center py-8">
              <p className="text-muted-foreground">{t('common.trendSignal.loadingSignals')}</p>
            </div>
          )}

          {error && (
            <div className="text-center py-8">
              <p className="text-red-500">{t('common.trendSignal.failedToLoad')}</p>
            </div>
          )}

          {!loading && !error && (
            <div>
              {sortedSignals.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  No historical signals found for the selected tickers
                </div>
              )}

              {/* Multiple tickers: Group by date */}
              {internalTickers.length > 1 && Object.entries(signalsByDate)
                .sort((a, b) => b[0].localeCompare(a[0])) // Sort dates descending
                .map(([date, dateSignals]) => {
                  const isCollapsed = !openDates.has(date)
                  return (
                    <div key={date}>
                      {/* Date Header */}
                      <div className="bg-primary/20 px-4 py-2 font-semibold text-primary text-xs flex items-center border-b border-primary/30">
                        <button
                          onClick={() => toggleDate(date)}
                          className="flex items-center gap-1 hover:bg-primary/30 rounded px-1 transition-colors w-full"
                        >
                          {isCollapsed ? (
                            <ChevronRight className="h-3 w-3 flex-shrink-0" />
                          ) : (
                            <ChevronDown className="h-3 w-3 flex-shrink-0" />
                          )}
                          <span className="truncate flex-1 text-left font-semibold text-sm">
                            {formatToVietnamDate(parseUTCISOString(date))}
                          </span>
                          <div className="flex items-center gap-3 font-mono text-xs">
                            {(() => {
                              const buyCount = dateSignals.filter(s => s.signal === 'BUY').length
                              const sellCount = dateSignals.filter(s => s.signal === 'SELL').length
                              return (
                                <>
                                  {buyCount > 0 && (
                                    <div className="flex items-center gap-1">
                                      <ChevronUp className="h-3 w-3 text-green-600" />
                                      <span className="w-2 text-right">{buyCount}</span>
                                    </div>
                                  )}
                                  {sellCount > 0 && (
                                    <div className="flex items-center gap-1">
                                      <ChevronDown className="h-3 w-3 text-red-600" />
                                      <span className="w-2 text-right">{sellCount}</span>
                                    </div>
                                  )}
                                </>
                              )
                            })()}
                          </div>
                        </button>
                      </div>

                      {/* Signal rows for this date */}
                      {!isCollapsed && dateSignals.map((signal) => (
                        <SignalCard
                          key={`${signal.ticker}-${signal.date}`}
                          signal={signal}
                          showDate={false} // Date is shown in header
                          onClick={shouldOpenFullscreen ? () => handleSignalClick(signal) : undefined}
                        />
                      ))}
                    </div>
                  )
                })}

              {/* Single ticker: Show all signals chronologically */}
              {internalTickers.length === 1 && sortedSignals.map((signal) => (
                <SignalCard
                  key={`${signal.ticker}-${signal.date}`}
                  signal={signal}
                  showDate={true} // Show date on each card
                  onClick={shouldOpenFullscreen ? () => handleSignalClick(signal) : undefined}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Chart Dialog */}
      <ChartFullscreenDialog
        ticker={dialogTicker}
        onClose={handleCloseDialog}
        tickerList={allTickersForNavigation}
        currentIndex={currentTickerIndex}
        getTitle={getChartTitle}
      />
    </>
  )
}

// Signal Card Component (extracted for reuse)
interface SignalCardProps {
  signal: HistoricalSignalData
  showDate: boolean
  onClick?: () => void  // Optional onClick
}

function SignalCard({ signal, showDate, onClick }: SignalCardProps) {
  const { t } = useTranslation()

  return (
    <div
      onClick={onClick}
      className={`flex items-center justify-between p-4 border-b border-border ${
        onClick ? 'hover:bg-muted/50 cursor-pointer' : ''
      }`}
    >
      {/* Left side: Ticker and signal */}
      <div className="flex items-center gap-2 flex-shrink-0 w-24">
        <span className={`font-mono font-bold ${signal.ticker.length >= 4 ? 'text-xs' : 'text-sm'}`}>{signal.ticker}</span>
        {signal.signal && (
          <span className={`px-1.5 py-0.5 text-xs font-semibold rounded flex-shrink-0 ${
            signal.signal === 'BUY'
              ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
              : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
          }`}>
            {signal.signal === 'BUY' ? t('common.trendSignal.buy') : t('common.trendSignal.sell')}
          </span>
        )}
        {!signal.signal && (
          <span className="px-1.5 py-0.5 text-xs font-semibold rounded bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400 flex-shrink-0">
            {t('common.trendSignal.none')}
          </span>
        )}
      </div>

      {/* Right side: Details */}
      <div className="flex-1 pl-4">
        {/* Line 1: Date (only shown in single ticker mode) */}
        {showDate && (
          <div className="text-xs text-muted-foreground mb-1">
            {formatToVietnamDate(parseUTCISOString(signal.date))}
          </div>
        )}

        {/* Line 2: Current record (last price and change) */}
        <div className="flex items-baseline gap-3 text-sm">
          <span className="font-mono font-medium">
            {signal.currentPrice.toLocaleString()}
          </span>
          {signal.closeChange !== undefined && signal.closeChange !== null && (
            <span className={`text-xs font-medium ${
              signal.closeChange >= 0 ? 'text-green-600' : 'text-red-600'
            }`}>
              {signal.closeChange >= 0 ? '+' : ''}{signal.closeChange.toFixed(1)}%
            </span>
          )}
        </div>

        {/* Line 3: High and Low reference levels */}
        <div className="flex items-center gap-4 text-xs text-muted-foreground mt-1">
          {signal.highest20 && (
            <span className="text-green-700 dark:text-green-400">
              {t('common.trendSignal.highest', { period: 20 })}: {signal.highest20.toLocaleString()}
              {signal.currentPrice > signal.highest20 && <span className="ml-1">▲</span>}
            </span>
          )}
          {signal.lowest10 && (
            <span className="text-red-700 dark:text-red-400">
              {t('common.trendSignal.lowest', { period: 10 })}: {signal.lowest10.toLocaleString()}
              {signal.currentPrice < signal.lowest10 && <span className="ml-1">▼</span>}
            </span>
          )}
        </div>

        {/* Line 4: Signal reason */}
        {signal.signal && signal.strength !== undefined && signal.strength !== null && (
          <div className={`text-xs mt-1 ${
            signal.signal === 'BUY' ? 'text-green-600' : 'text-red-600'
          }`}>
            {t(`common.trendSignal.${signal.signal === 'BUY' ? 'above' : 'below'}`, {
              price: signal.signal === 'BUY'
                ? signal.previousHigh?.toLocaleString()
                : signal.previousLow?.toLocaleString()
            })} {Math.abs(signal.strength).toFixed(1)}%
          </div>
        )}
      </div>
    </div>
  )
}