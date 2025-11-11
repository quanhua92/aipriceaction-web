import { createFileRoute } from "@tanstack/react-router";
import * as React from "react";
import { TradingViewChart } from "@/components/charts/TradingViewChart";
import { BasicWatchList } from "@/components/lists";
import { BasicTickerWidget } from "@/components/widgets/BasicTickerWidget";

export const Route = createFileRoute("/chart/")({
	component: ChartPage,
});

function ChartPage() {
		// State for selected ticker from watchlist
	const [selectedTicker, setSelectedTicker] = React.useState("MBB");
		// State for selected sector group from watchlist
	const [selectedSector, setSelectedSector] = React.useState("NGAN_HANG");

	return (
		<div className="space-y-8">
			<ChartPageContent />

			<div className="p-4 md:p-6 border-t">
				<div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
					<TradingViewChart initialTicker="VNINDEX" />
					<TradingViewChart initialTicker="VIC" />
					<TradingViewChart initialTicker="STB" />
					<TradingViewChart initialTicker="VIX" />
				</div>
			</div>

			<div className="p-4 md:p-6 border-t">
				<div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
					<div className="lg:col-span-1">
						<BasicWatchList
							defaultGroup="NGAN_HANG"
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
							<BasicTickerWidget
                initialTicker="MBB"
                ticker={selectedTicker}
                onTickerChange={setSelectedTicker}
              />
							<TradingViewChart
                initialTicker="MBB"
                ticker={selectedTicker}
                onTickerChange={setSelectedTicker}
              />
						</div>
					</div>
				</div>
			</div>
		</div>
	);
}

function ChartPageContent() {
	return (
		<div className="p-4 md:p-6">
			<div className="mb-4">
				<h1 className="text-2xl font-bold">Chart</h1>
			</div>

			<div className="space-y-4">
				<BasicTickerWidget initialTicker="VNINDEX" />
			</div>
		</div>
	);
}
