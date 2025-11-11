import { CUSTOM_WATCHLISTS_STORAGE_KEY } from './constants'

/**
 * Custom watchlists storage format:
 * {
 *   "My List": "ACB,VCB,TCB",
 *   "Tech Stocks": "FPT,VNG"
 * }
 */
export type CustomWatchlists = Record<string, string>

/**
 * Get all custom watchlists from localStorage
 */
export function getCustomWatchlists(): CustomWatchlists {
  try {
    const stored = localStorage.getItem(CUSTOM_WATCHLISTS_STORAGE_KEY)
    if (!stored) return {}
    return JSON.parse(stored) as CustomWatchlists
  } catch (error) {
    console.error('Failed to parse custom watchlists:', error)
    return {}
  }
}

/**
 * Get list of custom watchlist names
 */
export function getWatchlistNames(): string[] {
  const watchlists = getCustomWatchlists()
  return Object.keys(watchlists)
}

/**
 * Get tickers for a specific watchlist as an array
 */
export function getWatchlistTickers(name: string): string[] {
  const watchlists = getCustomWatchlists()
  const tickersString = watchlists[name]
  if (!tickersString) return []
  return tickersString.split(',').map(t => t.trim()).filter(Boolean)
}

/**
 * Save or update a watchlist
 */
export function saveWatchlist(name: string, tickers: string[]): void {
  try {
    const watchlists = getCustomWatchlists()
    watchlists[name] = tickers.join(',')
    localStorage.setItem(CUSTOM_WATCHLISTS_STORAGE_KEY, JSON.stringify(watchlists))
  } catch (error) {
    console.error('Failed to save watchlist:', error)
    throw error
  }
}

/**
 * Delete a watchlist
 */
export function deleteWatchlist(name: string): void {
  try {
    const watchlists = getCustomWatchlists()
    delete watchlists[name]
    localStorage.setItem(CUSTOM_WATCHLISTS_STORAGE_KEY, JSON.stringify(watchlists))
  } catch (error) {
    console.error('Failed to delete watchlist:', error)
    throw error
  }
}

/**
 * Check if a watchlist name already exists
 */
export function watchlistExists(name: string): boolean {
  const watchlists = getCustomWatchlists()
  return name in watchlists
}
