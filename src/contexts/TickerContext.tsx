import React from 'react'
import { type StockData, Interval } from '@/lib/api-client'
import { useChartSettings } from './ChartSettingsContext'
import { useRefresh } from './RefreshContext'
import { useAPI } from './APIContext'
import { API_RETRY_ATTEMPTS, API_CALL_DELAY_MS, API_CACHE_WINDOW_MS, API_RECENT_CALLS_LIMIT, LOAD_MORE_LIMIT } from '@/lib/constants'
import { getTickerMode } from '@/lib/ticker-utils'

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

  // NEW: Cache support
  cachedData?: StockData[]
  initialCacheMetadata?: {
    symbol: string
    interval: Interval
    startDate: string
    endDate: string
    mode: 'vn' | 'crypto' | 'yahoo'
  }
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

// Helper: Check if cache is valid for current request
function isCacheValid(
  cachedData: StockData[] | null,
  cacheMetadata: TickerProviderProps['initialCacheMetadata'] | null,
  ticker: string,
  interval: string,
  endDate: string | null | undefined,
  tickers: any[],
  globalTickers: any[],
  cryptoTickers: any[]
): boolean {
  if (!cachedData || !cacheMetadata || cachedData.length === 0) {
    return false
  }

  // Determine mode from ticker
  const mode = getTickerMode(ticker, tickers, globalTickers, cryptoTickers)

  return (
    cacheMetadata.symbol === ticker &&
    cacheMetadata.interval === interval &&
    cacheMetadata.mode === mode &&
    (!endDate || cacheMetadata.endDate === endDate)
  )
}

