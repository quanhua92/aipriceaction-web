import type { StockData } from "@/integrations/aipriceaction/src/types";

/**
 * Find the first bar where close price genuinely crossed the target.
 *
 * Uses close-only detection with stateful tracking across bars.
 * Price must move from one side of the target to the other side.
 * This prevents re-triggering after a reset when price is already
 * on the same side as the target.
 *
 * @param creationPrice - Close price when alert was created (or reset)
 * @param targetPrice - Target price for the alert
 * @param bars - Array of OHLCV bars (sorted chronologically)
 * @returns The first bar where close crossed the target, or null
 */
export function findPriceCrossBar(
	creationPrice: number,
	targetPrice: number,
	bars: StockData[],
): StockData | null {
	if (creationPrice === targetPrice) return null;

	const isUpward = targetPrice > creationPrice;

	for (const bar of bars) {
		if (isUpward && bar.close >= targetPrice) return bar;
		if (!isUpward && bar.close <= targetPrice) return bar;
	}

	return null;
}
