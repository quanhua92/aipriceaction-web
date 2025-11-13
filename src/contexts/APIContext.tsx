import * as React from 'react'
import { getTickerGroups, getTickersWithLogging, getHealth as getHealthApi, type TickerGroups, type StockData, type TickersQueryParams, type HealthResponse } from '@/lib/api-client'
import { PRIORITY_GROUPS } from '@/lib/constants'
import { useLogs } from './LogsContext'

const sortTickerGroups = (groups: TickerGroups): TickerGroups => {
  const sortedEntries = Object.entries(groups)
    .sort(([groupA], [groupB]) => {
      const priorityA = PRIORITY_GROUPS.indexOf(groupA)
      const priorityB = PRIORITY_GROUPS.indexOf(groupB)

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
  tickerGroups: TickerGroups | null
  tickers: Ticker[]
  allTickersData: Record<string, StockData[]>
  loading: boolean
  error: string | null
  refetch: () => Promise<void>
  getTickers: (source: string, params?: TickersQueryParams) => Promise<Record<string, StockData[]>>
  getHealth: (source: string) => Promise<HealthResponse>
}

const APIContext = React.createContext<APIContextValue | undefined>(undefined)

export function APIProvider({ children }: { children: React.ReactNode }) {
  const { info, error: logError } = useLogs()
  const [tickerGroups, setTickerGroups] = React.useState<TickerGroups | null>(null)
  const [tickers, setTickers] = React.useState<Ticker[]>([])
  const [allTickersData, setAllTickersData] = React.useState<Record<string, StockData[]>>({})
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)

  const fetchTickerGroups = React.useCallback(async () => {
    setLoading(true)
    setError(null)
    const startTime = Date.now()

    try {
      // Fetch both ticker groups and all tickers data in parallel
      const [groups, tickersData] = await Promise.all([
        getTickerGroups(),
        getTickersWithLogging('APIContext.init', {}, { info, warn: info, error: logError })
      ])

      const duration = Date.now() - startTime
      info(`[API] Initial data fetch completed in ${duration}ms`)

      const sortedGroups = sortTickerGroups(groups)
      setTickerGroups(sortedGroups)
      setAllTickersData(tickersData)

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
      console.error('Failed to fetch API data:', err)
      const errorMessage = err instanceof Error ? err.message : 'Failed to load market data'
      logError(`[API] Initial data fetch failed: ${errorMessage}`)
      setError('Failed to load market data')
    } finally {
      setLoading(false)
    }
  }, [info, logError])

  // Fetch on mount
  React.useEffect(() => {
    fetchTickerGroups()
  }, [fetchTickerGroups])

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
      info(`[API] ${source} getHealth: ${duration}ms | Status: ${health.status}`)
      return health
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err)
      logError(`[API] ${source} getHealth FAILED: ${errorMessage}`)
      throw err
    }
  }, [info, logError])

  const value: APIContextValue = React.useMemo(
    () => ({
      tickerGroups,
      tickers,
      allTickersData,
      loading,
      error,
      refetch: fetchTickerGroups,
      getTickers,
      getHealth,
    }),
    [
      tickerGroups,
      tickers,
      allTickersData,
      loading,
      error,
      fetchTickerGroups,
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
