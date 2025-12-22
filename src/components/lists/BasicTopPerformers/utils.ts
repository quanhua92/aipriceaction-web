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
 * Filter out tickers without current trading data matching VNINDEX's last trading day
 * Only applies to Vietnamese stocks (mode: 'vn'), not crypto
 */
export function filterNonTradingTickers(
  tickers: TickerWithData[],
  stockData: Record<string, any[]>,
  sectionFilter: SectionFilter
): TickerWithData[] {
  // Skip filtering for crypto-only mode
  if (sectionFilter === 'crypto') {
    return tickers
  }

  // Get VNINDEX data for last trading day reference
  const vnindexData = stockData.VNINDEX
  if (!vnindexData || vnindexData.length === 0) {
    // Log warning but return all tickers (graceful degradation)
    console.warn('[BasicTopPerformers] VNINDEX data not available for trading day filtering')
    return tickers
  }

  // Extract last trading day from VNINDEX's latest bar
  const vnindexLatestBar = vnindexData[vnindexData.length - 1]
  const lastTradingDay = vnindexLatestBar?.time?.split('T')[0]

  if (!lastTradingDay) {
    console.warn('[BasicTopPerformers] Unable to extract last trading day from VNINDEX data')
    return tickers
  }

  // Filter tickers whose data matches VNINDEX's last trading day
  return tickers.filter(ticker => {
    // Only apply to Vietnamese stocks
    if (ticker.mode !== 'vn') {
      return true
    }

    const tickerData = ticker.stockData
    if (!tickerData) {
      return false // Remove tickers without data
    }

    const tickerDate = tickerData.time?.split('T')[0]

    // Keep ticker if its data matches VNINDEX's trading day
    return tickerDate === lastTradingDay
  })
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
 * Sort tickers by MA200 score (highest score first)
 */
export function sortByMA200(tickers: TickerWithData[]): TickerWithData[] {
  return [...tickers].sort((a, b) => {
    const aScore = a.stockData?.ma200_score ?? -Infinity
    const bScore = b.stockData?.ma200_score ?? -Infinity
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
    case 'az':
      return [...tickers].sort((a, b) => a.symbol.localeCompare(b.symbol))
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
    case 'ma200':
      return sortByMA200(tickers)
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
    ma100_score: data.ma100_score ?? null,
    ma200_score: data.ma200_score ?? null,
    ma10: data.ma10 ?? null,
    ma20: data.ma20 ?? null,
    ma50: data.ma50 ?? null,
    ma100: data.ma100 ?? null,
    ma200: data.ma200 ?? null
  }
}

/**
 * Calculate top winners and losers from sorted tickers
 */
export function calculateTopPerformers(
  sortedTickers: TickerWithData[],
  maxItems: number,
  sortBy: 'gainers' | 'losers' | 'volume' | 'value' | 'az' | 'ma10' | 'ma20' | 'ma50' | 'ma100' | 'ma200' = 'gainers'
): { winners: TopPerformer[]; losers: TopPerformer[] } {
  // Convert to TopPerformer format and filter out invalid data
  const performers = sortedTickers
    .map(tickerToTopPerformer)
    .filter((p): p is TopPerformer => p !== null)

  // Helper function to get sorting value based on criteria (for non-az sorting)
  const getSortValue = (performer: TopPerformer, criteria: string) => {
    switch (criteria) {
      case 'volume':
        return performer.volume
      case 'value':
        return performer.value
      case 'gainers':
        return performer.change
      case 'losers':
        return performer.change
      case 'ma10':
        return performer.ma10_score ?? -Infinity
      case 'ma20':
        return performer.ma20_score ?? -Infinity
      case 'ma50':
        return performer.ma50_score ?? -Infinity
      case 'ma100':
        return performer.ma100_score ?? -Infinity
      case 'ma200':
        return performer.ma200_score ?? -Infinity
      default:
        return performer.change
    }
  }

  // Always select top winners by highest positive change (same selection regardless of sorting mode)
  const topWinnersByChange = [...performers]
    .filter(p => p.change > 0)
    .sort((a, b) => b.change - a.change)
    .slice(0, maxItems)

  // Then reorder the selected winners based on sorting criteria
  let winners: TopPerformer[]
  if (sortBy === 'gainers') {
    // For gainers sorting: highest positive on top (same order as selection)
    winners = [...topWinnersByChange]
  } else if (sortBy === 'losers') {
    // For losers sorting: lowest positive on top (reverse order)
    winners = [...topWinnersByChange].reverse()
  } else {
    // For other sorting criteria: reorder the selected top 10 winners
    winners = [...topWinnersByChange].sort((a, b) => {
      if (sortBy === 'az') {
        return a.symbol.localeCompare(b.symbol)
      } else {
        return getSortValue(b, sortBy) - getSortValue(a, sortBy)
      }
    })
  }

  // Always select top losers by lowest (most negative) change (same selection regardless of sorting mode)
  const topLosersByChange = [...performers]
    .filter(p => p.change < 0)
    .sort((a, b) => a.change - b.change)  // Most negative first
    .slice(0, maxItems)

  // Then reorder the selected losers based on sorting criteria
  let losers: TopPerformer[]
  if (sortBy === 'gainers') {
    // For gainers sorting: most negative on top (same order as selection)
    losers = [...topLosersByChange]
  } else if (sortBy === 'losers') {
    // For losers sorting: least negative on top (reverse order)
    losers = [...topLosersByChange].reverse()
  } else {
    // For other sorting criteria: reorder the selected top 10 losers
    losers = [...topLosersByChange].sort((a, b) => {
      if (sortBy === 'az') {
        return a.symbol.localeCompare(b.symbol)
      } else {
        return getSortValue(b, sortBy) - getSortValue(a, sortBy)
      }
    })
  }

  return { winners, losers }
}