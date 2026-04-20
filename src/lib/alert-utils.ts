import type { StockData } from "@/integrations/aipriceaction/src/types";

/**
 * Find the first bar where price genuinely crossed the target.
 *
 * Requires a directional cross: price must move from one side of the target
 * to the other side. This prevents re-triggering after a reset when price
 * is already on the same side as the target.
 *
 * For upward alert (creationPrice < targetPrice):
 *   Price must be below target, then a bar must reach above target.
 *   If creationPrice >= targetPrice (reset case), price must drop below
 *   target first, then rise above.
 *
 * For downward alert (creationPrice > targetPrice):
 *   Price must be above target, then a bar must reach below target.
 *   If creationPrice <= targetPrice (reset case), price must rise above
 *   target first, then drop below.
 *
 * @param creationPrice - Price when alert was created (or reset)
 * @param targetPrice - Target price for the alert
 * @param bars - Array of OHLCV bars (sorted chronologically)
 * @returns The first bar where a genuine cross occurred, or null
 */
export function findPriceCrossBar(
	creationPrice: number,
	targetPrice: number,
	bars: StockData[],
): StockData | null {
	const isUpward = targetPrice > creationPrice;

	for (const bar of bars) {
		if (isUpward) {
			// Upward cross: need price below target, then a bar reaching >= target
			if (bar.low < targetPrice && bar.high >= targetPrice) {
				return bar;
			}
		} else if (targetPrice < creationPrice) {
			// Downward cross: need price above target, then a bar reaching <= target
			if (bar.high > targetPrice && bar.low <= targetPrice) {
				return bar;
			}
		}
		// targetPrice == creationPrice: no meaningful direction, never trigger
	}
	return null;
}
