/**
 * Ticker utility functions
 */

interface Ticker {
	symbol: string;
	sector: string;
}

// Common crypto symbols for fallback detection when ticker lists haven't loaded yet
const COMMON_CRYPTO_SYMBOLS = new Set([
	"BTCUSDT",
	"ETHUSDT",
	"XRPUSDT",
	"TONUSDT",
	"SOLUSDT",
	"BNBUSDT",
	"ADAUSDT",
	"DOGEUSDT",
	"AVAXUSDT",
	"DOTUSDT",
	"LINKUSDT",
	"MATICUSDT",
	"UNIUSDT",
	"ATOMUSDT",
	"LTCUSDT",
	"BCHUSDT",
	"XLMUSDT",
	"ALGOUSDT",
	"VETUSDT",
	"FILUSDT",
	"AAVEUSDT",
	"NEARUSDT",
	"APTUSDT",
	"ARBUSDT",
	"OPUSDT",
	"INJUSDT",
	"SUIUSDT",
	"SEIUSDT",
	"TIAUSDT",
	"PEPEUSDT",
]);

// Common global/yahoo symbols for fallback detection
const COMMON_GLOBAL_SYMBOLS = new Set([
	"GC=F",
	"SI=F",
	"CL=F",
	"^GSPC",
	"^DJI",
	"^NDX",
	"^N225",
	"^HSI",
	"DX-Y.NYB",
	"AAPL",
	"NVDA",
	"GOOGL",
	"SPY",
	"QQQ",
	"MSFT",
	"AMZN",
	"TSLA",
	"META",
]);

/**
 * Determines the mode of a ticker symbol: 'vn', 'crypto', or 'yahoo'
 *
 * Priority logic:
 * 1. Check stock tickers first - if found, it's a stock (vn)
 * 2. Check yahoo tickers second
 * 3. Check crypto tickers third
 * 4. Fallback to common symbol sets
 * 5. Default to 'all' if in none
 *
 * @param symbol - Ticker symbol to check
 * @param stockTickers - Array of stock tickers from APIContext
 * @param yahooTickers - Array of yahoo/global tickers from APIContext
 * @param cryptoTickers - Array of crypto tickers from APIContext
 * @returns 'vn' | 'crypto' | 'yahoo' | 'all'
 */
export function getTickerMode(
	symbol: string,
	stockTickers: Ticker[],
	yahooTickers: Ticker[],
	cryptoTickers: Ticker[],
): "vn" | "crypto" | "yahoo" | "all" {
	// Check stock tickers FIRST - highest priority
	if (stockTickers.some((t) => t.symbol === symbol)) {
		return "vn";
	}

	// Check yahoo tickers second
	if (yahooTickers.some((t) => t.symbol === symbol)) {
		return "yahoo";
	}

	// Check crypto tickers third
	if (cryptoTickers.some((t) => t.symbol === symbol)) {
		return "crypto";
	}

	// Fallback: check common symbol sets regardless of list state
	if (COMMON_CRYPTO_SYMBOLS.has(symbol)) return "crypto";
	if (COMMON_GLOBAL_SYMBOLS.has(symbol)) return "yahoo";

	return "all";
}

/**
 * Determines if a ticker symbol is crypto (backward compatibility shim)
 *
 * @deprecated Use getTickerMode() instead
 */
export function isCryptoTicker(
	symbol: string,
	stockTickers: Ticker[],
	cryptoTickers: Ticker[],
): boolean {
	return getTickerMode(symbol, stockTickers, [], cryptoTickers) === "crypto";
}
