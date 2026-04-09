import * as React from "react";
import { Badge } from "@/components/ui/badge";
import { useTranslation } from "@/hooks/useTranslation";
import type { RRGTicker } from "@/lib/api-client";

type Quadrant = "leading" | "improving" | "weakening" | "lagging";

interface RRGDetailPanelProps {
	ticker: RRGTicker;
	algorithm: "mascore" | "jdk";
	onClose: () => void;
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
}: RRGDetailPanelProps) {
	const { t } = useTranslation();
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

	// Mini trail canvas
	const trailCanvasRef = React.useRef<HTMLCanvasElement>(null);

	React.useEffect(() => {
		const canvas = trailCanvasRef.current;
		if (!canvas) return;

		const trails = ticker.trails;
		const width = 200;
		const height = 80;
		const dpr = window.devicePixelRatio || 1;
		canvas.width = width * dpr;
		canvas.height = height * dpr;

		const ctx = canvas.getContext("2d");
		if (!ctx) return;

		ctx.scale(dpr, dpr);
		ctx.clearRect(0, 0, width, height);

		if (!trails || trails.length < 2) return;

		// Compute bounds from trail data
		let xMin = Infinity,
			xMax = -Infinity,
			yMin = Infinity,
			yMax = -Infinity;
		for (const p of trails) {
			xMin = Math.min(xMin, p.rs_ratio);
			xMax = Math.max(xMax, p.rs_ratio);
			yMin = Math.min(yMin, p.rs_momentum);
			yMax = Math.max(yMax, p.rs_momentum);
		}

		// Ensure some minimum range
		const xRange = Math.max(xMax - xMin, 0.1);
		const yRange = Math.max(yMax - yMin, 0.1);
		const pad = 8;

		const toX = (v: number) => pad + ((v - xMin) / xRange) * (width - pad * 2);
		const toY = (v: number) =>
			height - pad - ((v - yMin) / yRange) * (height - pad * 2);

		// Draw trail
		const isDark = document.documentElement.classList.contains("dark");
		ctx.strokeStyle = isDark
			? "rgba(148, 163, 184, 0.4)"
			: "rgba(100, 116, 139, 0.4)";
		ctx.lineWidth = 1.5;
		ctx.beginPath();
		for (let i = 0; i < trails.length; i++) {
			const px = toX(trails[i].rs_ratio);
			const py = toY(trails[i].rs_momentum);
			if (i === 0) ctx.moveTo(px, py);
			else ctx.lineTo(px, py);
		}
		ctx.stroke();

		// End dot
		const lastTrail = trails[trails.length - 1];
		const dotColors: Record<Quadrant, string> = {
			leading: "#22c55e",
			improving: "#3b82f6",
			weakening: "#ef4444",
			lagging: "#f97316",
		};
		ctx.beginPath();
		ctx.arc(
			toX(lastTrail.rs_ratio),
			toY(lastTrail.rs_momentum),
			3,
			0,
			Math.PI * 2,
		);
		ctx.fillStyle = dotColors[quadrant];
		ctx.fill();
	}, [ticker, quadrant]);

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
					<span className="font-bold text-sm">{ticker.symbol}</span>
					{ticker.sector && (
						<span className="text-xs text-muted-foreground">
							{ticker.sector}
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
					<button
						type="button"
						onClick={onClose}
						className="text-muted-foreground hover:text-foreground text-sm leading-none p-1"
					>
						x
					</button>
				</div>
			</div>

			{/* Trail mini canvas */}
			{ticker.trails && ticker.trails.length >= 2 && (
				<div className="mb-2 rounded bg-muted/50 overflow-hidden">
					<canvas
						ref={trailCanvasRef}
						className="w-full"
						style={{ height: "80px" }}
					/>
				</div>
			)}

			{/* Details grid */}
			<div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
				<div className="flex justify-between">
					<span className="text-muted-foreground">{t("common.rrg.detail.price")}</span>
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
					<span className="text-muted-foreground">{t("common.rrg.detail.rawRs")}</span>
					<span className="font-mono">{ticker.raw_rs.toFixed(4)}</span>
				</div>
				<div className="flex justify-between">
					<span className="text-muted-foreground">
						{t("common.rrg.detail.quadrant")}
					</span>
					<span className="font-mono">{t(`common.rrg.quadrants.${quadrant}`)}</span>
				</div>
			</div>
		</div>
	);
}
