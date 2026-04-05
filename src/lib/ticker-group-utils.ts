import { getWatchlistTickers } from './watchlist-storage'
import { getPredefinedWatchlistTickers, isPredefinedWatchlist } from './predefined-watchlists'
import { ALL_WATCHLIST_NAME, CRYPTO_WATCHLIST_NAME, GLOBAL_WATCHLIST_NAME, MARKET_INDICES } from './constants'

export interface TickerGroupInfo {
	tickers: string[]
	type: 'all' | 'crypto' | 'global' | 'predefined' | 'custom' | 'sector'
}

/**
 * Get tickers for any group name (ALL, CRYPTO, GLOBAL, predefined, custom, or sector)
 */
export function getTickersForGroup(
	groupName: string,
	tickerGroups: Record<string, string[]> | null,
	cryptoTickers: { symbol: string; sector: string }[],
	globalTickers: { symbol: string; sector: string }[],
	customWatchlistNames: string[]
): TickerGroupInfo {
	// ALL watchlist - all sectors
	if (groupName === ALL_WATCHLIST_NAME) {
		const allTickers: string[] = []
		if (tickerGroups) {
			Object.entries(tickerGroups).forEach(([sector, symbols]) => {
				if (!MARKET_INDICES.includes(sector as any)) {
					allTickers.push(...symbols)
				}
			})
		}
		return { tickers: allTickers, type: 'all' }
	}

	// CRYPTO watchlist
	if (groupName === CRYPTO_WATCHLIST_NAME) {
		return {
			tickers: cryptoTickers.map((t) => t.symbol),
			type: 'crypto',
		}
	}

	// GLOBAL watchlist
	if (groupName === GLOBAL_WATCHLIST_NAME) {
		return {
			tickers: globalTickers.map((t) => t.symbol),
			type: 'global',
		}
	}

	// Predefined watchlist (VN30, VINGROUP, etc)
	if (isPredefinedWatchlist(groupName)) {
		return {
			tickers: getPredefinedWatchlistTickers(groupName),
			type: 'predefined',
		}
	}

	// Custom watchlist
	if (customWatchlistNames.includes(groupName)) {
		return {
			tickers: getWatchlistTickers(groupName),
			type: 'custom',
		}
	}

	// Regular sector group
	return {
		tickers: tickerGroups?.[groupName] || [],
		type: 'sector',
	}
}
