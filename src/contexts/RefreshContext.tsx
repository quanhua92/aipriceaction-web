import * as React from 'react'
import { useLogs } from './LogsContext'
import { VISIBILITY_REFRESH_DEBOUNCE_MS, VISIBILITY_MIN_REFRESH_INTERVAL_MS } from '@/lib/constants'

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

  // Manual refresh trigger
  const triggerRefresh = React.useCallback(() => {
    const now = Date.now()
    const timeSinceLastRefresh = now - lastRefresh

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

      if (timePageWasHidden > VISIBILITY_MIN_REFRESH_INTERVAL_MS) {
        // Page was hidden for more than 5 seconds - refresh immediately
        info('Refresh triggered immediately', {
          source: 'visibility-long-hidden',
          timePageWasHidden,
          minIntervalRequired: VISIBILITY_MIN_REFRESH_INTERVAL_MS
        })
        setLastRefresh(now)
      } else if (timePageWasHidden > 0) {
        // Page was hidden for less than 5 seconds - use debounce to prevent rapid switching
        visibilityTimeoutRef.current = setTimeout(() => {
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
        }, VISIBILITY_REFRESH_DEBOUNCE_MS)
      }
      // If timePageWasHidden is 0, it means page wasn't actually hidden (initial load), do nothing
    }
  }, [info])

  // Handle window focus
  const handleWindowFocus = React.useCallback(() => {
    // Window focus is another indication the page is visible
    // This helps catch cases where visibility API might not fire
    if (!isVisible) {
      info('Window focused - triggering refresh', {
        wasVisible: isVisible
      })
      triggerRefresh()
    }
  }, [isVisible, info, triggerRefresh])

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

      // Clear any pending visibility timeout
      if (visibilityTimeoutRef.current) {
        clearTimeout(visibilityTimeoutRef.current)
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
        info('Refresh triggered', {
          source: 'auto-interval',
          interval: 30000
        })
        triggerRefresh()
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
