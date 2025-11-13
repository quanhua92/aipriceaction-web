import React from 'react'
import { getTickers, type StockData } from '@/lib/api-client'
import { useChartSettings } from './ChartSettingsContext'
import { useRefresh } from './RefreshContext'

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
      try {
        const response = await getTickers({
          symbol: selectedTicker,
          interval: settings.interval,
          start_date: settings.startDate,
          end_date: settings.endDate,
          limit: limit ?? settings.limit,
        })
        const data = response[selectedTicker] || []
        setChartData(data)
      } catch (err) {
                setError(err instanceof Error ? err.message : 'Failed to fetch chart data')
        setChartData([])
      } finally {
                setLoading(false)
      }
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