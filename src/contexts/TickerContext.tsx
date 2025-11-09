import React from 'react'
import { getTickers, Interval, type StockData } from '@/lib/api-client'

interface TickerContextValue {
  selectedTicker: string
  setSelectedTicker: (ticker: string) => void
  interval: Interval
  setInterval: (interval: Interval) => void
  startDate: string | undefined
  setStartDate: (date: string | undefined) => void
  endDate: string | undefined
  setEndDate: (date: string | undefined) => void
  limit: number
  setLimit: (limit: number) => void
  chartData: StockData[]
  loading: boolean
  error: string | null
}

const TickerContext = React.createContext<TickerContextValue | undefined>(
  undefined
)

export function TickerProvider({ children }: { children: React.ReactNode }) {
  const [selectedTicker, setSelectedTicker] = React.useState('VNINDEX')
  const [interval, setInterval] = React.useState<Interval>(Interval.Daily)
  const [startDate, setStartDate] = React.useState<string | undefined>(undefined)
  const [endDate, setEndDate] = React.useState<string | undefined>(undefined)
  const [limit, setLimit] = React.useState<number>(365)
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
          interval: interval,
          start_date: startDate,
          end_date: endDate,
          limit: limit,
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
  }, [selectedTicker, interval, startDate, endDate, limit])

  return (
    <TickerContext.Provider value={{
      selectedTicker,
      setSelectedTicker,
      interval,
      setInterval,
      startDate,
      setStartDate,
      endDate,
      setEndDate,
      limit,
      setLimit,
      chartData,
      loading,
      error
    }}>
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
