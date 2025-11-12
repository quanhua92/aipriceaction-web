import { createFileRoute } from "@tanstack/react-router";
import * as React from "react";
import { MarketMatrix } from "@/components/MarketMatrix";
import { TradingViewChart } from "@/components/charts/TradingViewChart";
import { BasicWatchList } from "@/components/lists";
import { BasicTickerWidget } from "@/components/widgets/BasicTickerWidget";
import { ALL_WATCHLIST_NAME } from "@/lib/constants";

export const Route = createFileRoute("/")({ component: HomePage });

function HomePage() {
	// State for selected ticker from watchlist
	const [selectedTicker, setSelectedTicker] = React.useState("VNINDEX");
	// State for selected sector group from watchlist
	const [selectedSector, setSelectedSector] = React.useState(ALL_WATCHLIST_NAME);

	return (
		<div className="space-y-8">
			{/* Section 1: Charts Grid */}
			<div className="p-4 md:p-6">
				<div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
					<TradingViewChart initialTicker="VNINDEX" />
					<TradingViewChart initialTicker="VIC" />
					<TradingViewChart initialTicker="STB" />
					<TradingViewChart initialTicker="VIX" />
				</div>
			</div>

			{/* Section 2: Watchlist + Interactive Chart */}
			<div className="p-4 md:p-6 border-t">
				<div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
					<div className="lg:col-span-1">
						<BasicWatchList
							defaultGroup={ALL_WATCHLIST_NAME}
							showControls={true}
							onSelectTicker={setSelectedTicker}
							onSectorChange={setSelectedSector}
						/>
					</div>
					<div className="lg:col-span-2">
						<div className="mb-2">
							<span className="text-sm text-muted-foreground">
								Current Sector:{" "}
								<span className="font-semibold">{selectedSector}</span>
							</span>
						</div>
						<h3 className="text-lg font-semibold mb-4">
							Watchlist Chart: {selectedTicker}
						</h3>
						<div className="grid grid-cols-1 gap-4">
							<TradingViewChart
								initialTicker="VNINDEX"
								ticker={selectedTicker}
								onTickerChange={setSelectedTicker}
							/>
							<BasicTickerWidget
								initialTicker="VNINDEX"
								ticker={selectedTicker}
								onTickerChange={setSelectedTicker}
							/>
						</div>
					</div>
				</div>
			</div>

			{/* Section 3: Market Matrix */}
			<div className="p-4 md:p-6 border-t">
				<MarketMatrix />
			</div>
		</div>
	);
}
