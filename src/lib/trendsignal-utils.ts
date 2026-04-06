import type { StockData } from './api-client'
import type { SortBy } from '@/components/lists/SortableTickerList'
import {
  ALL_WATCHLIST_NAME,
  CRYPTO_WATCHLIST_NAME,
  GLOBAL_WATCHLIST_NAME,
  MARKET_INDICES,
  PRIORITY_GROUPS,
} from './constants'
import {
  getPredefinedWatchlistTickers,
  isPredefinedWatchlist
} from './predefined-watchlists'
import { getWatchlistTickers } from './watchlist-storage'

// Types to export
export type SignalType = 'BUY' | 'SELL' | null
export type IntervalType = '1h' | '1D'

export interface TrendSignalData {
  ticker: string
  signal: SignalType
  signalDate?: string
  breakoutPrice?: number
  previousHigh?: number
  previousLow?: number
  strength?: number
  sector: string
  currentPrice: number
  closeChange?: number
  volume?: number
  ma10_score?: number
  ma20_score?: number
  ma50_score?: number
  ma100_score?: number
  ma200_score?: number
  highest20?: number
  lowest10?: number
}

export interface HistoricalSignalData extends TrendSignalData {
  date: string               // Date of the signal
  windowEnd: number          // Index position in data array
}

export interface TickerSignalHistory {
  ticker: string
  signals: HistoricalSignalData[]
}

/**
 * Detect buy/sell signals based on price breakouts
 * BUY: Current price breaks above highest close in last buyPeriod bars
 * SELL: Current price breaks below lowest close in last sellPeriod bars
 */
export function detectSignal(
  data: StockData[],
  buyPeriod: number,
  sellPeriod: number
): { signal: SignalType; strength: number; previousHigh?: number; previousLow?: number } {
  const minLength = Math.max(buyPeriod, sellPeriod) + 1
  if (data.length < minLength) {
    return { signal: null, strength: 0 }
  }

  const latest = data[data.length - 1]
  const historical = data.slice(0, -1)

  // Check BUY signal
  if (historical.length >= buyPeriod) {
    const lastNBars = historical.slice(-buyPeriod)
    const highestClose = Math.max(...lastNBars.map(d => d.close))

    if (latest.close > highestClose) {
      const strength = ((latest.close - highestClose) / highestClose) * 100
      return {
        signal: 'BUY',
        strength,
        previousHigh: highestClose
      }
    }
  }

  // Check SELL signal
  if (historical.length >= sellPeriod) {
    const lastNBars = historical.slice(-sellPeriod)
    const lowestClose = Math.min(...lastNBars.map(d => d.close))

    if (latest.close < lowestClose) {
      const strength = ((latest.close - lowestClose) / lowestClose) * 100
      return {
        signal: 'SELL',
        strength,
        previousLow: lowestClose
      }
    }
  }

  return { signal: null, strength: 0 }
}

/**
 * Get the sector for a ticker based on ticker groups
 * Checks crypto groups first, then regular ticker groups
 */
export function getTickerSector(
  ticker: string,
  tickerGroups: Record<string, string[]> | null,
  cryptoTickerGroups: Record<string, string[]> | null,
  globalTickerGroups?: Record<string, string[]> | null
): string {
  // Check crypto groups first
  if (cryptoTickerGroups) {
    for (const [sector, symbols] of Object.entries(cryptoTickerGroups)) {
      if (symbols.includes(ticker)) {
        return sector
      }
    }
  }

  // Check global/yahoo groups second
  if (globalTickerGroups) {
    for (const [sector, symbols] of Object.entries(globalTickerGroups)) {
      if (symbols.includes(ticker)) {
        return sector
      }
    }
  }

  // Check regular ticker groups
  if (tickerGroups) {
    for (const [sector, symbols] of Object.entries(tickerGroups)) {
      if (symbols.includes(ticker)) {
        return sector
      }
    }
  }

  return 'Unknown'
}

/**
 * Process tickers to calculate signals
 * Transforms raw stock data into TrendSignalData with signals
 */
