/**
 * Predefined watchlists - read-only watchlists that are built into the application
 * These appear between "ALL" and custom watchlists in the UI
 */

import { INDEX_TICKERS, MARKET_INDICES } from './constants'

export interface PredefinedWatchlist {
  name: string
  tickers: string[]
  description?: string
}

/**
 * VN30 Index - 30 largest companies by market cap in Vietnamese stock market
 */
const VN30_TICKERS = [
  'ACB', 'BID', 'CTG', 'DGC', 'FPT',
  'GAS', 'GVR', 'HDB', 'HPG', 'LPB',
  'MBB', 'MSN', 'MWG', 'PLX', 'SAB',
  'SHB', 'SSB', 'SSI', 'STB', 'TCB',
  'TPB', 'VCB', 'VHM', 'VIB', 'VIC',
  'VJC', 'VNM', 'VPB', 'VRE', 'VPL'
]

/**
 * VINGROUP - Vingroup ecosystem companies
 */
const VINGROUP_TICKERS = [
  'VIC',  // Vingroup
  'VHM',  // Vinhomes
  'VRE',  // Vincom Retail
  'VPL'   // Vận tải PETROLIMEX
]

/**
 * TM - TM Group companies
 */
const TM_TICKERS = [
  'GEX',  // Gelex Group
  'GEE',  // Geleximco
  'VIX',  // Viglacera
  'EIB',  // Eximbank
  'VGC',  // Viglacera Corporation
  'IDC'   // IDICO Corporation
]

/**
 * MASAN - Masan Group companies
 */
const MASAN_TICKERS = [
  'MSN',  // Masan Consumer Corporation
  'MCH',  // Masan Consumer Holdings
  'MSR',  // CTCP Masan High-Tech Materials
  'MML',  // Masan MeatLife Joint Stock Company
  'VCF',  // Vinacafé Bien Hoa Joint Stock Company
  'VSN',  // VISSAN Joint Stock Company
  'NET'   // Net Detergent Joint Stock Company (NETCO)
]

/**
 * INDEX - Vietnamese market indices
 */
const ALL_INDEX_TICKERS = [...MARKET_INDICES, ...INDEX_TICKERS]

/**
 * All predefined watchlists
 */
export const PREDEFINED_WATCHLISTS: PredefinedWatchlist[] = [
  {
    name: 'VN30',
    tickers: VN30_TICKERS,
    description: 'VN30 Index - 30 largest companies by market cap'
  },
  {
    name: 'VINGROUP',
    tickers: VINGROUP_TICKERS,
    description: 'Vingroup ecosystem companies'
  },
  {
    name: 'TM',
    tickers: TM_TICKERS,
    description: 'TM Group companies'
  },
  {
    name: 'MASAN',
    tickers: MASAN_TICKERS,
    description: 'Masan Group companies'
  },
  {
    name: 'INDEX',
    tickers: ALL_INDEX_TICKERS,
    description: 'Vietnamese market indices'
  },
  {
    name: 'CROSS',
    tickers: ['VNINDEX', '^GSPC', 'GC=F', 'SJC-GOLD', 'KC=F', 'BZ=F', 'BTCUSDT'],
    description: 'Cross-market instruments'
  }
]

/**
 * Get all predefined watchlists
 */
export function getPredefinedWatchlists(): PredefinedWatchlist[] {
  return PREDEFINED_WATCHLISTS
}

/**
 * Get all predefined watchlist names
 */
export function getPredefinedWatchlistNames(): string[] {
  return PREDEFINED_WATCHLISTS.map(w => w.name)
}

/**
 * Get tickers for a specific predefined watchlist
 */
export function getPredefinedWatchlistTickers(name: string): string[] {
  const watchlist = PREDEFINED_WATCHLISTS.find(w => w.name === name)
  return watchlist?.tickers ?? []
}

/**
 * Check if a watchlist name is a predefined watchlist
 */
export function isPredefinedWatchlist(name: string): boolean {
  return PREDEFINED_WATCHLISTS.some(w => w.name === name)
}

/**
 * Get description for a predefined watchlist
 */
export function getPredefinedWatchlistDescription(name: string): string | undefined {
  const watchlist = PREDEFINED_WATCHLISTS.find(w => w.name === name)
  return watchlist?.description
}
