/**
 * Market indices
 */
export const MARKET_INDICES = ['VNINDEX', 'VN30'] as const

export type MarketIndex = typeof MARKET_INDICES[number]

/**
 * Number of tickers to prefetch ahead in BasicWatchList
 */
export const BASIC_WATCHLIST_PREFETCH_COUNT = 3

/**
 * Priority order for ticker groups in dropdown
 */
export const PRIORITY_GROUPS = [
  'NGAN_HANG',
  'CHUNG_KHOAN',
  'BAT_DONG_SAN',
  'XAY_DUNG',
  'THEP',
  'BAN_LE'
] as const

/**
 * Default tickers for new custom watchlists
 */
export const DEFAULT_WATCHLIST_TICKERS = 'VNINDEX,VN30'

/**
 * LocalStorage key for custom watchlists
 */
export const CUSTOM_WATCHLISTS_STORAGE_KEY = 'customWatchlists'
