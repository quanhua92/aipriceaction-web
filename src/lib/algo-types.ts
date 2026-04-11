export type DataSplitName = "training" | "validation" | "testing";
export type AlgoOrderAction = "long" | "short";

/** Raw order emitted by long() / short() */
export interface AlgoOrder {
	symbol: string;
	date: string;
	action: AlgoOrderAction;
	price: number;
	stoploss: number | null;
}

/** Matched round-trip trade */
export interface AlgoTrade {
	symbol: string;
	side: "long" | "short";
	entryDate: string;
	entryPrice: number;
	exitDate: string | null;
	exitPrice: number | null;
	pnl: number;
	pnlPercent: number;
	stoploss: number | null;
	status: "open" | "closed";
}

/** Aggregate backtest result for one data split */
export interface AlgoResult {
	split: DataSplitName;
	dateRange: { start: string; end: string };
	trades: AlgoTrade[];
	totalTrades: number;
	wins: number;
	losses: number;
	winRate: number;
	totalPnL: number;
	bestTrade: AlgoTrade | null;
	worstTrade: AlgoTrade | null;
	maxDrawdown: number;
	executionTimeMs: number;
	errors: string[];
}

/** Single log entry from strategy execution */
export interface AlgoLogEntry {
	args: unknown[];
	timestamp: number;
}

/** Return type of executeAlgo() */
export interface AlgoExecutionResult {
	result: AlgoResult | null;
	logs: AlgoLogEntry[];
	error: string | null;
}

/** Strategy shape (for future phases) */
export interface AlgoStrategy {
	id: string;
	name: string;
	description: string;
	code: string;
	isBuiltIn: boolean;
	dataSplits: AlgoDataSplit;
	createdAt: string;
	updatedAt: string;
}

export interface AlgoDataSplit {
	training: { start: string; end: string };
	validation: { start: string; end: string };
	testing: { start: string; end: string };
}
