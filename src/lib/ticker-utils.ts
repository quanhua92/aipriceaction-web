/**
 * Ticker utility functions
 */

interface Ticker {
  symbol: string
  sector: string
}

/**
 * Determines if a ticker symbol is crypto (with stock priority)
 *
 * Priority logic:
 * 1. Check stock tickers first - if found, it's a stock (not crypto)
 * 2. Only check crypto if NOT in stock list
 * 3. If in neither, default to false (stock mode)
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

  // Only check crypto if NOT in stock list
  const isCrypto = cryptoTickers.some(t => t.symbol === symbol)
  return isCrypto
}
