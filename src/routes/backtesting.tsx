import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { PlaygroundChart } from "@/components/playground/PlaygroundChart";
import { PlaygroundControls } from "@/components/playground/PlaygroundControls";
import { PlaygroundDataProvider } from "@/components/playground/PlaygroundDataProvider";
import { PlaygroundDescription } from "@/components/playground/PlaygroundDescription";
import { PlaygroundInfoPanel } from "@/components/playground/PlaygroundInfoPanel";
import { PlaygroundIntervalWatcher } from "@/components/playground/PlaygroundIntervalWatcher";
import { PlaygroundOrderBook } from "@/components/playground/PlaygroundOrderBook";
import { useChartSettings } from "@/contexts/ChartSettingsContext";

export const Route = createFileRoute("/backtesting")({
	component: PlayPage,
	validateSearch: (search: Record<string, unknown>) => ({
		ticker: (search.ticker as string) || undefined,
		endDate: (search.endDate as string) || undefined,
		interval: (search.interval as string) || undefined,
		limit: search.limit ? Number(search.limit) : undefined,
	}),
});

function PlayPage() {
	const { ticker, endDate, interval, limit } = Route.useSearch();
	const navigate = useNavigate();
	const { setInterval: setGlobalInterval } = useChartSettings();

	return (
		<div className="space-y-4">
			{/* Description Section */}
			<div className="bg-gradient-to-r from-green-500/10 via-blue-500/10 to-purple-500/10 border-b">
				<div className="container mx-auto p-6 md:p-8">
					<PlaygroundDescription />
				</div>
			</div>

			<PlaygroundDataProvider
				initialTicker={ticker}
				initialEndDate={endDate}
				initialSecondaryTicker={"VNINDEX"}
				initialInterval={interval}
				initialLimit={limit}
				navigate={navigate}
				onIntervalInit={(interval) =>
					setGlobalInterval(interval as import("@/lib/api-client").Interval)
				}
			>
				<div className="space-y-4">
					{/* Top: Info */}
					<div className="px-4 md:px-6 pt-4 md:pt-6 pb-2">
						<PlaygroundInfoPanel />
					</div>

					{/* Top: Slider + Date Controls */}
					<div className="px-4 md:px-6 pb-2">
						<PlaygroundControls hideSliderAndDate={false} />
					</div>

					{/* Middle: Chart */}
					<div className="px-4 md:px-6 py-2">
						<PlaygroundChart />
					</div>

					{/* Interval Availability Warning */}
					<PlaygroundIntervalWatcher />

					{/* Bottom: Controls (nav buttons only) */}
					<div className="px-4 md:px-6 pb-4 md:pb-6 pt-2">
						<PlaygroundControls hideSliderAndDate enableKeyboardShortcuts />
					</div>

					{/* Order Book */}
					<div className="px-4 md:px-6 pb-4 md:pb-6">
						<PlaygroundOrderBook />
					</div>
				</div>
			</PlaygroundDataProvider>
		</div>
	);
}
