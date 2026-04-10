import type { StockData } from "@/integrations/aipriceaction/src";
import { createAlgoSDK } from "./algo-sdk";
import type {
	AlgoExecutionResult,
	AlgoLogEntry,
	AlgoOrder,
	AlgoResult,
	AlgoTrade,
	DataSplitName,
} from "./algo-types";

export function executeAlgo(
	code: string,
	marketData: Record<string, StockData[]>,
	params?: Record<string, unknown>,
	split: DataSplitName = "training",
	dateRange?: { start: string; end: string },
): AlgoExecutionResult {
	const sdk = createAlgoSDK(marketData);

	// Inject params before execution
	if (params) {
		Object.assign(sdk.params, params);
	}

	const startTime = performance.now();

	try {
		// Build sandboxed function — blocks dangerous globals
		const fn = new Function(
			"sdk",
			"window",
			"document",
			"fetch",
			"XMLHttpRequest",
			"importScripts",
			"eval",
			"Function",
			"setTimeout",
			"setInterval",
			`const { getTicker, buy, sell, log, params } = sdk; ${code}; if (typeof main === 'function') return main(); throw new Error('Script must define a main() function');`,
		);

		fn(
			sdk,
			undefined,
			undefined,
			undefined,
			undefined,
			undefined,
			undefined,
			undefined,
			undefined,
			undefined,
		);

		const executionTimeMs = performance.now() - startTime;
		const result = postProcessOrders(
			sdk.__orders,
			executionTimeMs,
			split,
			dateRange,
			sdk.__logs,
		);

		return { result, logs: sdk.__logs, error: null };
	} catch (err) {
		const executionTimeMs = performance.now() - startTime;
		const errorMsg = err instanceof Error ? err.message : String(err);
		const logs = sdk.__logs;

		return {
			result: {
				split,
				dateRange: dateRange || { start: "", end: "" },
				trades: [],
				totalTrades: 0,
				wins: 0,
				losses: 0,
				winRate: 0,
				totalPnL: 0,
				bestTrade: null,
				worstTrade: null,
				maxDrawdown: 0,
				executionTimeMs,
				errors: [errorMsg],
			},
			logs,
			error: errorMsg,
		};
	}
}

function postProcessOrders(
	orders: AlgoOrder[],
	executionTimeMs: number,
	split: DataSplitName,
	dateRange?: { start: string; end: string },
	logs?: AlgoLogEntry[],
): AlgoResult {
	const errors =
		orders.length === 0 && logs?.length === 0 ? ["No orders generated"] : [];

	// Group by symbol
	const bySymbol = new Map<string, AlgoOrder[]>();
	for (const order of orders) {
		const existing = bySymbol.get(order.symbol) || [];
		existing.push(order);
		bySymbol.set(order.symbol, existing);
	}

	// Sort each symbol's orders by date
	for (const [, symbolOrders] of bySymbol) {
		symbolOrders.sort((a, b) => a.date.localeCompare(b.date));
	}

	// FIFO matching: buy → sell = closed trade, unmatched buy = open
	const trades: AlgoTrade[] = [];
	for (const [, symbolOrders] of bySymbol) {
		let pendingBuy: AlgoOrder | null = null;

		for (const order of symbolOrders) {
			// Heuristic: a "buy" intent has stoploss or is first in pair; "sell" is exit
			// Simple approach: treat first order as entry, second as exit, repeat
			if (!pendingBuy) {
				pendingBuy = order;
			} else {
				// Close the trade
				const entryPrice = pendingBuy.price;
				const exitPrice = order.price;
				const pnl = exitPrice - entryPrice;
				const pnlPercent = entryPrice !== 0 ? (pnl / entryPrice) * 100 : 0;

				trades.push({
					symbol: pendingBuy.symbol,
					entryDate: pendingBuy.date,
					entryPrice,
					exitDate: order.date,
					exitPrice,
					pnl,
					pnlPercent,
					stoploss: pendingBuy.stoploss,
					status: "closed",
				});
				pendingBuy = null;
			}
		}

		// Unmatched buy → open trade
		if (pendingBuy) {
			trades.push({
				symbol: pendingBuy.symbol,
				entryDate: pendingBuy.date,
				entryPrice: pendingBuy.price,
				exitDate: null,
				exitPrice: null,
				pnl: 0,
				pnlPercent: 0,
				stoploss: pendingBuy.stoploss,
				status: "open",
			});
		}
	}

	// Calculate stats
	const closedTrades = trades.filter((t) => t.status === "closed");
	const wins = closedTrades.filter((t) => t.pnl > 0).length;
	const losses = closedTrades.filter((t) => t.pnl < 0).length;
	const totalPnL = closedTrades.reduce((sum, t) => sum + t.pnl, 0);
	const winRate =
		closedTrades.length > 0 ? (wins / closedTrades.length) * 100 : 0;

	// Best / worst trades
	let bestTrade: AlgoTrade | null = null;
	let worstTrade: AlgoTrade | null = null;
	for (const t of closedTrades) {
		if (!bestTrade || t.pnl > bestTrade.pnl) bestTrade = t;
		if (!worstTrade || t.pnl < worstTrade.pnl) worstTrade = t;
	}

	// Max drawdown (peak-to-trough in cumulative P&L)
	let maxDrawdown = 0;
	let peak = 0;
	let cumulative = 0;
	for (const t of closedTrades) {
		cumulative += t.pnl;
		if (cumulative > peak) peak = cumulative;
		const dd = peak - cumulative;
		if (dd > maxDrawdown) maxDrawdown = dd;
	}

	return {
		split,
		dateRange: dateRange || { start: "", end: "" },
		trades,
		totalTrades: trades.length,
		wins,
		losses,
		winRate,
		totalPnL,
		bestTrade,
		worstTrade,
		maxDrawdown,
		executionTimeMs,
		errors,
	};
}
