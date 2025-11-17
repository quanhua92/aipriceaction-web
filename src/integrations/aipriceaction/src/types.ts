/**
 * TypeScript types for AIPriceAction API
 * Based on API documentation v0.3.0
 */

// ===== Enums =====

export enum Interval {
  // Base intervals
  Daily = "1D",
  Hourly = "1H",
  Minute = "1m",
  // Aggregated intervals (minute-based, computed from 1m)
  Minutes5 = "5m",
  Minutes15 = "15m",
  Minutes30 = "30m",
  // Aggregated intervals (day-based, computed from 1D)
  Weekly = "1W",
  BiWeekly = "2W",
  Monthly = "1M",
}

export enum ResponseFormat {
  JSON = "json",
  CSV = "csv",
}

export enum SortDirection {
  Ascending = "asc",
  Descending = "desc",
}

export enum SortMetric {
  CloseChanged = "close_changed",
  Volume = "volume",
  VolumeChanged = "volume_changed",
  TotalMoneyChanged = "total_money_changed",
  MA10Score = "ma10_score",
  MA20Score = "ma20_score",
  MA50Score = "ma50_score",
  MA100Score = "ma100_score",
  MA200Score = "ma200_score",
}

export enum MAPeriod {
  MA10 = 10,
  MA20 = 20,
  MA50 = 50,
  MA100 = 100,
  MA200 = 200,
}

// ===== Core Data Types =====

/**
 * Stock data with OHLCV and technical indicators
 * All prices in full VND (e.g., 60300.0 not 60.3) unless legacy=true
 */
export interface StockData {
  /** Ticker symbol */
  symbol: string;
  /** Time in YYYY-MM-DD (daily) or YYYY-MM-DD HH:MM:SS (hourly/minute) */
  time: string;
  /** Asset mode: 'vn' for Vietnamese stocks, 'crypto' for cryptocurrencies (injected by client) */
  mode?: 'vn' | 'crypto';
  /** Opening price */
  open: number;
  /** Highest price */
  high: number;
  /** Lowest price */
  low: number;
  /** Closing price */
  close: number;
  /** Trading volume */
  volume: number;
  /** 10-period moving average (null if insufficient data) */
  ma10?: number | null;
  /** 20-period moving average */
  ma20?: number | null;
  /** 50-period moving average */
  ma50?: number | null;
  /** 100-period moving average */
  ma100?: number | null;
  /** 200-period moving average */
  ma200?: number | null;
  /** Distance from MA10 as percentage */
  ma10_score?: number | null;
  /** Distance from MA20 as percentage */
  ma20_score?: number | null;
  /** Distance from MA50 as percentage */
  ma50_score?: number | null;
  /** Distance from MA100 as percentage */
  ma100_score?: number | null;
  /** Distance from MA200 as percentage */
  ma200_score?: number | null;
  /** Percentage change from previous close */
  close_changed?: number | null;
  /** Percentage change from previous volume */
  volume_changed?: number | null;
  /** Total money changed from previous row in VND (price_change × volume) */
  total_money_changed?: number | null;
}

/**
 * Ticker performance data (used in top-performers endpoint)
 */
export interface PerformerData {
  symbol: string;
  close: number;
  volume: number;
  close_changed?: number | null;
  volume_changed?: number | null;
  total_money_changed?: number | null;
  ma10?: number | null;
  ma20?: number | null;
  ma50?: number | null;
  ma100?: number | null;
  ma200?: number | null;
  ma10_score?: number | null;
  ma20_score?: number | null;
  ma50_score?: number | null;
  ma100_score?: number | null;
  ma200_score?: number | null;
  sector?: string;
}

/**
 * MA score for a single stock
 */
export interface MAStockScore {
  symbol: string;
  close: number;
  volume: number;
  ma_value: number;
  ma_score: number;
  close_changed?: number | null;
  volume_changed?: number | null;
}

