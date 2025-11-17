import { AIPriceActionClient, type RequestResult } from '@/integrations/aipriceaction/src'
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
 * Singleton API client instance (without metadata)
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
  includeMetadata: false,
})

/**
 * API client instance with metadata enabled (for logging)
 */
export const apiClientWithMetadata = new AIPriceActionClient({
  baseURL: getApiBaseURL(),
  timeout: 30000,
  retry: {
    maxRetries: 3,
    initialDelay: 1000,
    maxDelay: 10000,
    backoffMultiplier: 2,
  },
  debug: import.meta.env.MODE === 'development',
  includeMetadata: true,
})

/**
 * Get ticker groups organized by sector (Vietnamese stocks)
 */
export async function getTickerGroups() {
  return apiClient.getTickerGroups('vn')
}

/**
 * Get crypto ticker groups
 */
export async function getCryptoTickerGroups() {
  return apiClient.getTickerGroups('crypto')
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
 * Get ticker data with logging support
 * @param source - Source component/context calling this function
 * @param params - Query parameters for tickers API
 * @param logger - Logger functions (info, warn, error)
 */
export async function getTickersWithLogging(
  source: string,
  params: Parameters<typeof apiClient.getTickers>[0],
  logger?: {
    info: (message: string) => void
    warn: (message: string) => void
    error: (message: string) => void
  }
) {
  try {
    // Ensure mode is set (default to 'vn' if not specified)
    const paramsWithMode = { ...params, mode: params?.mode || 'vn' }
    const response = await apiClientWithMetadata.getTickers(paramsWithMode) as unknown as RequestResult<TickersResponse>

    // Calculate raw API response bars (before normalization)
    const rawBars = Object.values(response.data).reduce((sum, data) => sum + data.length, 0)

    // Normalize all ticker data timestamps to UTC ISO format
    const normalizedResponse: TickersResponse = {}
    for (const [ticker, data] of Object.entries(response.data)) {
      normalizedResponse[ticker] = normalizeStockDataTimestamps(data)
    }

    // Log success
    if (logger) {
      const symbolParam = params?.symbol
      const symbolStr = Array.isArray(symbolParam)
        ? symbolParam.length > 3
          ? `${symbolParam.slice(0, 3).join(',')}... (${symbolParam.length} total)`
          : symbolParam.join(',')
        : symbolParam || 'ALL'

      const cfCache = response.headers['cf-cache-status'] || 'N/A'
      const cfRay = response.headers['cf-ray'] || 'N/A'
      const rateLimit = response.headers['x-ratelimit-remaining']
        ? `RateLimit:${response.headers['x-ratelimit-remaining']}/${response.headers['x-ratelimit-limit']}`
        : 'RateLimit:N/A'

      // Get response size from metadata (already calculated during fetch)
      const sizeKB = response.metadata.responseSize
        ? (response.metadata.responseSize / 1024).toFixed(2) + 'KB'
        : 'N/A'

      const paramsStr = [
        `symbol=${symbolStr}`,
        params?.interval ? `interval=${params.interval}` : null,
        params?.limit ? `limit=${params.limit}` : null,
        params?.start_date ? `start=${params.start_date}` : null,
        params?.end_date ? `end=${params.end_date}` : null,
        paramsWithMode.mode !== 'vn' ? `mode=${paramsWithMode.mode}` : null,
      ].filter(Boolean).join(' ')

      // Calculate total bars returned after normalization
      const totalBars = Object.values(normalizedResponse).reduce((sum, data) => sum + data.length, 0)
      const tickerCount = Object.keys(normalizedResponse).length
      const averageBarsPerTicker = tickerCount > 0 ? Math.round(totalBars / tickerCount) : 0

      logger.info(
        `[API] ${source} getTickers: ${paramsStr} | ${tickerCount} tickers × ~${averageBarsPerTicker} bars avg (${totalBars} total, ${rawBars} raw) | ${response.metadata.duration}ms | ${sizeKB} | CF:${cfCache} | Ray:${cfRay} | ${rateLimit} | ${response.metadata.status}`
      )
    }

    return normalizedResponse
  } catch (error) {
    // Log error
    if (logger) {
      const symbolParam = params?.symbol
      const symbolStr = Array.isArray(symbolParam)
        ? symbolParam.join(',')
        : symbolParam || 'ALL'

      const paramsStr = [
        `symbol=${symbolStr}`,
        params?.interval ? `interval=${params.interval}` : null,
        params?.limit ? `limit=${params.limit}` : null,
      ].filter(Boolean).join(' ')

      const errorMessage = error instanceof Error ? error.message : String(error)
      logger.error(`[API] ${source} getTickers FAILED: ${errorMessage} | Params: ${paramsStr}`)
    }

    throw error
  }
}

/**
 * Get crypto ticker data with logging support
 * Convenience wrapper that sets mode='crypto' automatically
 * @param source - Source component/context calling this function
 * @param params - Query parameters for tickers API
 * @param logger - Logger functions (info, warn, error)
 */
export async function getCryptoTickersWithLogging(
  source: string,
  params: Parameters<typeof apiClient.getTickers>[0],
  logger?: {
    info: (message: string) => void
    warn: (message: string) => void
    error: (message: string) => void
  }
) {
  return getTickersWithLogging(source, { ...params, mode: 'crypto' }, logger)
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
