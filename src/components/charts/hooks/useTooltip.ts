import type { Time } from "lightweight-charts";
import { useCallback, useRef } from "react";
import { useAPI } from "@/contexts/APIContext";
import type { StockData } from "@/lib/api-client";
import { TOOLTIP_HEIGHT, TOOLTIP_MARGIN, TOOLTIP_WIDTH } from "@/lib/constants";
import {
	formatPercent,
	formatPrice,
	formatVolume,
	parseUTCISOString,
} from "@/lib/format";

type TooltipMode = "hover" | "click" | "locked";
type TooltipPosition = { x: number; y: number } | "top-right";

interface TooltipState {
	isVisible: boolean;
	mode: TooltipMode;
	content: string;
	position?: TooltipPosition;
}

export const useTooltip = (
	chartContainerRef: React.RefObject<HTMLDivElement>,
) => {
	const { ema } = useAPI();
	const tooltipRef = useRef<HTMLDivElement | null>(null);
	const tooltipState = useRef<TooltipState>({
		isVisible: false,
		mode: "hover",
		content: "",
	});

	const createTooltipElement = useCallback(() => {
		if (!chartContainerRef.current || tooltipRef.current) return;

		const tooltip = document.createElement("div");
		tooltip.style.cssText = `
      width: auto;
      min-width: 180px;
      max-width: ${TOOLTIP_WIDTH}px;
      position: absolute;
      display: none;
      padding: 6px 8px;
      box-sizing: border-box;
      font-size: 11px;
      text-align: left;
      z-index: 10;
      pointer-events: none;
      border: 1px solid #27272a;
      border-radius: 4px;
      background: rgba(24, 24, 27, 0.95);
      color: #fafafa;
      font-family: -apple-system, BlinkMacSystemFont, 'Trebuchet MS', Roboto, Ubuntu, sans-serif;
      -webkit-font-smoothing: antialiased;
      -moz-osx-font-smoothing: grayscale;
      backdrop-filter: blur(8px);
    `;

		chartContainerRef.current.appendChild(tooltip);
		tooltipRef.current = tooltip;
	}, [chartContainerRef]);

	const formatDateTime = useCallback((paramTime: any): string => {
		try {
			const date = new Date((paramTime as number) * 1000);
			if (isNaN(date.getTime())) {
				return String(paramTime);
			}
			return date.toLocaleString("en-US", {
				year: "numeric",
				month: "short",
				day: "numeric",
				hour: "2-digit",
				minute: "2-digit",
				timeZone: "UTC",
			});
		} catch (error) {
			return String(paramTime);
		}
	}, []);

	const buildTooltipHTML = useCallback(
		(
			currentDataPoint: StockData,
			paramTime: any,
			tickerSymbol: string,
			maVisibility: {
				ma10: boolean;
				ma20: boolean;
				ma50: boolean;
				ma100: boolean;
				ma200: boolean;
			},
			maData: Record<string, { value: number } | undefined>,
		): string => {
			const dateStr = formatDateTime(paramTime);

			// Price and volume change percentages
			const priceChangePercent =
				currentDataPoint.close_changed !== null &&
				currentDataPoint.close_changed !== undefined
					? `<span style="color: ${currentDataPoint.close_changed >= 0 ? "#16a34a" : "#dc2626"}; font-size: 9px;">${formatPercent(currentDataPoint.close_changed)}</span>`
					: "";

			const volumeChangePercent =
				currentDataPoint.volume_changed !== null &&
				currentDataPoint.volume_changed !== undefined
					? `<span style="color: ${currentDataPoint.volume_changed >= 0 ? "#16a34a" : "#dc2626"}; font-size: 9px;">${formatPercent(currentDataPoint.volume_changed)}</span>`
					: "";

			let html = `
      <div style="display: flex; justify-content: space-between; align-items: center; color: #a1a1aa; font-size: 10px; margin-bottom: 4px;">
        <span style="font-weight: bold;">${tickerSymbol}</span>
        <span>${dateStr}</span>
      </div>
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 2px 8px; font-size: 10px;">
        <div><span style="color: #a1a1aa;">O</span> ${formatPrice(currentDataPoint.open, currentDataPoint)}</div>
        <div><span style="color: #a1a1aa;">C</span> ${formatPrice(currentDataPoint.close, currentDataPoint)} ${priceChangePercent}</div>
        <div><span style="color: #a1a1aa;">H</span> <span style="color: #16a34a;">${formatPrice(currentDataPoint.high, currentDataPoint)}</span></div>
        <div><span style="color: #a1a1aa;">L</span> <span style="color: #dc2626;">${formatPrice(currentDataPoint.low, currentDataPoint)}</span></div>
    `;

			if (currentDataPoint.volume) {
				html += `
        <div style="grid-column: 1 / -1;"><span style="color: #a1a1aa;">Vol</span> ${formatVolume(currentDataPoint.volume)} ${volumeChangePercent}</div>
      `;
			}

			// Add moving averages
			const prefix = ema ? "EMA" : "MA";
			const maConfigs = [
				{ key: "ma10", label: `${prefix}10`, color: "#dc2626" },
				{ key: "ma20", label: `${prefix}20`, color: "#16a34a" },
				{ key: "ma50", label: `${prefix}50`, color: "#2563eb" },
				{ key: "ma100", label: `${prefix}100`, color: "#a1a1aa" },
				{ key: "ma200", label: `${prefix}200`, color: "#71717a" },
			];

			const visibleMAs = maConfigs.filter((config) => {
				const isVisible = maVisibility[config.key as keyof typeof maVisibility];
				const hasData = maData[config.key] !== undefined;
				const hasScore =
					currentDataPoint[`${config.key}_score` as keyof StockData] !== null;
				return isVisible && hasData && hasScore;
			});

			if (visibleMAs.length > 0) {
				html += `<div style="grid-column: 1 / -1; margin-top: 4px; padding-top: 4px; border-top: 1px solid #27272a;"></div>`;

				visibleMAs.forEach((config, index) => {
					const maScoreKey = `${config.key}_score` as keyof StockData;
					const score = currentDataPoint[maScoreKey] as number;
					const scoreColor = score >= 0 ? "#16a34a" : "#dc2626";

					if (config.key === "ma200") {
						html += `<div style="grid-column: 1 / -1;">
            <span style="color: ${config.color}; display: inline-block; width: 40px;">${config.label}</span>
            ${formatPrice(maData[config.key]!.value, currentDataPoint)}
            <span style="color: ${config.color};">Score</span>
            <span style="color: ${scoreColor}; font-size: 9px;">${formatPercent(score)}</span>
          </div>`;
					} else {
						html += `<div><span style="color: ${config.color}; display: inline-block; width: 40px;">${config.label}</span> ${formatPrice(maData[config.key]!.value, currentDataPoint)}</div>`;
						html += `<div><span style="color: ${config.color}; display: inline-block; width: 40px;">Score</span> <span style="color: ${scoreColor}; font-size: 9px;">${formatPercent(score)}</span></div>`;
					}
				});
			}

			return html + "</div>";
		},
		[formatDateTime, ema],
	);

	const positionTooltip = useCallback(
		(position: TooltipPosition) => {
			if (!tooltipRef.current || !chartContainerRef.current) return;

			if (position === "top-right") {
				const left =
					chartContainerRef.current.clientWidth -
					TOOLTIP_WIDTH -
					TOOLTIP_MARGIN;
				const top = TOOLTIP_MARGIN;
				tooltipRef.current.style.left = `${left}px`;
				tooltipRef.current.style.top = `${top}px`;
			} else {
				const { x, y } = position;
				let left = x + TOOLTIP_MARGIN;
				if (left > chartContainerRef.current.clientWidth - TOOLTIP_WIDTH) {
					left = x - TOOLTIP_MARGIN - TOOLTIP_WIDTH;
				}

				let top = y + TOOLTIP_MARGIN;
				if (top > chartContainerRef.current.clientHeight - TOOLTIP_HEIGHT) {
					top = y - TOOLTIP_HEIGHT - TOOLTIP_MARGIN;
				}

				tooltipRef.current.style.left = `${left}px`;
				tooltipRef.current.style.top = `${top}px`;
			}
		},
		[chartContainerRef],
	);

	const showTooltip = useCallback(
		(
			mode: TooltipMode,
			dataPoint: StockData,
			paramTime: Time,
			tickerSymbol: string,
			maVisibility: {
				ma10: boolean;
				ma20: boolean;
				ma50: boolean;
				ma100: boolean;
				ma200: boolean;
			},
			maData: Record<string, { value: number } | undefined>,
			position: TooltipPosition = "top-right",
		) => {
			if (!tooltipRef.current) return;

			const content = buildTooltipHTML(
				dataPoint,
				paramTime,
				tickerSymbol,
				maVisibility,
				maData,
			);
			if (!content) return;

			tooltipRef.current.innerHTML = content;
			tooltipRef.current.style.display = "block";

			positionTooltip(position);

			tooltipState.current = {
				isVisible: true,
				mode,
				content,
				position,
			};
		},
		[buildTooltipHTML, positionTooltip],
	);

	const showTooltipAtPosition = useCallback(
		(
			mode: TooltipMode,
			dataPoint: StockData,
			paramTime: Time,
			tickerSymbol: string,
			maVisibility: {
				ma10: boolean;
				ma20: boolean;
				ma50: boolean;
				ma100: boolean;
				ma200: boolean;
			},
			maData: Record<string, { value: number } | undefined>,
			x: number,
			y: number,
		) => {
			showTooltip(
				mode,
				dataPoint,
				paramTime,
				tickerSymbol,
				maVisibility,
				maData,
				{ x, y },
			);
		},
		[showTooltip],
	);

	const hideTooltip = useCallback(() => {
		if (!tooltipRef.current) return;

		tooltipRef.current.style.display = "none";
		tooltipRef.current.innerHTML = "";

		tooltipState.current = {
			isVisible: false,
			mode: "hover",
			content: "",
		};
	}, []);

	const cleanup = useCallback(() => {
		if (
			tooltipRef.current &&
			chartContainerRef.current &&
			tooltipRef.current.parentNode === chartContainerRef.current
		) {
			chartContainerRef.current.removeChild(tooltipRef.current);
			tooltipRef.current = null;
		}
	}, [chartContainerRef]);

	return {
		createTooltipElement,
		showTooltip,
		showTooltipAtPosition,
		hideTooltip,
		cleanup,
		isVisible: tooltipState.current.isVisible,
	};
};
