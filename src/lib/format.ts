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
 * Format a Date object to short Vietnam date string (e.g., "Nov 9")
 * Useful for compact displays like chart overlays
 *
 * @param utcDate - Date object in UTC
 * @returns Short date string in "MMM D" format (e.g., "Nov 9")
 * @example formatToVietnamDateShort(new Date("2025-11-09T14:00:00Z")) => "Nov 9"
 */
export function formatToVietnamDateShort(utcDate: Date): string {
  if (!utcDate || isNaN(utcDate.getTime())) {
    return '--'
  }

  // Add 7 hours for Vietnam timezone (UTC+7)
  const vietnamTime = new Date(utcDate.getTime() + (7 * 60 * 60 * 1000))

  // Format using UTC methods (the time is already shifted by +7)
  const month = vietnamTime.getUTCMonth()
  const day = vietnamTime.getUTCDate()

  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

  return `${monthNames[month]} ${day}`
}

/**
 * Format a price value with comma separators
 * @param price - The price value to format
 * @param useDecimalsOrData - If boolean, explicit decimal control. If StockData, auto-detects from mode field
 * @example formatPrice(145230.5) => "145,230.50" (default: with decimals)
 * @example formatPrice(1000) => "1,000.00" (default: with decimals)
 * @example formatPrice(145230.5, false) => "145,231" (VND - no decimals)
 * @example formatPrice(1000, false) => "1,000" (VND - no decimals)
 * @example formatPrice(1.83, dataWithModeCrypto) => "1.83" (auto-detect crypto)
 * @example formatPrice(50000, dataWithModeVN) => "50,000" (auto-detect VN)
 */
export function formatPrice(
  price: number | null | undefined,
  useDecimalsOrData?: boolean | { mode?: 'vn' | 'crypto' }
): string {
  const safePrice = price ?? 0

  // Determine if we should use decimals
  let useDecimals = true // default
  if (typeof useDecimalsOrData === 'boolean') {
    useDecimals = useDecimalsOrData
  } else if (useDecimalsOrData && typeof useDecimalsOrData === 'object' && 'mode' in useDecimalsOrData) {
    // Auto-detect from data.mode: VN stocks = no decimals, crypto = decimals
    useDecimals = useDecimalsOrData.mode !== 'vn'
  }

  if (useDecimals) {
    return new Intl.NumberFormat('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(safePrice)
  }

  // VND format - no decimals
  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(Math.round(safePrice))
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

