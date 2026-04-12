import * as React from 'react'
import { useAPI } from '@/contexts/APIContext'
import { useRefresh } from '@/contexts/RefreshContext'
import { useChartSettings } from '@/contexts/ChartSettingsContext'
import type { StockData } from '@/lib/api-client'

interface UseWatchListDataOptions {
  needsMA: boolean
  /** Override endDate from ChartSettings */
  endDate?: string
}

interface UseWatchListDataResult {
  stockData: Record<string, StockData[]>
  cryptoData: Record<string, StockData[]>
  globalData: Record<string, StockData[]>
  combinedData: Record<string, StockData[]>
  loading: boolean
  error: string | null
}

export function useWatchListData({ needsMA, endDate: endDateOverride }: UseWatchListDataOptions): UseWatchListDataResult {
  const { getTickers } = useAPI()
  const { lastRefresh } = useRefresh()
  const { endDate: settingsEndDate } = useChartSettings()
  const effectiveEndDate = endDateOverride ?? settingsEndDate

  const [stockData, setStockData] = React.useState<Record<string, StockData[]>>({})
  const [cryptoData, setCryptoData] = React.useState<Record<string, StockData[]>>({})
  const [globalData, setGlobalData] = React.useState<Record<string, StockData[]>>({})
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)

  React.useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)

    const params = { limit: 1, end_date: effectiveEndDate, ma: needsMA } as const

    Promise.all([
      getTickers('WatchListData.stock', { ...params, mode: 'vn' }),
      getTickers('WatchListData.crypto', { ...params, mode: 'crypto' }),
      getTickers('WatchListData.global', { ...params, mode: 'yahoo' }),
    ])
      .then(([stock, crypto, global]) => {
        if (cancelled) return
        setStockData(stock)
        setCryptoData(crypto)
        setGlobalData(global)
      })
      .catch((err) => {
        if (cancelled) return
        const message = err instanceof Error ? err.message : 'Failed to fetch watchlist data'
        setError(message)
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [getTickers, lastRefresh, effectiveEndDate, needsMA])

  const combinedData = React.useMemo(
    () => ({ ...stockData, ...cryptoData, ...globalData }),
    [stockData, cryptoData, globalData],
  )

  return { stockData, cryptoData, globalData, combinedData, loading, error }
}
