import { INDEX_TICKERS, INTEGER_FORMAT_SYMBOLS, MARKET_INDICES } from './constants'

/**
 * Parse UTC ISO string to Date object
 * Safari-compatible: Handles both standard ISO format and space-separated format
 *
 * @param utcISOString - UTC timestamp in ISO 8601 format (e.g., "2025-11-09T14:00:00Z")
 * @returns Date object representing the UTC time
 * @example parseUTCISOString("2025-11-09T14:00:00Z") => Date object at 2pm UTC
 * @example parseUTCISOString("2025-11-09 14:00:00") => Date object at 2pm UTC (auto-adds Z)
 */
export function parseUTCISOString(utcISOString: string): Date {
  if (!utcISOString || typeof utcISOString !== 'string') {
    return new Date('Invalid Date')
  }

  // Handle both formats: "2025-11-09T14:00:00Z" and "2025-11-09 14:00:00"
  let isoString = utcISOString.replace(' ', 'T') // Safari compatibility

  // Ensure it has UTC marker
  if (!isoString.endsWith('Z')) {
    isoString += 'Z'
  }

  return new Date(isoString)
}

/**
 * Format a Date object to Vietnam time string (UTC+7)
 * Always displays time in Vietnam timezone regardless of user's local timezone
 *
 * @param date - Date object (typically parsed from UTC)
 * @returns Vietnam time string in "YYYY-MM-DD HH:MM:SS" format
 * @example formatToVietnamTime(new Date("2025-11-09T14:00:00Z")) => "2025-11-09 21:00:00"
 */
