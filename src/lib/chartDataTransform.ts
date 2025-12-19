/**
 * Data transformation utilities for chart components
 * Extracts and modularizes data processing logic from chart components
 */

import { type CandlestickData, type HistogramData, type LineData, type Time } from "lightweight-charts";
import { type StockData } from "@/lib/api-client";
import { parseUTCISOString, toVietnamUnixTime } from "@/lib/format";
import { MA_CONFIG } from "@/components/charts/utils/chartConfig";
import { getVolumeCandlestickColor } from "@/lib/chartColors";

export interface ChartData {
	candlestick: CandlestickData[];
	volume: HistogramData[];
	ma10: LineData[];
	ma20: LineData[];
	ma50: LineData[];
	ma100: LineData[];
	ma200: LineData[];
}

/**
 * Creates an empty chart data structure
 */
export const createEmptyChartData = (): ChartData => ({
	candlestick: [],
	volume: [],
	ma10: [],
	ma20: [],
	ma50: [],
	ma100: [],
	ma200: [],
});

/**
 * Creates MA data arrays object for dynamic mapping
 */
export const createMADataArrays = () => {
	const ma10: LineData[] = [];
	const ma20: LineData[] = [];
	const ma50: LineData[] = [];
	const ma100: LineData[] = [];
	const ma200: LineData[] = [];

	return {
		ma10,
		ma20,
		ma50,
		ma100,
		ma200,
	} as const;
};

/**
 * Transforms a single stock data point to candlestick data
 */
export const transformCandlestickPoint = (point: StockData, index: number, data: StockData[]): CandlestickData => {
	// Parse UTC ISO string to Date object
	const dateTime = parseUTCISOString(point.time);

	// Convert to Vietnam timezone Unix timestamp for display
	const time = toVietnamUnixTime(dateTime) as any;

	return {
		time,
		open: point.open,
		high: point.high,
		low: point.low,
		close: point.close,
	};
};

/**
 * Transforms a single stock data point to volume histogram data
 */
export const transformVolumePoint = (point: StockData, index: number, data: StockData[]): HistogramData => {
	// Parse UTC ISO string to Date object
	const dateTime = parseUTCISOString(point.time);

	// Convert to Vietnam timezone Unix timestamp for display
	const time = toVietnamUnixTime(dateTime) as any;

	const prevPoint = index > 0 ? data[index - 1] : null;
	const volumeColor = prevPoint
		? point.close >= prevPoint.close
			? "#16a34a"
			: "#dc2626"
		: point.close >= point.open
			? "#16a34a"
			: "#dc2626";

	return {
		time,
		value: point.volume,
		color: volumeColor + "80", // Add transparency
	};
};

/**
 * Processes moving average data for all MA periods
 */
export const processMAData = (
	point: StockData,
	time: any,
	maDataArrays: ReturnType<typeof createMADataArrays>
) => {
	// Add moving averages if available using configuration
	MA_CONFIG.forEach(({ key }) => {
		const maValue = point[key as keyof typeof point] as number | undefined;
		if (maValue !== undefined && maValue !== null) {
			maDataArrays[key as keyof typeof maDataArrays].push({ time, value: maValue });
		}
	});
};

/**
 * Main transformation function that converts StockData[] to ChartData
 */
export const transformStockDataToChartData = (data: StockData[]): ChartData => {
	if (!data || data.length === 0) {
		return createEmptyChartData();
	}

	const candlestick: CandlestickData[] = [];
	const volume: HistogramData[] = [];
	const maDataArrays = createMADataArrays();

	// Transform each data point
	data.forEach((point, index) => {
		// Parse UTC ISO string to Date object (reuse from candlestick transformation)
		const dateTime = parseUTCISOString(point.time);

		// Skip invalid dates
		if (isNaN(dateTime.getTime())) {
			if (process.env.NODE_ENV === "development") {
				console.error("Invalid date in chart data:", point.time);
			}
			return;
		}

		const time = toVietnamUnixTime(dateTime) as any;

		// Transform candlestick data
		candlestick.push({
			time,
			open: point.open,
			high: point.high,
			low: point.low,
			close: point.close,
		});

		// Transform volume data
		const prevPoint = index > 0 ? data[index - 1] : null;
		const volumeColor = prevPoint
			? point.close >= prevPoint.close
				? "#16a34a"
				: "#dc2626"
			: point.close >= point.open
				? "#16a34a"
				: "#dc2626";

		volume.push({
			time,
			value: point.volume,
			color: volumeColor + "80", // Add transparency
		});

		// Process MA data
		processMAData(point, time, maDataArrays);
	});

	return {
		candlestick,
		volume,
		ma10: maDataArrays.ma10,
		ma20: maDataArrays.ma20,
		ma50: maDataArrays.ma50,
		ma100: maDataArrays.ma100,
		ma200: maDataArrays.ma200,
	};
};