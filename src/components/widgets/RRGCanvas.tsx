import * as React from "react";
import { useTranslation } from "@/hooks/useTranslation";
import type { RRGResponse, RRGTicker } from "@/lib/api-client";

export type Quadrant = "leading" | "improving" | "weakening" | "lagging";

export function getQuadrant(
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

export interface ViewBounds {
	xMin: number;
	xMax: number;
	yMin: number;
	yMax: number;
}

interface RRGCanvasProps {
	data: RRGResponse["data"];
	algorithm: "mascore" | "jdk";
	hoveredTicker: RRGTicker | null;
	selectedTicker: RRGTicker | null;
	onHover: (ticker: RRGTicker | null) => void;
	onSelect: (ticker: RRGTicker) => void;
	showLabels: boolean;
	/** Optional external viewport bounds. When provided, overrides internal computation. */
	viewBounds?: ViewBounds | null;
}

function getQuadrantColor(q: Quadrant, isDark: boolean): string {
	const opacity = isDark ? 0.15 : 0.1;
	const colors: Record<Quadrant, string> = {
		leading: `rgba(34, 197, 94, ${opacity})`,
		improving: `rgba(59, 130, 246, ${opacity})`,
		weakening: `rgba(239, 68, 68, ${opacity})`,
		lagging: `rgba(249, 115, 22, ${opacity})`,
	};
	return colors[q];
}

function getQuadrantDotColor(q: Quadrant): string {
	const colors: Record<Quadrant, string> = {
		leading: "#22c55e",
		improving: "#3b82f6",
		weakening: "#ef4444",
		lagging: "#f97316",
	};
	return colors[q];
}

function getQuadrantTrailColor(q: Quadrant, isDark: boolean): string {
	const colors: Record<Quadrant, string> = {
		leading: isDark ? "rgba(34, 197, 94, 0.4)" : "rgba(34, 197, 94, 0.5)",
		improving: isDark ? "rgba(59, 130, 246, 0.4)" : "rgba(59, 130, 246, 0.5)",
		weakening: isDark ? "rgba(239, 68, 68, 0.4)" : "rgba(239, 68, 68, 0.5)",
		lagging: isDark ? "rgba(249, 115, 22, 0.4)" : "rgba(249, 115, 22, 0.5)",
	};
	return colors[q];
}

export function RRGCanvas({
	data,
	algorithm,
	hoveredTicker,
	selectedTicker,
	onHover,
	onSelect,
	showLabels,
	viewBounds,
}: RRGCanvasProps) {
	const canvasRef = React.useRef<HTMLCanvasElement>(null);
	const containerRef = React.useRef<HTMLDivElement>(null);
	const pixelPositionsRef = React.useRef<
		Map<string, { x: number; y: number; ticker: RRGTicker }>
	>(new Map());
	const rafRef = React.useRef<number>(0);
	const { t } = useTranslation();

	const tickers = data.tickers ?? [];
	const center = algorithm === "mascore" ? 0 : 100;

	const isDark = React.useMemo(() => {
		if (typeof document === "undefined") return false;
		return document.documentElement.classList.contains("dark");
	}, []);

	const textColor = isDark ? "#94a3b8" : "#64748b";
	const gridColor = isDark
		? "rgba(148, 163, 184, 0.2)"
		: "rgba(100, 116, 139, 0.15)";

	// Compute viewport bounds ensuring center is visible (skip if external bounds provided)
	const { xMin, xMax, yMin, yMax } = React.useMemo(() => {
		if (viewBounds) return viewBounds;
		if (tickers.length === 0) {
			const spread = algorithm === "mascore" ? 30 : 15;
			return {
				xMin: center - spread,
				xMax: center + spread,
				yMin: center - spread,
				yMax: center + spread,
			};
		}

		let dataXMin = Infinity;
		let dataXMax = -Infinity;
		let dataYMin = Infinity;
		let dataYMax = -Infinity;

		for (const ticker of tickers) {
			dataXMin = Math.min(dataXMin, ticker.rs_ratio);
			dataXMax = Math.max(dataXMax, ticker.rs_ratio);
			dataYMin = Math.min(dataYMin, ticker.rs_momentum);
			dataYMax = Math.max(dataYMax, ticker.rs_momentum);

			if (ticker.trails) {
				for (const trail of ticker.trails) {
					dataXMin = Math.min(dataXMin, trail.rs_ratio);
					dataXMax = Math.max(dataXMax, trail.rs_ratio);
					dataYMin = Math.min(dataYMin, trail.rs_momentum);
					dataYMax = Math.max(dataYMax, trail.rs_momentum);
				}
			}
		}

		// Ensure center is always visible with margin
		const margin = algorithm === "mascore" ? 5 : 3;
		dataXMin = Math.min(dataXMin, center - margin);
		dataXMax = Math.max(dataXMax, center + margin);
		dataYMin = Math.min(dataYMin, center - margin);
		dataYMax = Math.max(dataYMax, center + margin);

		// Add 10% padding
		const xRange = dataXMax - dataXMin;
		const yRange = dataYMax - dataYMin;
		const xPad = xRange * 0.1;
		const yPad = yRange * 0.1;

		return {
			xMin: dataXMin - xPad,
			xMax: dataXMax + xPad,
			yMin: dataYMin - yPad,
			yMax: dataYMax + yPad,
		};
	}, [tickers, center, algorithm, viewBounds]);

	// Responsive sizing
	const [size, setSize] = React.useState({ width: 0, height: 0 });

	React.useEffect(() => {
		const container = containerRef.current;
		if (!container) return;

		const observer = new ResizeObserver((entries) => {
			for (const entry of entries) {
				const w = entry.contentRect.width;
				const isMobile = w < 640;
				const h = isMobile
					? w * 0.85
					: Math.min(w * 0.75, window.innerHeight * 0.7);
				setSize({ width: Math.floor(w), height: Math.floor(h) });
			}
		});

		observer.observe(container);
		return () => observer.disconnect();
	}, []);

	// Responsive padding
	const padding = React.useMemo(() => {
		if (size.width < 640) {
			return { top: 30, right: 15, bottom: 40, left: 30 };
		}
		return { top: 50, right: 30, bottom: 50, left: 45 };
	}, [size.width]);

	// Coordinate transform functions
	const toPixelX = React.useCallback(
		(value: number) => {
			const plotW = size.width - padding.left - padding.right;
			return padding.left + ((value - xMin) / (xMax - xMin)) * plotW;
		},
		[size.width, padding, xMin, xMax],
	);

	const toPixelY = React.useCallback(
		(value: number) => {
			const plotH = size.height - padding.top - padding.bottom;
			return padding.top + plotH - ((value - yMin) / (yMax - yMin)) * plotH;
		},
		[size.height, padding, yMin, yMax],
	);

	// Main draw function
	React.useEffect(() => {
		const canvas = canvasRef.current;
		if (!canvas || size.width === 0 || size.height === 0) return;

		const dpr = window.devicePixelRatio || 1;
		canvas.width = size.width * dpr;
		canvas.height = size.height * dpr;

		const ctx = canvas.getContext("2d");
		if (!ctx) return;

		ctx.scale(dpr, dpr);

		const plotW = size.width - padding.left - padding.right;
		const plotH = size.height - padding.top - padding.bottom;

		// Clear
		ctx.fillStyle = isDark ? "#0f172a" : "#ffffff";
		ctx.fillRect(0, 0, size.width, size.height);

		const centerX = toPixelX(center);
		const centerY = toPixelY(center);

		// Quadrant shading
		const quadrants: [Quadrant, number, number, number, number][] = [
			[
				"leading",
				centerX,
				padding.top,
				plotW - (centerX - padding.left),
				centerY - padding.top,
			],
			[
				"improving",
				padding.top,
				padding.top,
				centerX - padding.left,
				centerY - padding.top,
			],
			[
				"weakening",
				centerX,
				centerY,
				plotW - (centerX - padding.left),
				plotH - (centerY - padding.top),
			],
			[
				"lagging",
				padding.top,
				centerY,
				centerX - padding.left,
				plotH - (centerY - padding.top),
			],
		];

		for (const [q, x, y, w, h] of quadrants) {
			ctx.fillStyle = getQuadrantColor(q, isDark);
			ctx.fillRect(x, y, w, h);
		}

		// Grid lines (dashed) at center
		ctx.strokeStyle = gridColor;
		ctx.lineWidth = 1;
		ctx.setLineDash([4, 4]);

		// Vertical center line
		ctx.beginPath();
		ctx.moveTo(centerX, padding.top);
		ctx.lineTo(centerX, size.height - padding.bottom);
		ctx.stroke();

		// Horizontal center line
		ctx.beginPath();
		ctx.moveTo(padding.left, centerY);
		ctx.lineTo(size.width - padding.right, centerY);
		ctx.stroke();

		ctx.setLineDash([]);

		// Axis labels at center
		ctx.font = "11px sans-serif";
		ctx.fillStyle = textColor;
		ctx.textAlign = "center";
		ctx.textBaseline = "top";
		ctx.fillText(String(center), centerX, size.height - padding.bottom + 4);

		ctx.save();
		ctx.translate(padding.left - 6, centerY);
		ctx.rotate(-Math.PI / 2);
		ctx.textAlign = "center";
		ctx.textBaseline = "bottom";
		ctx.fillText(String(center), 0, 0);
		ctx.restore();

		// Min/max labels
		ctx.font = "10px sans-serif";
		ctx.fillStyle = textColor;
		ctx.textAlign = "left";
		ctx.textBaseline = "top";
		ctx.fillText(
			xMin.toFixed(1),
			padding.left,
			size.height - padding.bottom + 4,
		);
		ctx.textAlign = "right";
		ctx.fillText(
			xMax.toFixed(1),
			size.width - padding.right,
			size.height - padding.bottom + 4,
		);

		// Y-axis min/max
		ctx.save();
		ctx.translate(padding.left - 6, size.height - padding.bottom);
		ctx.rotate(-Math.PI / 2);
		ctx.textAlign = "right";
		ctx.textBaseline = "top";
		ctx.fillText(yMin.toFixed(1), 0, 0);
		ctx.restore();

		ctx.save();
		ctx.translate(padding.left - 6, padding.top);
		ctx.rotate(-Math.PI / 2);
		ctx.textAlign = "left";
		ctx.textBaseline = "bottom";
		ctx.fillText(yMax.toFixed(1), 0, 0);
		ctx.restore();

		// Axis titles (algorithm-aware)
		ctx.font = `${size.width < 640 ? 10 : 12}px sans-serif`;
		ctx.fillStyle = textColor;
		ctx.textAlign = "center";
		ctx.textBaseline = "top";
		const xLabel =
			algorithm === "mascore"
				? t("common.rrg.mascoreXAxis")
				: t("common.rrg.xAxis");
		ctx.fillText(
			xLabel,
			(padding.left + size.width - padding.right) / 2,
			size.height - padding.bottom + 22,
		);

		ctx.save();
		ctx.translate(10, (padding.top + size.height - padding.bottom) / 2);
		ctx.rotate(-Math.PI / 2);
		ctx.textAlign = "center";
		ctx.textBaseline = "bottom";
		const yLabel =
			algorithm === "mascore"
				? t("common.rrg.mascoreYAxis")
				: t("common.rrg.yAxis");
		ctx.fillText(yLabel, 0, 0);
		ctx.restore();

		// Quadrant labels
		if (size.width >= 400) {
			const fontSize = size.width < 640 ? 11 : 13;
			ctx.font = `600 ${fontSize}px sans-serif`;
			ctx.textAlign = "center";
			ctx.textBaseline = "middle";

			const labelOffset = size.width < 640 ? 20 : 35;
			const labels: [Quadrant, number, number][] = [
				["leading", centerX + labelOffset, centerY - labelOffset],
				["improving", centerX - labelOffset, centerY - labelOffset],
				["weakening", centerX + labelOffset, centerY + labelOffset],
				["lagging", centerX - labelOffset, centerY + labelOffset],
			];

			for (const [q, x, y] of labels) {
				ctx.fillStyle = getQuadrantDotColor(q);
				ctx.globalAlpha = isDark ? 0.6 : 0.5;
				ctx.fillText(t(`common.rrg.quadrants.${q}`), x, y);
				ctx.globalAlpha = 1;
			}
		}

		// Trails
		for (const ticker of tickers) {
			if (!ticker.trails || ticker.trails.length < 2) continue;
			const q = getQuadrant(ticker.rs_ratio, ticker.rs_momentum, algorithm);
			const isHighlighted =
				hoveredTicker?.symbol === ticker.symbol ||
				selectedTicker?.symbol === ticker.symbol;

			// Highlight ring behind trail (same style as dots)
			if (isHighlighted) {
				ctx.strokeStyle = "#ffffff";
				ctx.lineWidth = 5;
				ctx.beginPath();
				for (let i = 0; i < ticker.trails.length; i++) {
					const trail = ticker.trails[i];
					const px = toPixelX(trail.rs_ratio);
					const py = toPixelY(trail.rs_momentum);
					if (i === 0) ctx.moveTo(px, py);
					else ctx.lineTo(px, py);
				}
				ctx.globalAlpha = 0.6 + (1 / ticker.trails.length) * 0.4;
				ctx.stroke();
			}

			ctx.strokeStyle = getQuadrantTrailColor(q, isDark);
			ctx.lineWidth = isHighlighted ? 2.5 : 1.5;
			ctx.beginPath();
			for (let i = 0; i < ticker.trails.length; i++) {
				const trail = ticker.trails[i];
				const px = toPixelX(trail.rs_ratio);
				const py = toPixelY(trail.rs_momentum);
				// Fade older trail points
				const baseFade = isHighlighted
					? 0.5
					: 0.1 + (i / ticker.trails.length) * 0.4;
				ctx.globalAlpha = isHighlighted
					? 0.4 + (i / ticker.trails.length) * 0.6
					: baseFade;
				if (i === 0) ctx.moveTo(px, py);
				else ctx.lineTo(px, py);
			}
			ctx.globalAlpha = 1;
			ctx.stroke();
		}

		// Build pixel positions for hit detection
		const pixelMap = new Map<
			string,
			{ x: number; y: number; ticker: RRGTicker }
		>();

		// Dots
		const dotRadius = size.width < 640 ? 4 : 5;

		for (const ticker of tickers) {
			const px = toPixelX(ticker.rs_ratio);
			const py = toPixelY(ticker.rs_momentum);
			const q = getQuadrant(ticker.rs_ratio, ticker.rs_momentum, algorithm);

			pixelMap.set(ticker.symbol, { x: px, y: py, ticker });

			const isHovered = hoveredTicker?.symbol === ticker.symbol;
			const isSelected = selectedTicker?.symbol === ticker.symbol;
			const r = isHovered || isSelected ? dotRadius + 3 : dotRadius;

			// Hover/selected highlight ring
			if (isHovered || isSelected) {
				ctx.beginPath();
				ctx.arc(px, py, r + 2, 0, Math.PI * 2);
				ctx.strokeStyle = "#ffffff";
				ctx.lineWidth = 2;
				ctx.stroke();
			}

			// Dot
			ctx.beginPath();
			ctx.arc(px, py, r, 0, Math.PI * 2);
			ctx.fillStyle = getQuadrantDotColor(q);
			ctx.fill();
		}

		pixelPositionsRef.current = pixelMap;

		// Symbol labels
		if (showLabels) {
			ctx.font = "10px sans-serif";
			ctx.textAlign = "left";
			ctx.textBaseline = "bottom";

			for (const ticker of tickers) {
				const px = toPixelX(ticker.rs_ratio);
				const py = toPixelY(ticker.rs_momentum);
				const isHighlighted =
					hoveredTicker?.symbol === ticker.symbol ||
					selectedTicker?.symbol === ticker.symbol;

				ctx.fillStyle = isHighlighted
					? isDark
						? "#e2e8f0"
						: "#1e293b"
					: textColor;
				ctx.globalAlpha = isHighlighted ? 1 : 0.7;
				ctx.fillText(ticker.symbol, px + dotRadius + 3, py - 2);
				ctx.globalAlpha = 1;
			}
		}
	}, [
		size,
		tickers,
		center,
		xMin,
		xMax,
		yMin,
		yMax,
		padding,
		toPixelX,
		toPixelY,
		hoveredTicker,
		selectedTicker,
		showLabels,
		isDark,
		textColor,
		gridColor,
		t,
		algorithm,
	]);

	// Hit detection for mouse events
	const hitTest = React.useCallback(
		(clientX: number, clientY: number) => {
			const canvas = canvasRef.current;
			if (!canvas) return null;
			const rect = canvas.getBoundingClientRect();
			const x = clientX - rect.left;
			const y = clientY - rect.top;
			const hitRadius = size.width < 640 ? 12 : 8;

			let closest: { x: number; y: number; ticker: RRGTicker } | null = null;
			let closestDist = Infinity;

			for (const entry of pixelPositionsRef.current.values()) {
				const dx = entry.x - x;
				const dy = entry.y - y;
				const dist = Math.sqrt(dx * dx + dy * dy);
				if (dist <= hitRadius && dist < closestDist) {
					closest = entry;
					closestDist = dist;
				}
			}
			return closest;
		},
		[size.width],
	);

	const handleMouseMove = React.useCallback(
		(e: React.MouseEvent) => {
			if (rafRef.current) cancelAnimationFrame(rafRef.current);
			rafRef.current = requestAnimationFrame(() => {
				const hit = hitTest(e.clientX, e.clientY);
				onHover(hit?.ticker ?? null);
			});
		},
		[hitTest, onHover],
	);

	const handleClick = React.useCallback(
		(e: React.MouseEvent) => {
			const hit = hitTest(e.clientX, e.clientY);
			if (hit) {
				onSelect(hit.ticker);
			}
		},
		[hitTest, onSelect],
	);

	const handleMouseLeave = React.useCallback(() => {
		onHover(null);
	}, [onHover]);

	const handleTouchStart = React.useCallback(
		(e: React.TouchEvent) => {
			if (e.touches.length === 1) {
				const touch = e.touches[0];
				const hit = hitTest(touch.clientX, touch.clientY);
				if (hit) {
					onSelect(hit.ticker);
				}
			}
		},
		[hitTest, onSelect],
	);

	const handleTouchMove = React.useCallback(
		(e: React.TouchEvent) => {
			if (e.touches.length === 1) {
				const touch = e.touches[0];
				if (rafRef.current) cancelAnimationFrame(rafRef.current);
				rafRef.current = requestAnimationFrame(() => {
					const hit = hitTest(touch.clientX, touch.clientY);
					onHover(hit?.ticker ?? null);
				});
			}
		},
		[hitTest, onHover],
	);

	const handleTouchEnd = React.useCallback(() => {
		onHover(null);
	}, [onHover]);

	// Cleanup RAF
	React.useEffect(() => {
		return () => {
			if (rafRef.current) cancelAnimationFrame(rafRef.current);
		};
	}, []);

	if (tickers.length === 0) return null;

	return (
		<div ref={containerRef} className="w-full">
			<canvas
				ref={canvasRef}
				className="w-full cursor-crosshair touch-none"
				style={{ height: size.height > 0 ? `${size.height}px` : undefined }}
				onMouseMove={handleMouseMove}
				onClick={handleClick}
				onMouseLeave={handleMouseLeave}
				onTouchStart={handleTouchStart}
				onTouchMove={handleTouchMove}
				onTouchEnd={handleTouchEnd}
			/>
		</div>
	);
}
