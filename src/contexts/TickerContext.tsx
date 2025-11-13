import React from 'react'
import { type StockData } from '@/lib/api-client'
import { useChartSettings } from './ChartSettingsContext'
import { useRefresh } from './RefreshContext'
import { useAPI } from './APIContext'
import { API_RETRY_ATTEMPTS, API_CALL_DELAY_MS, API_CACHE_WINDOW_MS, API_RECENT_CALLS_LIMIT } from '@/lib/constants'

interface TickerContextValue {
  selectedTicker: string
  setSelectedTicker: (ticker: string) => void
  chartData: StockData[]
  loading: boolean
  error: string | null
}

interface TickerProviderProps {
  children: React.ReactNode | ((context: TickerContextValue) => React.ReactNode)
  initialTicker?: string
  ticker?: string
  limit?: number
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
  enableFetching = true
}: TickerProviderProps) {
    // Get global settings for API calls (only if fetching is enabled)
  const settings = enableFetching ? useChartSettings() : null
  const { lastRefresh } = useRefresh()
  const { getTickers } = useAPI()
  const [selectedTicker, setSelectedTicker] = React.useState(ticker ?? initialTicker)
  const [chartData, setChartData] = React.useState<StockData[]>([])
  const [loading, setLoading] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)


  // Initialize with ticker on mount only (prioritize ticker prop over initialTicker)
  React.useEffect(() => {
        if (ticker ?? initialTicker) {
      setSelectedTicker(ticker ?? initialTicker)
    }
  }, []) // Only run once on mount, no dependencies

  // Data fetching effect (only if fetching is enabled)
  React.useEffect(() => {
    
    if (!enableFetching || !settings) {
            return
    }

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

          const response = await getTickers({
            symbol: selectedTicker,
            interval: settings.interval,
            start_date: settings.startDate,
            end_date: settings.endDate,
            limit: limit ?? settings.limit,
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
  }, [selectedTicker, enableFetching, settings?.interval, settings?.startDate, settings?.endDate, settings?.limit, lastRefresh])

  const contextValue = {
    selectedTicker,
    setSelectedTicker,
    chartData,
    loading,
    error,
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