/**
 * Format a price value with comma separators
 * @param price - The price value to format
 * @param useDecimals - If true, formats with 2 decimals. Default false for VND (no decimals)
 * @example formatPrice(145230.5) => "145,231" (VND)
 * @example formatPrice(1000) => "1,000" (VND)
 * @example formatPrice(145230.5, true) => "145,230.50" (with decimals)
 * @example formatPrice(1000, true) => "1,000.00" (with decimals)
 */
export function formatPrice(price: number, useDecimals: boolean = false): string {
  if (useDecimals) {
    return new Intl.NumberFormat('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(price)
  }

  // VND format - no decimals
  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(Math.round(price))
}

/**
 * Format a percentage change with +/- prefix
 * @example formatPercent(2.5) => "+2.5%"
 * @example formatPercent(-1.2) => "-1.2%"
 * @example formatPercent(0) => "0.0%"
 */
export function formatPercent(percent: number): string {
  const formatted = percent.toFixed(1)
  if (percent > 0) {
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
export function formatVolume(volume: number): string {
  if (volume >= 1_000_000) {
    return `${(volume / 1_000_000).toFixed(1)}M`
  }
  if (volume >= 1_000) {
    return `${Math.floor(volume / 1_000)}K`
  }
  return volume.toFixed(0)
}

/**
 * Convert UTC timestamp string to Vietnam time (UTC+7)
 * The API returns timestamps in UTC format (e.g., "2025-11-09 14:00:00")
 * This function parses them as UTC and converts to Vietnam timezone by adding 7 hours
 * @param utcTimeString - UTC time string in format "YYYY-MM-DD HH:MM:SS" or "YYYY-MM-DD"
 * @returns Unix timestamp in seconds adjusted for Vietnam timezone (UTC+7)
 * @example parseUTCToVietnamTime("2025-11-09 14:00:00") => Unix timestamp for 9pm Vietnam time
 */
export function parseUTCToVietnamTime(utcTimeString: string): number {
  // Parse as UTC by appending 'UTC' to force UTC interpretation
  const utcDate = new Date(utcTimeString + ' UTC')
  // Add 7 hours for Vietnam (UTC+7)
  const vietnamTime = new Date(utcDate.getTime() + (7 * 60 * 60 * 1000))
  // Return Unix timestamp in seconds
  return Math.floor(vietnamTime.getTime() / 1000)
}
