/**
 * Get Tailwind color class for price changes with extreme thresholds
 * @param change - Percentage change (e.g., 2.5 for +2.5%, -1.2 for -1.2%)
 * @returns Tailwind text color class string
 *
 * Color logic:
 * - < -6.8%: Cyan (extreme loss)
 * - Negative: Red (loss)
 * - Positive: Green (gain)
 * - > 6.7%: Purple (extreme gain)
 */
export function getPriceChangeColor(change: number): string {
  if (change < -6.8) {
    return 'text-cyan-600 dark:text-cyan-400'
  }
  if (change < 0) {
    return 'text-red-600 dark:text-red-500'
  }
  if (change > 6.7) {
    return 'text-purple-600 dark:text-purple-500'
  }
  return 'text-green-600 dark:text-green-500'
}

/**
 * Get Tailwind color class for volume changes
 * @param change - Percentage change (e.g., 15.2 for +15.2%, -5.4 for -5.4%)
 * @returns Tailwind text color class string
 *
 * Color logic:
 * - > 100%: Purple (extreme volume spike)
 * - Positive: Green (volume increase)
 * - Negative: Red (volume decrease)
 */
export function getVolumeChangeColor(change: number): string {
  if (change > 100) {
    return 'text-purple-600 dark:text-purple-500'
  }
  if (change >= 0) {
    return 'text-green-600 dark:text-green-500'
  }
  return 'text-red-600 dark:text-red-500'
}
