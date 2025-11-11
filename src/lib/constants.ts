/**
 * Market indices
 */
export const MARKET_INDICES = ['VNINDEX', 'VN30'] as const

export type MarketIndex = typeof MARKET_INDICES[number]

/**
 * Number of tickers to prefetch ahead in BasicWatchList
 */
export const BASIC_WATCHLIST_PREFETCH_COUNT = 3
