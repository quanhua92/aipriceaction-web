import type { StockData } from "@/integrations/aipriceaction/src/types";

/**
 * Find the first bar where close price crossed the target threshold.
 *
 * This is a stateless function that iterates bars chronologically and
 * returns the first bar where close >= target (upward) or close <= target (downward).
 *
 * Note: Re-triggering prevention is the caller's responsibility. The caller should
 * filter bars (e.g., by creation date) before passing them to this function to avoid
 * processing bars that were already checked in previous runs.
 *
 * @param creationPrice - Close price when alert was created (or reset)
 * @param targetPrice - Target price for the alert
 * @param bars - Array of OHLCV bars (sorted chronologically, filtered by caller)
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
