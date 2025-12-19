/**
 * Color utility functions for chart components
 * Eliminates repetitive color logic across chart components
 */

export type ColorType = 'text' | 'background' | 'border';

/**
 * Returns Tailwind CSS color classes based on percentage change
 * Uses Vietnamese market color scheme:
 * - > 6.5%: Purple (very strong gain)
 * - >= 0%: Green (gain)
 * - < -6.5%: Cyan (very strong loss)
 * - else: Red (loss)
 */
export const getChangeColors = (change: number): {
	symbol: string;
	price: string;
	percent: string;
} => {
	const baseColor =
		change > 6.5
			? "text-purple-400"
			: change >= 0
				? "text-green-400"
				: change < -6.5
					? "text-cyan-400"
					: "text-red-400";

	return {
		symbol: baseColor,
		price: baseColor,
		percent: baseColor,
	};
};

/**
 * Returns volume color class based on volume change
 */
export const getVolumeColor = (volumeChange: number): string => {
	return volumeChange >= 0 ? "text-green-400" : "text-red-400";
};

/**
 * Returns volume percent color (darker shade for contrast)
 */
export const getVolumePercentColor = (volumeChange: number): string => {
	return volumeChange >= 0 ? "text-green-600" : "text-red-600";
};

/**
 * Returns MA (Moving Average) color based on score
 */
export const getMAColor = (score: number): string => {
	return score >= 0 ? "#16a34a" : "#dc2626";
};

/**
 * Returns basic change color (green for positive, red for negative)
 */
export const getBasicChangeColor = (change: number): string => {
	return change >= 0 ? "#16a34a" : "#dc2626";
};

/**
 * Returns bullish/bearish color for candlestick volume
 */
export const getVolumeCandlestickColor = (current: number, previous: number | undefined): string => {
	if (!previous) {
		return current >= current ? "#16a34a" : "#dc2626";
	}
	return current >= previous ? "#16a34a" : "#dc2626";
};

// Predefined MA colors from chartConfig
export const MA_COLORS = {
	ma10: '#dc2626',
	ma20: '#16a34a',
	ma50: '#2563eb',
	ma100: '#a1a1aa',
	ma200: '#71717a',
} as const;