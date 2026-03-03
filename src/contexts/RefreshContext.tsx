import * as React from 'react'
import { useLogs } from './LogsContext'
import { VISIBILITY_REFRESH_DEBOUNCE_MS, VISIBILITY_MIN_REFRESH_INTERVAL_MS } from '@/lib/constants'
import { getHealth } from '@/lib/api-client'

interface RefreshContextValue {
  isRefreshEnabled: boolean
  lastRefresh: number
  isVisible: boolean
  toggleRefresh: () => void
  triggerRefresh: () => void
}

const RefreshContext = React.createContext<RefreshContextValue | undefined>(undefined)

export function RefreshProvider({ children }: { children: React.ReactNode }) {
  const { info } = useLogs()
  const [isRefreshEnabled, setIsRefreshEnabled] = React.useState(false)
  const [lastRefresh, setLastRefresh] = React.useState(Date.now())
  const intervalRef = React.useRef<NodeJS.Timeout | null>(null)

  // Visibility state and refs
  const [isVisible, setIsVisible] = React.useState(
    typeof document !== 'undefined' ? !document.hidden : true
  )
  const visibilityTimeoutRef = React.useRef<NodeJS.Timeout | null>(null)
  const lastVisibilityChangeRef = React.useRef<number>(Date.now())

  // Track when page becomes hidden to properly calculate time away
  const hiddenTimestampRef = React.useRef<number | null>(null)

  // Ref to track current lastRefresh to avoid closure issues
  const lastRefreshRef = React.useRef(lastRefresh)
  React.useEffect(() => {
    lastRefreshRef.current = lastRefresh
  }, [lastRefresh])

  // Trading hours cache (5-minute cache)
  const tradingHoursCacheRef = React.useRef<{ value: boolean; timestamp: number } | null>(null)

  // Fetch trading hours status with 5-minute cache
  const fetchTradingHours = React.useCallback(async (): Promise<boolean> => {
    const now = Date.now()
    const cache = tradingHoursCacheRef.current

    // Use cache if less than 5 minutes old
    if (cache && now - cache.timestamp < 5 * 60 * 1000) {
      return cache.value
    }

    try {
      const health = await getHealth()
      tradingHoursCacheRef.current = { value: health.is_trading_hours, timestamp: now }
      return health.is_trading_hours
    } catch (error) {
      info('Failed to fetch trading hours status, defaulting to true', {
        error: error instanceof Error ? error.message : String(error)
      })
      // Default to true on error (safe - will refresh)
      return true
    }
  }, [info])

  // Manual refresh trigger
  const triggerRefresh = React.useCallback(() => {
    const now = Date.now()
    const timeSinceLastRefresh = now - lastRefresh

    // Prevent refresh if it happened too recently (within 5 seconds)
    if (timeSinceLastRefresh < VISIBILITY_MIN_REFRESH_INTERVAL_MS) {
      info('Skipping manual refresh - too soon since last refresh', {
        source: 'manual',
        timeSinceLastRefresh,
        minIntervalRequired: VISIBILITY_MIN_REFRESH_INTERVAL_MS
      })
      return
    }

    info('Refresh triggered', {
      source: 'manual',
      timeSinceLastRefresh,
      lastRefresh: lastRefresh,
      newRefreshTime: now
    })

    setLastRefresh(now)
  }, [info, lastRefresh])

  // Handle visibility change
  const handleVisibilityChange = React.useCallback(() => {
    const currentlyVisible = !document.hidden
    const now = Date.now()
    const timeSinceLastChange = now - lastVisibilityChangeRef.current

    // Update visibility state
    setIsVisible(currentlyVisible)
    lastVisibilityChangeRef.current = now

    // Log the visibility change
    info(`Page visibility changed to ${currentlyVisible ? 'visible' : 'hidden'}`, {
      visibilityState: document.visibilityState,
      timeSinceLastChange
    })

    if (!currentlyVisible) {
      // Page became hidden - record the timestamp
      hiddenTimestampRef.current = now
    } else {
      // Page became visible - check how long it was hidden
      if (visibilityTimeoutRef.current) {
        clearTimeout(visibilityTimeoutRef.current)
      }

      const timePageWasHidden = hiddenTimestampRef.current
        ? now - hiddenTimestampRef.current
        : 0

      // Reset hidden timestamp
      hiddenTimestampRef.current = null

      // Check trading hours before refreshing
      const cachedTradingHours = tradingHoursCacheRef.current?.value
      if (cachedTradingHours === false) {
        info('Skipping visibility refresh - outside trading hours', {
          timePageWasHidden,
          isTradingHours: false
        })
        return
      }

      if (timePageWasHidden > VISIBILITY_MIN_REFRESH_INTERVAL_MS) {
      // Page was hidden for more than 30 seconds - refresh immediately
      info('Refresh triggered immediately', {
        source: 'visibility-long-hidden',
        timePageWasHidden,
        minIntervalRequired: VISIBILITY_MIN_REFRESH_INTERVAL_MS
      })
      setLastRefresh(now)
    } else if (timePageWasHidden > 0) {
      // Page was hidden for less than 30 seconds - use debounce to prevent rapid switching
      // But wait a bit longer to let focus events potentially handle it
      visibilityTimeoutRef.current = setTimeout(async () => {
        // Check trading hours before refreshing
        const tradingHours = await fetchTradingHours()
        if (!tradingHours) {
          info('Skipping visibility refresh - outside trading hours', {
            timePageWasHidden,
            isTradingHours: false
          })
          return
        }

        // Check time since last refresh to avoid duplicate refreshes
        const timeSinceLastRefresh = Date.now() - lastRefreshRef.current

        if (timeSinceLastRefresh >= VISIBILITY_MIN_REFRESH_INTERVAL_MS) {
          info('Refresh triggered', {
            source: 'visibility-short-hidden',
            timePageWasHidden,
            timeSinceLastRefresh,
            debounceDelay: VISIBILITY_REFRESH_DEBOUNCE_MS
          })
          setLastRefresh(Date.now())
        } else {
          info('Skipping visibility refresh - recent refresh detected', {
            timePageWasHidden,
            timeSinceLastRefresh,
            minIntervalRequired: VISIBILITY_MIN_REFRESH_INTERVAL_MS
          })
        }
      }, VISIBILITY_REFRESH_DEBOUNCE_MS + 200) // Add extra delay to let focus events handle it first
    }
      // If timePageWasHidden is 0, it means page wasn't actually hidden (initial load), do nothing
    }
  }, [info, fetchTradingHours])

  // Focus/blur coordination refs
  const focusTimeoutRef = React.useRef<NodeJS.Timeout | null>(null)
  const lastFocusTimeRef = React.useRef<number>(0)

  // Handle window focus
  const handleWindowFocus = React.useCallback(() => {
    info('FOCUS EVENT DETECTED - window focus handler called', {
      timestamp: Date.now(),
      wasVisible: isVisible
    })

    const now = Date.now()
    lastFocusTimeRef.current = now

    // Clear any pending focus timeout
    if (focusTimeoutRef.current) {
      clearTimeout(focusTimeoutRef.current)
    }

    // Use a short debounce to coordinate with visibility change events
    focusTimeoutRef.current = setTimeout(async () => {
      const currentlyVisible = !document.hidden

      // Check trading hours before refreshing
      const tradingHours = await fetchTradingHours()
      if (!tradingHours) {
        info('Window focus refresh skipped - outside trading hours', {
          wasVisible: isVisible,
          currentlyVisible,
          isTradingHours: false
        })
        return
      }

      const timeSinceLastRefresh = now - lastRefreshRef.current

      // Only trigger refresh if page is actually visible and enough time has passed
      if (currentlyVisible && timeSinceLastRefresh >= VISIBILITY_MIN_REFRESH_INTERVAL_MS) {
        info('Window focus refresh triggered', {
          wasVisible: isVisible,
          currentlyVisible,
          timeSinceLastRefresh,
          timeSinceFocus: Date.now() - now
        })
        setLastRefresh(now)
      } else {
        info('Window focus refresh skipped', {
          wasVisible: isVisible,
          currentlyVisible,
          timeSinceLastRefresh,
          reason: !currentlyVisible ? 'page not visible' : 'too soon since last refresh'
        })
      }
    }, 100) // Very short debounce to let visibility change events process first
  }, [isVisible, info, fetchTradingHours])

  // Handle window blur
  const handleWindowBlur = React.useCallback(() => {
    info('Window blurred', {
      wasVisible: isVisible
    })
  }, [isVisible, info])

  // Toggle auto-refresh on/off
  const toggleRefresh = React.useCallback(() => {
    setIsRefreshEnabled((prev) => !prev)
  }, [])

  // Log refresh state changes
  React.useEffect(() => {
    info(`Refresh ${isRefreshEnabled ? 'enabled' : 'disabled'}`)
  }, [isRefreshEnabled, info])

  // Poll trading hours status every 5 minutes
  React.useEffect(() => {
    // Only setup on client-side
    if (typeof document === 'undefined') return

    // Initial fetch
    fetchTradingHours()

    // Poll every 5 minutes
    const tradingHoursInterval = setInterval(fetchTradingHours, 5 * 60 * 1000)

    return () => {
      clearInterval(tradingHoursInterval)
    }
  }, [fetchTradingHours])

  // Setup visibility and focus event listeners
  React.useEffect(() => {
    // Only setup on client-side
    if (typeof document === 'undefined') return

    // Add visibility change listener
    document.addEventListener('visibilitychange', handleVisibilityChange)

    // Add window focus/blur listeners
    window.addEventListener('focus', handleWindowFocus)
    window.addEventListener('blur', handleWindowBlur)

    // Initial visibility check
    info('Initial page visibility state', {
      isVisible: !document.hidden,
      visibilityState: document.visibilityState
    })

    // Cleanup event listeners
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      window.removeEventListener('focus', handleWindowFocus)
      window.removeEventListener('blur', handleWindowBlur)

      // Clear any pending timeouts
      if (visibilityTimeoutRef.current) {
        clearTimeout(visibilityTimeoutRef.current)
      }
      if (focusTimeoutRef.current) {
        clearTimeout(focusTimeoutRef.current)
      }
    }
  }, [handleVisibilityChange, handleWindowFocus, handleWindowBlur, info])

  // Setup/cleanup 30-second interval when refresh is enabled
  React.useEffect(() => {
    if (isRefreshEnabled) {
      // Clear any existing interval
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }

      // Trigger immediate refresh when enabling
      info('Auto-refresh enabled - triggering initial refresh')
      triggerRefresh()

      // Setup 30-second interval
      intervalRef.current = setInterval(() => {
        const now = Date.now()
        const timeSinceLastRefresh = now - lastRefreshRef.current

        // Only refresh if minimum interval has passed
        if (timeSinceLastRefresh >= VISIBILITY_MIN_REFRESH_INTERVAL_MS) {
          info('Refresh triggered', {
            source: 'auto-interval',
            interval: 30000,
            timeSinceLastRefresh
          })
          triggerRefresh()
        } else {
          info('Skipping auto-interval refresh - too soon since last refresh', {
            timeSinceLastRefresh,
            minIntervalRequired: VISIBILITY_MIN_REFRESH_INTERVAL_MS
          })
        }
      }, 30000) // 30 seconds
    } else {
      // Clear interval when disabled
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
      }
      info('Auto-refresh disabled')
    }

    // Cleanup on unmount
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }
    }
  }, [isRefreshEnabled, triggerRefresh, info])

  const value: RefreshContextValue = {
    isRefreshEnabled,
    lastRefresh,
    isVisible,
    toggleRefresh,
    triggerRefresh,
  }

  return <RefreshContext.Provider value={value}>{children}</RefreshContext.Provider>
}

export function useRefresh() {
  const context = React.useContext(RefreshContext)
  if (context === undefined) {
    throw new Error('useRefresh must be used within a RefreshProvider')
  }
  return context
}
