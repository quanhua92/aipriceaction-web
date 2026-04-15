/**
 * Market indices
 */
export const MARKET_INDICES = ['VNINDEX', 'VN30', 'VN30F1M'] as const

export type MarketIndex = typeof MARKET_INDICES[number]

/**
 * Major cryptocurrencies (shown at top like market indices)
 */
export const MAJOR_CRYPTO = ['BTCUSDT', 'ETHUSDT', 'XRPUSDT', 'TONUSDT'] as const

export type MajorCrypto = typeof MAJOR_CRYPTO[number]

/**
 * Major global indices (shown at top like market indices on /global page)
 */
export const MAJOR_GLOBAL = ['^GSPC', '^DJI', '^NDX', 'GC=F', 'CL=F', 'SJC-GOLD'] as const

/**
 * Symbols that should always be formatted as integers (no decimals)
 * SJC-GOLD: Vietnamese SJC gold prices are quoted in whole VND (e.g. 85,000,000)
 */
export const INTEGER_FORMAT_SYMBOLS = ['SJC-GOLD'] as const

export type IntegerFormatSymbol = typeof INTEGER_FORMAT_SYMBOLS[number]

export const NO_VOLUME_SYMBOLS = ['SJC-GOLD'] as const

export type MajorGlobal = typeof MAJOR_GLOBAL[number]

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
  'TAI_NGUYEN_CO_BAN',
  'BAN_LE'
] as const

/**
 * Default tickers for new custom watchlists
 */
export const DEFAULT_WATCHLIST_TICKERS = 'VNINDEX,VN30,VN30F1M'

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
 * LocalStorage key for TrendSignal open sectors state
 */
export const TRENDSIGNAL_OPEN_SECTORS_STORAGE_KEY = 'trendsignal-open-sectors'

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
export const CRYPTO_CHART_TICKERS_STORAGE_KEY = 'crypto-chart-tickers'
export const GLOBAL_CHART_TICKERS_STORAGE_KEY = 'global-chart-tickers'
export const TICKER_LIST_SECTION_FILTER_STORAGE_KEY = 'ticker-list-section-filter'
export const TICKER_LIST_SORT_BY_STORAGE_KEY = 'ticker-list-sort-by'

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
 * Special watchlist name for showing only global/yahoo tickers
 */
export const GLOBAL_WATCHLIST_NAME = 'GLOBAL'

/**
 * Names of predefined watchlists (VN30, VINGROUP, TM, etc.)
 * These appear between "ALL" and custom watchlists in the UI
 */
export const PREDEFINED_WATCHLIST_NAMES = ['VN30', 'VINGROUP', 'TM'] as const

export type PredefinedWatchlistName = typeof PREDEFINED_WATCHLIST_NAMES[number]

/**
 * Number of days to display per page in Market Matrix
 */
export const MATRIX_DAYS_PER_PAGE = 21

/**
 * Default number of records to load for charts
 */
export const DEFAULT_CHART_LIMIT = 100
export const DEFAULT_DESKTOP_CHART_LIMIT = 200
export const MAX_CHART_LIMIT = 256

/**
 * Number of additional records to load when clicking "Load More" button
 */
export const LOAD_MORE_LIMIT = 50

/**
 * Bars from left edge to trigger infinite history load
 */
export const INFINITE_SCROLL_THRESHOLD = 50

/**
 * Debounce time between infinite history load triggers (in milliseconds)
 */
export const INFINITE_SCROLL_DEBOUNCE_MS = 500

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

	// Global/yahoo groups
	GLOBAL: 'GLB',

	// Priority sectors
	NGAN_HANG: 'NH',
	CHUNG_KHOAN: 'CK',
	BAT_DONG_SAN: 'BDS',
	XAY_DUNG: 'XD',
	BAN_LE: 'BL',

	// All sectors from API (alphabetical)
	BAO_HIEM: 'BH',
	CONG_NGHE: 'CN',
	DAU_KHI: 'DK',
	DICH_VU_CONG_NGHIEP: 'DV-CN',
	DIEN: 'DIEN',
	DU_LICH: 'DL',
	HANG_CA_NHAN_GIA_DUNG: 'HCN-GD',
	HOA_CHAT: 'HC',
	OTHERS: 'KHAC',
	OTO_PHU_TUNG: 'OTO-PT',
	TAI_NGUYEN_CO_BAN: 'TN-CB',
	THUC_PHAM: 'TP',
	TRUYEN_THONG: 'TT',
	VIEN_THONG: 'VTH',
	Y_TE: 'YT',
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
export const INTRADAY_INTERVALS = ['1m', '5m', '15m', '30m', '1h', '4h'] as const

/**
 * LocalStorage key for basic backtest data
 */
export const BACKTEST_STORAGE_KEY = 'basic-backtest-data'

/**
 * LocalStorage key for watch page left sidebar open state
 */
export const WATCH_LEFT_SIDEBAR_OPEN_KEY = 'watch-left-sidebar-open'

/**
 * LocalStorage key for watch page right sidebar open state
 */
export const WATCH_RIGHT_SIDEBAR_OPEN_KEY = 'watch-right-sidebar-open'

/**
 * Debounce delay for visibility change refresh trigger (in milliseconds)
 * Prevents rapid refresh triggers from quick tab switching
 */
export const VISIBILITY_REFRESH_DEBOUNCE_MS = 5000

/**
 * Minimum time between refreshes (in milliseconds)
 * Prevents unnecessary refreshes if user just switched away and back quickly
 */
export const VISIBILITY_MIN_REFRESH_INTERVAL_MS = 30000

/**
 * LocalStorage key for theme preference
 */
export const THEME_STORAGE_KEY = 'site-settings-theme'

/**
 * Tooltip margin from crosshair in pixels
 */
export const TOOLTIP_MARGIN = 30

/**
 * Tooltip dimensions in pixels
 */
export const TOOLTIP_WIDTH = 200
export const TOOLTIP_HEIGHT = 90

/**
 * LocalStorage key for BasicTopPerformers view mode preference
 */
export const BASIC_TOP_PERFORMERS_VIEW_MODE_STORAGE_KEY = 'basic-top-performers-view-mode'

/**
 * LocalStorage key for chart page layout settings (chart count and grid columns)
 */
export const CHART_LAYOUT_STORAGE_KEY = 'chart-page-layout'

/**
 * LocalStorage key for watch page layout settings (page size and columns)
 */
export const WATCH_LAYOUT_STORAGE_KEY = 'watch-page-layout'

/**
 * LocalStorage key for chart compare tab state (secondary ticker, layout, swap)
 */
export const CHART_COMPARE_STORAGE_KEY = 'chart-compare-state'

/**
 * LocalStorage key for chart settings (interval, MA visibility, MACD, etc.)
 */
export const CHART_SETTINGS_STORAGE_KEY = 'chart-settings'
export const EMA_STORAGE_KEY = 'ema-enabled'
