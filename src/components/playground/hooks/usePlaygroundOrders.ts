import { useCallback, useEffect, useState } from "react";
import { type StockData } from "@/lib/api-client";
import {
	clearOrderBook,
	loadOrderBook,
	type Order,
	placeOrder,
	saveOrderBook,
} from "@/lib/order-book-storage";

export function usePlaygroundOrders(
	ticker: string,
	visibleData: StockData[],
	currentIndex: number,
) {
	const [orders, setOrders] = useState<Order[]>(() => loadOrderBook(ticker));
	const [stoplossPct, setStoplossPct] = useState("1");

	const currentBar = visibleData[currentIndex];

	// Load orders when ticker changes
	useEffect(() => {
		setOrders(loadOrderBook(ticker));
	}, [ticker]);

	// Persist orders on change
	useEffect(() => {
		saveOrderBook(ticker, orders);
	}, [ticker, orders]);

	const currentPrice = currentBar?.close ?? 0;
	const currentDate = currentBar?.time ?? "";

	const handlePlace = useCallback(
		(side: "long" | "short") => {
			if (!currentBar) return;
			const price = currentBar.close;
			const pct = Number.parseFloat(stoplossPct);
			if (Number.isNaN(pct) || pct <= 0) return;

			const sl =
				side === "long" ? price * (1 - pct / 100) : price * (1 + pct / 100);

			if (sl <= 0) return;

			setOrders((prev) =>
				placeOrder(prev, ticker, side, price, sl, currentPrice, currentDate),
			);
		},
		[currentBar, stoplossPct, ticker, currentPrice, currentDate],
	);

	const handleClear = useCallback(() => {
		setOrders([]);
		clearOrderBook(ticker);
	}, [ticker]);

	return {
		orders,
		stoplossPct,
		setStoplossPct,
		handlePlace,
		handleClear,
	};
}
