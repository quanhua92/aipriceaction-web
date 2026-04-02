import { SafeLocalStorage } from "./localStorage";

export interface Order {
	id: string;
	ticker: string;
	side: "long" | "short";
	entryPrice: number;
	stoploss: number;
	entryDate: string;
	exitPrice?: number;
	exitDate?: string;
	status: "open" | "closed";
}

export interface OrderBook {
	ticker: string;
	orders: Order[];
}

const ORDER_BOOK_PREFIX = "playground-order-book-";

export function getOrderBookKey(ticker: string): string {
	return `${ORDER_BOOK_PREFIX}${ticker.toUpperCase()}`;
}

export function loadOrderBook(ticker: string): Order[] {
	const key = getOrderBookKey(ticker);
	const raw = SafeLocalStorage.getItem(key);
	if (!raw) return [];

	try {
		const parsed = JSON.parse(raw) as OrderBook;
		return parsed.orders ?? [];
	} catch {
		return [];
	}
}

export function saveOrderBook(ticker: string, orders: Order[]): void {
	const key = getOrderBookKey(ticker);
	const book: OrderBook = { ticker: ticker.toUpperCase(), orders };
	SafeLocalStorage.setItem(key, JSON.stringify(book));
}

export function clearOrderBook(ticker: string): void {
	const key = getOrderBookKey(ticker);
	SafeLocalStorage.removeItem(key);
}

/**
 * FIFO close logic:
 * - When placing a Short, close earliest open Long(s) first, remaining become net short.
 * - When placing a Long, close earliest open Short(s) first, remaining become net long.
 * - On close: exitPrice = closePrice of the bar when the closing order is placed.
 *
 * Returns the updated orders array (mutated in place for performance).
 */
export function placeOrder(
	orders: Order[],
	ticker: string,
	side: "long" | "short",
	entryPrice: number,
	stoploss: number,
	closePrice: number,
	currentDate: string,
): Order[] {
	// Determine the opposing side to close via FIFO
	const opposingSide = side === "short" ? "long" : "short";
	let closedCount = 0;

	const updatedOrders = orders.map((order) => {
		if (closedCount >= 1) return order;
		if (order.side === opposingSide && order.status === "open") {
			closedCount++;
			return {
				...order,
				status: "closed" as const,
				exitPrice: closePrice,
				exitDate: currentDate,
			};
		}
		return order;
	});

	const newOrder: Order = {
		id: `${performance.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`,
		ticker,
		side,
		entryPrice,
		stoploss,
		entryDate: currentDate,
		status: closedCount > 0 ? "closed" : "open",
		exitPrice: closedCount > 0 ? closePrice : undefined,
		exitDate: closedCount > 0 ? currentDate : undefined,
	};

	return [...updatedOrders, newOrder];
}

/**
 * Calculate realized P&L from closed trades.
 */
export function calculateRealizedPnL(orders: Order[]): number {
	let total = 0;
	for (const order of orders) {
		if (order.status !== "closed" || order.exitPrice == null) continue;
		const direction = order.side === "long" ? 1 : -1;
		total += (order.exitPrice - order.entryPrice) * direction;
	}
	return total;
}

/**
 * Calculate unrealized P&L from open trades at a given current price.
 */
export function calculateUnrealizedPnL(
	orders: Order[],
	currentPrice: number,
): number {
	let total = 0;
	for (const order of orders) {
		if (order.status !== "open") continue;
		const direction = order.side === "long" ? 1 : -1;
		total += (currentPrice - order.entryPrice) * direction;
	}
	return total;
}

/**
 * Calculate net position (positive = net long, negative = net short).
 */
export function calculateNetPosition(orders: Order[]): number {
	let net = 0;
	for (const order of orders) {
		if (order.status !== "open") continue;
		net += order.side === "long" ? 1 : -1;
	}
	return net;
}

/**
 * Calculate R:R for a closed trade.
 * Risk = |entryPrice - stoploss|
 * Reward = |exitPrice - entryPrice|
 */
export function calculateRR(order: Order): number | null {
	const risk = Math.abs(order.entryPrice - order.stoploss);
	if (risk === 0) return null;
	if (order.status !== "closed" || order.exitPrice == null) return null;
	const reward = Math.abs(order.exitPrice - order.entryPrice);
	return reward / risk;
}

/**
 * Calculate signed R-multiple for a closed trade.
 * Positive for winners, negative for losers.
 */
export function calculateSignedR(order: Order): number | null {
	const risk = Math.abs(order.entryPrice - order.stoploss);
	if (risk === 0) return null;
	if (order.status !== "closed" || order.exitPrice == null) return null;
	const pnl =
		(order.exitPrice - order.entryPrice) * (order.side === "long" ? 1 : -1);
	return pnl / risk;
}

/**
 * Calculate potential signed R-multiple for an open trade at a given current price.
 */
export function calculatePotentialSignedR(
	order: Order,
	currentPrice: number,
): number | null {
	const risk = Math.abs(order.entryPrice - order.stoploss);
	if (risk === 0) return null;
	const pnl =
		(currentPrice - order.entryPrice) * (order.side === "long" ? 1 : -1);
	return pnl / risk;
}

/**
 * Calculate potential R:R for an open trade at a given current price.
 */
export function calculatePotentialRR(
	order: Order,
	currentPrice: number,
): number | null {
	const risk = Math.abs(order.entryPrice - order.stoploss);
	if (risk === 0) return null;
	const reward = Math.abs(currentPrice - order.entryPrice);
	return reward / risk;
}
