import React from 'react'
import { getTickers, Interval, type StockData } from '@/lib/api-client'

export interface MaVisibility {
  ma10: boolean
  ma20: boolean
  ma50: boolean
  ma100: boolean
  ma200: boolean
}

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
  height: number
  setHeight: (height: number) => void
  chartData: StockData[]
  loading: boolean
  error: string | null
  maVisibility: MaVisibility
  setMaVisibility: (visibility: MaVisibility) => void
  resetMaVisibility: () => void
}

const TickerContext = React.createContext<TickerContextValue | undefined>(
  undefined
)

/**
 * Get default MA visibility based on interval
 * For intervals < 1H: MA10, MA20, MA50 enabled; MA100, MA200 disabled
 * For intervals >= 1H: MA10, MA20, MA50, MA100 enabled; MA200 disabled
 * MA200 is always hidden by default
 */
function getDefaultMaVisibility(interval: Interval): MaVisibility {
  const shortIntervals = [
    Interval.Minute,
    Interval.Minutes5,
    Interval.Minutes15,
    Interval.Minutes30,
  ]

  const isShortInterval = shortIntervals.includes(interval)

  return {
    ma10: true,
    ma20: true,
    ma50: true,
    ma100: !isShortInterval,
    ma200: false, // Always hidden by default
  }
}

export function TickerProvider({ children }: { children: React.ReactNode }) {
  const [selectedTicker, setSelectedTicker] = React.useState('VNINDEX')
  const [interval, setInterval] = React.useState<Interval>(Interval.Daily)
  const [startDate, setStartDate] = React.useState<string | undefined>(undefined)
  const [endDate, setEndDate] = React.useState<string | undefined>(undefined)
  const [limit, setLimit] = React.useState<number>(365)
  const [height, setHeight] = React.useState<number>(400)
  const [chartData, setChartData] = React.useState<StockData[]>([])
  const [loading, setLoading] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const [maVisibility, setMaVisibility] = React.useState<MaVisibility>(
    getDefaultMaVisibility(Interval.Daily)
  )

  // Reset MA visibility to defaults when interval changes
  React.useEffect(() => {
    setMaVisibility(getDefaultMaVisibility(interval))
  }, [interval])

  const resetMaVisibility = React.useCallback(() => {
    setMaVisibility(getDefaultMaVisibility(interval))
  }, [interval])

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
      height,
      setHeight,
      chartData,
      loading,
      error,
      maVisibility,
      setMaVisibility,
      resetMaVisibility,
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
