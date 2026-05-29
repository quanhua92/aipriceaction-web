import { Link } from "@tanstack/react-router";

export default function Footer() {
	return (
		<footer className="border-t bg-gray-800 text-white py-6 px-4">
			<div className="container mx-auto">
				<div className="grid grid-cols-2 md:grid-cols-4 gap-4">
					<div className="space-y-2">
						<Link
							to="/ai"
							className="block text-sm text-gray-300 hover:text-green-400 transition-colors"
						>
							AI Context
						</Link>
						<Link
							to="/skills"
							className="block text-sm text-gray-300 hover:text-green-400 transition-colors"
						>
							AI Agent Skills
						</Link>
						<Link
							to="/backtesting"
							search={{
								ticker: undefined,
								endDate: undefined,
								interval: undefined,
								limit: undefined,
							}}
							className="block text-sm text-gray-300 hover:text-green-400 transition-colors"
						>
							Backtesting
						</Link>
					</div>

					<div className="space-y-2">
						<Link
							to="/crypto"
							className="block text-sm text-gray-300 hover:text-green-400 transition-colors"
						>
							Crypto Market
						</Link>
						<Link
							to="/global"
							className="block text-sm text-gray-300 hover:text-green-400 transition-colors"
						>
							Global Market
						</Link>
						<Link
							to="/chart"
							className="block text-sm text-gray-300 hover:text-green-400 transition-colors"
						>
							Chart
						</Link>
					</div>

					<div className="space-y-2">
						<Link
							to="/watch"
							className="block text-sm text-gray-300 hover:text-green-400 transition-colors"
						>
							Watchlist
						</Link>
						<Link
							to="/heatmap"
							className="block text-sm text-gray-300 hover:text-green-400 transition-colors"
						>
							Heatmap
						</Link>
						<Link
							to="/matrix"
							className="block text-sm text-gray-300 hover:text-green-400 transition-colors"
						>
							Market Matrix
						</Link>
					</div>

					<div className="space-y-2">
						<Link
							to="/signals"
							className="block text-sm text-gray-300 hover:text-green-400 transition-colors"
						>
							Signals
						</Link>
						<Link
							to="/alert"
							className="block text-sm text-gray-300 hover:text-green-400 transition-colors"
						>
							Alerts
						</Link>
						<Link
							to="/sync"
							className="block text-sm text-gray-300 hover:text-green-400 transition-colors"
						>
							Sync
						</Link>
					</div>
				</div>
			</div>
		</footer>
	);
}
