import * as React from 'react'
import { usePlaygroundData } from './hooks/usePlaygroundData'

interface PlaygroundContextValue {
  playgroundData: ReturnType<typeof usePlaygroundData>['playgroundData']
  visibleData: ReturnType<typeof usePlaygroundData>['visibleData']
  viewportRange: ReturnType<typeof usePlaygroundData>['viewportRange']
  secondaryVisibleData: ReturnType<typeof usePlaygroundData>['secondaryVisibleData']
  secondaryViewportRange: ReturnType<typeof usePlaygroundData>['secondaryViewportRange']
  setCurrentIndex: ReturnType<typeof usePlaygroundData>['setCurrentIndex']
  navigate: ReturnType<typeof usePlaygroundData>['navigate']
  fetchInitialData: ReturnType<typeof usePlaygroundData>['fetchInitialData']
  randomizeData: ReturnType<typeof usePlaygroundData>['randomizeData']
  updateTicker: ReturnType<typeof usePlaygroundData>['updateTicker']
  updateEndDate: ReturnType<typeof usePlaygroundData>['updateEndDate']
  updateInterval: ReturnType<typeof usePlaygroundData>['updateInterval']
  updateSecondaryTicker: ReturnType<typeof usePlaygroundData>['updateSecondaryTicker']
  toggleSecondaryChart: ReturnType<typeof usePlaygroundData>['toggleSecondaryChart']
  setShowSecondaryChart: ReturnType<typeof usePlaygroundData>['setShowSecondaryChart']
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
  initialSecondaryTicker?: string
  initialInterval?: string
  navigate?: (options: { to: string; search?: Record<string, string> }) => void
}

export function PlaygroundDataProvider({
  children,
  initialTicker,
  initialEndDate,
  initialSecondaryTicker,
  initialInterval,
  navigate: navigateFn
}: PlaygroundDataProviderProps) {
  const playgroundDataValue = usePlaygroundData(
    initialTicker,
    initialEndDate,
    navigateFn,
    initialSecondaryTicker,
    initialInterval
  )

  const value: PlaygroundContextValue = {
    playgroundData: playgroundDataValue.playgroundData,
    visibleData: playgroundDataValue.visibleData,
    viewportRange: playgroundDataValue.viewportRange,
    secondaryVisibleData: playgroundDataValue.secondaryVisibleData,
    secondaryViewportRange: playgroundDataValue.secondaryViewportRange,
    setCurrentIndex: playgroundDataValue.setCurrentIndex,
    navigate: playgroundDataValue.navigate,
    fetchInitialData: playgroundDataValue.fetchInitialData,
    randomizeData: playgroundDataValue.randomizeData,
    updateTicker: playgroundDataValue.updateTicker,
    updateEndDate: playgroundDataValue.updateEndDate,
    updateInterval: playgroundDataValue.updateInterval,
    updateSecondaryTicker: playgroundDataValue.updateSecondaryTicker,
    toggleSecondaryChart: playgroundDataValue.toggleSecondaryChart,
    setShowSecondaryChart: playgroundDataValue.setShowSecondaryChart,
  }

  return (
    <PlaygroundContext.Provider value={value}>
      {children}
    </PlaygroundContext.Provider>
  )
}