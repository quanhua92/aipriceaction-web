import React, { useState, useCallback, useMemo, useEffect } from 'react'
import { useAPI } from '@/contexts/APIContext'
import { type StockData } from '@/lib/api-client'
import { useLogs } from '@/contexts/LogsContext'

export interface PlaygroundData {
  ticker: string          // Randomly selected Vietnamese stock or index
  allData: StockData[]    // 500 days cached from API
  currentIndex: number    // Current position (0-499)
  endDate: string        // Random end date (2016-2025)
  isLoading: boolean
  error?: string
}

// Generate random date between 2016-01-01 and today, weighted towards recent years
const generateRandomEndDate = (): string => {
  const start = new Date('2016-01-01')
  const end = new Date()

  // Use a power function to bias towards more recent dates
  // Math.random()^bias where bias < 1 gives more weight to recent dates
  const bias = 0.3 // Lower values = stronger bias towards recent dates
  const randomFactor = Math.pow(Math.random(), bias)

  const randomTime = start.getTime() + randomFactor * (end.getTime() - start.getTime())
  return new Date(randomTime).toISOString().split('T')[0]
}

// Get random ticker from existing ticker groups
const getRandomTicker = (tickerGroups: Record<string, string[]> | null): string => {
  const marketIndices = ['VNINDEX', 'VN30']
  const allStocks = tickerGroups ? Object.values(tickerGroups).flat() : []
  const allTickers = [...marketIndices, ...allStocks]
  const uniqueTickers = [...new Set(allTickers)]

  if (uniqueTickers.length === 0) {
    // Fallback if no ticker groups available
    return 'VNINDEX'
  }

  return uniqueTickers[Math.floor(Math.random() * uniqueTickers.length)]
}

// Utility function to preserve position when updating data
const findPreservedIndex = (
  newData: StockData[],
  currentData: StockData[],
  currentIndex: number,
  logger: (msg: string) => void
): number => {
  if (!currentData.length || !newData.length) {
    logger('[Playground] ⚠️ No current data or new data, using default index 99')
    return Math.min(99, Math.max(0, newData.length - 1))
  }

  const currentDate = currentData[currentIndex]?.time?.split('T')[0]
  if (!currentDate) {
    logger('[Playground] ⚠️ No current date found, using default index 99')
    return Math.min(99, Math.max(0, newData.length - 1))
  }

  logger(`[Playground] 🔍 Trying to preserve position for date: ${currentDate} (current index: ${currentIndex})`)

  // Try to find the exact date in new data
  const exactMatch = newData.findIndex(d => d.time?.split('T')[0] === currentDate)
  if (exactMatch !== -1) {
    logger(`[Playground] ✅ Found exact date match at index ${exactMatch}`)
    return exactMatch
  }

  // If exact date not found, try to find closest date
  let closestIndex = -1
  let minDistance = Infinity

  for (let i = 0; i < newData.length; i++) {
    const newDate = newData[i]?.time?.split('T')[0]
    if (newDate) {
      const distance = Math.abs(new Date(newDate).getTime() - new Date(currentDate).getTime())
      if (distance < minDistance) {
        minDistance = distance
        closestIndex = i
      }
    }
  }

  if (closestIndex !== -1) {
    const closestDate = newData[closestIndex]?.time?.split('T')[0]
    logger(`[Playground] ⚠️ Date not found, using closest match: ${closestDate} at index ${closestIndex}`)
    return closestIndex
  }

  // Last resort: use same absolute index if within bounds
  const sameIndex = Math.min(currentIndex, newData.length - 1)
  logger(`[Playground] ⚠️ No close date found, using same absolute index: ${sameIndex}`)
  return sameIndex
}