export function processTickerSignals(
  tickers: string[],
  data: Record<string, StockData[]>,
  tickerGroups: Record<string, string[]> | null,
  cryptoTickerGroups: Record<string, string[]> | null,
  buyPeriod: number,
  sellPeriod: number,
  globalTickerGroups?: Record<string, string[]> | null
): TrendSignalData[] {
  const processedSignals: TrendSignalData[] = []

  for (const ticker of tickers) {
    const tickerData = data[ticker] || []
    const latest = tickerData[tickerData.length - 1]

    if (latest) {
      const detection = detectSignal(tickerData, buyPeriod, sellPeriod)
      const sector = getTickerSector(ticker, tickerGroups, cryptoTickerGroups, globalTickerGroups)

      // Calculate highest buyPeriod and lowest sellPeriod for reference
      let highestBuyPeriod: number | undefined
      let lowestSellPeriod: number | undefined

      if (tickerData.length >= buyPeriod + 1) {
        const lastBuyPeriodCloses = tickerData.slice(-buyPeriod - 1, -1).map(d => d.close)
        highestBuyPeriod = Math.max(...lastBuyPeriodCloses)
      }

      if (tickerData.length >= sellPeriod + 1) {
        const lastSellPeriodCloses = tickerData.slice(-sellPeriod - 1, -1).map(d => d.close)
        lowestSellPeriod = Math.min(...lastSellPeriodCloses)
      }

      processedSignals.push({
        ticker,
        signal: detection.signal,
        breakoutPrice: detection.signal ? latest.close : undefined,
        previousHigh: detection.previousHigh,
        previousLow: detection.previousLow,
        strength: detection.strength,
        sector,
        currentPrice: latest.close,
        closeChange: latest.close_changed || undefined,
        volume: latest.volume || undefined,
        ma10_score: latest.ma10_score || undefined,
        ma20_score: latest.ma20_score || undefined,
        ma50_score: latest.ma50_score || undefined,
        ma100_score: latest.ma100_score || undefined,
        ma200_score: latest.ma200_score || undefined,
        highest20: highestBuyPeriod,
        lowest10: lowestSellPeriod,
      })
    }
  }

  return processedSignals
}

/**
 * Group signals by sector with priority-based sorting
 */
export function groupSignalsBySector(
  signals: TrendSignalData[],
  selectedWatchlist: string,
  sortBy: SortBy
): Record<string, TrendSignalData[]> {
  if (signals.length === 0) return {}

  const grouped: { [sector: string]: TrendSignalData[] } = {}
  signals.forEach((signal) => {
    if (!grouped[signal.sector]) {
      grouped[signal.sector] = []
    }
    grouped[signal.sector].push(signal)
  })

  // Sort sectors by priority
  const sortedSectors = Object.keys(grouped).sort((a, b) => {
    // MAJOR_CRYPTO goes first for CRYPTO watchlist
    if (selectedWatchlist === CRYPTO_WATCHLIST_NAME) {
      if (a === 'MAJOR_CRYPTO') return -1
      if (b === 'MAJOR_CRYPTO') return 1
    }

    // GLOBAL goes first for GLOBAL watchlist
    if (selectedWatchlist === GLOBAL_WATCHLIST_NAME) {
      if (a === 'GLOBAL') return -1
      if (b === 'GLOBAL') return 1
    }

    const priorityA = PRIORITY_GROUPS.indexOf(a as any)
    const priorityB = PRIORITY_GROUPS.indexOf(b as any)

    if (priorityA !== -1 && priorityB !== -1) {
      return priorityA - priorityB
    }
    if (priorityA !== -1) return -1
    if (priorityB !== -1) return 1

    return a.localeCompare(b)
  })

  // Sort signals within each sector based on sortBy
  sortedSectors.forEach(sector => {
    grouped[sector].sort((a, b) => {
      switch (sortBy) {
        case 'gainers':
          // Sort by price change descending (highest gain first)
          const aChange = a.closeChange ?? -Infinity
          const bChange = b.closeChange ?? -Infinity
          return bChange - aChange

        case 'losers':
          // Sort by price change ascending (lowest/most negative first)
          const aLoss = a.closeChange ?? Infinity
          const bLoss = b.closeChange ?? Infinity
          return aLoss - bLoss

        case 'volume':
          // Sort by volume descending (highest volume first)
          const aVol = a.volume ?? 0
          const bVol = b.volume ?? 0
          return bVol - aVol

        case 'ma10':
          // Sort by MA10 score descending (highest/most bullish first)
          const aMA10 = a.ma10_score ?? -Infinity
          const bMA10 = b.ma10_score ?? -Infinity
          return bMA10 - aMA10

        case 'ma20':
          // Sort by MA20 score descending (highest/most bullish first)
          const aMA20 = a.ma20_score ?? -Infinity
          const bMA20 = b.ma20_score ?? -Infinity
          return bMA20 - aMA20

        case 'ma50':
          // Sort by MA50 score descending (highest/most bullish first)
          const aMA50 = a.ma50_score ?? -Infinity
          const bMA50 = b.ma50_score ?? -Infinity
          return bMA50 - aMA50

        case 'ma100':
          // Sort by MA100 score descending (highest/most bullish first)
          const aMA100 = a.ma100_score ?? -Infinity
          const bMA100 = b.ma100_score ?? -Infinity
          return bMA100 - aMA100

        case 'ma200':
          // Sort by MA200 score descending (highest/most bullish first)
          const aMA200 = a.ma200_score ?? -Infinity
          const bMA200 = b.ma200_score ?? -Infinity
          return bMA200 - aMA200

        case 'value':
          // Sort by value descending (highest traded value first)
          const aValue = (a.currentPrice ?? 0) * (a.volume ?? 0)
          const bValue = (b.currentPrice ?? 0) * (b.volume ?? 0)
          return bValue - aValue

        case 'az':
          // Sort alphabetically by ticker symbol
          return a.ticker.localeCompare(b.ticker)

        default:
          // Default sorting: signals first by strength
          if (a.signal && b.signal) {
            return Math.abs(b.strength || 0) - Math.abs(a.strength || 0)
          }
          if (a.signal && !b.signal) {
            return -1
          }
          if (!a.signal && b.signal) {
            return 1
          }
          return a.ticker.localeCompare(b.ticker)
      }
    })
  })

  return grouped
}

