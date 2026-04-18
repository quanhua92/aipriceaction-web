/**
 * Data transformation utilities for chart components
 * Extracts and modularizes data processing logic from chart components
 */

import { type CandlestickData, type HistogramData, type LineData } from "lightweight-charts";
import { type StockData } from "@/lib/api-client";
import { NO_VOLUME_SYMBOLS } from "@/lib/constants";
import { parseUTCISOString, toVietnamUnixTime } from "@/lib/format";
import { MA_CONFIG } from "@/components/charts/utils/chartConfig";
import { MACD } from "lightweight-charts-indicators";
import type { Bar } from "oakscriptjs";

export interface ChartData {
	candlestick: CandlestickData[];
	volume: HistogramData[];
	volumeMA20: LineData[];
	ma10: LineData[];
	ma20: LineData[];
	ma50: LineData[];
	ma100: LineData[];
	ma200: LineData[];
	macdHistogram: HistogramData[];
	macdLine: LineData[];
	macdSignal: LineData[];
}

/**
 * Creates an empty chart data structure
 */
export const createEmptyChartData = (): ChartData => ({
	candlestick: [],
	volume: [],
	volumeMA20: [],
	ma10: [],
	ma20: [],
	ma50: [],
	ma100: [],
	ma200: [],
	macdHistogram: [],
	macdLine: [],
	macdSignal: [],
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
			? "#1e8c82"
			: "#d94040"
		: point.close >= point.open
			? "#1e8c82"
			: "#d94040";

	return {
		time,
		value: NO_VOLUME_SYMBOLS.includes(point.symbol as any) ? 0 : point.volume,
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
 * Calculates MACD using the lightweight-charts-indicators library.
 * Converts StockData to Bar format, runs MACD.calculate(), then maps
 * the output TimeValue[] arrays to lightweight-charts data types.
 */
function calculateMACDFromStockData(data: StockData[], timestamps: number[]) {
	if (data.length < 26) {
		return { macdHistogram: [], macdLine: [], macdSignal: [] };
	}

	// Build Bar[] for the library (time must be Unix seconds as number)
	const bars: Bar[] = data.map((point, i) => ({
		time: timestamps[i],
		open: point.open,
		high: point.high,
		low: point.low,
		close: point.close,
	}));

	const result = MACD.calculate(bars);

	const macdHistogram: HistogramData[] = [];
	const macdLine: LineData[] = [];
	const macdSignal: LineData[] = [];

	const histPlot = result.plots.plot0 ?? [];
	const macdPlot = result.plots.plot1 ?? [];
	const signalPlot = result.plots.plot2 ?? [];

	// Darken the library's bright histogram colors to match app style
	const histColorMap: Record<string, string> = {
		'#26A69A': '#1e8c82', // bright teal → darker teal
		'#B2DFDB': '#7cc0bb', // light teal → muted teal
		'#FF5252': '#d94040', // bright red → darker red
		'#FFCDD2': '#d9a0a3', // light pink → muted red
	};

	for (const item of histPlot) {
		if (!isNaN(item.value)) {
			macdHistogram.push({
				time: item.time,
				value: item.value,
				color: (item.color && histColorMap[item.color]) ?? item.color,
			});
		}
	}

	for (const item of macdPlot) {
		if (!isNaN(item.value)) {
			macdLine.push({
				time: item.time,
				value: item.value,
			});
		}
	}

	for (const item of signalPlot) {
		if (!isNaN(item.value)) {
			macdSignal.push({
				time: item.time,
				value: item.value,
			});
		}
	}

	return { macdHistogram, macdLine, macdSignal };
}

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
	const timestamps: number[] = [];
	const deduplicatedData: StockData[] = [];

	// Track seen timestamps to prevent duplicates
	const seenTimestamps = new Set<number>();

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

		// Skip duplicate timestamps to prevent lightweight-charts error
		if (seenTimestamps.has(time)) {
			return;
		}
		seenTimestamps.add(time);

		timestamps.push(time);
		deduplicatedData.push(point);

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
				? "#1e8c82"
				: "#d94040"
			: point.close >= point.open
				? "#1e8c82"
				: "#d94040";

		volume.push({
			time,
			value: NO_VOLUME_SYMBOLS.includes(point.symbol as any) ? 0 : point.volume,
			color: volumeColor + "80", // Add transparency
		});

		// Process MA data
		processMAData(point, time, maDataArrays);
	});

	// Calculate MACD using the library (pass deduplicated data to match timestamps)
	const { macdHistogram, macdLine, macdSignal } = calculateMACDFromStockData(deduplicatedData, timestamps);

	// Calculate 20-period simple moving average of volume
	const volumeMA20: LineData[] = [];
	if (volume.length >= 20) {
		for (let i = 19; i < volume.length; i++) {
			let sum = 0;
			for (let j = 0; j < 20; j++) {
				sum += volume[i - j].value;
			}
			volumeMA20.push({ time: volume[i].time, value: sum / 20 });
		}
	}

	return {
		candlestick,
		volume,
		volumeMA20,
		ma10: maDataArrays.ma10,
		ma20: maDataArrays.ma20,
		ma50: maDataArrays.ma50,
		ma100: maDataArrays.ma100,
		ma200: maDataArrays.ma200,
		macdHistogram,
		macdLine,
		macdSignal,
	};
};
