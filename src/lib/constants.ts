/**
 * Market indices
 */
export const MARKET_INDICES = ['VNINDEX', 'VN30'] as const

export type MarketIndex = typeof MARKET_INDICES[number]

/**
 * Major cryptocurrencies (shown at top like market indices)
 */
export const MAJOR_CRYPTO = ['BTC', 'ETH', 'XRP', 'TON'] as const

export type MajorCrypto = typeof MAJOR_CRYPTO[number]

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
 * LocalStorage key for API base URL override
 */
export const API_BASE_URL_OVERRIDE_STORAGE_KEY = 'api-base-url-override'

/**
 * LocalStorage key for price alerts
 */
export const ALERTS_STORAGE_KEY = 'alerts'

/**
 * LocalStorage key for markdown notes
 */
export const NOTES_STORAGE_KEY = 'aipriceaction-notes'

/**
 * LocalStorage key for home page chart tickers
 */
export const HOME_CHART_TICKERS_STORAGE_KEY = 'home-chart-tickers'

/**
 * Fixed filename for markdown content
 */
export const MARKDOWN_FILENAME = 'content.md'

/**
 * Special watchlist name for showing all tickers
 */
export const ALL_WATCHLIST_NAME = 'ALL'

/**
 * Special watchlist name for showing only crypto
 */
export const CRYPTO_WATCHLIST_NAME = 'CRYPTO'

/**
 * Names of predefined watchlists (VN30, VINGROUP, TM, etc.)
 * These appear between "ALL" and custom watchlists in the UI
 */
export const PREDEFINED_WATCHLIST_NAMES = ['VN30', 'VINGROUP', 'TM'] as const

export type PredefinedWatchlistName = typeof PREDEFINED_WATCHLIST_NAMES[number]

/**
 * Number of days to display per page in Market Matrix
 */
export const MATRIX_DAYS_PER_PAGE = 40

/**
 * Default number of records to load for charts
 */
export const DEFAULT_CHART_LIMIT = 128

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
	// Major crypto (for CRYPTO watchlist)
	MAJOR_CRYPTO: 'MAJOR',

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

/**
 * Alert types
 */
export const ALERT_TYPES = {
	PRICE_HITS: 'price_hits',
	// Future: PRICE_ABOVE, PRICE_BELOW, VOLUME_SPIKE
} as const

export type AlertType = typeof ALERT_TYPES[keyof typeof ALERT_TYPES]

/**
 * Distance thresholds for alert color coding (in percent)
 */
export const ALERT_DISTANCE_THRESHOLDS = {
	RED: 2,      // < 2%
	ORANGE: 5,   // 2-5%
	YELLOW: 10,  // 5-10%
	GREEN: 999,  // > 10%
} as const

/**
 * Alert trigger threshold (in percent)
 * Alert is considered triggered when price is within this % of target
 */
export const ALERT_TRIGGER_THRESHOLD = 0.5 // 0.5%

/**
 * Intraday intervals that show time in chart overlay
 */
export const INTRADAY_INTERVALS = ['1m', '5m', '15m', '30m', '1H'] as const
