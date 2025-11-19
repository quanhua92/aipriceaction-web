import React from 'react'
import { type StockData } from '@/lib/api-client'
import { useChartSettings } from './ChartSettingsContext'
import { useRefresh } from './RefreshContext'
import { useAPI } from './APIContext'
import { API_RETRY_ATTEMPTS, API_CALL_DELAY_MS, API_CACHE_WINDOW_MS, API_RECENT_CALLS_LIMIT, DEFAULT_CHART_LIMIT } from '@/lib/constants'
import { isCryptoTicker } from '@/lib/ticker-utils'

interface TickerContextValue {
  selectedTicker: string
  setSelectedTicker: (ticker: string) => void
  chartData: StockData[]
  loading: boolean
  error: string | null
  loadMoreHistoricalData: () => Promise<void>
  loadingMore: boolean
  localEndDate: string | null
  setLocalEndDate: (date: string | null) => void
}

interface TickerProviderProps {
  children: React.ReactNode | ((context: TickerContextValue) => React.ReactNode)
  initialTicker?: string
  ticker?: string
  limit?: number
  endDate?: string | null
  enableFetching?: boolean
}

const TickerContext = React.createContext<TickerContextValue | undefined>(
  undefined
)

// Track recent API calls to skip delay for cached requests
// Map key: "ticker:interval", value: timestamp
const recentApiCalls = new Map<string, number>()

// Helper: Generate cache key from ticker and interval
function getCacheKey(ticker: string, interval: string): string {
  return `${ticker}:${interval}`
}

// Helper: Check if request was made recently (likely cached)
function isRecentRequest(ticker: string, interval: string): boolean {
  const key = getCacheKey(ticker, interval)
  const lastCallTime = recentApiCalls.get(key)

  if (!lastCallTime) return false

  const now = Date.now()
  const timeSinceLastCall = now - lastCallTime

  return timeSinceLastCall < API_CACHE_WINDOW_MS
}

// Helper: Record an API call
function recordApiCall(ticker: string, interval: string): void {
  const key = getCacheKey(ticker, interval)
  recentApiCalls.set(key, Date.now())

  // Limit map size to prevent memory leak
  if (recentApiCalls.size > API_RECENT_CALLS_LIMIT) {
    // Remove oldest entry
    const firstKey = recentApiCalls.keys().next().value
    if (firstKey) {
      recentApiCalls.delete(firstKey)
    }
  }
}

// Helper: Generate random delay between min and max milliseconds
function getRandomDelay(): number {
  const { min, max } = API_CALL_DELAY_MS
  return Math.floor(Math.random() * (max - min + 1)) + min
}

// Helper: Sleep for specified milliseconds
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

