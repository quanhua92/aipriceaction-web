/**
 * AIPriceAction API Client
 */

import {
  APIError,
  NetworkError,
  RateLimitError,
  ValidationError,
} from "./errors.js";
import type {
  APIErrorResponse,
  HealthResponse,
  MAScoresBySectorQueryParams,
  MAScoresBySectorResponse,
  TickerGroups,
  TickersQueryParams,
  TickersResponse,
  TopPerformersQueryParams,
  TopPerformersResponse,
} from "./types.js";
import {
  buildQueryString,
  getUserAgent,
  isValidDate,
  type RetryConfig,
  DEFAULT_RETRY_CONFIG,
  withRetry,
} from "./utils.js";

/**
 * Client configuration options
 */
export interface ClientConfig {
  /** Base URL of the API (default: process.env.API_URL or http://localhost:3000) */
  baseURL?: string;
  /** Request timeout in milliseconds (default: 30000) */
  timeout?: number;
  /** Retry configuration */
  retry?: Partial<RetryConfig>;
  /** Enable debug logging */
  debug?: boolean;
}

/**
 * AIPriceAction API Client
 *
 * @example
 * ```ts
 * const client = new AIPriceActionClient({
 *   baseURL: process.env.API_URL || 'http://localhost:3000'
 * });
 *
 * const data = await client.getTickers({ symbol: 'VCB' });
 * ```
 */
export class AIPriceActionClient {
  private readonly baseURL: string;
  private readonly timeout: number;
  private readonly retryConfig: RetryConfig;
  private readonly debug: boolean;

  constructor(config: ClientConfig = {}) {
    this.baseURL = (
      config.baseURL ||
      process.env.API_URL ||
      "http://localhost:3000"
    ).replace(/\/$/, "");
    this.timeout = config.timeout || 30000;
    this.retryConfig = { ...DEFAULT_RETRY_CONFIG, ...config.retry };
    this.debug = config.debug || false;
  }

