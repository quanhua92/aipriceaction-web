import * as React from 'react'
import { usePlaygroundData } from './hooks/usePlaygroundData'

interface PlaygroundContextValue {
  playgroundData: ReturnType<typeof usePlaygroundData>['playgroundData']
  visibleData: ReturnType<typeof usePlaygroundData>['visibleData']
  viewportRange: ReturnType<typeof usePlaygroundData>['viewportRange']
  setCurrentIndex: ReturnType<typeof usePlaygroundData>['setCurrentIndex']
  navigate: ReturnType<typeof usePlaygroundData>['navigate']
  fetchInitialData: ReturnType<typeof usePlaygroundData>['fetchInitialData']
  randomizeData: ReturnType<typeof usePlaygroundData>['randomizeData']
  updateTicker: ReturnType<typeof usePlaygroundData>['updateTicker']
  updateEndDate: ReturnType<typeof usePlaygroundData>['updateEndDate']
}

const PlaygroundContext = React.createContext<PlaygroundContextValue | undefined>(undefined)

export function usePlayground() {
  const context = React.useContext(PlaygroundContext)
  if (context === undefined) {
    throw new Error('usePlayground must be used within a PlaygroundDataProvider')
  }
  return context
}

export interface PlaygroundDataProviderProps {
  children: React.ReactNode
  initialTicker?: string
  initialEndDate?: string
  navigate?: (options: { to: string; search?: Record<string, string> }) => void
}

export function PlaygroundDataProvider({
  children,
  initialTicker,
  initialEndDate,
  navigate: navigateFn
}: PlaygroundDataProviderProps) {
  const playgroundDataValue = usePlaygroundData(initialTicker, initialEndDate, navigateFn)

  const value: PlaygroundContextValue = {
    playgroundData: playgroundDataValue.playgroundData,
    visibleData: playgroundDataValue.visibleData,
    viewportRange: playgroundDataValue.viewportRange,
    setCurrentIndex: playgroundDataValue.setCurrentIndex,
    navigate: playgroundDataValue.navigate,
    fetchInitialData: playgroundDataValue.fetchInitialData,
    randomizeData: playgroundDataValue.randomizeData,
    updateTicker: playgroundDataValue.updateTicker,
    updateEndDate: playgroundDataValue.updateEndDate,
  }

  return (
    <PlaygroundContext.Provider value={value}>
      {children}
    </PlaygroundContext.Provider>
  )
}