/**
 * Sector MA score analysis
 */
export interface SectorMAScore {
  sector_name: string;
  total_stocks: number;
  stocks_above_threshold: number;
  average_score: number;
  top_stocks: MAStockScore[];
}

/**
 * Health check response
 */
export interface HealthResponse {
  // Worker statistics
  daily_last_sync: string | null;
  hourly_last_sync: string | null;
  minute_last_sync: string | null;
  daily_iteration_count: number;
  slow_iteration_count: number;

  // Trading hours
  is_trading_hours: boolean;
  trading_hours_timezone: string;

  // Memory statistics
  memory_usage_bytes: number;
  memory_usage_mb: number;
  memory_limit_mb: number;
  memory_usage_percent: number;

  // Ticker statistics
  total_tickers_count: number;
  active_tickers_count: number;
  daily_records_count: number;
  hourly_records_count: number;
  minute_records_count: number;

  // Disk cache statistics
  disk_cache_entries: number;
  disk_cache_size_bytes: number;
  disk_cache_size_mb: number;
  disk_cache_limit_mb: number;
  disk_cache_usage_percent: number;

  // System info
  uptime_secs: number;
  current_system_time: string;
}

/**
 * Ticker groups mapping
 */
export type TickerGroups = Record<string, string[]>;

// ===== Query Parameters =====

/**
 * Query parameters for /tickers endpoint
 */
export interface TickersQueryParams {
  /** Ticker symbols to query (can be array) */
  symbol?: string | string[];
  /** Time interval */
  interval?: Interval | string;
  /** Start date (YYYY-MM-DD) */
  start_date?: string;
  /** End date (YYYY-MM-DD) */
  end_date?: string;
  /** Limit number of records */
  limit?: number;
  /** Use legacy price format (divide by 1000) */
  legacy?: boolean;
  /** Response format */
  format?: ResponseFormat | string;
  /** Use cache (default: true) */
  cache?: boolean;
  /** Asset mode: 'vn' for Vietnamese stocks, 'crypto' for cryptocurrencies (default: 'vn') */
  mode?: 'vn' | 'crypto' | string;
}

/**
 * Query parameters for /analysis/top-performers endpoint
 */
export interface TopPerformersQueryParams {
  /** Analysis date (YYYY-MM-DD), default: latest */
  date?: string;
  /** Metric to sort by */
  sort_by?: SortMetric | string;
  /** Sort direction */
  direction?: SortDirection | string;
  /** Number of results (1-100) */
  limit?: number;
  /** Filter by sector */
  sector?: string;
  /** Minimum trading volume filter */
  min_volume?: number;
}

/**
 * Query parameters for /analysis/ma-scores-by-sector endpoint
 */
export interface MAScoresBySectorQueryParams {
  /** Analysis date (YYYY-MM-DD), default: latest */
  date?: string;
  /** Moving average period */
  ma_period?: MAPeriod | number;
  /** Minimum MA score threshold */
  min_score?: number;
  /** Include only stocks above threshold */
  above_threshold_only?: boolean;
  /** Maximum stocks per sector (1-50) */
  top_per_sector?: number;
}

// ===== Response Types =====

/**
 * Response from /tickers endpoint (JSON format)
 */
export type TickersResponse = Record<string, StockData[]>;

/**
 * Response from /analysis/top-performers endpoint
 */
export interface TopPerformersResponse {
  analysis_date: string;
  analysis_type: "top_performers";
  total_analyzed: number;
  data: {
    performers: PerformerData[];
  };
}

/**
 * Response from /analysis/ma-scores-by-sector endpoint
 */
export interface MAScoresBySectorResponse {
  analysis_date: string;
  analysis_type: "ma_scores_by_sector";
  total_analyzed: number;
  data: {
    sectors: SectorMAScore[];
    ma_period: number;
    threshold: number;
  };
}

/**
 * API Error response
 */
export interface APIErrorResponse {
  error: string;
}
