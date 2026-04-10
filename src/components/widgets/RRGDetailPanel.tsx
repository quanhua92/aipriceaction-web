import { Maximize2 } from "lucide-react";
import * as React from "react";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { TradingViewChart } from "@/components/charts/TradingViewChart";
import { useTranslation } from "@/hooks/useTranslation";
import { useDialog } from "@/contexts/DialogContext";
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
	const { viewportHeight } = useDialog();

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

	// Calculate chart height to fill available space in the dialog
	const chartHeight = React.useMemo(() => {
		const dialogHeight = viewportHeight * 0.9;
		const headerHeight = 50;
		const padding = 16; // p-2 top + bottom
		const gap = 8; // gap-2
		const controlBarHeight = 48; // Chart control bar
		return Math.max(dialogHeight - headerHeight - padding - gap - controlBarHeight, 200);
	}, [viewportHeight]);

	if (!ticker) return null;

	const quadrant = getQuadrant(ticker.rs_ratio, ticker.rs_momentum, algorithm);

	return (
		<Dialog open onOpenChange={handleOpenChange}>
			<DialogContent className="sm:max-w-5xl max-h-[90vh] p-2 gap-2 flex flex-col">
				<DialogHeader>
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
					<DialogTitle className="sr-only">
						{ticker.symbol} — {t(`common.rrg.quadrants.${quadrant}`)}
					</DialogTitle>
					<DialogDescription className="sr-only">
						{t("common.rrg.detail.quadrant")}:{" "}
						{t(`common.rrg.quadrants.${quadrant}`)}
					</DialogDescription>
				</DialogHeader>

				<div className="grid grid-cols-1 md:grid-cols-2 gap-4 flex-1 min-h-0">
				{/* Left column: RRG canvas + details */}
				<div className="flex flex-col min-h-0 overflow-y-auto">
					{/* Quadrant canvas for single ticker */}
					{ticker.trails && ticker.trails.length >= 2 && singleTickerData && (
						<div className="w-full overflow-hidden mb-2 flex-shrink-0">
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
				</div>
				{/* Right column: TradingView price chart */}
				<div className="flex flex-col min-h-0">
					<TradingViewChart
						initialTicker={ticker.symbol}
						height={chartHeight}
						showControls={true}
					/>
				</div>
			</div>
			</DialogContent>
		</Dialog>
	);
}
