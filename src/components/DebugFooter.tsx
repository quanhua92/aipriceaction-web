import React from 'react'
import { useLocation } from '@tanstack/react-router'
import { ChevronUp, ChevronDown } from 'lucide-react'
import {
	Collapsible,
	CollapsibleContent,
	CollapsibleTrigger,
} from '@/components/ui/collapsible'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { useAPI } from '@/contexts/APIContext'
import { useChartSettings } from '@/contexts/ChartSettingsContext'
import { useRefresh } from '@/contexts/RefreshContext'
import {
	ALL_WATCHLIST_NAME,
	CUSTOM_WATCHLISTS_STORAGE_KEY,
	AI_SELECTED_TICKERS_STORAGE_KEY,
	MATRIX_OPEN_SECTORS_STORAGE_KEY,
} from '@/lib/constants'

const DEBUG_FOOTER_STORAGE_KEY = 'debug-footer-open'

/**
 * Format timestamp to readable date/time
 */
function formatTimestamp(timestamp: number): string {
	return new Date(timestamp).toLocaleString()
}

/**
 * Get localStorage data for debugging
 */
function getLocalStorageData() {
	if (typeof window === 'undefined') return {}

	const keys = [
		CUSTOM_WATCHLISTS_STORAGE_KEY,
		AI_SELECTED_TICKERS_STORAGE_KEY,
		MATRIX_OPEN_SECTORS_STORAGE_KEY,
		DEBUG_FOOTER_STORAGE_KEY,
		'theme',
	]

	const data: Record<string, any> = {}
	keys.forEach((key) => {
		const value = localStorage.getItem(key)
		if (value !== null) {
			try {
				data[key] = JSON.parse(value)
			} catch {
				data[key] = value
			}
		}
	})

	return data
}

/**
 * Debug section component for displaying key-value pairs
 */
function DebugSection({ data }: { data: Record<string, any> }) {
	return (
		<div className="space-y-2">
			{Object.entries(data).map(([key, value]) => (
				<div key={key} className="flex flex-col gap-1">
					<div className="text-xs font-medium text-muted-foreground">{key}</div>
					<div className="text-sm font-mono bg-muted p-2 rounded overflow-auto max-h-32">
						{typeof value === 'object' ? (
							<pre className="text-xs">{JSON.stringify(value, null, 2)}</pre>
						) : (
							<span>{String(value)}</span>
						)}
					</div>
				</div>
			))}
		</div>
	)
}

/**
 * DebugFooter - Collapsible footer showing debug information from global contexts
 * Always visible (both dev and production) for debugging live issues
 */
export function DebugFooter() {
	const location = useLocation()
	const apiContext = useAPI()
	const chartSettings = useChartSettings()
	const refresh = useRefresh()

	// Load collapsed state from localStorage
	const [isOpen, setIsOpen] = React.useState(() => {
		if (typeof window === 'undefined') return false
		const saved = localStorage.getItem(DEBUG_FOOTER_STORAGE_KEY)
		return saved === 'true'
	})

	// Persist collapsed state to localStorage
	React.useEffect(() => {
		if (typeof window !== 'undefined') {
			localStorage.setItem(DEBUG_FOOTER_STORAGE_KEY, String(isOpen))
		}
	}, [isOpen])

	// Get current date for footer display
	const today = new Date().toLocaleDateString('en-US', {
		year: 'numeric',
		month: 'short',
		day: 'numeric',
	})

	// Prepare debug data for each tab
	const apiData = {
		loading: apiContext.loading,
		error: apiContext.error || 'None',
		'tickers count': apiContext.tickers.length,
		'ticker groups count': apiContext.tickerGroups
			? Object.keys(apiContext.tickerGroups).length
			: 0,
		'all tickers data count': Object.keys(apiContext.allTickersData).length,
	}

	const chartData = {
		interval: chartSettings.interval,
		limit: chartSettings.limit,
		height: chartSettings.height,
		startDate: chartSettings.startDate || 'None',
		endDate: chartSettings.endDate || 'None',
		maVisibility: chartSettings.maVisibility,
	}

	const refreshData = {
		isRefreshEnabled: refresh.isRefreshEnabled,
		lastRefresh: formatTimestamp(refresh.lastRefresh),
		lastRefreshRaw: refresh.lastRefresh,
	}

	const routeData = {
		pathname: location.pathname,
		search: location.search || '{}',
		hash: location.hash || 'None',
		href: location.href,
	}

	const environmentData = {
		mode: import.meta.env.MODE,
		dev: import.meta.env.DEV,
		prod: import.meta.env.PROD,
		baseUrl:
			import.meta.env.MODE === 'production'
				? 'https://api.aipriceaction.com'
				: '/aipriceaction-api',
		userAgent:
			typeof window !== 'undefined' ? window.navigator.userAgent : 'SSR',
	}

	const preferencesData = getLocalStorageData()

	return (
		<Collapsible
			open={isOpen}
			onOpenChange={setIsOpen}
			className="border-t bg-muted/30"
		>
			<CollapsibleTrigger className="w-full py-1.5 px-4 hover:bg-muted/50 transition-colors">
				<div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
					{isOpen ? (
						<>
							<span className="font-medium text-foreground">Debug Panel</span>
							<ChevronDown className="h-4 w-4" />
						</>
					) : (
						<>
							<span>© {new Date().getFullYear()} AIPriceAction</span>
							<span>•</span>
							<span>{today}</span>
						</>
					)}
				</div>
			</CollapsibleTrigger>

			<CollapsibleContent className="p-2 md:p-4 border-t">
				<Tabs defaultValue="api" className="w-full gap-2">
					<TabsList className="w-full overflow-x-auto flex-wrap h-auto gap-1 mb-4">
						<TabsTrigger value="api" className="text-xs">
							API
						</TabsTrigger>
						<TabsTrigger value="chart" className="text-xs">
							Chart
						</TabsTrigger>
						<TabsTrigger value="refresh" className="text-xs">
							Refresh
						</TabsTrigger>
						<TabsTrigger value="route" className="text-xs">
							Route
						</TabsTrigger>
						<TabsTrigger value="environment" className="text-xs">
							Environment
						</TabsTrigger>
						<TabsTrigger value="preferences" className="text-xs">
							Preferences
						</TabsTrigger>
						<TabsTrigger value="performance" className="text-xs">
							Performance
						</TabsTrigger>
					</TabsList>

					<div className="max-h-96 overflow-y-auto">
						<TabsContent value="api" className="mt-0">
							<DebugSection data={apiData} />
						</TabsContent>

						<TabsContent value="chart" className="mt-0">
							<DebugSection data={chartData} />
						</TabsContent>

						<TabsContent value="refresh" className="mt-0">
							<DebugSection data={refreshData} />
						</TabsContent>

						<TabsContent value="route" className="mt-0">
							<DebugSection data={routeData} />
						</TabsContent>

						<TabsContent value="environment" className="mt-0">
							<DebugSection data={environmentData} />
						</TabsContent>

						<TabsContent value="preferences" className="mt-0">
							{Object.keys(preferencesData).length > 0 ? (
								<DebugSection data={preferencesData} />
							) : (
								<div className="text-sm text-muted-foreground">
									No preferences data found
								</div>
							)}
						</TabsContent>

						<TabsContent value="performance" className="mt-0">
							<div className="text-sm text-muted-foreground">
								Performance metrics coming soon...
							</div>
						</TabsContent>
					</div>
				</Tabs>
			</CollapsibleContent>
		</Collapsible>
	)
}
