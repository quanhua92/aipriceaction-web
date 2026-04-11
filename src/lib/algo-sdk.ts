import type { StockData } from "@/integrations/aipriceaction/src";
import type { AlgoLogEntry, AlgoOrder } from "./algo-types";

export function createAlgoSDK(marketData: Record<string, StockData[]>) {
	const orders: AlgoOrder[] = [];
	const logs: AlgoLogEntry[] = [];

	return {
		__orders: orders,
		__logs: logs,

		getTicker(symbol: string): StockData[] {
			return marketData[symbol] || [];
		},

		long(symbol: string, date: string, _qty?: number, stoploss?: number) {
			const data = marketData[symbol];
			if (!data) {
				logs.push({
					args: [`Unknown symbol: ${symbol}`],
					timestamp: Date.now(),
				});
				return;
			}
			const bar = data.find((d) => d.time.startsWith(date));
			if (!bar) {
				logs.push({
					args: [`No data for ${symbol} on ${date}`],
					timestamp: Date.now(),
				});
				return;
			}
			orders.push({
				symbol,
				date,
				action: "long",
				price: bar.close,
				stoploss: stoploss ?? null,
			});
		},

		short(symbol: string, date: string, _qty?: number, stoploss?: number) {
			const data = marketData[symbol];
			if (!data) {
				logs.push({
					args: [`Unknown symbol: ${symbol}`],
					timestamp: Date.now(),
				});
				return;
			}
			const bar = data.find((d) => d.time.startsWith(date));
			if (!bar) {
				logs.push({
					args: [`No data for ${symbol} on ${date}`],
					timestamp: Date.now(),
				});
				return;
			}
			orders.push({
				symbol,
				date,
				action: "short",
				price: bar.close,
				stoploss: stoploss ?? null,
			});
		},

		log(...args: unknown[]) {
			logs.push({ args, timestamp: Date.now() });
		},

		params: {} as Record<string, unknown>,
	};
}
