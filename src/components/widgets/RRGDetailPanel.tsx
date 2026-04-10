import { Maximize2 } from "lucide-react";
import * as React from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { useTranslation } from "@/hooks/useTranslation";
import type { RRGTicker } from "@/lib/api-client";
import { getSectorDisplayName } from "@/lib/sector-names";
import type { ViewBounds } from "./RRGCanvas";
import { RRGCanvas } from "./RRGCanvas";

type Quadrant = "leading" | "improving" | "weakening" | "lagging";

interface RRGDetailPanelProps {
	ticker: RRGTicker | null;
	algorithm: "mascore" | "jdk";
	onClose: () => void;
	onFullscreen?: () => void;
	viewBounds?: ViewBounds | null;
}

function getQuadrant(
	rsRatio: number,
	rsMomentum: number,
	algorithm: "mascore" | "jdk",
): Quadrant {
	const center = algorithm === "mascore" ? 0 : 100;
	const xAbove = rsRatio >= center;
	const yAbove = rsMomentum >= center;
	if (xAbove && yAbove) return "leading";
	if (!xAbove && yAbove) return "improving";
	if (xAbove && !yAbove) return "weakening";
	return "lagging";
}

function getQuadrantBadgeVariant(
	q: Quadrant,
): "default" | "secondary" | "destructive" | "outline" {
	const variants: Record<
		Quadrant,
		"default" | "secondary" | "destructive" | "outline"
	> = {
		leading: "default",
		improving: "secondary",
		weakening: "destructive",
		lagging: "outline",
	};
	return variants[q];
}

function formatVolume(vol: number): string {
	if (vol >= 1_000_000_000) return `${(vol / 1_000_000_000).toFixed(1)}B`;
	if (vol >= 1_000_000) return `${(vol / 1_000_000).toFixed(1)}M`;
	if (vol >= 1_000) return `${(vol / 1_000).toFixed(1)}K`;
	return String(vol);
}

export function RRGDetailPanel({
	ticker,
	algorithm,
	onClose,
	onFullscreen,
	viewBounds,
}: RRGDetailPanelProps) {
	const { t, language } = useTranslation();

	const handleOpenChange = React.useCallback(
		(open: boolean) => {
			if (!open) onClose();
		},
		[onClose],
	);

	const singleTickerData = React.useMemo(
		() => (ticker ? { algorithm, tickers: [ticker] } : null),
		[ticker, algorithm],
	);

	if (!ticker) return null;

	const quadrant = getQuadrant(ticker.rs_ratio, ticker.rs_momentum, algorithm);

	return (
		<Dialog open onOpenChange={handleOpenChange}>
			<DialogContent className="sm:max-w-xl max-h-[90vh] overflow-y-auto">
				<DialogHeader>
					<div className="flex items-center justify-between">
						<div className="flex items-center gap-2">
							<button
								type="button"
								className="font-bold text-sm hover:underline bg-transparent p-0 border-0 cursor-pointer text-inherit"
								onClick={() => onFullscreen?.()}
							>
								{ticker.symbol}
							</button>
							{ticker.sector && (
								<span className="text-xs text-muted-foreground">
									{getSectorDisplayName(ticker.sector, language)}
								</span>
							)}
							{onFullscreen && (
								<Button
									variant="ghost"
									size="sm"
									className="h-7 w-7 p-0"
									onClick={() => onFullscreen()}
									title="Open fullscreen chart"
								>
									<Maximize2 className="h-4 w-4" />
								</Button>
							)}
						</div>
						<div className="flex items-center gap-2">
							<Badge
								variant={getQuadrantBadgeVariant(quadrant)}
								className="text-xs"
							>
								{t(`common.rrg.quadrants.${quadrant}`)}
							</Badge>
						</div>
					</div>
					<DialogTitle className="sr-only">
						{ticker.symbol} — {t(`common.rrg.quadrants.${quadrant}`)}
					</DialogTitle>
					<DialogDescription className="sr-only">
						{t("common.rrg.detail.quadrant")}:{" "}
						{t(`common.rrg.quadrants.${quadrant}`)}
					</DialogDescription>
				</DialogHeader>

				{/* Quadrant canvas for single ticker */}
				{ticker.trails && ticker.trails.length >= 2 && singleTickerData && (
					<div className="w-full overflow-hidden mb-2">
						<RRGCanvas
							data={singleTickerData}
							algorithm={algorithm}
							hoveredTicker={null}
							selectedTicker={ticker}
							onHover={() => {}}
							onSelect={() => {}}
							showLabels={true}
							viewBounds={viewBounds}
						/>
					</div>
				)}

				{/* Details grid */}
				<div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
					<div className="flex justify-between">
						<span className="text-muted-foreground">
							{t("common.rrg.detail.price")}
						</span>
						<span className="font-mono">{ticker.close.toLocaleString()}</span>
					</div>
					<div className="flex justify-between">
						<span className="text-muted-foreground">
							{t("common.rrg.detail.volume")}
						</span>
						<span className="font-mono">{formatVolume(ticker.volume)}</span>
					</div>
					<div className="flex justify-between">
						<span className="text-muted-foreground">
							{algorithm === "mascore"
								? t("common.rrg.mascoreXAxis")
								: t("common.rrg.detail.rsRatio")}
						</span>
						<span className="font-mono">{ticker.rs_ratio.toFixed(2)}%</span>
					</div>
					<div className="flex justify-between">
						<span className="text-muted-foreground">
							{algorithm === "mascore"
								? t("common.rrg.mascoreYAxis")
								: t("common.rrg.detail.rsMomentum")}
						</span>
						<span className="font-mono">{ticker.rs_momentum.toFixed(2)}%</span>
					</div>
					<div className="flex justify-between">
						<span className="text-muted-foreground">
							{t("common.rrg.detail.rawRs")}
						</span>
						<span className="font-mono">{ticker.raw_rs.toFixed(4)}</span>
					</div>
					<div className="flex justify-between">
						<span className="text-muted-foreground">
							{t("common.rrg.detail.quadrant")}
						</span>
						<span className="font-mono">
							{t(`common.rrg.quadrants.${quadrant}`)}
						</span>
					</div>
				</div>
			</DialogContent>
		</Dialog>
	);
}
