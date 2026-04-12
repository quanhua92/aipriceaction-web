import * as React from "react";
import { useAPI } from "@/contexts/APIContext";
import { useTranslation } from "@/hooks/useTranslation";
import { formatPercent, formatPrice, formatVolume } from "@/lib/format";
import { getSectorDisplayName } from "@/lib/sector-names";
import type { TopPerformerCardProps } from "./types";

export function TopPerformerCard({
	performer,
	onClick,
}: TopPerformerCardProps) {
	const isPositive = performer.change >= 0;
	const { language } = useTranslation();
	const { ema } = useAPI();
	const maPrefix = ema ? "EMA" : "MA";

	return (
		<div
			onClick={onClick}
			className={`flex items-center p-3 border-b border-border transition-colors ${
				onClick ? "hover:bg-muted/50 cursor-pointer" : ""
			}`}
		>
			{/* Left side: Ticker with sector below */}
			<div className="flex flex-col flex-shrink-0 w-20">
				<span
					className={`font-mono font-bold ${performer.symbol.length >= 4 ? "text-xs" : "text-sm"}`}
				>
					{performer.symbol}
				</span>
				<span className="text-xs text-muted-foreground/70 truncate">
					{getSectorDisplayName(performer.sector, language)}
				</span>
			</div>

			{/* Right side: Details - compact multiline layout */}
			<div className="flex-1 pl-4">
				{/* Line 1: Price and % change - most important info */}
				<div className="flex items-baseline gap-2 text-sm">
					<span className="font-mono font-medium">
						{formatPrice(performer.price, {
							symbol: performer.symbol,
							mode: performer.mode === "crypto" ? "crypto" : "vn",
						})}
					</span>
					<span
						className={`text-xs font-medium ${
							isPositive ? "text-green-600" : "text-red-600"
						}`}
					>
						{isPositive ? "+" : ""}
						{performer.change.toFixed(1)}%
					</span>
				</div>

				{/* Line 2: Volume with change percentage (like tooltip) */}
				<div className="flex items-baseline gap-2 text-xs mt-1">
					<span className="text-muted-foreground">
						{formatVolume(performer.volume)}
					</span>
					{performer.volumeChanged !== null &&
						performer.volumeChanged !== undefined && (
							<span
								style={{
									color:
										performer.volumeChanged >= 0
											? "var(--color-up)"
											: "var(--color-down)",
								}}
							>
								{formatPercent(performer.volumeChanged)}
							</span>
						)}
				</div>

				{/* Line 3: Multiple MA scores in compact format */}
				<div className="flex items-center gap-3 text-xs text-muted-foreground mt-1">
					{performer.ma10_score !== null &&
						performer.ma10_score !== undefined && (
							<span
								className={
									performer.ma10_score >= 0
										? "text-green-700 dark:text-green-400"
										: "text-red-700 dark:text-red-400"
								}
							>
								{maPrefix}10:{performer.ma10_score.toFixed(1)}%
							</span>
						)}
					{performer.ma20_score !== null &&
						performer.ma20_score !== undefined && (
							<span
								className={
									performer.ma20_score >= 0
										? "text-green-700 dark:text-green-400"
										: "text-red-700 dark:text-red-400"
								}
							>
								{maPrefix}20:{performer.ma20_score.toFixed(1)}%
							</span>
						)}
					{performer.ma50_score !== null &&
						performer.ma50_score !== undefined && (
							<span
								className={
									performer.ma50_score >= 0
										? "text-green-700 dark:text-green-400"
										: "text-red-700 dark:text-red-400"
								}
							>
								{maPrefix}50:{performer.ma50_score.toFixed(1)}%
							</span>
						)}
				</div>

				{/* Line 4: Traded value (if significant) */}
				{performer.value >= 1000000 && (
					<div className="text-xs text-muted-foreground/70 mt-1">
						Value:{" "}
						{performer.value >= 1000000000
							? `${(performer.value / 1000000000).toFixed(1)}B`
							: `${(performer.value / 1000000).toFixed(1)}M`}
					</div>
				)}
			</div>
		</div>
	);
}
