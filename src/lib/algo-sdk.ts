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

		buy(symbol: string, date: string, _qty?: number, stoploss?: number) {
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
				side: "long",
				price: bar.close,
				stoploss: stoploss ?? null,
			});
		},

		sell(symbol: string, date: string, _qty?: number, _stoploss?: number) {
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
				side: "long",
				price: bar.close,
				stoploss: null,
			});
		},

		log(...args: unknown[]) {
			logs.push({ args, timestamp: Date.now() });
		},

		params: {} as Record<string, unknown>,
	};
}
