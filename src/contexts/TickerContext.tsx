import React from 'react'

interface TickerContextValue {
  selectedTicker: string
  setSelectedTicker: (ticker: string) => void
}

const TickerContext = React.createContext<TickerContextValue | undefined>(
  undefined
)

export function TickerProvider({ children }: { children: React.ReactNode }) {
  const [selectedTicker, setSelectedTicker] = React.useState('VNINDEX')

  return (
    <TickerContext.Provider value={{ selectedTicker, setSelectedTicker }}>
      {children}
    </TickerContext.Provider>
  )
}

export function useTicker() {
  const context = React.useContext(TickerContext)
  if (context === undefined) {
    throw new Error('useTicker must be used within a TickerProvider')
  }
  return context
}
