import { useMemo } from "react";
import { useAPI } from "@/contexts/APIContext";
import type { Interval, StockData } from "@/lib/api-client";
import { INTRADAY_INTERVALS } from "@/lib/constants";
import {
	formatPercent,
	formatPrice,
	formatVolume,
	parseUTCISOString,
} from "@/lib/format";
import { cn } from "@/lib/utils";

interface MAValue {
	label: string;
	value: number;
	color: string;
}

interface ChartOverlayProps {
	data: StockData | null;
	maVisibility: {
		ma10: boolean;
		ma20: boolean;
		ma50: boolean;
		ma100: boolean;
		ma200: boolean;
	};
	interval: Interval;
}

const DataLine = ({ data }: { data: StockData }) => {
	const change = data.close_changed ?? 0;
	const symbolColor =
		change > 6.5
			? "text-purple-400"
			: change >= 0
				? "text-green-400"
				: change < -6.5
					? "text-cyan-400"
					: "text-red-400";
	const priceColor =
		change > 6.5
			? "text-purple-400"
			: change >= 0
				? "text-green-400"
				: change < -6.5
					? "text-cyan-400"
					: "text-red-400";
	const percentColor =
		change > 6.5
			? "text-purple-400"
			: change >= 0
				? "text-green-400"
				: change < -6.5
					? "text-cyan-400"
					: "text-red-400";

	const isIntradayInterval = INTRADAY_INTERVALS.includes(
		data.interval as Interval,
	);

	const formatTimestamp = () => {
		try {
			if (!data.time || typeof data.time !== "string") return "--";
			const date = parseUTCISOString(data.time);
			return isIntradayInterval
				? date.toLocaleString("vi-VN", {
						month: "short",
						day: "numeric",
						hour: "2-digit",
						minute: "2-digit",
					})
				: date.toLocaleDateString("vi-VN", {
						month: "short",
						day: "numeric",
					});
		} catch {
			return "--";
		}
	};

	return (
		<>
			<span className={cn("font-semibold", symbolColor)}>{data.symbol}</span>{" "}
			<span className={cn(priceColor)}>{formatPrice(data.close, data)}</span>{" "}
			<span className={cn(percentColor)}>{formatPercent(change)}</span>
			<span className="mx-1"></span>
			<span
				className={cn(
					(data.volume_changed ?? 0) >= 0 ? "text-green-400" : "text-red-400",
				)}
			>
				{formatVolume(data.volume)}
			</span>{" "}
			<span
				className={cn(
					(data.volume_changed ?? 0) >= 0 ? "text-green-600" : "text-red-600",
				)}
			>
				{formatPercent(data.volume_changed ?? 0)}
			</span>
			<span className="text-zinc-400 ml-2">{formatTimestamp()}</span>
		</>
	);
};

const MALine = ({ values, data }: { values: MAValue[]; data: StockData }) => (
	<div
		className={cn(
			"absolute top-7 left-3 text-zinc-100 z-10 pointer-events-none",
			"text-[9px]",
		)}
		style={{
			WebkitFontSmoothing: "antialiased",
			MozOsxFontSmoothing: "grayscale",
			opacity: 0.8,
		}}
	>
		{values.map((ma, index) => (
			<span key={ma.label}>
				<span style={{ color: ma.color }}>{ma.label}:</span>
				<span style={{ color: ma.color, marginLeft: "2px" }}>
					{formatPrice(ma.value, data)}
				</span>
				{index < values.length - 1 && <span className="mx-1"></span>}
			</span>
		))}
	</div>
);

export const ChartOverlay = ({
	data,
	maVisibility,
	interval,
}: ChartOverlayProps) => {
	const { ema } = useAPI();
	if (!data) return null;

	const maValues = useMemo(() => {
		const values: MAValue[] = [];

		if (maVisibility.ma10 && data.ma10 != null) {
			values.push({
				label: ema ? "EMA10" : "MA10",
				value: data.ma10,
				color: "#dc2626",
			});
		}
		if (maVisibility.ma20 && data.ma20 != null) {
			values.push({
				label: ema ? "EMA20" : "MA20",
				value: data.ma20,
				color: "#16a34a",
			});
		}
		if (maVisibility.ma50 && data.ma50 != null) {
			values.push({
				label: ema ? "EMA50" : "MA50",
				value: data.ma50,
				color: "#2563eb",
			});
		}
		if (maVisibility.ma100 && data.ma100 != null) {
			values.push({
				label: ema ? "EMA100" : "MA100",
				value: data.ma100,
				color: "#a1a1aa",
			});
		}
		if (maVisibility.ma200 && data.ma200 != null) {
			values.push({
				label: ema ? "EMA200" : "MA200",
				value: data.ma200,
				color: "#71717a",
			});
		}

		return values;
	}, [data, maVisibility, ema]);

	return (
		<div>
			<div
				className={cn(
					"absolute top-3 left-3 text-zinc-100 z-10 pointer-events-none text-[11px]",
				)}
				style={{
					WebkitFontSmoothing: "antialiased",
					MozOsxFontSmoothing: "grayscale",
				}}
			>
				<DataLine data={data} />
			</div>

			{maValues.length > 0 && <MALine values={maValues} data={data} />}
		</div>
	);
};
