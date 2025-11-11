/**
 * Utility functions for AIPriceAction SDK
 */

import { NetworkError, RateLimitError } from "./errors.js";

/**
 * Retry configuration
 */
export interface RetryConfig {
  /** Maximum number of retry attempts */
  maxRetries: number;
  /** Initial delay in milliseconds */
  initialDelay: number;
  /** Maximum delay in milliseconds */
  maxDelay: number;
  /** Backoff multiplier */
  backoffMultiplier: number;
}

/**
 * Default retry configuration
 */
export const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxRetries: 3,
  initialDelay: 1000,
  maxDelay: 10000,
  backoffMultiplier: 2,
};

/**
 * Calculate delay for exponential backoff
 */
export function calculateBackoffDelay(
  attempt: number,
  config: RetryConfig
): number {
  const delay = config.initialDelay * Math.pow(config.backoffMultiplier, attempt);
  return Math.min(delay, config.maxDelay);
}

/**
 * Sleep for specified milliseconds
 */
export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Check if error is retryable
 */
export function isRetryableError(error: unknown): boolean {
  if (error instanceof NetworkError) {
    return true;
  }

  if (error instanceof RateLimitError) {
    return true;
  }

  // Network errors from fetch
  if (error instanceof TypeError && error.message.includes("fetch")) {
    return true;
  }

  return false;
}

/**
 * Retry a function with exponential backoff
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  config: RetryConfig = DEFAULT_RETRY_CONFIG,
  onRetry?: (attempt: number, error: unknown) => void
): Promise<T> {
  let lastError: unknown;

  for (let attempt = 0; attempt <= config.maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;

      // Don't retry on last attempt
      if (attempt === config.maxRetries) {
        break;
      }

      // Check if error is retryable
      if (!isRetryableError(error)) {
        throw error;
      }

      // Calculate delay
      const delay = calculateBackoffDelay(attempt, config);

      // Call retry callback
      onRetry?.(attempt + 1, error);

      // Wait before retrying
      await sleep(delay);
    }
  }

  throw lastError;
}

/**
 * Build query string from parameters
 */
export function buildQueryString(params: Record<string, unknown>): string {
  const searchParams = new URLSearchParams();

  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null) {
      continue;
    }

    if (Array.isArray(value)) {
      // Handle array parameters (e.g., symbol=VCB&symbol=FPT)
      for (const item of value) {
        searchParams.append(key, String(item));
      }
    } else {
      searchParams.append(key, String(value));
    }
  }

  const query = searchParams.toString();
  return query ? `?${query}` : "";
}

/**
 * Validate date format (YYYY-MM-DD)
 */
export function isValidDate(dateString: string): boolean {
  const regex = /^\d{4}-\d{2}-\d{2}$/;
  if (!regex.test(dateString)) {
    return false;
  }

  const date = new Date(dateString);
  return !isNaN(date.getTime());
}

/**
 * Format date to YYYY-MM-DD
 */
export function formatDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/**
 * Get user agent string
 */
export function getUserAgent(): string {
  return "aipriceaction-js/0.1.0";
}

/**
 * Parse CSV response from /tickers endpoint into TickersResponse format
 *
 * @param csvText - CSV text from the API response
 * @returns TickersResponse object with parsed StockData arrays grouped by symbol
 */
export function parseCSVToTickersResponse(csvText: string): Record<string, any[]> {
  const lines = csvText.trim().split('\n');

  if (lines.length < 2) {
    return {};
  }

  // Parse header
  const headers = lines[0].split(',');
  const data: Record<string, any[]> = {};

  // Parse data rows
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    // Handle CSV parsing - split by comma but respect that values don't contain commas in this format
    const values = line.split(',');

    if (values.length !== headers.length) {
      continue; // Skip malformed rows
    }

    // Create stock data object
    const stockData: any = {
      symbol: values[0],
      time: values[1],
      open: parseFloat(values[2]) || 0,
      high: parseFloat(values[3]) || 0,
      low: parseFloat(values[4]) || 0,
      close: parseFloat(values[5]) || 0,
      volume: parseInt(values[6]) || 0,
      ma10: values[7] ? parseFloat(values[7]) : null,
      ma20: values[8] ? parseFloat(values[8]) : null,
      ma50: values[9] ? parseFloat(values[9]) : null,
      ma100: values[10] ? parseFloat(values[10]) : null,
      ma200: values[11] ? parseFloat(values[11]) : null,
      ma10_score: values[12] ? parseFloat(values[12]) : null,
      ma20_score: values[13] ? parseFloat(values[13]) : null,
      ma50_score: values[14] ? parseFloat(values[14]) : null,
      ma100_score: values[15] ? parseFloat(values[15]) : null,
      ma200_score: values[16] ? parseFloat(values[16]) : null,
      close_changed: values[17] ? parseFloat(values[17]) : null,
      volume_changed: values[18] ? parseFloat(values[18]) : null,
      total_money_changed: values[19] ? parseFloat(values[19]) : null,
    };

    // Group by symbol
    const symbol = stockData.symbol;
    if (!data[symbol]) {
      data[symbol] = [];
    }
    data[symbol].push(stockData);
  }

  return data;
}
