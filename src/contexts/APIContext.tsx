import * as React from 'react'
import { getTickerGroups, getCryptoTickerGroups, getYahooTickerGroups, getTickersWithLogging, getCryptoTickersWithLogging, getYahooTickersWithLogging, getTickerNamesWithLogging, getHealth as getHealthApi, type TickerGroups, type TickerNames, type StockData, type TickersQueryParams, type HealthResponse } from '@/lib/api-client'
import { PRIORITY_GROUPS, API_CACHE_WINDOW_MS } from '@/lib/constants'
import { useLogs } from './LogsContext'
import { useRefresh } from './RefreshContext'
import { useChartSettings } from './ChartSettingsContext'

// Request deduplication cache
interface CacheEntry {
  promise: Promise<Record<string, StockData[]>>
  timestamp: number
  result?: Record<string, StockData[]>  // Cached result for instant hits
}

const requestCache = new Map<string, CacheEntry>()

// Generate deterministic cache key from request parameters
function generateCacheKey(params?: TickersQueryParams): string {
  const { symbol, interval, start_date, end_date, limit, mode, legacy, ma } = params || {}

  return [
    // Normalize symbols: sort arrays, handle undefined as "ALL"
    Array.isArray(symbol) ? symbol.sort().join(',') : symbol || 'ALL',
    interval || '1D',
    start_date || '',
    end_date || '',
    limit?.toString() || '',
    mode || 'vn',
    legacy ? '1' : '0',
    ma !== undefined ? `ma=${ma}` : ''
  ].filter(Boolean).join('|')
}

const sortTickerGroups = (groups: TickerGroups): TickerGroups => {
  const sortedEntries = Object.entries(groups)
    .sort(([groupA], [groupB]) => {
      const priorityA = PRIORITY_GROUPS.indexOf(groupA as typeof PRIORITY_GROUPS[number])
      const priorityB = PRIORITY_GROUPS.indexOf(groupB as typeof PRIORITY_GROUPS[number])

      if (priorityA !== -1 && priorityB !== -1) {
        return priorityA - priorityB
      }
      if (priorityA !== -1) return -1
      if (priorityB !== -1) return 1

      return groupA.localeCompare(groupB)
    })

  return Object.fromEntries(sortedEntries)
}

interface Ticker {
  symbol: string
  sector: string
}

interface APIContextValue {
  // VN stocks
  tickerGroups: TickerGroups | null
  tickers: Ticker[]
  allTickersLastData: Record<string, StockData[]>
  loading: boolean  // For backward compatibility, mirrors stockLoading
  error: string | null  // For backward compatibility, mirrors stockError
  stockLoading: boolean
  stockError: string | null

  // Crypto
  cryptoTickerGroups: TickerGroups | null
  cryptoTickers: Ticker[]
  allCryptoTickersLastData: Record<string, StockData[]>
  cryptoLoading: boolean
  cryptoError: string | null

  // Global (Yahoo)
  globalTickerGroups: TickerGroups | null
  globalTickers: Ticker[]
  allGlobalTickersLastData: Record<string, StockData[]>
  globalLoading: boolean
  globalError: string | null

  // Ticker names
  tickerNames: TickerNames | null
  cryptoTickerNames: TickerNames | null
  globalTickerNames: TickerNames | null

  // Methods
  refetch: () => Promise<void>
  refetchStock: () => Promise<void>
  refetchCrypto: () => Promise<void>
  refetchGlobal: () => Promise<void>
  getTickers: (source: string, params?: TickersQueryParams) => Promise<Record<string, StockData[]>>
  getHealth: (source: string) => Promise<HealthResponse>
}

const APIContext = React.createContext<APIContextValue | undefined>(undefined)

