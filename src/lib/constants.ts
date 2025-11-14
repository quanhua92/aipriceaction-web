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

/**
 * LocalStorage key for AI page selected tickers
 */
export const AI_SELECTED_TICKERS_STORAGE_KEY = 'ai-selected-tickers'

/**
 * LocalStorage key for Market Matrix open sectors state
 */
export const MATRIX_OPEN_SECTORS_STORAGE_KEY = 'matrix-open-sectors'

/**
 * Special watchlist name for showing all tickers
 */
export const ALL_WATCHLIST_NAME = 'ALL'

/**
 * Names of predefined watchlists (VN30, VINGROUP, etc.)
 * These appear between "ALL" and custom watchlists in the UI
 */
export const PREDEFINED_WATCHLIST_NAMES = ['VN30', 'VINGROUP'] as const

export type PredefinedWatchlistName = typeof PREDEFINED_WATCHLIST_NAMES[number]

/**
 * Number of days to display per page in Market Matrix
 */
export const MATRIX_DAYS_PER_PAGE = 40

/**
 * Number of trading days in approximately 1 year (used for caching VNINDEX data)
 */
export const TRADING_DAYS_PER_YEAR = 252

/**
 * Maximum number of retry attempts for failed API calls
 */
export const API_RETRY_ATTEMPTS = 3

/**
 * Random delay range (in milliseconds) before API calls to prevent simultaneous requests
 * Will use random value between min and max
 * Kept small (0-50ms) to avoid bad UX since browser cache can serve data instantly
 */
export const API_CALL_DELAY_MS = {
  min: 0,
  max: 50
} as const

/**
 * Time window (in milliseconds) to consider a recent API call as "cached"
 * If same ticker+interval was fetched within this window, skip the random delay
 */
export const API_CACHE_WINDOW_MS = 15000 // 15 seconds

/**
 * Maximum number of recent API calls to track for cache detection
 */
export const API_RECENT_CALLS_LIMIT = 10

/**
 * Sector abbreviations for compact display in Market Matrix
 * Based on real API sectors from https://api.aipriceaction.com/tickers/group
 */
export const SECTOR_ABBREVIATIONS: Record<string, string> = {
	// Priority sectors
	NGAN_HANG: 'NH',
	CHUNG_KHOAN: 'CK',
	BAT_DONG_SAN: 'BDS',
	XAY_DUNG: 'XD',
	THEP: 'THEP',
	BAN_LE: 'BL',

	// Other sectors (alphabetical)
	BAO_HIEM: 'BH',
	BAT_DONG_SAN_KCN: 'KCN',
	CAO_SU: 'CS',
	CONG_NGHE: 'CN',
	DAU_KHI: 'DK',
	DAU_TU_CONG: 'DTC',
	DET_MAY: 'DM',
	HANG_KHONG: 'HK',
	HOA_CHAT: 'HC',
	KHAI_KHOANG: 'KK',
	NANG_LUONG: 'NL',
	NHUA: 'NHUA',
	NONG_NGHIEP: 'NN',
	OTHERS: 'OTH',
	PENNY: 'PNY',
	SUC_KHOE: 'SK',
	THUC_PHAM: 'TP',
	THUY_SAN: 'TS',
	VAN_TAI: 'VT',
	VLXD: 'VLXD',
	XAY_LAP_DIEN: 'XLD',
}
