import type { StockData } from '@/integrations/aipriceaction/src/types'

/**
 * Check if a price crossed the target in a given OHLCV bar
 *
 * @param creationPrice - Price when alert was created
 * @param targetPrice - Target price for the alert
 * @param barLow - Low price of the bar
 * @param barHigh - High price of the bar
 * @returns true if price crossed target during this bar
 *
 * @example
 * // Alert: buy at 60k, currently at 50k
 * didPriceCrossTarget(50000, 60000, 59000, 65000) // true (crossed upward)
 *
 * // Alert: sell at 40k, currently at 50k
 * didPriceCrossTarget(50000, 40000, 38000, 45000) // true (crossed downward)
 *
 * // Alert: at 50k, target 60k, but bar is 51k-55k
 * didPriceCrossTarget(50000, 60000, 51000, 55000) // false (not reached yet)
 */
export function didPriceCrossTarget(
  creationPrice: number,
  targetPrice: number,
  barLow: number,
  barHigh: number
): boolean {
  // Upward alert: target is above creation price
  // Check if bar's high reached or exceeded target
  if (targetPrice > creationPrice) {
    return barHigh >= targetPrice
  }

  // Downward alert: target is below creation price
  // Check if bar's low reached or went below target
  if (targetPrice < creationPrice) {
    return barLow <= targetPrice
  }

  // Edge case: target equals creation price (already at target)
  return true
}

/**
 * Find the first bar where price crossed the target
 *
 * @param creationPrice - Price when alert was created
 * @param targetPrice - Target price for the alert
 * @param bars - Array of OHLCV bars (sorted chronologically)
 * @returns The first bar where price crossed, or null if no crossing found
 *
 * @example
 * const bars = [
 *   { time: '2025-11-01', low: 51000, high: 55000, ... },
 *   { time: '2025-11-02', low: 58000, high: 62000, ... }, // Crossed here!
 *   { time: '2025-11-03', low: 63000, high: 68000, ... },
 * ]
 * const cross = findPriceCrossBar(50000, 60000, bars)
 * // Returns: { time: '2025-11-02', low: 58000, high: 62000, ... }
 */
export function findPriceCrossBar(
  creationPrice: number,
  targetPrice: number,
  bars: StockData[]
): StockData | null {
  for (const bar of bars) {
    if (didPriceCrossTarget(creationPrice, targetPrice, bar.low, bar.high)) {
      return bar
    }
  }
  return null
}
