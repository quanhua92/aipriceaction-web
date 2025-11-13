import { AIPriceActionClient } from '@/integrations/aipriceaction/src'
import type { StockData, TickersResponse } from '@/integrations/aipriceaction/src'

/**
 * Get API base URL based on environment
 * - Development: /aipriceaction-api (proxied to localhost:3000 by Vite)
 * - Production: https://api.aipriceaction.com
 */
function getApiBaseURL(): string {
  if (import.meta.env.MODE === 'production') {
    return 'https://api.aipriceaction.com'
  }
  // Use proxy path in development for network access
  return '/aipriceaction-api'
}

/**
 * Normalize API timestamp to UTC ISO string format
 * Handles both date-only and datetime formats from the API
 *
 * @param apiTimeString - UTC time string from API in format "YYYY-MM-DD HH:MM:SS" or "YYYY-MM-DD"
 * @returns UTC ISO string with 'Z' suffix (e.g., "2025-11-09T14:00:00Z")
 * @example "2025-11-09 14:00:00" (UTC) => "2025-11-09T14:00:00Z"
 * @example "2025-11-09" (date only) => "2025-11-09T02:00:00Z" (assumes 02:00 UTC for daily data)
 */
function normalizeAPITimestamp(apiTimeString: string): string {
  // Check if input is date-only (no time component)
  const isDateOnly = !apiTimeString.includes(':')

  if (isDateOnly) {
    // For date-only formats (1D, 1W, 2W, 1M), API uses 02:00 UTC
    return `${apiTimeString}T02:00:00Z`
  }

  // For datetime formats, replace space with 'T' and add 'Z'
  return apiTimeString.replace(' ', 'T') + 'Z'
}

/**
 * Transform StockData timestamps from API format to UTC ISO strings
 * @param data - Array of stock data with API format timestamps
 * @returns Array of stock data with UTC ISO timestamps
 */
function normalizeStockDataTimestamps(data: StockData[]): StockData[] {
  return data.map(item => ({
    ...item,
    time: normalizeAPITimestamp(item.time)
  }))
}

/**
 * Singleton API client instance
 */
export const apiClient = new AIPriceActionClient({
  baseURL: getApiBaseURL(),
  timeout: 30000,
  retry: {
    maxRetries: 3,
    initialDelay: 1000,
    maxDelay: 10000,
    backoffMultiplier: 2,
  },
  debug: import.meta.env.MODE === 'development',
})

/**
 * Get ticker groups organized by sector
 */
export async function getTickerGroups() {
  return apiClient.getTickerGroups()
}

/**
 * Get ticker data for specific symbols
 * Normalizes API timestamps to UTC ISO format (e.g., "2025-11-09T14:00:00Z")
 * Display components will convert to Vietnam time when rendering
 */
export async function getTickers(params: Parameters<typeof apiClient.getTickers>[0]) {
  const response = await apiClient.getTickers(params)

  // Normalize all ticker data timestamps to UTC ISO format
  const normalizedResponse: TickersResponse = {}
  for (const [ticker, data] of Object.entries(response)) {
    normalizedResponse[ticker] = normalizeStockDataTimestamps(data)
  }

  return normalizedResponse
}

/**
 * Get top performing stocks
 */
export async function getTopPerformers(params?: Parameters<typeof apiClient.getTopPerformers>[0]) {
  return apiClient.getTopPerformers(params)
}

/**
 * Get MA scores by sector
 */
export async function getMAScoresBySector(params?: Parameters<typeof apiClient.getMAScoresBySector>[0]) {
  return apiClient.getMAScoresBySector(params)
}

/**
 * Get API health status
 */
export async function getHealth() {
  return apiClient.getHealth()
}

// Re-export types and enums from the SDK
export type {
  TickerGroups,
  TickersQueryParams,
  TickersResponse,
  StockData,
  TopPerformersQueryParams,
  TopPerformersResponse,
  PerformerData,
  MAScoresBySectorQueryParams,
  MAScoresBySectorResponse,
  SectorMAScore,
  HealthResponse,
} from '@/integrations/aipriceaction/src'

export { Interval } from '@/integrations/aipriceaction/src'