export function TickerProvider({
  children,
  initialTicker = 'VNINDEX',
  ticker,
  limit,
  endDate,
  enableFetching = true
}: TickerProviderProps) {
    // Get global settings for API calls (only if fetching is enabled)
  const settings = enableFetching ? useChartSettings() : null
  const { lastRefresh } = useRefresh()
  const { getTickers, tickers, cryptoTickers } = useAPI()
  const [selectedTicker, setSelectedTicker] = React.useState(ticker ?? initialTicker)
  const [chartData, setChartData] = React.useState<StockData[]>([])
  const [loading, setLoading] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const [loadingMore, setLoadingMore] = React.useState(false)

  // Local limit state (independent of global settings)
  const [localLimit, setLocalLimit] = React.useState<number | null>(null)

  // Local endDate state (independent of global settings)
  const [localEndDate, setLocalEndDate] = React.useState<string | null>(null)

  // Refs for stable access
  const loadingMoreRef = React.useRef(false)
  const tickersRef = React.useRef(tickers)
  const cryptoTickersRef = React.useRef(cryptoTickers)

  // Update refs when tickers change (but don't trigger re-fetch)
  React.useEffect(() => {
    tickersRef.current = tickers
    cryptoTickersRef.current = cryptoTickers
  }, [tickers, cryptoTickers])

  // Load more historical data (for Load More button)
  const loadMoreHistoricalData = React.useCallback(async () => {
    if (!settings || loadingMoreRef.current) {
      return
    }

    loadingMoreRef.current = true

    // Increase local limit - this will trigger main effect to refetch
    const currentLimit = localLimit ?? (limit ?? settings.limit)
    const newLimit = currentLimit + DEFAULT_CHART_LIMIT
    setLocalLimit(newLimit)

    // Reset flag after state update
    await new Promise(resolve => setTimeout(resolve, 100))
    loadingMoreRef.current = false
  }, [settings, localLimit, limit])

  // Sync loadingMore with main loading state
  React.useEffect(() => {
    setLoadingMore(loading)
  }, [loading])

  // Reset local limit and endDate when ticker or key settings change
  React.useEffect(() => {
    setLocalLimit(null)
    // Only reset localEndDate if no endDate prop is provided
    if (endDate === undefined || endDate === null) {
      setLocalEndDate(null)
    }
  }, [selectedTicker, settings?.interval, endDate])

  // Sync ticker prop changes (only if ticker prop is controlled externally)
  React.useEffect(() => {
    if (ticker !== undefined && ticker !== selectedTicker) {
      setSelectedTicker(ticker)
    }
  }, [ticker, selectedTicker])

  // Sync endDate prop with localEndDate state
  React.useEffect(() => {
    if (endDate !== undefined && endDate !== localEndDate) {
      setLocalEndDate(endDate)
    }
  }, [endDate])

  // Track previous dependency values for debugging
  const prevDepsRef = React.useRef<{
    selectedTicker?: string
    enableFetching?: boolean
    interval?: string
    startDate?: string | undefined
    endDate?: string | undefined
    limit?: number
    lastRefresh?: number
    localLimit?: number | null
    localEndDate?: string | null
    tickers?: any[]
    cryptoTickers?: any[]
  }>({})

  // Data fetching effect (only if fetching is enabled)
  React.useEffect(() => {

    if (!enableFetching || !settings) {
            return
    }

    // Track which dependencies changed
    const currentDeps = {
      selectedTicker,
      enableFetching,
      interval: settings?.interval,
      startDate: settings?.startDate,
      endDate: settings?.endDate,
      limit: settings?.limit,
      lastRefresh,
      localLimit,
      localEndDate,
      tickersLen: tickers?.length,
      cryptoTickersLen: cryptoTickers?.length,
    }

    const prevDeps = prevDepsRef.current
    const changedDeps: string[] = []

    for (const [key, value] of Object.entries(currentDeps)) {
      if (prevDeps[key as keyof typeof prevDeps] !== value) {
        changedDeps.push(`${key}:${prevDeps[key as keyof typeof prevDeps]}→${value}`)
      }
    }

    prevDepsRef.current = currentDeps

    const fetchChartData = async () => {
            setLoading(true)
      setError(null)

      let lastError: Error | null = null

      // Retry loop with exponential backoff
      for (let attempt = 1; attempt <= API_RETRY_ATTEMPTS; attempt++) {
        try {
          // Check if this is a recent request (likely cached)
          const isRecent = isRecentRequest(selectedTicker, settings.interval)

          // Only add random delay for new requests, skip for cached ones
          if (!isRecent) {
            const delay = getRandomDelay()
            await sleep(delay)
          }

          // Determine mode: crypto or stock (stock takes priority if symbol in both lists)
          const mode = isCryptoTicker(selectedTicker, tickersRef.current, cryptoTickersRef.current) ? 'crypto' : 'vn'

          // Build source string with dependency changes
          const source = changedDeps.length > 0
            ? `TickerContext [${changedDeps.join(', ')}]`
            : 'TickerContext'

          const response = await getTickers(source, {
            symbol: selectedTicker,
            interval: settings.interval,
            start_date: settings.startDate,
            end_date: localEndDate ?? settings.endDate,
            limit: localLimit ?? (limit ?? settings.limit),
            mode,
          })
          const data = response[selectedTicker] || []

          setChartData(data)

          // Record this API call for future cache detection
          recordApiCall(selectedTicker, settings.interval)

          // Success - clear error and exit retry loop
          setLoading(false)
          return
        } catch (err) {
          lastError = err instanceof Error ? err : new Error('Failed to fetch chart data')

          // If this is not the last attempt, wait before retrying (exponential backoff)
          if (attempt < API_RETRY_ATTEMPTS) {
            const backoffDelay = Math.pow(2, attempt - 1) * 1000 // 1s, 2s, 4s
            console.warn(`API call failed (attempt ${attempt}/${API_RETRY_ATTEMPTS}), retrying in ${backoffDelay}ms...`, lastError)
            await sleep(backoffDelay)
          }
        }
      }

      // All retries failed
      setError(lastError?.message || 'Failed to fetch chart data')
      setChartData([])
      setLoading(false)
    }

    fetchChartData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedTicker, enableFetching, settings?.interval, settings?.startDate, settings?.endDate, settings?.limit, lastRefresh, localLimit, localEndDate, getTickers])

  const contextValue = {
    selectedTicker,
    setSelectedTicker,
    chartData,
    loading,
    error,
    loadMoreHistoricalData,
    loadingMore,
    localEndDate,
    setLocalEndDate,
  }

  
  return (
    <TickerContext.Provider value={contextValue}>
      {typeof children === 'function' ? children(contextValue) : children}
    </TickerContext.Provider>
  )
}

export function useTicker() {
  const context = React.useContext(TickerContext)
  if (context === undefined) {
    throw new Error('useTicker must be used within a TickerProvider')
  }
  return context
}