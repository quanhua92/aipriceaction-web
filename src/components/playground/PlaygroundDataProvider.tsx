import * as React from 'react'
import { usePlaygroundData } from './hooks/usePlaygroundData'

interface PlaygroundContextValue {
  playgroundData: ReturnType<typeof usePlaygroundData>['playgroundData']
  visibleData: ReturnType<typeof usePlaygroundData>['visibleData']
  secondaryVisibleData: ReturnType<typeof usePlaygroundData>['secondaryVisibleData']
  setCurrentIndex: ReturnType<typeof usePlaygroundData>['setCurrentIndex']
  navigate: ReturnType<typeof usePlaygroundData>['navigate']
  randomizeData: ReturnType<typeof usePlaygroundData>['randomizeData']
  updateTicker: ReturnType<typeof usePlaygroundData>['updateTicker']
  updateEndDate: ReturnType<typeof usePlaygroundData>['updateEndDate']
  updateInterval: ReturnType<typeof usePlaygroundData>['updateInterval']
  updateLimit: ReturnType<typeof usePlaygroundData>['updateLimit']
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
  initialLimit?: string
  navigate?: (options: { to: string; search?: Record<string, string> }) => void
  onIntervalInit?: (interval: string) => void
}

export function PlaygroundDataProvider({
  children,
  initialTicker,
  initialEndDate,
  initialSecondaryTicker,
  initialInterval,
  initialLimit,
  navigate: navigateFn,
  onIntervalInit,
}: PlaygroundDataProviderProps) {
  const playgroundDataValue = usePlaygroundData(
    initialTicker,
    initialEndDate,
    navigateFn,
    initialSecondaryTicker,
    initialInterval,
    onIntervalInit,
    initialLimit
  )

  const value: PlaygroundContextValue = {
    playgroundData: playgroundDataValue.playgroundData,
    visibleData: playgroundDataValue.visibleData,
    secondaryVisibleData: playgroundDataValue.secondaryVisibleData,
    setCurrentIndex: playgroundDataValue.setCurrentIndex,
    navigate: playgroundDataValue.navigate,
    randomizeData: playgroundDataValue.randomizeData,
    updateTicker: playgroundDataValue.updateTicker,
    updateEndDate: playgroundDataValue.updateEndDate,
    updateInterval: playgroundDataValue.updateInterval,
    updateLimit: playgroundDataValue.updateLimit,
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