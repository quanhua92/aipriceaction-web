import type { TickerGroups } from '@/lib/api-client'
import type {
  TopPerformer,
  TickerWithData,
  SectionFilter,
  SortBy
} from './types'
import { isCryptoTicker } from '@/lib/ticker-utils'
import { getWatchlistTickers } from '@/lib/watchlist-storage'
import { isPredefinedWatchlist, getPredefinedWatchlistTickers } from '@/lib/predefined-watchlists'
import { ALL_WATCHLIST_NAME } from '@/lib/constants'

/**
 * Enrich tickers with latest price data from API responses
 */
export function enrichTickerWithData(
  tickers: Array<{ symbol: string; sector: string }>,
  stockData: Record<string, any[]>,
  cryptoData: Record<string, any[]>,
  stockTickers: Array<{ symbol: string; sector: string }>,
  cryptoTickers: Array<{ symbol: string; sector: string }>
): TickerWithData[] {
  return tickers.map(ticker => {
    const isCrypto = isCryptoTicker(ticker.symbol, stockTickers, cryptoTickers)
    const dataSource = isCrypto ? cryptoData : stockData
    const data = dataSource[ticker.symbol]
    const latestData = data?.[data.length - 1]

    return {
      symbol: ticker.symbol,
      sector: ticker.sector,
      stockData: latestData,
      mode: isCrypto ? 'crypto' : 'vn'
    }
  })
}

/**
 * Filter tickers by section (ALL/VN/Crypto)
 */
export function filterBySection(
  tickers: TickerWithData[],
  sectionFilter: SectionFilter
): TickerWithData[] {
  switch (sectionFilter) {
    case 'stocks':
      return tickers.filter(t => t.mode === 'vn')
    case 'crypto':
      return tickers.filter(t => t.mode === 'crypto')
    case 'all':
    default:
      return tickers
  }
}

/**
 * Filter tickers by ticker group
 */
export function filterByGroup(
  tickers: Array<{ symbol: string; sector: string }>,
  group: string,
  tickerGroups: TickerGroups | null,
  customWatchlists: string[]
): Array<{ symbol: string; sector: string }> {
  if (!group || !tickerGroups) return tickers

  // If ALL watchlist is selected, return all tickers
  if (group === ALL_WATCHLIST_NAME) {
    return tickers
  }

  // If it's a custom watchlist
  if (customWatchlists.includes(group)) {
    const watchlistTickers = getWatchlistTickers(group)
    const watchlistSet = new Set(watchlistTickers)
    return tickers.filter(t => watchlistSet.has(t.symbol))
  }

  // If it's a predefined watchlist
  if (isPredefinedWatchlist(group)) {
    const watchlistTickers = getPredefinedWatchlistTickers(group)
    const watchlistSet = new Set(watchlistTickers)
    return tickers.filter(t => watchlistSet.has(t.symbol))
  }

  // Regular ticker group
  const groupSymbols = tickerGroups[group] || []
  const groupSet = new Set(groupSymbols)
  return tickers.filter(t => groupSet.has(t.symbol))
}

/**
 * Sort tickers by gainers (highest % change first)
 */
export function sortByGainers(tickers: TickerWithData[]): TickerWithData[] {
  return [...tickers].sort((a, b) => {
    const aChange = a.stockData?.close_changed ?? -Infinity
    const bChange = b.stockData?.close_changed ?? -Infinity
    return bChange - aChange
  })
}

/**
 * Sort tickers by losers (lowest % change first)
 */
export function sortByLosers(tickers: TickerWithData[]): TickerWithData[] {
  return [...tickers].sort((a, b) => {
    const aChange = a.stockData?.close_changed ?? Infinity
    const bChange = b.stockData?.close_changed ?? Infinity
    return aChange - bChange
  })
}

/**
 * Sort tickers by volume (highest volume first)
 */
export function sortByVolume(tickers: TickerWithData[]): TickerWithData[] {
  return [...tickers].sort((a, b) => {
    const aVol = a.stockData?.volume ?? 0
    const bVol = b.stockData?.volume ?? 0
    return bVol - aVol
  })
}

/**
 * Sort tickers by traded value (price * volume, highest first)
 */
export function sortByValue(tickers: TickerWithData[]): TickerWithData[] {
  return [...tickers].sort((a, b) => {
    const aValue = (a.stockData?.close ?? 0) * (a.stockData?.volume ?? 0)
    const bValue = (b.stockData?.close ?? 0) * (b.stockData?.volume ?? 0)
    return bValue - aValue
  })
}

/**
 * Sort tickers by MA10 score (highest score first)
 */
export function sortByMA10(tickers: TickerWithData[]): TickerWithData[] {
  return [...tickers].sort((a, b) => {
    const aScore = a.stockData?.ma10_score ?? -Infinity
    const bScore = b.stockData?.ma10_score ?? -Infinity
    return bScore - aScore
  })
}

/**
 * Sort tickers by MA20 score (highest score first)
 */