  /**
   * Make HTTP request with retry logic
   */
  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.baseURL}${endpoint}`;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeout);

    const requestOptions: RequestInit = {
      ...options,
      signal: controller.signal,
      headers: {
        "User-Agent": getUserAgent(),
        ...options.headers,
      },
    };

    if (this.debug) {
      console.log(`[AIPriceAction] ${options.method || "GET"} ${url}`);
    }

    try {
      const response = await withRetry(
        async () => {
          const res = await fetch(url, requestOptions);

          if (!res.ok) {
            // Try to parse error response
            let errorMessage = `HTTP ${res.status}: ${res.statusText}`;
            try {
              const errorData = (await res.json()) as APIErrorResponse;
              if (errorData.error) {
                errorMessage = errorData.error;
              }
            } catch {
              // Ignore JSON parse errors
            }

            // Handle specific status codes
            if (res.status === 429) {
              const retryAfter = res.headers.get("Retry-After");
              throw new RateLimitError(
                errorMessage,
                retryAfter ? parseInt(retryAfter, 10) : undefined
              );
            }

            throw new APIError(errorMessage, res.status);
          }

          return res;
        },
        this.retryConfig,
        (attempt, error) => {
          if (this.debug) {
            console.log(
              `[AIPriceAction] Retry attempt ${attempt} after error:`,
              error
            );
          }
        }
      );

      clearTimeout(timeoutId);

      // Handle different response types
      const contentType = response.headers.get("content-type");

      if (contentType?.includes("application/json")) {
        return (await response.json()) as T;
      } else if (contentType?.includes("text/csv")) {
        return (await response.text()) as T;
      } else {
        return (await response.text()) as T;
      }
    } catch (error) {
      clearTimeout(timeoutId);

      if (error instanceof APIError || error instanceof RateLimitError) {
        throw error;
      }

      if (error instanceof Error && error.name === "AbortError") {
        throw new NetworkError(`Request timeout after ${this.timeout}ms`);
      }

      if (error instanceof TypeError) {
        throw new NetworkError("Network request failed", error);
      }

      throw error;
    }
  }

  /**
   * GET /tickers - Query stock data
   *
   * @example
   * ```ts
   * // Get today's data for VCB
   * const data = await client.getTickers({ symbol: 'VCB' });
   *
   * // Get multiple tickers
   * const data = await client.getTickers({ symbol: ['VCB', 'FPT'] });
   *
   * // Get historical data
   * const data = await client.getTickers({
   *   symbol: 'VCB',
   *   start_date: '2025-01-01',
   *   end_date: '2025-12-31'
   * });
   * ```
   */
  async getTickers(params: TickersQueryParams = {}): Promise<TickersResponse> {
    // Validate dates
    if (params.start_date && !isValidDate(params.start_date)) {
      throw new ValidationError(
        `Invalid start_date format: ${params.start_date}. Expected YYYY-MM-DD`,
        "start_date"
      );
    }
    if (params.end_date && !isValidDate(params.end_date)) {
      throw new ValidationError(
        `Invalid end_date format: ${params.end_date}. Expected YYYY-MM-DD`,
        "end_date"
      );
    }

    const queryString = buildQueryString(params as Record<string, unknown>);
    return this.request<TickersResponse>(`/tickers${queryString}`);
  }

  /**
   * GET /tickers (CSV format) - Export stock data as CSV
   *
   * @example
   * ```ts
   * const csv = await client.getTickersCSV({ symbol: 'VCB' });
   * console.log(csv); // CSV string
   * ```
   */
  async getTickersCSV(params: Omit<TickersQueryParams, "format"> = {}): Promise<string> {
    const csvParams = { ...params, format: "csv" };
    const queryString = buildQueryString(csvParams as Record<string, unknown>);
    return this.request<string>(`/tickers${queryString}`);
  }

  /**
   * GET /health - Get server health and statistics
   *
   * @example
   * ```ts
   * const health = await client.getHealth();
   * console.log(`Memory: ${health.memory_usage_mb}MB`);
   * console.log(`Active tickers: ${health.active_tickers_count}`);
   * ```
   */
  async getHealth(): Promise<HealthResponse> {
    return this.request<HealthResponse>("/health");
  }

  /**
   * GET /tickers/group - Get ticker groups
   *
   * @example
   * ```ts
   * const groups = await client.getTickerGroups();
   * console.log(groups.VN30); // ['VCB', 'VIC', 'VHM', ...]
   * console.log(groups.BANKING); // ['VCB', 'CTG', 'BID', ...]
   * ```
   */
  async getTickerGroups(): Promise<TickerGroups> {
    return this.request<TickerGroups>("/tickers/group");
  }

  /**
   * GET /analysis/top-performers - Get top/bottom performing stocks
   *
   * @example
   * ```ts
   * // Top 10 performers by percentage change
   * const top = await client.getTopPerformers({
   *   sort_by: 'close_changed',
   *   limit: 10
   * });
   *
   * // Bottom 5 performers
   * const bottom = await client.getTopPerformers({
   *   sort_by: 'close_changed',
   *   direction: 'asc',
   *   limit: 5
   * });
   *
   * // VN30 sector top performers
   * const vn30 = await client.getTopPerformers({
   *   sector: 'VN30',
   *   sort_by: 'ma20_score'
   * });
   * ```
   */
  async getTopPerformers(
    params: TopPerformersQueryParams = {}
  ): Promise<TopPerformersResponse> {
    // Validate date
    if (params.date && !isValidDate(params.date)) {
      throw new ValidationError(
        `Invalid date format: ${params.date}. Expected YYYY-MM-DD`,
        "date"
      );
    }

    const queryString = buildQueryString(params as Record<string, unknown>);
    return this.request<TopPerformersResponse>(
      `/analysis/top-performers${queryString}`
    );
  }

  /**
   * GET /analysis/ma-scores-by-sector - Get MA scores grouped by sector
   *
   * @example
   * ```ts
   * // MA20 scores by sector
   * const scores = await client.getMAScoresBySector({
   *   ma_period: 20,
   *   min_score: 1.0
   * });
   *
   * // MA50 scores, only stocks above threshold
   * const filtered = await client.getMAScoresBySector({
   *   ma_period: 50,
   *   min_score: 2.0,
   *   above_threshold_only: true
   * });
   * ```
   */
  async getMAScoresBySector(
    params: MAScoresBySectorQueryParams = {}
  ): Promise<MAScoresBySectorResponse> {
    // Validate date
    if (params.date && !isValidDate(params.date)) {
      throw new ValidationError(
        `Invalid date format: ${params.date}. Expected YYYY-MM-DD`,
        "date"
      );
    }

    // Validate MA period
    const validPeriods = [10, 20, 50, 100, 200];
    if (params.ma_period && !validPeriods.includes(params.ma_period)) {
      throw new ValidationError(
        `Invalid ma_period: ${params.ma_period}. Must be one of: ${validPeriods.join(", ")}`,
        "ma_period"
      );
    }

    const queryString = buildQueryString(params as Record<string, unknown>);
    return this.request<MAScoresBySectorResponse>(
      `/analysis/ma-scores-by-sector${queryString}`
    );
  }

  /**
   * GET /raw/* - Legacy GitHub proxy endpoint
   *
   * ⚠️ DEPRECATED - Will be removed in future versions
   *
   * @example
   * ```ts
   * const data = await client.getRawData('ticker_group.json');
   * ```
   */
  async getRawData(path: string): Promise<unknown> {
    return this.request<unknown>(`/raw/${path}`);
  }
}
