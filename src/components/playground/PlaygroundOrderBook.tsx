import { Trash2 } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
import {
	formatPrice,
	formatToVietnamDateShort,
	formatToVietnamDateTimeShort,
	parseUTCISOString,
} from "@/lib/format";
import {
	calculateNetPosition,
	calculatePotentialRR,
	calculatePotentialSignedR,
	calculateRealizedPnL,
	calculateRR,
	calculateSignedR,
	calculateUnrealizedPnL,
	clearOrderBook,
	loadOrderBook,
	type Order,
	placeOrder,
	saveOrderBook,
} from "@/lib/order-book-storage";
import { usePlayground } from "./PlaygroundDataProvider";

export function PlaygroundOrderBook() {
	const { playgroundData, visibleData } = usePlayground();
	const ticker = playgroundData.ticker;
	const currentIndex = playgroundData.currentIndex;
	const currentBar = visibleData[currentIndex];

	const [orders, setOrders] = useState<Order[]>(() => loadOrderBook(ticker));
	const [stoplossPct, setStoplossPct] = useState("1");
	const [clearDialogOpen, setClearDialogOpen] = useState(false);

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

	const realizedPnL = calculateRealizedPnL(orders);
	const unrealizedPnL = calculateUnrealizedPnL(orders, currentPrice);
	const netPnL = realizedPnL + unrealizedPnL;
	const netPosition = calculateNetPosition(orders);

	// Closed trade stats — only count original orders, not FIFO closers (entryDate === exitDate)
	const closedOrders = orders.filter((o) => o.status === "closed");
	const tradeOrders = closedOrders.filter((o) => o.entryDate !== o.exitDate);
	const winCount = tradeOrders.filter((o) => {
		const pnl =
			o.exitPrice != null
				? (o.exitPrice - o.entryPrice) * (o.side === "long" ? 1 : -1)
				: 0;
		return pnl > 0;
	}).length;
	const lossCount = tradeOrders.length - winCount;
	const winRate =
		tradeOrders.length > 0 ? (winCount / tradeOrders.length) * 100 : 0;

	const totalRealizedR = tradeOrders.reduce((sum, o) => {
		const r = calculateSignedR(o);
		return sum + (r ?? 0);
	}, 0);

	const totalUnrealizedR = orders
		.filter((o) => o.status === "open")
		.reduce((sum, o) => {
			const r = calculatePotentialSignedR(o, currentPrice);
			return sum + (r ?? 0);
		}, 0);

	const netR = totalRealizedR + totalUnrealizedR;

	const avgRealizedR =
		tradeOrders.length > 0 ? totalRealizedR / tradeOrders.length : 0;

	const handlePlace = useCallback(
		(side: "long" | "short") => {
			if (!currentBar) return;
			const price = currentBar.close;
			const pct = Number.parseFloat(stoplossPct);
			if (Number.isNaN(pct) || pct <= 0) return;

			const sl =
				side === "long"
					? Math.round(price * (1 - pct / 100))
					: Math.round(price * (1 + pct / 100));

			if (sl <= 0) return;

			setOrders((prev) => {
				const next = placeOrder(
					prev,
					ticker,
					side,
					price,
					sl,
					currentPrice,
					currentDate,
				);
				return next;
			});
		},
		[currentBar, stoplossPct, ticker, currentPrice, currentDate],
	);

	const handleClear = useCallback(() => {
		setOrders([]);
		clearOrderBook(ticker);
	}, [ticker]);

	const formatPnL = (value: number) => {
		const formatted = value >= 0 ? `+${value.toFixed(0)}` : value.toFixed(0);
		return formatted;
	};

	const formatPnLPct = (order: Order) => {
		if (order.entryPrice === 0) return "-";
		const pct = (orderPnL(order) / order.entryPrice) * 100;
		if (pct > 0) return `+${pct.toFixed(1)}%`;
		return `${pct.toFixed(1)}%`;
	};

	const pnLColor = (value: number) =>
		value > 0
			? "text-green-600"
			: value < 0
				? "text-red-600"
				: "text-muted-foreground";

	const rrDisplay = (order: Order) => {
		if (order.status === "closed") {
			const rr = calculateRR(order);
			if (rr == null) return "-";
			return `${rr.toFixed(1)}R`;
		}
		const rr = calculatePotentialRR(order, currentPrice);
		if (rr == null) return "-";
		return `${rr.toFixed(1)}R`;
	};

	const orderPnL = (order: Order) => {
		if (order.status === "closed" && order.exitPrice != null) {
			const direction = order.side === "long" ? 1 : -1;
			return (order.exitPrice - order.entryPrice) * direction;
		}
		if (order.status === "open") {
			const direction = order.side === "long" ? 1 : -1;
			return (currentPrice - order.entryPrice) * direction;
		}
		return 0;
	};

	const formatDecimal = (value: number) => formatPrice(value, false);

	const isIntraday =
		playgroundData.interval !== "1D" && playgroundData.interval !== "1W";

	const formatDate = (isoString: string) => {
		if (!isoString) return "-";
		const date = parseUTCISOString(isoString);
		return isIntraday
			? formatToVietnamDateTimeShort(date)
			: formatToVietnamDateShort(date);
	};

	return (
		<>
			<div className="border rounded-lg overflow-hidden">
				{/* Controls */}
				<div className="flex items-center justify-between p-3 bg-muted/30 border-b">
					<div className="flex items-center gap-2">
						<Button
							size="sm"
							variant="default"
							className="bg-green-600 hover:bg-green-700 text-white"
							onClick={() => handlePlace("long")}
							disabled={!currentBar}
						>
							Long
						</Button>
						<Button
							size="sm"
							variant="default"
							className="bg-red-600 hover:bg-red-700 text-white"
							onClick={() => handlePlace("short")}
							disabled={!currentBar}
						>
							Short
						</Button>
						<span className="text-sm text-muted-foreground ml-2">
							Position:
							<span
								className={`font-mono font-medium ml-1 ${
									netPosition > 0
										? "text-green-600"
										: netPosition < 0
											? "text-red-600"
											: "text-muted-foreground"
								}`}
							>
								{netPosition > 0 ? "+" : ""}
								{netPosition}
							</span>
						</span>
					</div>
					<Button
						size="sm"
						variant="ghost"
						className="text-muted-foreground hover:text-destructive"
						onClick={() => setClearDialogOpen(true)}
						disabled={orders.length === 0}
					>
						<Trash2 className="h-4 w-4" />
					</Button>
				</div>
				{/* Stop Loss % row */}
				<div className="flex items-center gap-2 px-3 py-2 border-b">
					<span className="text-sm text-muted-foreground">Price</span>
					<span className="font-mono text-sm font-medium">
						{formatDecimal(currentPrice)}
					</span>
					<span className="text-sm text-muted-foreground ml-2">SL %</span>
					<Input
						type="number"
						min="0.1"
						step="0.1"
						value={stoplossPct}
						onChange={(e) => setStoplossPct(e.target.value)}
						className="w-20 h-8 text-sm font-mono"
					/>
					{currentBar && (
						<span className="text-xs text-muted-foreground">
							→{" "}
							{formatDecimal(
								Math.round(
									currentBar.close * (1 - Number(stoplossPct || 0) / 100),
								),
							)}{" "}
							/{" "}
							{formatDecimal(
								Math.round(
									currentBar.close * (1 + Number(stoplossPct || 0) / 100),
								),
							)}
						</span>
					)}
				</div>

				{/* Table */}
				<div className="overflow-auto max-h-[500px]">
					<Table>
						<TableHeader>
							<TableRow className="bg-muted/30">
								<TableHead className="sticky left-0 bg-muted/30 z-10 min-w-16 text-center">
									Side
								</TableHead>
								<TableHead className="text-center min-w-24">Date</TableHead>
								<TableHead className="text-center min-w-24">Entry</TableHead>
								<TableHead className="text-center min-w-24">
									Stop Loss
								</TableHead>
								<TableHead className="text-center min-w-24">Exit</TableHead>
								<TableHead className="text-center min-w-20">R:R</TableHead>
								<TableHead className="text-center min-w-20">P&L</TableHead>
								<TableHead className="text-center min-w-20">%</TableHead>
								<TableHead className="text-center min-w-20">Status</TableHead>
							</TableRow>
						</TableHeader>
						<TableBody>
							{orders.length === 0 ? (
								<TableRow>
									<TableCell
										colSpan={9}
										className="text-center text-muted-foreground py-6"
									>
										No trades yet
									</TableCell>
								</TableRow>
							) : (
								orders.map((order) => {
									const pnl = orderPnL(order);
									return (
										<TableRow key={order.id}>
											<TableCell className="sticky left-0 bg-background z-10 text-center font-medium">
												<span
													className={
														order.side === "long"
															? "text-green-600"
															: "text-red-600"
													}
												>
													{order.side === "long" ? "L" : "S"}
												</span>
											</TableCell>
											<TableCell className="text-center font-mono text-xs">
												{formatDate(order.entryDate)}
											</TableCell>
											<TableCell className="text-center font-mono text-sm">
												{formatDecimal(order.entryPrice)}
											</TableCell>
											<TableCell className="text-center font-mono text-sm text-red-600">
												{formatDecimal(order.stoploss)}
											</TableCell>
											<TableCell className="text-center font-mono text-sm">
												{order.status === "closed" && order.exitPrice != null
													? formatDecimal(order.exitPrice)
													: "-"}
											</TableCell>
											<TableCell
												className={`text-center font-mono text-sm ${pnLColor(pnl)}`}
											>
												{rrDisplay(order)}
											</TableCell>
											<TableCell
												className={`text-center font-mono text-sm font-medium ${pnLColor(pnl)}`}
											>
												{formatPnL(pnl)}
											</TableCell>
											<TableCell
												className={`text-center font-mono text-sm ${pnLColor(pnl)}`}
											>
												{formatPnLPct(order)}
											</TableCell>
											<TableCell className="text-center">
												{order.status === "open" ? (
													<Badge variant="secondary" className="text-xs">
														Open
													</Badge>
												) : (
													<Badge variant="outline" className="text-xs">
														Closed
													</Badge>
												)}
											</TableCell>
										</TableRow>
									);
								})
							)}
						</TableBody>
					</Table>
				</div>

				{/* Summary */}
				<div className="p-3 border-t text-sm space-y-1.5">
					{/* P&L row */}
					<div className="flex items-center gap-4 flex-wrap">
						<span>
							Realized:{" "}
							<span
								className={`font-mono font-medium ${pnLColor(realizedPnL)}`}
							>
								{formatPnL(realizedPnL)}
							</span>
						</span>
						<span>
							Unrealized:{" "}
							<span
								className={`font-mono font-medium ${pnLColor(unrealizedPnL)}`}
							>
								{formatPnL(unrealizedPnL)}
							</span>
						</span>
						<span>
							Net P&L:{" "}
							<span className={`font-mono font-bold ${pnLColor(netPnL)}`}>
								{formatPnL(netPnL)}
							</span>
						</span>
					</div>
					{/* R-multiple row */}
					<div className="flex items-center gap-4 flex-wrap">
						<span>
							Realized R:{" "}
							<span
								className={`font-mono font-medium ${pnLColor(totalRealizedR)}`}
							>
								{totalRealizedR > 0 ? "+" : ""}
								{totalRealizedR.toFixed(1)}R
							</span>
						</span>
						<span>
							Unrealized R:{" "}
							<span
								className={`font-mono font-medium ${pnLColor(totalUnrealizedR)}`}
							>
								{totalUnrealizedR > 0 ? "+" : ""}
								{totalUnrealizedR.toFixed(1)}R
							</span>
						</span>
						<span>
							Net R:{" "}
							<span className={`font-mono font-bold ${pnLColor(netR)}`}>
								{netR > 0 ? "+" : ""}
								{netR.toFixed(1)}R
							</span>
						</span>
					</div>
					{/* Trade stats row */}
					<div className="flex items-center gap-4 flex-wrap text-muted-foreground">
						<span>
							Trades:{" "}
							<span className="font-mono">
								{winCount}W / {lossCount}L
							</span>
						</span>
						<span>
							Win Rate:{" "}
							<span
								className={`font-mono ${winRate >= 50 ? "text-green-600" : "text-red-600"}`}
							>
								{winRate.toFixed(0)}%
							</span>
						</span>
						<span>
							Avg R:{" "}
							<span className={`font-mono ${pnLColor(avgRealizedR)}`}>
								{avgRealizedR > 0 ? "+" : ""}
								{avgRealizedR.toFixed(2)}R
							</span>
						</span>
					</div>
				</div>
			</div>

			{/* Clear confirmation dialog */}
			<Dialog open={clearDialogOpen} onOpenChange={setClearDialogOpen}>
				<DialogContent className="sm:max-w-sm">
					<DialogHeader>
						<DialogTitle>Clear Order Book</DialogTitle>
						<DialogDescription>
							This will delete all trades for {ticker}. This action cannot be
							undone.
						</DialogDescription>
					</DialogHeader>
					<DialogFooter>
						<Button variant="outline" onClick={() => setClearDialogOpen(false)}>
							Cancel
						</Button>
						<Button
							variant="destructive"
							onClick={() => {
								handleClear();
								setClearDialogOpen(false);
							}}
						>
							Clear All
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>
		</>
	);
}
