/**
 * AIPriceAction TypeScript SDK
 *
 * A type-safe client for the AIPriceAction Vietnamese Stock Market API
 *
 * @example
 * ```ts
 * import { AIPriceActionClient } from 'aipriceaction-js';
 *
 * const client = new AIPriceActionClient({
 *   baseURL: process.env.API_URL || 'http://localhost:3000'
 * });
 *
 * // Get stock data
 * const data = await client.getTickers({ symbol: 'VCB' });
 *
 * // Get top performers
 * const top = await client.getTopPerformers({ limit: 10 });
 *
 * // Get health status
 * const health = await client.getHealth();
 * ```
 */

// Export main client
export { AIPriceActionClient, type ClientConfig, type RequestResult } from "./client.js";

// Export types
export type {
  StockData,
  PerformerData,
  MAStockScore,
  SectorMAScore,
  HealthResponse,
  TickerGroups,
  TickersQueryParams,
  TopPerformersQueryParams,
  MAScoresBySectorQueryParams,
  TickersResponse,
  TopPerformersResponse,
  MAScoresBySectorResponse,
  VolumeProfileQueryParams,
  VolumeProfileResponse,
  VolumeProfileData,
  PriceRange,
  PointOfControl,
  ValueArea,
  PriceLevelVolume,
  VolumeStatistics,
  APIErrorResponse,
} from "./types.js";

// Export enums
export {
  Interval,
  ResponseFormat,
  SortDirection,
  SortMetric,
  MAPeriod,
} from "./types.js";

// Export errors
export {
  AIPriceActionError,
  NetworkError,
  APIError,
  ValidationError,
  RateLimitError,
} from "./errors.js";

// Export utilities
export {
  buildQueryString,
  isValidDate,
  formatDate,
  withRetry,
  type RetryConfig,
} from "./utils.js";
