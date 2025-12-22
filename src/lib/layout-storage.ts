import { SafeLocalStorage } from './localStorage'
import { CHART_LAYOUT_STORAGE_KEY, WATCH_LAYOUT_STORAGE_KEY } from './constants'

// Chart page layout interface
export interface ChartPageLayout {
  chartCount: number
  gridColumns: number
}

// Watch page layout interface
export interface WatchPageLayout {
  pageSize: number
  columns: number
}

// Default values
export const DEFAULT_CHART_LAYOUT: ChartPageLayout = {
  chartCount: 4,
  gridColumns: 1, // Will be updated by responsive logic
}

export const DEFAULT_WATCH_LAYOUT: WatchPageLayout = {
  pageSize: 10,
  columns: 1, // Will be updated by responsive logic
}

/**
 * Get chart page layout from localStorage
 */
export function getChartLayout(): ChartPageLayout {
  try {
    const stored = SafeLocalStorage.getItem(CHART_LAYOUT_STORAGE_KEY)
    if (!stored) {
      // Return responsive defaults for first-time users
      const isDesktop = typeof window !== 'undefined' && window.innerWidth >= 768;
      return {
        chartCount: DEFAULT_CHART_LAYOUT.chartCount,
        gridColumns: isDesktop ? 2 : 1
      };
    }

    const parsed = JSON.parse(stored) as ChartPageLayout

    // Validate and sanitize values
    return {
      chartCount: Math.max(1, Math.min(10, parsed.chartCount || DEFAULT_CHART_LAYOUT.chartCount)),
      gridColumns: Math.max(1, Math.min(6, parsed.gridColumns || DEFAULT_CHART_LAYOUT.gridColumns))
    }
  } catch (error) {
    console.warn('Failed to parse chart layout:', error)
    const isDesktop = typeof window !== 'undefined' && window.innerWidth >= 768;
    return {
      chartCount: DEFAULT_CHART_LAYOUT.chartCount,
      gridColumns: isDesktop ? 2 : 1
    };
  }
}

/**
 * Save chart page layout to localStorage
 */
export function saveChartLayout(layout: Partial<ChartPageLayout>): void {
  try {
    const currentLayout = getChartLayout()
    const newLayout = { ...currentLayout, ...layout }
    SafeLocalStorage.setItem(CHART_LAYOUT_STORAGE_KEY, JSON.stringify(newLayout))
  } catch (error) {
    console.warn('Failed to save chart layout:', error)
  }
}

/**
 * Get watch page layout from localStorage
 */
export function getWatchLayout(): WatchPageLayout {
  try {
    const stored = SafeLocalStorage.getItem(WATCH_LAYOUT_STORAGE_KEY)
    if (!stored) {
      // Return responsive defaults for first-time users
      const isDesktop = typeof window !== 'undefined' && window.innerWidth >= 768;
      return {
        pageSize: DEFAULT_WATCH_LAYOUT.pageSize,
        columns: isDesktop ? 2 : 1
      };
    }

    const parsed = JSON.parse(stored) as WatchPageLayout

    // Validate and sanitize values
    return {
      pageSize: [10, 20, 30].includes(parsed.pageSize) ? parsed.pageSize : DEFAULT_WATCH_LAYOUT.pageSize,
      columns: Math.max(1, Math.min(6, parsed.columns || DEFAULT_WATCH_LAYOUT.columns))
    }
  } catch (error) {
    console.warn('Failed to parse watch layout:', error)
    const isDesktop = typeof window !== 'undefined' && window.innerWidth >= 768;
    return {
      pageSize: DEFAULT_WATCH_LAYOUT.pageSize,
      columns: isDesktop ? 2 : 1
    };
  }
}

/**
 * Save watch page layout to localStorage
 */
export function saveWatchLayout(layout: Partial<WatchPageLayout>): void {
  try {
    const currentLayout = getWatchLayout()
    const newLayout = { ...currentLayout, ...layout }
    SafeLocalStorage.setItem(WATCH_LAYOUT_STORAGE_KEY, JSON.stringify(newLayout))
  } catch (error) {
    console.warn('Failed to save watch layout:', error)
  }
}