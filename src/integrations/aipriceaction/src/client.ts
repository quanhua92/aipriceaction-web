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
  VolumeProfileQueryParams,
  VolumeProfileResponse,
} from "./types.js";
import {
  buildQueryString,
  getUserAgent,
  isValidDate,
  parseCSVToTickersResponse,
  type RetryConfig,
  DEFAULT_RETRY_CONFIG,
  withRetry,
} from "./utils.js";

/**
 * Response with metadata including headers
 */
export interface RequestResult<T> {
  data: T;
  headers: Record<string, string>;
  metadata: {
    url: string;
    status: number;
    duration: number;
    retries: number;
    responseSize?: number; // Response body size in bytes
  };
}

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
  /** Enable response metadata (headers, timing) - defaults to false for backward compatibility */
  includeMetadata?: boolean;
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
  private readonly includeMetadata: boolean;

  constructor(config: ClientConfig = {}) {
    this.baseURL = (
      config.baseURL ||
      process.env.API_URL ||
      "http://localhost:3000"
    ).replace(/\/$/, "");
    this.timeout = config.timeout || 30000;
    this.retryConfig = { ...DEFAULT_RETRY_CONFIG, ...config.retry };
    this.debug = config.debug || false;
    this.includeMetadata = config.includeMetadata || false;
  }

  /**
   * Make HTTP request with retry logic
   */
  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T | RequestResult<T>> {
    const url = `${this.baseURL}${endpoint}`;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeout);
    const startTime = Date.now();
    let retryCount = 0;

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
          retryCount = attempt;
          if (this.debug) {
            console.log(
              `[AIPriceAction] Retry attempt ${attempt} after error:`,
              error
            );
          }
        }
      );

      clearTimeout(timeoutId);
      const duration = Date.now() - startTime;

      // Handle different response types
      const contentType = response.headers.get("content-type");
      let data: T;
      let responseSize: number | undefined;

      if (contentType?.includes("application/json")) {
        const text = await response.text();
        responseSize = new TextEncoder().encode(text).length;
        data = JSON.parse(text) as T;
      } else if (contentType?.includes("text/csv")) {
        const text = await response.text();
        responseSize = new TextEncoder().encode(text).length;
        data = text as T;
      } else {
        const text = await response.text();
        responseSize = new TextEncoder().encode(text).length;
        data = text as T;
      }

      // Return with metadata if enabled
      if (this.includeMetadata) {
        const headers: Record<string, string> = {};
        response.headers.forEach((value, key) => {
          headers[key] = value;
        });

        return {
          data,
          headers,
          metadata: {
            url,
            status: response.status,
            duration,
            retries: retryCount,
            responseSize,
          },
        } as RequestResult<T>;
      }

      return data;
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
   *
   * // Force JSON format instead of CSV (default)
   * const data = await client.getTickers({ symbol: 'VCB', format: 'json' });
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

    // Default to CSV format for better performance, unless explicitly requested JSON
    const finalParams = { ...params, format: params.format || 'csv' };
    const queryString = buildQueryString(finalParams as Record<string, unknown>);

    if (params.format === 'json') {
      // If JSON format is explicitly requested, use original behavior
      return this.request<TickersResponse>(`/tickers${queryString}`) as Promise<TickersResponse>;
    } else {
      // Default: request CSV and parse it to TickersResponse
      const csvText = await this.request<string>(`/tickers${queryString}`);

      if (this.includeMetadata && typeof csvText !== 'string') {
        // csvText is RequestResult<string>, need to preserve the wrapper
        const result = csvText as RequestResult<string>;
        return {
          data: parseCSVToTickersResponse(result.data),
          headers: result.headers,
          metadata: result.metadata,
        } as any as TickersResponse; // Return wrapped but cast to match signature
      }

      return parseCSVToTickersResponse(csvText as string) as TickersResponse;
    }
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
    return this.request<string>(`/tickers${queryString}`) as Promise<string>;
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
    return this.request<HealthResponse>("/health") as Promise<HealthResponse>;
  }

  /**
   * GET /tickers/group - Get ticker groups
   *
   * @param mode - Asset mode: 'vn' for Vietnamese stocks, 'crypto' for cryptocurrencies (default: 'vn')
   *
   * @example
   * ```ts
   * // Get Vietnamese stock groups
   * const groups = await client.getTickerGroups();
   * console.log(groups.VN30); // ['VCB', 'VIC', 'VHM', ...]
   * console.log(groups.BANKING); // ['VCB', 'CTG', 'BID', ...]
   *
   * // Get crypto groups
   * const cryptoGroups = await client.getTickerGroups('crypto');
   * ```
   */
  async getTickerGroups(mode: 'vn' | 'crypto' | string = 'vn'): Promise<TickerGroups> {
    const queryString = mode !== 'vn' ? `?mode=${mode}` : '';
    return this.request<TickerGroups>(`/tickers/group${queryString}`) as Promise<TickerGroups>;
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
    ) as Promise<TopPerformersResponse>;
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
    ) as Promise<MAScoresBySectorResponse>;
  }

  /**
   * GET /analysis/volume-profile - Get volume profile analysis
   *
   * Provides volume distribution across price levels for a specific trading session.
   * Uses minute-level OHLCV data with uniform distribution (smearing) method.
   *
   * @example
   * ```ts
   * // Basic volume profile for VN stock
   * const profile = await client.getVolumeProfile({
   *   symbol: 'VCB',
   *   date: '2024-01-15'
   * });
   *
   * console.log(`POC: ${profile.data.poc.price}`);
   * console.log(`Value Area: ${profile.data.value_area.low} - ${profile.data.value_area.high}`);
   *
   * // Crypto volume profile
   * const btcProfile = await client.getVolumeProfile({
   *   symbol: 'BTC',
   *   date: '2024-01-15',
   *   mode: 'crypto'
   * });
   *
   * // Custom parameters
   * const customProfile = await client.getVolumeProfile({
   *   symbol: 'VCB',
   *   date: '2024-01-15',
   *   bins: 100,           // More granular (default: 50)
   *   value_area_pct: 80   // 80% value area (default: 70)
   * });
   * ```
   */
  async getVolumeProfile(
    params: VolumeProfileQueryParams
  ): Promise<VolumeProfileResponse> {
    // Validate required parameters
    if (!params.symbol) {
      throw new ValidationError(
        "symbol parameter is required",
        "symbol"
      );
    }

    if (!params.date) {
      throw new ValidationError(
        "date parameter is required (YYYY-MM-DD format)",
        "date"
      );
    }

    // Validate date format
    if (!isValidDate(params.date)) {
      throw new ValidationError(
        `Invalid date format: ${params.date}. Expected YYYY-MM-DD`,
        "date"
      );
    }

    // Validate bins parameter (optional, 10-200 range)
    if (params.bins !== undefined) {
      if (params.bins < 10 || params.bins > 200) {
        throw new ValidationError(
          `Invalid bins: ${params.bins}. Must be between 10 and 200`,
          "bins"
        );
      }
    }

    // Validate value_area_pct parameter (optional, 60-90 range)
    if (params.value_area_pct !== undefined) {
      if (params.value_area_pct < 60 || params.value_area_pct > 90) {
        throw new ValidationError(
          `Invalid value_area_pct: ${params.value_area_pct}. Must be between 60 and 90`,
          "value_area_pct"
        );
      }
    }

    const queryString = buildQueryString(params as unknown as Record<string, unknown>);
    return this.request<VolumeProfileResponse>(
      `/analysis/volume-profile${queryString}`
    ) as Promise<VolumeProfileResponse>;
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