export function sortByMA20(tickers: TickerWithData[]): TickerWithData[] {
  return [...tickers].sort((a, b) => {
    const aScore = a.stockData?.ma20_score ?? -Infinity
    const bScore = b.stockData?.ma20_score ?? -Infinity
    return bScore - aScore
  })
}

/**
 * Sort tickers by MA50 score (highest score first)
 */
export function sortByMA50(tickers: TickerWithData[]): TickerWithData[] {
  return [...tickers].sort((a, b) => {
    const aScore = a.stockData?.ma50_score ?? -Infinity
    const bScore = b.stockData?.ma50_score ?? -Infinity
    return bScore - aScore
  })
}

/**
 * Sort tickers by MA100 score (highest score first)
 */
export function sortByMA100(tickers: TickerWithData[]): TickerWithData[] {
  return [...tickers].sort((a, b) => {
    const aScore = a.stockData?.ma100_score ?? -Infinity
    const bScore = b.stockData?.ma100_score ?? -Infinity
    return bScore - aScore
  })
}

/**
 * Apply sorting based on selected criteria
 */
export function applySorting(
  tickers: TickerWithData[],
  sortBy: SortBy
): TickerWithData[] {
  switch (sortBy) {
    case 'gainers':
      return sortByGainers(tickers)
    case 'losers':
      return sortByLosers(tickers)
    case 'volume':
      return sortByVolume(tickers)
    case 'value':
      return sortByValue(tickers)
    case 'ma10':
      return sortByMA10(tickers)
    case 'ma20':
      return sortByMA20(tickers)
    case 'ma50':
      return sortByMA50(tickers)
    case 'ma100':
      return sortByMA100(tickers)
    default:
      return tickers
  }
}

/**
 * Convert TickerWithData to TopPerformer format
 */
export function tickerToTopPerformer(ticker: TickerWithData): TopPerformer | null {
  const data = ticker.stockData
  if (!data) return null

  // Validate required fields
  if (typeof data.close !== 'number' || data.close <= 0) {
    return null
  }

  // Handle missing close_changed - treat as 0 if not available
  const change = data.close_changed ?? 0

  // Skip if change is invalid (should be a number)
  if (typeof change !== 'number' || !isFinite(change)) {
    return null
  }

  const price = data.close
  const volume = data.volume ?? 0

  // Skip if volume is invalid
  if (typeof volume !== 'number' || volume < 0) {
    return null
  }

  const value = price * volume

  // Calculate change value if possible (for display purposes)
  let changeValue = 0
  if (change !== 0 && price > 0) {
    // Approximate previous price from percentage change
    const prevPrice = price / (1 + change / 100)
    changeValue = price - prevPrice
  }

  return {
    symbol: ticker.symbol,
    sector: ticker.sector,
    price,
    change,
    changeValue,
    volume,
    volumeChanged: data.volume_changed ?? null,
    value,
    mode: ticker.mode,
    ma10_score: data.ma10_score ?? null,
    ma20_score: data.ma20_score ?? null,
    ma50_score: data.ma50_score ?? null,
    ma10: data.ma10 ?? null,
    ma20: data.ma20 ?? null,
    ma50: data.ma50 ?? null
  }
}

/**
 * Calculate top winners and losers from sorted tickers
 */
export function calculateTopPerformers(
  sortedTickers: TickerWithData[],
  maxItems: number = 10,
  sortBy: 'gainers' | 'losers' | 'volume' | 'value' | 'az' = 'gainers'
): { winners: TopPerformer[]; losers: TopPerformer[] } {
  // Convert to TopPerformer format and filter out invalid data
  const performers = sortedTickers
    .map(tickerToTopPerformer)
    .filter((p): p is TopPerformer => p !== null)

  // Always get top winners: 10 tickers with highest positive changes
  const winners = [...performers]
    .filter(p => p.change > 0)
    .sort((a, b) => b.change - a.change) // Highest positive first
    .slice(0, maxItems)

  // Always get top losers: 10 tickers with lowest (most negative) changes
  const losers = [...performers]
    .filter(p => p.change < 0)
    .sort((a, b) => a.change - b.change) // Most negative first
    .slice(0, maxItems)

  // Sort the selected top 10 by the SortButtons criteria
  const sortPerformers = (performers: TopPerformer[], criteria: string) => {
    switch (criteria) {
      case 'az':
        return [...performers].sort((a, b) => a.symbol.localeCompare(b.symbol))
      case 'volume':
        return [...performers].sort((a, b) => b.volume - a.volume)
      case 'value':
        return [...performers].sort((a, b) => b.value - a.value)
      case 'gainers':
        return [...performers].sort((a, b) => b.change - a.change) // Highest gains first
      case 'losers':
        return [...performers].sort((a, b) => a.change - b.change) // Most losses first
      default:
        return performers
    }
  }

  return {
    winners: sortPerformers(winners, sortBy),
    losers: sortPerformers(losers, sortBy)
  }
}