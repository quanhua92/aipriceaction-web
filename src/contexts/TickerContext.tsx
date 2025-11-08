import React from 'react'
import { getTickers, Interval, type StockData } from '@/lib/api-client'

interface TickerContextValue {
  selectedTicker: string
  setSelectedTicker: (ticker: string) => void
  chartData: StockData[]
  loading: boolean
  error: string | null
}

const TickerContext = React.createContext<TickerContextValue | undefined>(
  undefined
)

export function TickerProvider({ children }: { children: React.ReactNode }) {
  const [selectedTicker, setSelectedTicker] = React.useState('VNINDEX')
  const [chartData, setChartData] = React.useState<StockData[]>([])
  const [loading, setLoading] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)

  React.useEffect(() => {
    const fetchChartData = async () => {
      setLoading(true)
      setError(null)
      try {
        const response = await getTickers({
          symbol: selectedTicker,
          interval: Interval.Daily,
          limit: 365,
        })
        setChartData(response[selectedTicker] || [])
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch chart data')
        setChartData([])
      } finally {
        setLoading(false)
      }
    }

    fetchChartData()
  }, [selectedTicker])

  return (
    <TickerContext.Provider value={{ selectedTicker, setSelectedTicker, chartData, loading, error }}>
      {children}
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