export function usePlaygroundData(
  initialTicker?: string,
  initialEndDate?: string,
  navigateFn?: (options: { to: string; search?: Record<string, string> }) => void
) {
  const { getTickers, tickerGroups } = useAPI()
  const { info, error: logError, debug } = useLogs()
  const [playgroundData, setPlaygroundData] = useState<PlaygroundData>({
    ticker: '',
    allData: [],
    currentIndex: 0,
    endDate: '',
    isLoading: true,
  })

  // Fetch initial data
  const fetchInitialData = useCallback(async () => {
    info('[Playground] Starting initialization...')
    setPlaygroundData(prev => ({ ...prev, isLoading: true, error: undefined }))

    try {
      const startTime = Date.now()
      info('[Playground] Fetching initial data...')

      // Use provided values or generate random ones
      // If initial values were provided, use them. Otherwise, generate random ones.
      const useInitial = initialTicker && initialEndDate
      const ticker = useInitial ? initialTicker : getRandomTicker(tickerGroups)
      const endDate = useInitial ? initialEndDate : generateRandomEndDate()

      info(`[Playground] Selected ticker: ${ticker} (${useInitial ? 'from URL' : 'random'})`)
      info(`[Playground] Selected end date: ${endDate} (${useInitial ? 'from URL' : 'random'})`)

      // To get exactly 500 days, we only specify endDate and limit
      // The API will return 500 trading days before the endDate
      info(`[Playground] Fetching 500 days ending at ${endDate}`)

      const response = await getTickers('Playground.initialLoad', {
        symbol: ticker,
        end_date: endDate,
        limit: 500,
        mode: 'vn'
      })

      const data = response[ticker] || []
      const duration = Date.now() - startTime

      // Start by showing first 100 days (or all if less than 100)
      const startIndex = Math.min(99, Math.max(0, data.length - 1))

      info(`[Playground] ✅ Loaded ${data.length} days for ${ticker} in ${duration}ms`)
      info(`[Playground] Initial display index: ${startIndex} (showing ${startIndex + 1} days)`)

      if (data.length > 0) {
        const firstDate = data[0]?.time?.split('T')[0]
        const lastDate = data[data.length - 1]?.time?.split('T')[0]
        info(`[Playground] Data range: ${firstDate} to ${lastDate}`)
      }

      setPlaygroundData({
        ticker,
        allData: data,
        currentIndex: startIndex,
        endDate,
        isLoading: false,
      })

      // Update URL if we have navigate function and this wasn't from initial URL params
      if (navigateFn && !useInitial) {
        navigateFn({
          to: '/play',
          search: {
            ticker,
            endDate
          }
        })
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load playground data'
      logError(`[Playground] ❌ Initial data fetch failed: ${errorMessage}`)
      if (err instanceof Error) {
        logError(`[Playground] Error stack: ${err.stack}`)
      }
      setPlaygroundData(prev => ({
        ...prev,
        isLoading: false,
        error: errorMessage,
      }))
    }
  }, [getTickers, tickerGroups, info, logError, navigateFn, initialTicker, initialEndDate])

  // Randomize data with new ticker and date
  const randomizeData = useCallback(async () => {
    info('[Playground] 🎲 Starting randomization...')
    setPlaygroundData(prev => ({ ...prev, isLoading: true, error: undefined }))

    try {
      const startTime = Date.now()
      info('[Playground] Generating random ticker and date...')

      // Always generate random ones for randomization
      const ticker = getRandomTicker(tickerGroups)
      const endDate = generateRandomEndDate()

      info(`[Playground] Randomized ticker: ${ticker}`)
      info(`[Playground] Randomized end date: ${endDate}`)

      // To get exactly 500 days, we only specify endDate and limit
      info(`[Playground] Fetching 500 days ending at ${endDate}`)

      const response = await getTickers('Playground.randomize', {
        symbol: ticker,
        end_date: endDate,
        limit: 500,
        mode: 'vn'
      })

      const data = response[ticker] || []
      const duration = Date.now() - startTime

      // Start by showing first 100 days (or all if less than 100)
      const startIndex = Math.min(99, Math.max(0, data.length - 1))

      info(`[Playground] ✅ Loaded ${data.length} days for ${ticker} in ${duration}ms`)
      info(`[Playground] Initial display index: ${startIndex} (showing ${startIndex + 1} days)`)

      if (data.length > 0) {
        const firstDate = data[0]?.time?.split('T')[0]
        const lastDate = data[data.length - 1]?.time?.split('T')[0]
        info(`[Playground] Data range: ${firstDate} to ${lastDate}`)
      }

      setPlaygroundData({
        ticker,
        allData: data,
        currentIndex: startIndex,
        endDate,
        isLoading: false,
      })

      // Update URL with new random values
      if (navigateFn) {
        navigateFn({
          to: '/play',
          search: {
            ticker,
            endDate
          }
        })
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to randomize playground data'
      logError(`[Playground] ❌ Randomization failed: ${errorMessage}`)
      if (err instanceof Error) {
        logError(`[Playground] Error stack: ${err.stack}`)
      }
      setPlaygroundData(prev => ({
        ...prev,
        isLoading: false,
        error: errorMessage,
      }))
    }
  }, [getTickers, tickerGroups, info, logError, navigateFn])

  // Fetch data on mount
  useEffect(() => {
    info('[Playground] 🚀 Component mounted, initializing...')
    fetchInitialData()
  }, [fetchInitialData]) // Only run on mount

  // Navigate to new index
  const setCurrentIndex = useCallback((newIndex: number) => {
    setPlaygroundData(prev => {
      const clampedIndex = Math.max(0, Math.min(prev.allData.length - 1, newIndex))
      if (clampedIndex !== prev.currentIndex) {
        const currentIndexDate = prev.allData[clampedIndex]?.time?.split('T')[0]
        info(`[Playground] 📍 Index changed to ${clampedIndex} (${clampedIndex + 1} days, date: ${currentIndexDate})`)
      }
      return { ...prev, currentIndex: clampedIndex }
    })
  }, [info])

  // Get visible data based on current index
  const visibleData = useMemo(() => {
    if (!playgroundData.allData.length) return []

    // Show data from index 0 to currentIndex (cumulative view)
    const visible = playgroundData.allData.slice(0, playgroundData.currentIndex + 1)

    // Log when visible data changes
    if (visible.length > 0) {
      const firstDate = visible[0]?.time?.split('T')[0]
      const lastDate = visible[visible.length - 1]?.time?.split('T')[0]
      debug(`[Playground] 📊 Visible data: ${visible.length} days (${firstDate} to ${lastDate})`)
    }

    return visible
  }, [playgroundData.allData, playgroundData.currentIndex, debug])

  // Store navigate function for URL updates
  React.useEffect(() => {
    if (navigateFn && !initialTicker && !initialEndDate) {
      // Only update URL on initial load if not from URL params
      navigateFn({
        to: '/play',
        search: {
          ticker: playgroundData.ticker,
          endDate: playgroundData.endDate
        }
      })
    }
  }, [playgroundData.ticker, playgroundData.endDate, navigateFn, initialTicker, initialEndDate])

  // Watch for URL param changes (e.g., when user manually changes URL in browser)
  useEffect(() => {
    // Only react to URL changes if they differ from current state
    const urlTicker = initialTicker || undefined
    const urlEndDate = initialEndDate || undefined

    // Skip if URL params are empty (not provided) or match current state
    if ((!urlTicker && !urlEndDate) ||
        (urlTicker === playgroundData.ticker && urlEndDate === playgroundData.endDate)) {
      return
    }

    info(`[Playground] 🔄 URL params changed - fetching data for ${urlTicker || playgroundData.ticker} ending at ${urlEndDate || playgroundData.endDate}`)
    setPlaygroundData(prev => ({ ...prev, isLoading: true, error: undefined }))

    const fetchDataForParams = async (ticker: string, endDate: string) => {
      try {
        const startTime = Date.now()
        info(`[Playground] Fetching data from URL params: ${ticker} ending at ${endDate}`)

        const response = await getTickers('Playground.urlChange', {
          symbol: ticker,
          end_date: endDate,
          limit: 500,
          mode: 'vn'
        })

        const data = response[ticker] || []
        const duration = Date.now() - startTime

        // Start by showing first 100 days (or all if less than 100)
        const startIndex = Math.min(99, Math.max(0, data.length - 1))

        info(`[Playground] ✅ Loaded ${data.length} days for ${ticker} in ${duration}ms`)
        info(`[Playground] Initial display index: ${startIndex} (showing ${startIndex + 1} days)`)

        if (data.length > 0) {
          const firstDate = data[0]?.time?.split('T')[0]
          const lastDate = data[data.length - 1]?.time?.split('T')[0]
          info(`[Playground] Data range: ${firstDate} to ${lastDate}`)
        }

        setPlaygroundData({
          ticker,
          allData: data,
          currentIndex: startIndex,
          endDate,
          isLoading: false,
        })
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to load data from URL params'
        logError(`[Playground] ❌ URL param data fetch failed: ${errorMessage}`)
        if (err instanceof Error) {
          logError(`[Playground] Error stack: ${err.stack}`)
        }
        setPlaygroundData(prev => ({
          ...prev,
          isLoading: false,
          error: errorMessage,
        }))
      }
    }

    // Use URL params if provided, otherwise use current state
    const tickerToLoad = urlTicker || playgroundData.ticker
    const endDateToUse = urlEndDate || playgroundData.endDate

    fetchDataForParams(tickerToLoad, endDateToUse)
  }, [initialTicker, initialEndDate, playgroundData.ticker, playgroundData.endDate, getTickers, info, logError])

  // Navigation helpers
  const navigateDate = useCallback((direction: 'back5' | 'back1' | 'next1' | 'next5') => {
    const prevIndex = playgroundData.currentIndex
    let newIndex: number

    switch (direction) {
      case 'back5':
        newIndex = Math.max(0, prevIndex - 5)
        info(`[Playground] ⬅️ Navigating back 5 days: ${prevIndex} → ${newIndex}`)
        break
      case 'back1':
        newIndex = Math.max(0, prevIndex - 1)
        info(`[Playground] ⬅️ Navigating back 1 day: ${prevIndex} → ${newIndex}`)
        break
      case 'next1':
        newIndex = Math.min(playgroundData.allData.length - 1, prevIndex + 1)
        info(`[Playground] ➡️ Navigating next 1 day: ${prevIndex} → ${newIndex}`)
        break
      case 'next5':
        newIndex = Math.min(playgroundData.allData.length - 1, prevIndex + 5)
        info(`[Playground] ➡️ Navigating next 5 days: ${prevIndex} → ${newIndex}`)
        break
      default:
        newIndex = prevIndex
    }

    setCurrentIndex(newIndex)
  }, [playgroundData.currentIndex, playgroundData.allData.length, setCurrentIndex, info])

  // Manual ticker change method
  const updateTicker = useCallback(async (newTicker: string) => {
    info(`[Playground] 📊 User selected ticker: ${newTicker}`)
    setPlaygroundData(prev => ({ ...prev, isLoading: true, error: undefined }))

    try {
      const startTime = Date.now()
      info(`[Playground] Updating ticker to: ${newTicker}`)

      const response = await getTickers('Playground.updateTicker', {
        symbol: newTicker,
        end_date: playgroundData.endDate,
        limit: 500,
        mode: 'vn'
      })

      const data = response[newTicker] || []
      const duration = Date.now() - startTime

      // Start by showing first 100 days (or all if less than 100)
      const startIndex = Math.min(99, Math.max(0, data.length - 1))

      info(`[Playground] ✅ Loaded ${data.length} days for ${newTicker} in ${duration}ms`)
      info(`[Playground] Initial display index: ${startIndex} (showing ${startIndex + 1} days)`)

      if (data.length > 0) {
        const firstDate = data[0]?.time?.split('T')[0]
        const lastDate = data[data.length - 1]?.time?.split('T')[0]
        info(`[Playground] Data range: ${firstDate} to ${lastDate}`)
      }

      setPlaygroundData({
        ticker: newTicker,
        allData: data,
        currentIndex: startIndex,
        endDate: playgroundData.endDate,
        isLoading: false,
      })

      // Update URL
      if (navigateFn) {
        navigateFn({
          to: '/play',
          search: {
            ticker: newTicker,
            endDate: playgroundData.endDate
          }
        })
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update ticker'
      logError(`[Playground] ❌ Ticker update failed: ${errorMessage}`)
      if (err instanceof Error) {
        logError(`[Playground] Error stack: ${err.stack}`)
      }
      setPlaygroundData(prev => ({
        ...prev,
        isLoading: false,
        error: errorMessage,
      }))
    }
  }, [getTickers, playgroundData.endDate, navigateFn, info, logError])

  // Manual date change method
  const updateEndDate = useCallback(async (newEndDate: string) => {
    info(`[Playground] 📅 User selected end date: ${newEndDate}`)

    // Get current state synchronously
    const currentState = playgroundData

    if (!currentState.ticker) {
      logError('[Playground] ❌ No ticker available for update')
      return
    }

    setPlaygroundData(prev => ({ ...prev, isLoading: true, error: undefined }))

    try {
      const startTime = Date.now()
      info(`[Playground] Updating end date to: ${newEndDate} for ticker ${currentState.ticker}`)

      const currentDate = currentState.allData[currentState.currentIndex]?.time?.split('T')[0]
      info(`[Playground] Current position: index ${currentState.currentIndex} (date: ${currentDate || 'undefined'})`)

      const response = await getTickers('Playground.updateDate', {
        symbol: currentState.ticker,
        end_date: newEndDate,
        limit: 500,
        mode: 'vn'
      })

      const data = response[currentState.ticker] || []
      const duration = Date.now() - startTime

      // Preserve the user's current position when extending the date range
      const startIndex = findPreservedIndex(data, currentState.allData, currentState.currentIndex, info)

      info(`[Playground] ✅ Loaded ${data.length} days for ${currentState.ticker} in ${duration}ms`)
      info(`[Playground] 📍 Display index: ${startIndex} (showing ${startIndex + 1} days)`)

      if (data.length > 0) {
        const firstDate = data[0]?.time?.split('T')[0]
        const lastDate = data[data.length - 1]?.time?.split('T')[0]
        info(`[Playground] Data range: ${firstDate} to ${lastDate}`)
      }

      setPlaygroundData(prev => ({
        ...prev,
        allData: data,
        currentIndex: startIndex,
        endDate: newEndDate,
        isLoading: false,
      }))

      // Update URL
      if (navigateFn) {
        navigateFn({
          to: '/play',
          search: {
            ticker: currentState.ticker,
            endDate: newEndDate
          }
        })
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update end date'
      logError(`[Playground] ❌ End date update failed: ${errorMessage}`)
      if (err instanceof Error) {
        logError(`[Playground] Error stack: ${err.stack}`)
      }
      setPlaygroundData(prev => ({
        ...prev,
        isLoading: false,
        error: errorMessage,
      }))
    }
  }, [getTickers, navigateFn, info, logError])

  // Viewport range for chart performance (show last ~100 candles)
  const viewportRange = useMemo(() => {
    const visibleLength = visibleData.length
    if (visibleLength <= 100) {
      return { from: 0, to: visibleLength }
    }
    return {
      from: visibleLength - 100,
      to: visibleLength
    }
  }, [visibleData])

  return {
    playgroundData,
    visibleData,
    viewportRange,
    setCurrentIndex,
    navigate: navigateDate,
    fetchInitialData,
    randomizeData,
    updateTicker,
    updateEndDate,
  }
}