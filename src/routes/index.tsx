import { createFileRoute, Link } from "@tanstack/react-router";
import * as React from "react";
import { MarketMatrix } from "@/components/MarketMatrix";
import { TradingViewChart } from "@/components/charts/TradingViewChart";
import { BasicWatchList } from "@/components/lists";
import { BasicTickerWidget } from "@/components/widgets/BasicTickerWidget";
import { ALL_WATCHLIST_NAME } from "@/lib/constants";
import { useTranslation } from "@/hooks/useTranslation";
import { Button } from "@/components/ui/button";
import { Brain, ArrowRight } from "lucide-react";

export const Route = createFileRoute("/")({ component: HomePage });

function HomePage() {
	const { t } = useTranslation();
	// State for selected ticker from watchlist
	const [selectedTicker, setSelectedTicker] = React.useState("VNINDEX");
	// State for selected sector group from watchlist
	const [selectedSector, setSelectedSector] = React.useState(ALL_WATCHLIST_NAME);

	return (
		<div className="space-y-8">
			{/* Welcome Section */}
			<div className="bg-gradient-to-r from-green-500/10 via-blue-500/10 to-purple-500/10 border-b">
				<div className="container mx-auto p-6 md:p-8">
					<div className="max-w-4xl mx-auto text-center space-y-4">
						<h1 className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-green-400 to-blue-500 bg-clip-text text-transparent">
							{t("common.home.welcomeTitle")}
						</h1>
						<p className="text-base md:text-lg text-muted-foreground max-w-2xl mx-auto">
							{t("common.home.welcomeDescription")}
						</p>
						<Link to="/ai">
							<Button size="lg" className="mt-4 gap-2">
								<Brain className="h-5 w-5" />
								{t("common.home.tryAIContext")}
								<ArrowRight className="h-4 w-4" />
							</Button>
						</Link>
					</div>
				</div>
			</div>
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
