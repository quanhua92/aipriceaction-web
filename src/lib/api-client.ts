import { AIPriceActionClient } from '@/integrations/aipriceaction/src'

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
 */
export async function getTickers(params: Parameters<typeof apiClient.getTickers>[0]) {
  return apiClient.getTickers(params)
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
