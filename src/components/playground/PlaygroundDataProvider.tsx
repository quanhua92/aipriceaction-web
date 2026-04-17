import * as React from "react";
import { usePlaygroundData } from "./hooks/usePlaygroundData";
import { usePlaygroundOrders } from "./hooks/usePlaygroundOrders";
import { SafeLocalStorage } from "@/lib/localStorage";

const SHOW_ALERT_LINES_KEY = "playground-show-alert-lines";
const SHOW_CHART_LINES_KEY = "playground-show-chart-lines";

interface PlaygroundContextValue {
	playgroundData: ReturnType<typeof usePlaygroundData>["playgroundData"];
	visibleData: ReturnType<typeof usePlaygroundData>["visibleData"];
	secondaryVisibleData: ReturnType<
		typeof usePlaygroundData
	>["secondaryVisibleData"];
	setCurrentIndex: ReturnType<typeof usePlaygroundData>["setCurrentIndex"];
	navigate: ReturnType<typeof usePlaygroundData>["navigate"];
	randomizeData: ReturnType<typeof usePlaygroundData>["randomizeData"];
	updateTicker: ReturnType<typeof usePlaygroundData>["updateTicker"];
	updateEndDate: ReturnType<typeof usePlaygroundData>["updateEndDate"];
	updateInterval: ReturnType<typeof usePlaygroundData>["updateInterval"];
	updateLimit: ReturnType<typeof usePlaygroundData>["updateLimit"];
	updateSecondaryTicker: ReturnType<
		typeof usePlaygroundData
	>["updateSecondaryTicker"];
	toggleSecondaryChart: ReturnType<
		typeof usePlaygroundData
	>["toggleSecondaryChart"];
	setShowSecondaryChart: ReturnType<
		typeof usePlaygroundData
	>["setShowSecondaryChart"];
	orders: ReturnType<typeof usePlaygroundOrders>["orders"];
	stoplossPct: ReturnType<typeof usePlaygroundOrders>["stoplossPct"];
	setStoplossPct: ReturnType<typeof usePlaygroundOrders>["setStoplossPct"];
	handlePlaceOrder: ReturnType<typeof usePlaygroundOrders>["handlePlace"];
	handleClearOrders: ReturnType<typeof usePlaygroundOrders>["handleClear"];
	showAlertLines: boolean;
	setShowAlertLines: (value: boolean) => void;
	showChartLines: boolean;
	setShowChartLines: (value: boolean) => void;
}

const PlaygroundContext = React.createContext<
	PlaygroundContextValue | undefined
>(undefined);

export function usePlayground() {
	const context = React.useContext(PlaygroundContext);
	if (context === undefined) {
		throw new Error(
			"usePlayground must be used within a PlaygroundDataProvider",
		);
	}
	return context;
}

export interface PlaygroundDataProviderProps {
	children: React.ReactNode;
	initialTicker?: string;
	initialEndDate?: string;
	initialSecondaryTicker?: string;
	initialInterval?: string;
	initialLimit?: number;
	navigate?: (options: { to: string; search?: Record<string, string> }) => void;
	onIntervalInit?: (interval: string) => void;
}

export function PlaygroundDataProvider({
	children,
	initialTicker,
	initialEndDate,
	initialSecondaryTicker,
	initialInterval,
	initialLimit,
	navigate: navigateFn,
	onIntervalInit,
}: PlaygroundDataProviderProps) {
	const playgroundDataValue = usePlaygroundData(
		initialTicker,
		initialEndDate,
		navigateFn,
		initialSecondaryTicker,
		initialInterval,
		onIntervalInit,
		initialLimit,
	);

	const ordersValue = usePlaygroundOrders(
		playgroundDataValue.playgroundData.ticker,
		playgroundDataValue.visibleData,
		playgroundDataValue.playgroundData.currentIndex,
	);

	const [showAlertLines, setShowAlertLinesState] = React.useState<boolean>(() => {
		const stored = SafeLocalStorage.getItem(SHOW_ALERT_LINES_KEY);
		return stored === null ? false : stored === "true";
	});
	const setShowAlertLines = React.useCallback((value: boolean) => {
		setShowAlertLinesState(value);
		SafeLocalStorage.setItem(SHOW_ALERT_LINES_KEY, String(value));
	}, []);

	const [showChartLines, setShowChartLinesState] = React.useState<boolean>(() => {
		const stored = SafeLocalStorage.getItem(SHOW_CHART_LINES_KEY);
		return stored === null ? true : stored === "true";
	});
	const setShowChartLines = React.useCallback((value: boolean) => {
		setShowChartLinesState(value);
		SafeLocalStorage.setItem(SHOW_CHART_LINES_KEY, String(value));
	}, []);

	const value: PlaygroundContextValue = {
		playgroundData: playgroundDataValue.playgroundData,
		visibleData: playgroundDataValue.visibleData,
		secondaryVisibleData: playgroundDataValue.secondaryVisibleData,
		setCurrentIndex: playgroundDataValue.setCurrentIndex,
		navigate: playgroundDataValue.navigate,
		randomizeData: playgroundDataValue.randomizeData,
		updateTicker: playgroundDataValue.updateTicker,
		updateEndDate: playgroundDataValue.updateEndDate,
		updateInterval: playgroundDataValue.updateInterval,
		updateLimit: playgroundDataValue.updateLimit,
		updateSecondaryTicker: playgroundDataValue.updateSecondaryTicker,
		toggleSecondaryChart: playgroundDataValue.toggleSecondaryChart,
		setShowSecondaryChart: playgroundDataValue.setShowSecondaryChart,
		orders: ordersValue.orders,
		stoplossPct: ordersValue.stoplossPct,
		setStoplossPct: ordersValue.setStoplossPct,
		handlePlaceOrder: ordersValue.handlePlace,
		handleClearOrders: ordersValue.handleClear,
		showAlertLines,
		setShowAlertLines,
		showChartLines,
		setShowChartLines,
	};

	return (
		<PlaygroundContext.Provider value={value}>
			{children}
		</PlaygroundContext.Provider>
	);
}