export function TickerProvider({
  children,
  initialTicker = 'VNINDEX',
  ticker,
  limit,
  endDate,
  enableFetching = true,
  cachedData,
  initialCacheMetadata
}: TickerProviderProps) {
    // Get global settings for API calls
  const settings = useChartSettings()
  const { setLimit } = settings
  const { lastRefresh } = useRefresh()
  const { getTickers, tickers, globalTickers, cryptoTickers, ema } = useAPI()
  const [selectedTicker, setSelectedTicker] = React.useState(ticker ?? initialTicker)

  // Cache - read-only from props
  const cacheData = React.useMemo(() => cachedData || null, [cachedData])
  const cacheMetadata = React.useMemo(() => initialCacheMetadata || null, [initialCacheMetadata])

  // Chart data state - initialize from cache if available
  const [chartData, setChartData] = React.useState<StockData[]>(() => cachedData || [])
  const [loading, setLoading] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const [loadingMore, setLoadingMore] = React.useState(false)

  // Local endDate state (independent of global settings)
  const [localEndDate, setLocalEndDate] = React.useState<string | null>(null)

  // Initialize chart data from cache if cache is valid
  React.useEffect(() => {
    if (cacheData && cacheMetadata &&
        cacheMetadata.symbol === (ticker ?? initialTicker) &&
        cacheMetadata.interval === settings.interval) {
      setChartData(cacheData)
      setLoading(false)
      setError(null)
    }
  }, [cacheData, cacheMetadata, ticker, initialTicker, settings.interval])


  // Refs for stable access (avoid re-fetching when these change reference)
  const loadingMoreRef = React.useRef(false)
  const tickersRef = React.useRef(tickers)
  tickersRef.current = tickers
  const globalTickersRef = React.useRef(globalTickers)
  globalTickersRef.current = globalTickers
  const cryptoTickersRef = React.useRef(cryptoTickers)
  cryptoTickersRef.current = cryptoTickers
  const getTickersRef = React.useRef(getTickers)
  getTickersRef.current = getTickers

  // Load more historical data (for Load More button)
  const loadMoreHistoricalData = React.useCallback(async () => {
    if (!enableFetching || loadingMoreRef.current) {
      return
    }

    loadingMoreRef.current = true

    // Increase global limit - this will affect all charts
    const currentLimit = limit ?? settings.limit
    const newLimit = currentLimit + LOAD_MORE_LIMIT
    setLimit(newLimit)

    // Reset flag after state update
    await new Promise(resolve => setTimeout(resolve, 100))
    loadingMoreRef.current = false
  }, [enableFetching, settings, limit, setLimit])

  // Sync loadingMore with main loading state
  React.useEffect(() => {
    setLoadingMore(loading)
  }, [loading])

  // Reset local endDate when ticker or key settings change
  React.useEffect(() => {
    // Only reset localEndDate if no endDate prop is provided
    if (endDate === undefined || endDate === null) {
      setLocalEndDate(null)
    }
  }, [selectedTicker, settings.interval, endDate])

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
    localEndDate?: string | null
    tickers?: any[]
    globalTickers?: any[]
    cryptoTickers?: any[]
  }>({})

  // Data fetching effect (only if fetching is enabled)
  React.useEffect(() => {

    if (!enableFetching) {
            return
    }

    // Track which dependencies changed
    const currentDeps = {
      selectedTicker,
      enableFetching,
      interval: settings.interval,
      startDate: settings.startDate,
      endDate: settings.endDate,
      limit: settings.limit,
      lastRefresh,
      localEndDate,
      tickersLen: tickers?.length,
      globalTickersLen: globalTickers?.length,
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

    // 1. Perfect cache match (symbol, interval, date, mode)
    if (isCacheValid(cacheData, cacheMetadata, selectedTicker, settings.interval, localEndDate ?? settings.endDate, tickersRef.current, globalTickersRef.current, cryptoTickersRef.current)) {
      setChartData(cacheData)
      setLoading(false)
      setError(null)
      return
    }

    // 2. Same symbol but different interval - fetch new interval using cache's date range
    if (cacheData && cacheMetadata &&
        cacheMetadata.symbol === selectedTicker &&
        cacheMetadata.interval !== settings.interval) {

      const targetDate = cacheData[cacheData.length - 1]?.time?.split('T')[0] || settings.endDate

      const fetchIntervalData = async () => {
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

            // Determine mode: vn > yahoo > crypto (stock takes priority if symbol in both lists)
            const mode = getTickerMode(selectedTicker, tickersRef.current, globalTickersRef.current, cryptoTickersRef.current)

            // Build source string for interval change
            const source = `TickerContext.intervalChange [${cacheMetadata.interval}→${settings.interval}]`

            const response = await getTickersRef.current(source, {
              symbol: selectedTicker,
              interval: settings.interval,  // New interval from global settings
              end_date: targetDate,         // Date from last cached item
              limit: limit ?? settings.limit,
              mode,
              ...(ema ? { ema: true } : {}),
            })
            const data = response[selectedTicker] || []

            setChartData(data)

            // Record this API call for future cache detection
            recordApiCall(selectedTicker, settings.interval)

            // Success - clear error and exit retry loop
            setLoading(false)
            return
          } catch (err) {
            lastError = err instanceof Error ? err : new Error('Failed to fetch chart data for interval change')

            // If this is not the last attempt, wait before retrying (exponential backoff)
            if (attempt < API_RETRY_ATTEMPTS) {
              const backoffDelay = Math.pow(2, attempt - 1) * 1000 // 1s, 2s, 4s
              console.warn(`API call failed (attempt ${attempt}/${API_RETRY_ATTEMPTS}), retrying in ${backoffDelay}ms...`, lastError)
              await sleep(backoffDelay)
            }
          }
        }

        // All retries failed
        setError(lastError?.message || 'Failed to fetch chart data for interval change')
        setChartData([])
        setLoading(false)
      }

      fetchIntervalData()
      return
    }

    // Cache miss or invalid cache - fetch normally

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

          // Determine mode: vn > yahoo > crypto (stock takes priority if symbol in both lists)
          const mode = getTickerMode(selectedTicker, tickersRef.current, globalTickersRef.current, cryptoTickersRef.current)

          // Build source string with dependency changes
          const source = changedDeps.length > 0
            ? `TickerContext [${changedDeps.join(', ')}]`
            : 'TickerContext'

          const response = await getTickersRef.current(source, {
            symbol: selectedTicker,
            interval: settings.interval,
            start_date: settings.startDate,
            end_date: localEndDate ?? settings.endDate,
            limit: limit ?? settings.limit,
            mode,
            ...(ema ? { ema: true } : {}),
          })
          const data = response[selectedTicker] || []

          setChartData(data)

          // Record this API call for future cache detection
          recordApiCall(selectedTicker, settings.interval)

          // Success - clear error and exit retry loop (even if data is empty)
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
  }, [
    selectedTicker,
    enableFetching,
    settings.interval,
    settings.startDate,
    settings.endDate,
    settings.limit,
    lastRefresh,
    localEndDate,
    ema,
    tickers.length,
    globalTickers.length,
    cryptoTickers.length,
    // NOTE: Don't include getTickers, cacheData/cacheMetadata as dependencies to avoid infinite loops
    // getTickersRef, tickersRef, globalTickersRef, cryptoTickersRef are refs and don't need to be listed
  ])

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
