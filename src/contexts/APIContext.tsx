import * as React from 'react'
import { getTickerGroups, getCryptoTickerGroups, getTickersWithLogging, getCryptoTickersWithLogging, getHealth as getHealthApi, type TickerGroups, type StockData, type TickersQueryParams, type HealthResponse } from '@/lib/api-client'
import { PRIORITY_GROUPS } from '@/lib/constants'
import { useLogs } from './LogsContext'
import { useRefresh } from './RefreshContext'

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

  // Methods
  refetch: () => Promise<void>
  refetchStock: () => Promise<void>
  refetchCrypto: () => Promise<void>
  getTickers: (source: string, params?: TickersQueryParams) => Promise<Record<string, StockData[]>>
  getHealth: (source: string) => Promise<HealthResponse>
}

const APIContext = React.createContext<APIContextValue | undefined>(undefined)

export function APIProvider({ children }: { children: React.ReactNode }) {
  const { info, error: logError } = useLogs()
  const { lastRefresh } = useRefresh()

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

  const fetchStockData = React.useCallback(async () => {
    setStockLoading(true)
    setStockError(null)
    const startTime = Date.now()

    try {
      // Fetch both ticker groups and all tickers data in parallel
      const [groups, tickersData] = await Promise.all([
        getTickerGroups(),
        getTickersWithLogging('APIContext.init.stock', { limit: 1 }, { info, warn: info, error: logError })
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
  }, [info, logError])

  const fetchCryptoData = React.useCallback(async () => {
    setCryptoLoading(true)
    setCryptoError(null)
    const startTime = Date.now()

    try {
      // Fetch both crypto ticker groups and all crypto tickers data in parallel
      const [groups, tickersData] = await Promise.all([
        getCryptoTickerGroups(),
        getCryptoTickersWithLogging('APIContext.init.crypto', { limit: 1 }, { info, warn: info, error: logError })
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
  }, [info, logError])

  // Fetch both stock and crypto data in parallel on mount and when refresh is triggered
  React.useEffect(() => {
    Promise.all([fetchStockData(), fetchCryptoData()])
  }, [fetchStockData, fetchCryptoData, lastRefresh])

  // Provide logged API methods
  const getTickers = React.useCallback(
    async (source: string, params?: TickersQueryParams) => {
      return getTickersWithLogging(source, params ?? {}, { info, warn: info, error: logError })
    },
    [info, logError]
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

      // Methods
      refetch: async () => { await Promise.all([fetchStockData(), fetchCryptoData()]) },
      refetchStock: fetchStockData,
      refetchCrypto: fetchCryptoData,
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

      // Methods
      fetchStockData,
      fetchCryptoData,
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