export function formatToVietnamTime(date: Date): string {
  if (!date || isNaN(date.getTime())) {
    return ''
  }

  // Add 7 hours for Vietnam timezone (UTC+7)
  const vietnamTime = new Date(date.getTime() + (7 * 60 * 60 * 1000))

  // Format using UTC methods (the time is already shifted by +7)
  const year = vietnamTime.getUTCFullYear()
  const month = String(vietnamTime.getUTCMonth() + 1).padStart(2, '0')
  const day = String(vietnamTime.getUTCDate()).padStart(2, '0')
  const hours = String(vietnamTime.getUTCHours()).padStart(2, '0')
  const minutes = String(vietnamTime.getUTCMinutes()).padStart(2, '0')
  const seconds = String(vietnamTime.getUTCSeconds()).padStart(2, '0')

  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`
}

/**
 * Format a Date object to Vietnam date string (date only, no time)
 *
 * @param date - Date object (typically parsed from UTC)
 * @returns Vietnam date string in "YYYY-MM-DD" format
 * @example formatToVietnamDate(new Date("2025-11-09T14:00:00Z")) => "2025-11-09"
 */
export function formatToVietnamDate(date: Date): string {
  if (!date || isNaN(date.getTime())) {
    return ''
  }

  // Add 7 hours for Vietnam timezone (UTC+7)
  const vietnamTime = new Date(date.getTime() + (7 * 60 * 60 * 1000))

  // Format using UTC methods (the time is already shifted by +7)
  const year = vietnamTime.getUTCFullYear()
  const month = String(vietnamTime.getUTCMonth() + 1).padStart(2, '0')
  const day = String(vietnamTime.getUTCDate()).padStart(2, '0')

  return `${year}-${month}-${day}`
}

/**
 * Convert UTC Date to Vietnam time Unix timestamp (for chart libraries)
 * Chart libraries like TradingView need Unix timestamps in seconds.
 * This shifts the timestamp to Vietnam timezone so the chart axis displays Vietnam time.
 *
 * @param utcDate - Date object in UTC
 * @returns Unix timestamp in seconds, shifted to Vietnam timezone (UTC+7)
 * @example toVietnamUnixTime(new Date("2025-11-09T14:00:00Z")) => Unix timestamp for 21:00 Vietnam time
 */
export function toVietnamUnixTime(utcDate: Date): number {
  if (!utcDate || isNaN(utcDate.getTime())) {
    return 0
  }

  // Add 7 hours for Vietnam timezone (UTC+7)
  const vietnamTime = new Date(utcDate.getTime() + (7 * 60 * 60 * 1000))

  // Return Unix timestamp in seconds
  return Math.floor(vietnamTime.getTime() / 1000)
}

/**
 * Format a Date object to short Vietnam date string (e.g., "2025-11-09")
 * Useful for compact displays like chart overlays
 *
 * @param utcDate - Date object in UTC
 * @returns Short date string in "YYYY-MM-DD" format (e.g., "2025-11-09")
 * @example formatToVietnamDateShort(new Date("2025-11-09T14:00:00Z")) => "2025-11-09"
 */
export function formatToVietnamDateShort(utcDate: Date): string {
  if (!utcDate || isNaN(utcDate.getTime())) {
    return '--'
  }

  // Add 7 hours for Vietnam timezone (UTC+7)
  const vietnamTime = new Date(utcDate.getTime() + (7 * 60 * 60 * 1000))

  // Format using UTC methods (the time is already shifted by +7)
  const year = vietnamTime.getUTCFullYear()
  const month = String(vietnamTime.getUTCMonth() + 1).padStart(2, '0')
  const day = String(vietnamTime.getUTCDate()).padStart(2, '0')

  return `${year}-${month}-${day}`
}

/**
 * Format a Date object to short month name format (e.g., "Nov 09")
 * Useful for compact displays where month name is preferred over numbers
 *
 * @param utcDate - Date object in UTC
 * @returns Short month name format string (e.g., "Nov 09")
 * @example formatToVietnamMonthDay(new Date("2025-11-09T14:00:00Z")) => "Nov 09"
 */
export function formatToVietnamMonthDay(utcDate: Date): string {
  if (!utcDate || isNaN(utcDate.getTime())) {
    return '--'
  }

  // Add 7 hours for Vietnam timezone (UTC+7)
  const vietnamTime = new Date(utcDate.getTime() + (7 * 60 * 60 * 1000))

  // Month names
  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

  // Format using UTC methods (the time is already shifted by +7)
  const month = monthNames[vietnamTime.getUTCMonth()]
  const day = String(vietnamTime.getUTCDate()).padStart(2, '0')

  return `${month} ${day}`
}

/**
 * Format a Date object to short Vietnam date+time string (e.g., "2025-11-09, 21:00")
 * Useful for intraday chart overlays (minute/hour intervals)
 *
 * @param utcDate - Date object in UTC
 * @returns Short date+time string in "YYYY-MM-DD, HH:MM" format (e.g., "2025-11-09, 21:00")
 * @example formatToVietnamDateTimeShort(new Date("2025-11-09T14:00:00Z")) => "2025-11-09, 21:00"
 */
export function formatToVietnamDateTimeShort(utcDate: Date): string {
  if (!utcDate || isNaN(utcDate.getTime())) {
    return '--'
  }

  // Add 7 hours for Vietnam timezone (UTC+7)
  const vietnamTime = new Date(utcDate.getTime() + (7 * 60 * 60 * 1000))

  // Format using UTC methods (the time is already shifted by +7)
  const year = vietnamTime.getUTCFullYear()
  const month = String(vietnamTime.getUTCMonth() + 1).padStart(2, '0')
  const day = String(vietnamTime.getUTCDate()).padStart(2, '0')
  const hours = String(vietnamTime.getUTCHours()).padStart(2, '0')
  const minutes = String(vietnamTime.getUTCMinutes()).padStart(2, '0')

  return `${year}-${month}-${day}, ${hours}:${minutes}`
}

/**
 * Get optimal decimal places based on price magnitude
 * Provides appropriate precision for different price ranges
 */
export function getOptimalDecimalPlaces(price: number): number {
  const abs = Math.abs(price)
  if (abs >= 100) return 2          // 1,250.45
  if (abs >= 10) return 2           // 50.25
  if (abs >= 1) return 2            // 5.12
  if (abs >= 0.5) return 3          // 0.625
  if (abs >= 0.01) return 4         // 0.1234
  if (abs >= 0.0001) return 6       // 0.001234
  if (abs >= 0.000001) return 8     // 0.00000123
  return 10                          // 0.0000000123 (DeFi tokens, fractional shares)
}

/**
 * Get market-specific decimal places override
 */
export function getMarketDecimalPlaces(mode?: string): number | undefined {
  switch (mode) {
    case 'vn':
      return undefined // Vietnamese stocks use no decimals (handled separately)
    case 'forex':
      return 4 // Forex pairs: 4 decimal places (pip precision)
    case 'commodity':
      return 2 // Gold, oil: 2 decimal places
    case 'stock':
      return 2 // International stocks: 2 decimal places
    case 'yahoo':
      return 2 // Yahoo/Global: 2 decimal places (indices, commodities, stocks)
    case 'crypto':
    default:
      return undefined // Use dynamic precision based on price
  }
}

/**
 * Format a price value with comma separators and dynamic decimal precision
 * @param price - The price value to format
 * @param useDecimalsOrData - If boolean, explicit decimal control. If StockData, auto-detects from mode/symbol
 * @example formatPrice(145230.5) => "145,230.50" (default: with decimals)
 * @example formatPrice(1000) => "1,000.00" (default: with decimals)
 * @example formatPrice(145230.5, false) => "145,231" (VND - no decimals)
 * @example formatPrice(1000, false) => "1,000" (VND - no decimals)
 * @example formatPrice(1.83, dataWithModeCrypto) => "1.83" (auto-detect crypto)
 * @example formatPrice(0.00001234, dataWithModeCrypto) => "0.00001234" (dynamic precision for small crypto)
 * @example formatPrice(50000, dataWithModeVN) => "50,000" (auto-detect VN stock)
 * @example formatPrice(1250.45, dataWithVNINDEX) => "1,250.45" (market indices show decimals)
 * @example formatPrice(1.2345, dataWithModeForex) => "1.2345" (forex pip precision)
 */
export function formatPrice(
  price: number | null | undefined,
  useDecimalsOrData?: boolean | { symbol?: string; mode?: 'vn' | 'crypto' | 'yahoo' | 'forex' | 'commodity' | 'stock' | 'all' }
): string {
  const safePrice = price ?? 0

  // Boolean override
  if (typeof useDecimalsOrData === 'boolean') {
    if (!useDecimalsOrData) {
      return new Intl.NumberFormat('en-US', {
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
      }).format(Math.round(safePrice))
    }
    const finalDecimalPlaces = getOptimalDecimalPlaces(safePrice)
    return new Intl.NumberFormat('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: finalDecimalPlaces,
    }).format(safePrice)
  }

  // VN stocks (including market indices) - no decimals
  const mode = useDecimalsOrData?.mode
  const symbol = useDecimalsOrData?.symbol
  const isMarketIndex = symbol ? MARKET_INDICES.includes(symbol as typeof MARKET_INDICES[number]) : false
  const isIndexTicker = symbol ? INDEX_TICKERS.includes(symbol as typeof INDEX_TICKERS[number]) : false
  const isIntegerFormatSymbol = symbol ? INTEGER_FORMAT_SYMBOLS.includes(symbol as typeof INTEGER_FORMAT_SYMBOLS[number]) : false

  // Force integer format for specific symbols (e.g. SJC-GOLD)
  if (isIntegerFormatSymbol) {
    return new Intl.NumberFormat('en-US', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(Math.round(safePrice))
  }

  if (mode === 'vn' && !isMarketIndex && !isIndexTicker) {
    return new Intl.NumberFormat('en-US', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(Math.round(safePrice))
  }

  // Market indices (VNINDEX, VN30) - always 2 decimals
  if (isMarketIndex) {
    return new Intl.NumberFormat('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(safePrice)
  }

  // All other modes (crypto, yahoo, all, etc.) - dynamic decimals
  const marketDecimals = getMarketDecimalPlaces(mode)
  const finalDecimalPlaces = marketDecimals ?? getOptimalDecimalPlaces(safePrice)
  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: finalDecimalPlaces,
  }).format(safePrice)
}

/**
 * Format a percentage change with +/- prefix
 * @example formatPercent(2.5) => "+2.5%"
 * @example formatPercent(-1.2) => "-1.2%"
 * @example formatPercent(0) => "0.0%"
 */
export function formatPercent(percent: number | null | undefined): string {
  const safePercent = percent ?? 0
  const formatted = safePercent.toFixed(1)
  if (safePercent > 0) {
    return `+${formatted}%`
  }
  return `${formatted}%`
}

/**
 * Calculate percentage difference between current price and transaction price
 * @param currentPrice - Current market price
 * @param transactionPrice - Original transaction price
 * @returns Percentage difference (positive for profit, negative for loss)
 * @example calculatePriceDifference(55000, 50000) => 10 (10% profit)
 * @example calculatePriceDifference(45000, 50000) => -10 (10% loss)
 */
export function calculatePriceDifference(currentPrice: number, transactionPrice: number): number {
  if (transactionPrice === 0) return 0
  return ((currentPrice - transactionPrice) / transactionPrice) * 100
}

/**
 * Format volume with K/M suffix for readability
 * @example formatVolume(2400000) => "2.4M"
 * @example formatVolume(500000) => "500K"
 * @example formatVolume(999) => "999"
 */
export function formatVolume(volume: number | null | undefined): string {
  const safeVolume = volume ?? 0
  if (safeVolume >= 1_000_000) {
    return `${(safeVolume / 1_000_000).toFixed(1)}M`
  }
  if (safeVolume >= 1_000) {
    return `${Math.floor(safeVolume / 1_000)}K`
  }
  return safeVolume.toFixed(0)
}

/**
 * Get responsive viewport size based on chart container width
 * @param chartWidth - Width of the chart container in pixels
 * @returns number of bars to show based on container size
 */
export function getResponsiveViewportSize(chartWidth: number): number {
  // Small containers (like mobile grid): < 400px
  if (chartWidth < 400) {
    return 60
  }

  // Medium containers: 400px - 599px
  if (chartWidth < 600) {
    return 80
  }

  // Large containers: 600px - 899px
  if (chartWidth < 900) {
    return 128
  }

  // Extra large containers: 900px - 1199px
  if (chartWidth < 1200) {
    return 156
  }

  // Full width: >= 1200px
  return 200
}

