/**
 * Ticker utility functions
 */

interface Ticker {
  symbol: string
  sector: string
}

// Common crypto symbols for fallback detection when ticker lists haven't loaded yet
const COMMON_CRYPTO_SYMBOLS = new Set([
  'BTC', 'ETH', 'XRP', 'TON', 'SOL', 'BNB', 'ADA', 'DOGE', 'AVAX', 'DOT',
  'LINK', 'MATIC', 'UNI', 'ATOM', 'LTC', 'BCH', 'XLM', 'ALGO', 'VET', 'FIL',
  'AAVE', 'NEAR', 'APT', 'ARB', 'OP', 'INJ', 'SUI', 'SEI', 'TIA', 'PEPE',
])

/**
 * Determines if a ticker symbol is crypto (with stock priority)
 *
 * Priority logic:
 * 1. Check stock tickers first - if found, it's a stock (not crypto)
 * 2. Only check crypto if NOT in stock list
 * 3. If both lists are empty, fallback to common crypto symbols list
 * 4. If in neither, default to false (stock mode)
 *
 * This ensures stocks take priority if a symbol exists in both lists (edge case)
 *
 * @param symbol - Ticker symbol to check (e.g., "BTC", "ACB", "VNINDEX")
 * @param stockTickers - Array of stock tickers from APIContext
 * @param cryptoTickers - Array of crypto tickers from APIContext
 * @returns true if crypto, false if stock or unknown (defaults to stock)
 *
 * @example
 * isCryptoTicker("ACB", stocks, crypto) // false - stock only
 * isCryptoTicker("BTC", stocks, crypto) // true - crypto only
 * isCryptoTicker("X", stocks, crypto) // false - if in both, stock wins
 * isCryptoTicker("???", stocks, crypto) // false - unknown defaults to stock
 * isCryptoTicker("BTC", [], []) // true - fallback to common crypto list
 */
export function isCryptoTicker(
  symbol: string,
  stockTickers: Ticker[],
  cryptoTickers: Ticker[]
): boolean {
  // Check stock tickers FIRST - if found, it's a stock (not crypto)
  // This gives stock priority in case of symbol collision
  const isStock = stockTickers.some(t => t.symbol === symbol)
  if (isStock) {
    return false
  }

  // Check crypto tickers
  const isCrypto = cryptoTickers.some(t => t.symbol === symbol)
  if (isCrypto) {
    return true
  }

  // Fallback: if both lists are empty (not loaded yet), check common crypto symbols
  if (stockTickers.length === 0 && cryptoTickers.length === 0) {
    return COMMON_CRYPTO_SYMBOLS.has(symbol)
  }

  return false
}
