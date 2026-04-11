import { createFileRoute } from "@tanstack/react-router";
import { Play } from "lucide-react";
import { useCallback, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { StockData } from "@/integrations/aipriceaction/src";
import { executeAlgo } from "@/lib/algo-runner";
import type { AlgoExecutionResult, AlgoTrade } from "@/lib/algo-types";

export const Route = createFileRoute("/algo/$id/edit")({
	component: AlgoEditPage,
});

const DEFAULT_CODE = `function main() {
  const symbol = params.symbol || 'VCB';
  const data = getTicker(symbol);
  if (data.length < 5) { log('Not enough data'); return; }

  for (let i = 1; i < data.length; i++) {
    const date = data[i].time.split('T')[0];
    if (data[i].close > data[i - 1].close) {
      long(symbol, date);
    } else {
      short(symbol, date);
    }
  }
  log('Strategy completed. Orders: ' + (data.length - 1));
}`;

/** Hardcoded 30-bar test data for VCB */
function generateMockData(): StockData[] {
	const data: StockData[] = [];
	let price = 60000;
	for (let i = 0; i < 30; i++) {
		const date = new Date(2025, 0, 2 + i); // 2025-01-02 to 2025-01-31
		const dateStr = date.toISOString().split("T")[0];
		// Random walk: ±500 VND
		price += (Math.random() - 0.48) * 1000;
		price = Math.max(55000, Math.min(65000, price));
		const change = (Math.random() - 0.5) * 200;
		data.push({
			symbol: "VCB",
			time: `${dateStr}T00:00:00Z`,
			open: price - change,
			high: price + Math.abs(change),
			low: price - Math.abs(change),
			close: price,
			volume: Math.floor(Math.random() * 500000) + 100000,
		});
	}
	return data;
}

function formatPnL(value: number): string {
	const sign = value >= 0 ? "+" : "";
	return `${sign}${value.toLocaleString("en-US", { maximumFractionDigits: 0 })}`;
}

function TradeRow({ trade }: { trade: AlgoTrade }) {
	return (
		<div className="grid grid-cols-9 gap-2 text-xs py-1 border-b border-border/50">
			<span className="font-mono">{trade.symbol}</span>
			<span
				className={`font-mono font-medium ${trade.side === "long" ? "text-green-500" : "text-red-500"}`}
			>
				{trade.side === "long" ? "L" : "S"}
			</span>
			<span className="font-mono">{trade.entryDate}</span>
			<span className="font-mono text-right">
				{trade.entryPrice.toLocaleString("en-US", { maximumFractionDigits: 0 })}
			</span>
			<span className="font-mono">{trade.exitDate ?? "—"}</span>
			<span className="font-mono text-right">
				{trade.exitPrice?.toLocaleString("en-US", {
					maximumFractionDigits: 0,
				}) ?? "—"}
			</span>
			<span
				className={`font-mono text-right ${trade.pnl > 0 ? "text-green-500" : trade.pnl < 0 ? "text-red-500" : ""}`}
			>
				{formatPnL(trade.pnl)}
			</span>
			<span
				className={`font-mono text-right ${trade.pnlPercent > 0 ? "text-green-500" : trade.pnlPercent < 0 ? "text-red-500" : ""}`}
			>
				{formatPnL(trade.pnlPercent)}%
			</span>
			<span
				className={`text-right text-[10px] ${trade.status === "open" ? "text-yellow-500" : "text-muted-foreground"}`}
			>
				{trade.status}
			</span>
		</div>
	);
}

function AlgoEditPage() {
	const { id } = Route.useParams();
	const [code, setCode] = useState(DEFAULT_CODE);
	const [output, setOutput] = useState<AlgoExecutionResult | null>(null);
	const mockDataRef = useRef<Record<string, StockData[]> | null>(null);

	const getMockData = useCallback(() => {
		if (!mockDataRef.current) {
			mockDataRef.current = { VCB: generateMockData() };
		}
		return mockDataRef.current;
	}, []);

	const handleRun = useCallback(() => {
		const marketData = getMockData();
		const result = executeAlgo(code, marketData, { symbol: "VCB" });
		setOutput(result);
	}, [code, getMockData]);

	return (
		<div className="container mx-auto p-4 md:p-6 space-y-4">
			<div className="flex items-center justify-between">
				<h1 className="text-xl font-bold">Algo Trading — {id}</h1>
			</div>

			{/* Editor */}
			<Card>
				<CardHeader>
					<CardTitle className="text-sm font-medium text-muted-foreground">
						Strategy Editor
					</CardTitle>
				</CardHeader>
				<CardContent>
					<textarea
						value={code}
						onChange={(e) => setCode(e.target.value)}
						className="w-full h-[400px] font-mono text-sm bg-muted/50 border rounded-md p-3 resize-none focus:outline-none focus:ring-2 focus:ring-ring"
						spellCheck={false}
					/>
					<div className="mt-3">
						<Button onClick={handleRun} size="sm">
							<Play className="size-4" />
							Run
						</Button>
					</div>
				</CardContent>
			</Card>

			{/* Console */}
			<Card>
				<CardHeader>
					<CardTitle className="text-sm font-medium text-muted-foreground">
						Console
					</CardTitle>
				</CardHeader>
				<CardContent>
					<div className="bg-muted/50 border rounded-md p-3 min-h-[80px] max-h-[200px] overflow-y-auto font-mono text-xs">
						{output ? (
							<>
								{output.error && (
									<div className="text-red-500 mb-1">
										&gt; Error: {output.error}
									</div>
								)}
								{output.logs.map((entry) => (
									<div key={entry.timestamp} className="text-muted-foreground">
										&gt; {entry.args.map((a) => String(a)).join(" ")}
									</div>
								))}
								{!output.error && output.logs.length === 0 && (
									<div className="text-muted-foreground">No output</div>
								)}
							</>
						) : (
							<div className="text-muted-foreground">
								Click Run to execute strategy
							</div>
						)}
					</div>
				</CardContent>
			</Card>

			{/* Results */}
			{output?.result && (
				<Card>
					<CardHeader>
						<CardTitle className="text-sm font-medium text-muted-foreground">
							Results
						</CardTitle>
					</CardHeader>
					<CardContent className="space-y-4">
						{/* Summary stats */}
						<div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-3">
							<StatItem
								label="Trades"
								value={String(output.result.totalTrades)}
							/>
							<StatItem
								label="Win Rate"
								value={`${output.result.winRate.toFixed(1)}%`}
							/>
							<StatItem
								label="Total P&L"
								value={formatPnL(output.result.totalPnL)}
								highlight={output.result.totalPnL > 0}
							/>
							<StatItem label="Wins" value={String(output.result.wins)} />
							<StatItem label="Losses" value={String(output.result.losses)} />
							<StatItem
								label="Max DD"
								value={formatPnL(-output.result.maxDrawdown)}
							/>
						</div>

						{/* Best / worst */}
						<div className="grid grid-cols-2 gap-3 text-xs">
							{output.result.bestTrade && (
								<div className="text-green-500">
									Best: {output.result.bestTrade.entryDate} →{" "}
									{output.result.bestTrade.exitDate} (
									{formatPnL(output.result.bestTrade.pnl)})
								</div>
							)}
							{output.result.worstTrade && (
								<div className="text-red-500">
									Worst: {output.result.worstTrade.entryDate} →{" "}
									{output.result.worstTrade.exitDate} (
									{formatPnL(output.result.worstTrade.pnl)})
								</div>
							)}
						</div>

						{/* Trade list */}
						{output.result.trades.length > 0 && (
							<div>
								<div className="grid grid-cols-9 gap-2 text-xs font-medium text-muted-foreground mb-1">
									<span>Symbol</span>
									<span>Side</span>
									<span>Entry</span>
									<span className="text-right">Entry Price</span>
									<span>Exit</span>
									<span className="text-right">Exit Price</span>
									<span className="text-right">P&L</span>
									<span className="text-right">P&L%</span>
									<span className="text-right">Status</span>
								</div>
								<div className="max-h-[200px] overflow-y-auto">
									{output.result.trades.map((trade) => (
										<TradeRow
											key={`${trade.symbol}-${trade.entryDate}`}
											trade={trade}
										/>
									))}
								</div>
							</div>
						)}

						{/* Execution time */}
						<div className="text-xs text-muted-foreground">
							Executed in {output.result.executionTimeMs.toFixed(1)}ms
						</div>
					</CardContent>
				</Card>
			)}
		</div>
	);
}

function StatItem({
	label,
	value,
	highlight,
}: {
	label: string;
	value: string;
	highlight?: boolean;
}) {
	return (
		<div className="bg-muted/50 rounded-md p-2">
			<div className="text-[10px] text-muted-foreground mb-0.5">{label}</div>
			<div
				className={`text-sm font-mono font-medium ${highlight ? "text-green-500" : ""}`}
			>
				{value}
			</div>
		</div>
	);
}
