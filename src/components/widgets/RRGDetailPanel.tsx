import { Maximize2 } from "lucide-react";
import * as React from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useTranslation } from "@/hooks/useTranslation";
import type { RRGTicker } from "@/lib/api-client";
import { getSectorDisplayName } from "@/lib/sector-names";
import type { ViewBounds } from "./RRGCanvas";
import { RRGCanvas } from "./RRGCanvas";

type Quadrant = "leading" | "improving" | "weakening" | "lagging";

interface RRGDetailPanelProps {
	ticker: RRGTicker;
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
	const quadrant = getQuadrant(ticker.rs_ratio, ticker.rs_momentum, algorithm);
	const ref = React.useRef<HTMLDivElement>(null);

	// Click-away listener
	React.useEffect(() => {
		const handler = (e: MouseEvent) => {
			if (ref.current && !ref.current.contains(e.target as Node)) {
				onClose();
			}
		};
		// Use mousedown for faster response
		document.addEventListener("mousedown", handler);
		return () => document.removeEventListener("mousedown", handler);
	}, [onClose]);

	const singleTickerData = React.useMemo(
		() => ({
			algorithm,
			tickers: [ticker],
		}),
		[ticker, algorithm],
	);

	return (
		<div
			ref={ref}
			className="absolute bottom-14 left-2 right-2 md:bottom-auto md:left-auto md:right-auto z-20
        bg-card border rounded-lg shadow-lg p-3 md:p-4 animate-in fade-in-0 zoom-in-95 duration-200
        max-h-[50vh] md:max-h-none overflow-y-auto"
		>
			{/* Header */}
			<div className="flex items-center justify-between mb-2">
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
				</div>
				<div className="flex items-center gap-2">
					<Badge
						variant={getQuadrantBadgeVariant(quadrant)}
						className="text-xs"
					>
						{t(`common.rrg.quadrants.${quadrant}`)}
					</Badge>
					{onFullscreen && (
						<Button
							variant="ghost"
							size="sm"
							className="h-7 w-7 p-0"
							onClick={(e) => {
								e.stopPropagation();
								onFullscreen();
							}}
							title="Open fullscreen chart"
						>
							<Maximize2 className="h-4 w-4" />
						</Button>
					)}
					<button
						type="button"
						onClick={onClose}
						className="text-muted-foreground hover:text-foreground text-sm leading-none p-1"
					>
						x
					</button>
				</div>
			</div>

			{/* Quadrant canvas for single ticker */}
			{ticker.trails && ticker.trails.length >= 2 && (
				<div className="mb-2" style={{ width: "280px", height: "250px" }}>
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
	);
}