export function APIProvider({ children }: { children: React.ReactNode }) {
  const { info, error: logError } = useLogs()
  const { lastRefresh } = useRefresh()
  const { endDate: globalEndDate } = useChartSettings()

  // VN stocks state
  const [tickerGroups, setTickerGroups] = React.useState<TickerGroups | null>(null)
  const [tickers, setTickers] = React.useState<Ticker[]>([])
  const [allTickersLastData, setAllTickersLastData] = React.useState<Record<string, StockData[]>>({})
  const [stockLoading, setStockLoading] = React.useState(true)
  const [stockError, setStockError] = React.useState<string | null>(null)

  // Crypto state
  const [cryptoTickerGroups, setCryptoTickerGroups] = React.useState<TickerGroups | null>(null)
  const [cryptoTickers, setCryptoTickers] = React.useState<Ticker[]>([])
  const [allCryptoTickersLastData, setAllCryptoTickersLastData] = React.useState<Record<string, StockData[]>>({})
  const [cryptoLoading, setCryptoLoading] = React.useState(true)
  const [cryptoError, setCryptoError] = React.useState<string | null>(null)

  // Global (Yahoo) state
  const [globalTickerGroups, setGlobalTickerGroups] = React.useState<TickerGroups | null>(null)
  const [globalTickers, setGlobalTickers] = React.useState<Ticker[]>([])
  const [allGlobalTickersLastData, setAllGlobalTickersLastData] = React.useState<Record<string, StockData[]>>({})
  const [globalLoading, setGlobalLoading] = React.useState(true)
  const [globalError, setGlobalError] = React.useState<string | null>(null)

  // Ticker names state
  const [tickerNames, setTickerNames] = React.useState<TickerNames | null>(null)
  const [cryptoTickerNames, setCryptoTickerNames] = React.useState<TickerNames | null>(null)
  const [globalTickerNames, setGlobalTickerNames] = React.useState<TickerNames | null>(null)

  const fetchStockData = React.useCallback(async () => {
    setStockLoading(true)
    setStockError(null)
    const startTime = Date.now()

    try {
      // Fetch both ticker groups and all tickers data in parallel
      const [groups, tickersData] = await Promise.all([
        getTickerGroups(),
        getTickersWithLogging('APIContext.init.stock', { limit: 1, end_date: globalEndDate }, { info, warn: info, error: logError })
      ])

      const duration = Date.now() - startTime
      info(`[API] Stock data fetch completed in ${duration}ms`)

      const sortedGroups = sortTickerGroups(groups)
      setTickerGroups(sortedGroups)
      setAllTickersLastData(tickersData)

      // Flatten groups into ticker list with sector info
      const tickerList: Ticker[] = []
      for (const [sector, symbols] of Object.entries(sortedGroups)) {
        for (const symbol of symbols) {
          tickerList.push({ symbol, sector })
        }
      }

      // Remove duplicates (a ticker can be in multiple groups)
      const uniqueTickers = Array.from(
        new Map(tickerList.map(t => [t.symbol, t])).values()
      )

      // Sort alphabetically
      uniqueTickers.sort((a, b) => a.symbol.localeCompare(b.symbol))
      setTickers(uniqueTickers)
    } catch (err) {
      console.error('Failed to fetch stock data:', err)
      const errorMessage = err instanceof Error ? err.message : 'Failed to load stock market data'
      logError(`[API] Stock data fetch failed: ${errorMessage}`)
      setStockError('Failed to load stock market data')
    } finally {
      setStockLoading(false)
    }
  }, [info, logError, globalEndDate])

  const fetchCryptoData = React.useCallback(async () => {
    setCryptoLoading(true)
    setCryptoError(null)
    const startTime = Date.now()

    try {
      // Fetch both crypto ticker groups and all crypto tickers data in parallel
      const [groups, tickersData] = await Promise.all([
        getCryptoTickerGroups(),
        getCryptoTickersWithLogging('APIContext.init.crypto', { limit: 1, end_date: globalEndDate }, { info, warn: info, error: logError })
      ])

      const duration = Date.now() - startTime
      info(`[API] Crypto data fetch completed in ${duration}ms`)

      const sortedGroups = sortTickerGroups(groups)
      setCryptoTickerGroups(sortedGroups)
      setAllCryptoTickersLastData(tickersData)

      // Flatten groups into ticker list with sector/category info
      const tickerList: Ticker[] = []
      for (const [sector, symbols] of Object.entries(sortedGroups)) {
        for (const symbol of symbols) {
          tickerList.push({ symbol, sector })
        }
      }

      // Remove duplicates (a ticker can be in multiple groups)
      const uniqueTickers = Array.from(
        new Map(tickerList.map(t => [t.symbol, t])).values()
      )

      // Sort alphabetically
      uniqueTickers.sort((a, b) => a.symbol.localeCompare(b.symbol))
      setCryptoTickers(uniqueTickers)
    } catch (err) {
      console.error('Failed to fetch crypto data:', err)
      const errorMessage = err instanceof Error ? err.message : 'Failed to load crypto market data'
      logError(`[API] Crypto data fetch failed: ${errorMessage}`)
      setCryptoError('Failed to load crypto market data')
    } finally {
      setCryptoLoading(false)
    }
  }, [info, logError, globalEndDate])

  const fetchGlobalData = React.useCallback(async () => {
    setGlobalLoading(true)
    setGlobalError(null)
    const startTime = Date.now()

    try {
      // Fetch both global ticker groups and all global tickers data in parallel
      const [groups, tickersData] = await Promise.all([
        getYahooTickerGroups(),
        getYahooTickersWithLogging('APIContext.init.global', { limit: 1, end_date: globalEndDate }, { info, warn: info, error: logError })
      ])

      const duration = Date.now() - startTime
      info(`[API] Global data fetch completed in ${duration}ms`)

      setGlobalTickerGroups(groups)
      setAllGlobalTickersLastData(tickersData)

      // Flatten groups into ticker list with sector/category info
      const tickerList: Ticker[] = []
      for (const [sector, symbols] of Object.entries(groups)) {
        for (const symbol of symbols) {
          tickerList.push({ symbol, sector })
        }
      }

      // Remove duplicates (a ticker can be in multiple groups)
      const uniqueTickers = Array.from(
        new Map(tickerList.map(t => [t.symbol, t])).values()
      )

      // Sort alphabetically
      uniqueTickers.sort((a, b) => a.symbol.localeCompare(b.symbol))
      setGlobalTickers(uniqueTickers)
    } catch (err) {
      console.error('Failed to fetch global data:', err)
      const errorMessage = err instanceof Error ? err.message : 'Failed to load global market data'
      logError(`[API] Global data fetch failed: ${errorMessage}`)
      setGlobalError('Failed to load global market data')
    } finally {
      setGlobalLoading(false)
    }
  }, [info, logError, globalEndDate])

  const fetchTickerNames = React.useCallback(async () => {
    try {
      const [vnNames, cryptoNames, globalNames] = await Promise.all([
        getTickerNamesWithLogging('APIContext.names.vn', 'vn', { info, warn: info, error: logError }),
        getTickerNamesWithLogging('APIContext.names.crypto', 'crypto', { info, warn: info, error: logError }),
        getTickerNamesWithLogging('APIContext.names.global', 'yahoo', { info, warn: info, error: logError }),
      ])
      setTickerNames(vnNames)
      setCryptoTickerNames(cryptoNames)
      setGlobalTickerNames(globalNames)
    } catch (err) {
      // Non-critical: just log, don't set error state
      const errorMessage = err instanceof Error ? err.message : String(err)
      info(`[API] Ticker names fetch failed (non-critical): ${errorMessage}`)
    }
  }, [info, logError])

  // Fetch all data in parallel on mount and when refresh/date changes
  React.useEffect(() => {
    Promise.all([fetchStockData(), fetchCryptoData(), fetchGlobalData(), fetchTickerNames()])
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lastRefresh, globalEndDate])

  // Automatic cache cleanup to prevent memory leaks
  React.useEffect(() => {
    const cleanup = () => {
      const now = Date.now()
      const staleKeys: string[] = []

      for (const [key, entry] of requestCache.entries()) {
        const age = now - entry.timestamp
        if (age > API_CACHE_WINDOW_MS) {
          staleKeys.push(key)
        }
      }

      staleKeys.forEach(key => requestCache.delete(key))
      if (staleKeys.length > 0) {
        info(`[API] Cache cleanup: removed ${staleKeys.length} stale entries`)
      }
    }

    const interval = setInterval(cleanup, 5000) // Clean every 5s
    return () => clearInterval(interval)
  }, [info])

  // Provide logged API methods with request deduplication
  const getTickers = React.useCallback(
    async (source: string, params?: TickersQueryParams) => {
      const cacheKey = generateCacheKey(params)
      const now = Date.now()

      // Check for existing in-flight request or fresh result
      if (requestCache.has(cacheKey)) {
        const entry = requestCache.get(cacheKey)!
        const age = now - entry.timestamp

        // If fresh (within API_CACHE_WINDOW_MS), reuse
        if (age < API_CACHE_WINDOW_MS) {
          if (entry.result) {
            // Return cached result immediately
            info(`[API] ${source} CACHE_HIT: ${cacheKey} (${age}ms old)`)
            return entry.result
          } else {
            // Wait for in-flight request
            info(`[API] ${source} REUSE_PROMISE: ${cacheKey}`)
            return entry.promise
          }
        }

        // Remove stale entry
        requestCache.delete(cacheKey)
      }

      // Create new request and store in cache
      const promise = getTickersWithLogging(source, params ?? {}, { info, warn: info, error: logError })
        .then(result => result)
      const cacheEntry: CacheEntry = { promise, timestamp: now }

      // Cache the promise and store result when complete
      requestCache.set(cacheKey, cacheEntry)

      // Store result for future cache hits
      promise.then(result => {
        cacheEntry.result = result
      }).catch(() => {
        // Remove failed request from cache
        requestCache.delete(cacheKey)
      })

      return promise
    },
    [info, logError, cryptoTickers, globalTickers]
  )

  const getHealth = React.useCallback(async (source: string) => {
    try {
      const startTime = Date.now()
      const health = await getHealthApi()
      const duration = Date.now() - startTime
      info(`[API] ${source} getHealth: ${duration}ms | Active tickers: ${health.active_tickers_count}`)
      return health
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err)
      logError(`[API] ${source} getHealth FAILED: ${errorMessage}`)
      throw err
    }
  }, [info, logError])

  const value: APIContextValue = React.useMemo(
    () => ({
      // VN stocks
      tickerGroups,
      tickers,
      allTickersLastData,
      loading: stockLoading,  // Backward compatibility
      error: stockError,      // Backward compatibility
      stockLoading,
      stockError,

      // Crypto
      cryptoTickerGroups,
      cryptoTickers,
      allCryptoTickersLastData,
      cryptoLoading,
      cryptoError,

      // Global (Yahoo)
      globalTickerGroups,
      globalTickers,
      allGlobalTickersLastData,
      globalLoading,
      globalError,

      // Ticker names
      tickerNames,
      cryptoTickerNames,
      globalTickerNames,

      // Methods
      refetch: async () => { await Promise.all([fetchStockData(), fetchCryptoData(), fetchGlobalData(), fetchTickerNames()]) },
      refetchStock: fetchStockData,
      refetchCrypto: fetchCryptoData,
      refetchGlobal: fetchGlobalData,
      getTickers,
      getHealth,
    }),
    [
      // VN stocks
      tickerGroups,
      tickers,
      allTickersLastData,
      stockLoading,
      stockError,

      // Crypto
      cryptoTickerGroups,
      cryptoTickers,
      allCryptoTickersLastData,
      cryptoLoading,
      cryptoError,

      // Global (Yahoo)
      globalTickerGroups,
      globalTickers,
      allGlobalTickersLastData,
      globalLoading,
      globalError,

      // Ticker names
      tickerNames,
      cryptoTickerNames,
      globalTickerNames,

      // Methods
      fetchStockData,
      fetchCryptoData,
      fetchGlobalData,
      fetchTickerNames,
      getTickers,
      getHealth,
    ]
  )

  return <APIContext.Provider value={value}>{children}</APIContext.Provider>
}

export function useAPI() {
  const context = React.useContext(APIContext)
  if (context === undefined) {
    throw new Error('useAPI must be used within an APIProvider')
  }
  return context
}
