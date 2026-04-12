import { useCallback } from 'react'
import { useAPI } from '@/contexts/APIContext'
import { useChartSettings } from '@/contexts/ChartSettingsContext'
import { getTickerMode } from '@/lib/ticker-utils'

/**
 * Hook to prefetch ticker data for browser cache warming
 * Uses fire-and-forget pattern - errors are silently ignored
 */
export function usePrefetchTicker() {
  const { getTickers, tickers, cryptoTickers, globalTickers, ema } = useAPI()
  const settings = useChartSettings()

  /**
   * Prefetch data for multiple tickers (fire-and-forget)
   * @param source - Source identifier for debugging (e.g., 'BasicWatchList', 'ChartDialog.next')
   * @param symbols - Array of ticker symbols to prefetch
   */
  const prefetchTickers = useCallback(
    (source: string, symbols: string[]) => {
      if (!settings || symbols.length === 0) return

      // Fire-and-forget HTTP calls for browser cache
      for (const symbol of symbols) {
        if (!symbol) continue

        // Detect mode for each symbol (crypto vs stock)
        const mode = getTickerMode(symbol, tickers, globalTickers, cryptoTickers)

        getTickers(`prefetch:${source}`, {
          symbol,
          interval: settings.interval,
          start_date: settings.startDate,
          end_date: settings.endDate,
          limit: settings.limit,
          mode,
          ema: ema || undefined,
        }).catch(() => {}) // Ignore errors
      }
    },
    [settings, getTickers, tickers, cryptoTickers, globalTickers, ema],
  )

  return { prefetchTickers }
}