/**
 * Get tickers for a watchlist and determine if it's stock, crypto, or mixed
 */
export function getWatchlistTickersByType(
  selectedWatchlist: string,
  tickerGroups: Record<string, string[]> | null,
  cryptoTickers: { symbol: string }[],
  globalTickers: { symbol: string }[],
  customWatchlists: string[]
): { stockSymbols: string[]; cryptoSymbols: string[]; globalSymbols: string[]; watchlistType: 'stock' | 'crypto' | 'global' | 'mixed' } {
  if (!tickerGroups) {
    return { stockSymbols: [], cryptoSymbols: [], globalSymbols: [], watchlistType: 'stock' as const }
  }

  let selectedTickers: string[] = []

  // Get tickers based on watchlist type
  if (selectedWatchlist === ALL_WATCHLIST_NAME) {
    // Get all tickers from all sectors (excluding market indices like VNINDEX, VN30)
    Object.entries(tickerGroups).forEach(([sector, symbols]) => {
      if (!MARKET_INDICES.includes(sector as any)) {
        selectedTickers.push(...symbols)
      }
    })
  } else if (selectedWatchlist === CRYPTO_WATCHLIST_NAME) {
    selectedTickers = cryptoTickers.map(t => t.symbol)
  } else if (selectedWatchlist === GLOBAL_WATCHLIST_NAME) {
    selectedTickers = globalTickers.map(t => t.symbol)
  } else if (isPredefinedWatchlist(selectedWatchlist)) {
    selectedTickers = getPredefinedWatchlistTickers(selectedWatchlist)
  } else if (customWatchlists.includes(selectedWatchlist)) {
    selectedTickers = getWatchlistTickers(selectedWatchlist)
  } else {
    selectedTickers = tickerGroups[selectedWatchlist] || []
  }

  // Split into stocks, crypto, and global
  const cryptoSymbolSet = new Set(cryptoTickers.map(t => t.symbol))
  const globalSymbolSet = new Set(globalTickers.map(t => t.symbol))
  const stocks: string[] = []
  const crypto: string[] = []
  const global: string[] = []

  selectedTickers.forEach(symbol => {
    if (cryptoSymbolSet.has(symbol)) {
      crypto.push(symbol)
    } else if (globalSymbolSet.has(symbol)) {
      global.push(symbol)
    } else {
      stocks.push(symbol)
    }
  })

  // Determine watchlist type
  const typeCount = [stocks.length > 0, crypto.length > 0, global.length > 0].filter(Boolean).length
  const type =
    selectedWatchlist === ALL_WATCHLIST_NAME ? 'stock' as const :
    selectedWatchlist === CRYPTO_WATCHLIST_NAME ? 'crypto' as const :
    selectedWatchlist === GLOBAL_WATCHLIST_NAME ? 'global' as const :
    typeCount >= 2 ? 'mixed' as const :
    global.length > 0 ? 'global' as const :
    crypto.length > 0 ? 'crypto' as const :
    'stock' as const

  return { stockSymbols: stocks, cryptoSymbols: crypto, globalSymbols: global, watchlistType: type }
}

