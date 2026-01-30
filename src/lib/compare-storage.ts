import { SafeLocalStorage } from './localStorage'
import { CHART_COMPARE_STORAGE_KEY } from './constants'

/**
 * Chart compare tab state interface
 */
export interface ChartCompareState {
  secondaryTicker: string
  layout: 'vertical' | 'horizontal'
  swapped: boolean  // true = secondary ticker on left/top, false = secondary on right/bottom
}

// Default values
export const DEFAULT_COMPARE_STATE: ChartCompareState = {
  secondaryTicker: 'VNINDEX',
  layout: 'vertical',
  swapped: false
}

/**
 * Get chart compare state from localStorage
 */
export function getCompareState(): ChartCompareState {
  try {
    const stored = SafeLocalStorage.getItem(CHART_COMPARE_STORAGE_KEY)
    if (!stored) {
      // Return defaults for first-time users
      return {
        secondaryTicker: DEFAULT_COMPARE_STATE.secondaryTicker,
        layout: DEFAULT_COMPARE_STATE.layout,
        swapped: DEFAULT_COMPARE_STATE.swapped
      };
    }

    const parsed = JSON.parse(stored) as ChartCompareState

    // Validate and sanitize values
    return {
      secondaryTicker: parsed.secondaryTicker || DEFAULT_COMPARE_STATE.secondaryTicker,
      layout: parsed.layout === 'vertical' || parsed.layout === 'horizontal'
        ? parsed.layout
        : DEFAULT_COMPARE_STATE.layout,
      swapped: typeof parsed.swapped === 'boolean' ? parsed.swapped : DEFAULT_COMPARE_STATE.swapped
    }
  } catch (error) {
    console.warn('Failed to parse compare state:', error)
    return {
      secondaryTicker: DEFAULT_COMPARE_STATE.secondaryTicker,
      layout: DEFAULT_COMPARE_STATE.layout,
      swapped: DEFAULT_COMPARE_STATE.swapped
    };
  }
}

/**
 * Save chart compare state to localStorage
 */
export function saveCompareState(state: ChartCompareState): void {
  try {
    SafeLocalStorage.setItem(CHART_COMPARE_STORAGE_KEY, JSON.stringify(state))
  } catch (error) {
    console.warn('Failed to save compare state:', error)
  }
}
