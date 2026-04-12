import * as React from 'react'
import { useAPI } from '@/contexts/APIContext'
import { useRefresh } from '@/contexts/RefreshContext'
import { useChartSettings } from '@/contexts/ChartSettingsContext'
import type { StockData } from '@/lib/api-client'
import { toStockData, type BasicStockData } from '@/lib/api-client'

/** Convert Record<string, BasicStockData[]> to Record<string, StockData[]> */
function toStockDataMap(map: Record<string, BasicStockData[]>): Record<string, StockData[]> {
  const result: Record<string, StockData[]> = {}
  for (const [key, arr] of Object.entries(map)) {
    result[key] = arr.map(toStockData)
  }
  return result
}

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
  const { getTickers, allTickersLastData, allCryptoTickersLastData, allGlobalTickersLastData } = useAPI()
  const { lastRefresh } = useRefresh()
  const { endDate: settingsEndDate } = useChartSettings()
  const effectiveEndDate = endDateOverride ?? settingsEndDate

  // When MA is not needed and no custom endDate, APIContext already has the same data
  // (fetched with limit:1, same endDate, ma:false). Avoid duplicate fetches.
  const canUseAPIContext = !needsMA && endDateOverride === undefined

  const [stockData, setStockData] = React.useState<Record<string, StockData[]>>({})
  const [cryptoData, setCryptoData] = React.useState<Record<string, StockData[]>>({})
  const [globalData, setGlobalData] = React.useState<Record<string, StockData[]>>({})
  const [loading, setLoading] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)

  React.useEffect(() => {
    if (canUseAPIContext) return

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
  }, [getTickers, lastRefresh, effectiveEndDate, needsMA, canUseAPIContext])

  // When using APIContext data (BasicStockData), convert to StockData with default MA values
  const effectiveStockData = canUseAPIContext ? toStockDataMap(allTickersLastData) : stockData
  const effectiveCryptoData = canUseAPIContext ? toStockDataMap(allCryptoTickersLastData) : cryptoData
  const effectiveGlobalData = canUseAPIContext ? toStockDataMap(allGlobalTickersLastData) : globalData

  const combinedData = React.useMemo(
    () => ({ ...effectiveStockData, ...effectiveCryptoData, ...effectiveGlobalData }),
    [effectiveStockData, effectiveCryptoData, effectiveGlobalData],
  )

  return { stockData: effectiveStockData, cryptoData: effectiveCryptoData, globalData: effectiveGlobalData, combinedData, loading, error }
}