/**
 * Calculate historical signals using sliding windows for each ticker
 * Creates signals for each day using moving windows over the historical data
 */
export function calculateHistoricalSignals(
  tickers: string[],
  data: Record<string, StockData[]>,
  tickerGroups: Record<string, string[]> | null,
  cryptoTickerGroups: Record<string, string[]> | null,
  buyPeriod: number,
  sellPeriod: number,
  globalTickerGroups?: Record<string, string[]> | null
): TickerSignalHistory[] {
  const histories: TickerSignalHistory[] = []

  for (const ticker of tickers) {
    const tickerData = data[ticker] || []
    if (tickerData.length < Math.max(buyPeriod, sellPeriod) + 1) {
      // Skip tickers with insufficient data
      continue
    }

    const signals: HistoricalSignalData[] = []
    const sector = getTickerSector(ticker, tickerGroups, cryptoTickerGroups, globalTickerGroups)

    // Calculate signals for each window position
    for (let windowEnd = Math.max(buyPeriod, sellPeriod); windowEnd < tickerData.length; windowEnd++) {
      const windowData = tickerData.slice(0, windowEnd + 1)
      const currentBar = tickerData[windowEnd]

      if (!currentBar) continue

      // Detect signal for this window
      const detection = detectSignal(windowData, buyPeriod, sellPeriod)

      // Calculate highest buyPeriod and lowest sellPeriod for this window
      let highestBuyPeriod: number | undefined
      let lowestSellPeriod: number | undefined

      if (windowData.length >= buyPeriod + 1) {
        const lastBuyPeriodCloses = windowData.slice(-buyPeriod - 1, -1).map(d => d.close)
        highestBuyPeriod = Math.max(...lastBuyPeriodCloses)
      }

      if (windowData.length >= sellPeriod + 1) {
        const lastSellPeriodCloses = windowData.slice(-sellPeriod - 1, -1).map(d => d.close)
        lowestSellPeriod = Math.min(...lastSellPeriodCloses)
      }

      // Create signal data
      const signalData: HistoricalSignalData = {
        ticker,
        signal: detection.signal,
        breakoutPrice: detection.signal ? currentBar.close : undefined,
        previousHigh: detection.previousHigh,
        previousLow: detection.previousLow,
        strength: detection.strength,
        sector,
        currentPrice: currentBar.close,
        closeChange: currentBar.close_changed || undefined,
        volume: currentBar.volume || undefined,
        ma10_score: currentBar.ma10_score || undefined,
        ma20_score: currentBar.ma20_score || undefined,
        ma50_score: currentBar.ma50_score || undefined,
        ma100_score: currentBar.ma100_score || undefined,
        ma200_score: currentBar.ma200_score || undefined,
        highest20: highestBuyPeriod,
        lowest10: lowestSellPeriod,
        date: currentBar.time, // Use normalized timestamp
        windowEnd
      }

      signals.push(signalData)
    }

    if (signals.length > 0) {
      histories.push({
        ticker,
        signals
      })
    }
  }

  return histories
}

/**
 * Group historical signals by date for multiple tickers view
 */
export function groupSignalsByDate(signals: HistoricalSignalData[]): Record<string, HistoricalSignalData[]> {
  const grouped: Record<string, HistoricalSignalData[]> = {}

  signals.forEach(signal => {
    const date = signal.date.split('T')[0] // Extract date part
    if (!grouped[date]) {
      grouped[date] = []
    }
    grouped[date].push(signal)
  })

  // Sort signals within each date by ticker name
  Object.keys(grouped).forEach(date => {
    grouped[date].sort((a, b) => a.ticker.localeCompare(b.ticker))
  })

  return grouped
}