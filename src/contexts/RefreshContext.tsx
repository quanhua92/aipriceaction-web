import * as React from 'react'

interface RefreshContextValue {
  isRefreshEnabled: boolean
  lastRefresh: number
  toggleRefresh: () => void
  triggerRefresh: () => void
}

const RefreshContext = React.createContext<RefreshContextValue | undefined>(undefined)

export function RefreshProvider({ children }: { children: React.ReactNode }) {
  const [isRefreshEnabled, setIsRefreshEnabled] = React.useState(false)
  const [lastRefresh, setLastRefresh] = React.useState(Date.now())
  const intervalRef = React.useRef<NodeJS.Timeout | null>(null)

  // Manual refresh trigger
  const triggerRefresh = React.useCallback(() => {
    setLastRefresh(Date.now())
  }, [])

  // Toggle auto-refresh on/off
  const toggleRefresh = React.useCallback(() => {
    setIsRefreshEnabled((prev) => !prev)
  }, [])

  // Setup/cleanup 30-second interval when refresh is enabled
  React.useEffect(() => {
    if (isRefreshEnabled) {
      // Clear any existing interval
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }

      // Trigger immediate refresh when enabling
      triggerRefresh()

      // Setup 30-second interval
      intervalRef.current = setInterval(() => {
        triggerRefresh()
      }, 30000) // 30 seconds
    } else {
      // Clear interval when disabled
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
      }
    }

    // Cleanup on unmount
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }
    }
  }, [isRefreshEnabled, triggerRefresh])

  const value: RefreshContextValue = {
    isRefreshEnabled,
    lastRefresh,
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
