import * as React from "react";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
import { useAPI } from "@/contexts/APIContext";
import { useTranslation } from "@/hooks/useTranslation";
import { formatPercent, formatPrice, formatVolume } from "@/lib/format";
import { getSectorDisplayName } from "@/lib/sector-names";
import type { TopPerformerTableProps } from "./types";

export function TopPerformerTable({
	performers,
	title,
	onTickerSelect,
	emptyMessage,
}: TopPerformerTableProps) {
	const { t, language } = useTranslation();
	const { ema } = useAPI();
	const maPrefix = ema ? "EMA" : "MA";

	if (performers.length === 0) {
		return (
			<div className="text-center py-8">
				<h3 className="text-sm font-semibold mb-2">{title}</h3>
				<p className="text-muted-foreground text-sm">{emptyMessage}</p>
			</div>
		);
	}

	return (
		<div>
			<h3 className="text-sm font-semibold mb-2">{title}</h3>
			<div className="border rounded-lg overflow-hidden">
				<div className="overflow-x-auto">
					<Table>
						<TableHeader>
							<TableRow className="bg-muted/30">
								<TableHead className="sticky left-0 bg-background z-10 min-w-20 text-center">
									{t("common.topPerformers.tableHeaders.symbol")}
								</TableHead>
								<TableHead className="text-center min-w-24">
									{t("common.topPerformers.tableHeaders.price")}
								</TableHead>
								<TableHead className="text-center min-w-20">
									{t("common.topPerformers.tableHeaders.changePercent")}
								</TableHead>
								<TableHead className="text-center min-w-24">
									{t("common.topPerformers.tableHeaders.volume")}
								</TableHead>
								<TableHead className="text-center min-w-20">
									{t("common.topPerformers.tableHeaders.volumeChange")}
								</TableHead>
								<TableHead className="text-center min-w-16">
									{maPrefix}10
								</TableHead>
								<TableHead className="text-center min-w-16">
									{maPrefix}20
								</TableHead>
								<TableHead className="text-center min-w-16">
									{maPrefix}50
								</TableHead>
								<TableHead className="text-center min-w-16">
									{maPrefix}100
								</TableHead>
								<TableHead className="text-center min-w-16">
									{maPrefix}200
								</TableHead>
								<TableHead className="text-center min-w-20">
									{t("common.topPerformers.tableHeaders.value")}
								</TableHead>
								<TableHead className="text-center min-w-24">
									{t("common.topPerformers.tableHeaders.sector")}
								</TableHead>
							</TableRow>
						</TableHeader>
						<TableBody>
							{performers.map((performer) => {
								const isPositive = performer.change >= 0;
								const isVolumePositive =
									performer.volumeChanged != null &&
									performer.volumeChanged >= 0;

								return (
									<TableRow
										key={performer.symbol}
										onClick={() => onTickerSelect?.(performer.symbol)}
										className="cursor-pointer hover:bg-muted/50 transition-colors"
									>
										<TableCell className="sticky left-0 bg-background font-mono font-medium min-w-20 text-center">
											{performer.symbol}
										</TableCell>
										<TableCell className="text-center font-mono min-w-24">
											{formatPrice(performer.price, {
												symbol: performer.symbol,
												mode: performer.mode === "crypto" ? "crypto" : "vn",
											})}
										</TableCell>
										<TableCell
											className={`text-center font-medium min-w-20 ${
												isPositive ? "text-green-600" : "text-red-600"
											}`}
										>
											{isPositive ? "+" : ""}
											{performer.change.toFixed(1)}%
										</TableCell>
										<TableCell className="text-center font-mono text-sm min-w-24">
											{formatVolume(performer.volume)}
										</TableCell>
										<TableCell
											className={`text-center min-w-20 ${
												isVolumePositive ? "text-green-600" : "text-red-600"
											}`}
										>
											{performer.volumeChanged != null
												? formatPercent(performer.volumeChanged)
												: "-"}
										</TableCell>
										<TableCell
											className={`text-center min-w-16 ${
												performer.ma10_score != null &&
												performer.ma10_score >= 0
													? "text-green-700"
													: "text-red-700"
											}`}
										>
											{performer.ma10_score != null
												? `${performer.ma10_score.toFixed(1)}%`
												: "-"}
										</TableCell>
										<TableCell
											className={`text-center min-w-16 ${
												performer.ma20_score != null &&
												performer.ma20_score >= 0
													? "text-green-700"
													: "text-red-700"
											}`}
										>
											{performer.ma20_score != null
												? `${performer.ma20_score.toFixed(1)}%`
												: "-"}
										</TableCell>
										<TableCell
											className={`text-center min-w-16 ${
												performer.ma50_score != null &&
												performer.ma50_score >= 0
													? "text-green-700"
													: "text-red-700"
											}`}
										>
											{performer.ma50_score != null
												? `${performer.ma50_score.toFixed(1)}%`
												: "-"}
										</TableCell>
										<TableCell
											className={`text-center min-w-16 ${
												performer.ma100_score != null &&
												performer.ma100_score >= 0
													? "text-green-700"
													: "text-red-700"
											}`}
										>
											{performer.ma100_score != null
												? `${performer.ma100_score.toFixed(1)}%`
												: "-"}
										</TableCell>
										<TableCell
											className={`text-center min-w-16 ${
												performer.ma200_score != null &&
												performer.ma200_score >= 0
													? "text-green-700"
													: "text-red-700"
											}`}
										>
											{performer.ma200_score != null
												? `${performer.ma200_score.toFixed(1)}%`
												: "-"}
										</TableCell>
										<TableCell className="text-center font-mono min-w-20">
											{performer.value >= 1000000000
												? `${(performer.value / 1000000000).toFixed(1)}B`
												: performer.value >= 1000000
													? `${(performer.value / 1000000).toFixed(1)}M`
													: formatVolume(performer.value)}
										</TableCell>
										<TableCell className="text-center text-muted-foreground min-w-24">
											{getSectorDisplayName(performer.sector, language)}
										</TableCell>
									</TableRow>
								);
							})}
						</TableBody>
					</Table>
				</div>
			</div>
		</div>
	);
}
