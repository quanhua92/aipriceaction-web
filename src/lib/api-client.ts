import { AIPriceActionClient } from '@/integrations/aipriceaction/src'
import type { StockData, TickersResponse } from '@/integrations/aipriceaction/src'
import { parseUTCToVietnamTime } from './format'

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
 * Convert UTC timestamp string to Vietnam time string (UTC+7)
 * For date-only formats (1D, 1W, 2W, 1M), assumes 02:00 UTC from API
 * @param utcTimeString - UTC time string in format "YYYY-MM-DD HH:MM:SS" or "YYYY-MM-DD"
 * @returns Vietnam time string in same format
 * @example "2025-11-09 14:00:00" (UTC) => "2025-11-09 21:00:00" (Vietnam)
 * @example "2025-11-09" (assumes 02:00 UTC) => "2025-11-09 09:00:00" (9am Vietnam)
 */
function convertUTCTimestampToVietnamString(utcTimeString: string): string {
  // Check if input is date-only (no time component)
  const isDateOnly = !utcTimeString.includes(':')

  let utcTimeToParse = utcTimeString
  if (isDateOnly) {
    // For date-only formats (1D, 1W, 2W, 1M), API uses 02:00 UTC
    utcTimeToParse = utcTimeString + ' 02:00:00'
  }

  const unixTime = parseUTCToVietnamTime(utcTimeToParse)
  const date = new Date(unixTime * 1000)

  // Format back to "YYYY-MM-DD HH:MM:SS" in local time (which is now Vietnam time)
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  const hours = String(date.getHours()).padStart(2, '0')
  const minutes = String(date.getMinutes()).padStart(2, '0')
  const seconds = String(date.getSeconds()).padStart(2, '0')

  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`
}

/**
 * Transform StockData timestamps from UTC to Vietnam time (UTC+7)
 * @param data - Array of stock data with UTC timestamps
 * @returns Array of stock data with Vietnam time timestamps
 */
function transformStockDataTimestamps(data: StockData[]): StockData[] {
  return data.map(item => ({
    ...item,
    time: convertUTCTimestampToVietnamString(item.time)
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
 * Automatically transforms UTC timestamps to Vietnam time (UTC+7)
 */
export async function getTickers(params: Parameters<typeof apiClient.getTickers>[0]) {
  const response = await apiClient.getTickers(params)

  // Transform all ticker data timestamps from UTC to Vietnam time
  const transformedResponse: TickersResponse = {}
  for (const [ticker, data] of Object.entries(response)) {
    transformedResponse[ticker] = transformStockDataTimestamps(data)
  }

  return transformedResponse
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
