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

  // Secondary ticker support
  secondaryTicker?: string
  secondaryAllData?: StockData[]
  secondaryIsLoading?: boolean
  secondaryError?: string
  showSecondaryChart?: boolean
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
  navigateFn?: (options: { to: string; search?: Record<string, string> }) => void,
  initialSecondaryTicker?: string
) {
  const { getTickers, tickerGroups } = useAPI()
  const { info, error: logError, debug } = useLogs()
  const [playgroundData, setPlaygroundData] = useState<PlaygroundData>({
    ticker: '',
    allData: [],
    currentIndex: 0,
    endDate: '',
    isLoading: true,
    secondaryTicker: initialSecondaryTicker || 'VNINDEX',
    secondaryAllData: undefined,
    secondaryIsLoading: false,
    secondaryError: undefined,
    showSecondaryChart: false,
  })

  // Log initial values after mount
  React.useEffect(() => {
    info(`[Playground] 🎯 Initial secondary ticker: "${playgroundData.secondaryTicker}"`)
  }, [])

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

      // Fetch both primary and secondary tickers in parallel if secondary ticker is set
      const promises = [
        getTickers('Playground.initialLoad.primary', {
          symbol: ticker,
          end_date: endDate,
          limit: 500,
          mode: 'vn'
        })
      ]

      const secondaryTicker = initialSecondaryTicker || 'VNINDEX'
      promises.push(
        getTickers('Playground.initialLoad.secondary', {
          symbol: secondaryTicker,
          end_date: endDate,
          limit: 500,
          mode: 'vn'
        })
      )

      const results = await Promise.allSettled(promises)
      const duration = Date.now() - startTime

      // Process primary ticker result
      const primaryResult = results[0]
      let primaryData: StockData[] = []
      let primaryError: string | undefined

      if (primaryResult.status === 'fulfilled') {
        const response = primaryResult.value
        primaryData = response[ticker] || []
        info(`[Playground] ✅ Primary ${ticker}: ${primaryData.length} days`)
      } else {
        primaryError = primaryResult.reason?.message || 'Failed to fetch primary ticker'
        logError(`[Playground] ❌ Primary ${ticker} failed: ${primaryError}`)
      }

      // Process secondary ticker result
      const secondaryResult = results[1]
      let secondaryData: StockData[] = []
      let secondaryError: string | undefined

      if (secondaryResult.status === 'fulfilled') {
        const response = secondaryResult.value
        secondaryData = response[secondaryTicker] || []
        info(`[Playground] ✅ Secondary ${secondaryTicker}: ${secondaryData.length} days`)
      } else {
        secondaryError = secondaryResult.reason?.message || 'Failed to fetch secondary ticker'
        logError(`[Playground] ❌ Secondary ${secondaryTicker} failed: ${secondaryError}`)
      }

      // Start by showing first 100 days (or all if less than 100)
      const startIndex = Math.min(99, Math.max(0, primaryData.length - 1))

      info(`[Playground] Initial display index: ${startIndex} (showing ${startIndex + 1} days)`)

      if (primaryData.length > 0) {
        const firstDate = primaryData[0]?.time?.split('T')[0]
        const lastDate = primaryData[primaryData.length - 1]?.time?.split('T')[0]
        info(`[Playground] Primary data range: ${firstDate} to ${lastDate}`)
      }

      if (secondaryData.length > 0) {
        const firstDate = secondaryData[0]?.time?.split('T')[0]
        const lastDate = secondaryData[secondaryData.length - 1]?.time?.split('T')[0]
        info(`[Playground] Secondary data range: ${firstDate} to ${lastDate}`)
      }

      setPlaygroundData({
        ticker,
        allData: primaryData,
        currentIndex: startIndex,
        endDate,
        isLoading: false,
        error: primaryError,
        secondaryTicker,
        secondaryAllData: secondaryData,
        secondaryIsLoading: false,
        secondaryError,
        showSecondaryChart: false, // Hide by default
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
  }, [getTickers, tickerGroups, info, logError, navigateFn, initialTicker, initialEndDate, initialSecondaryTicker])

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

    // Set loading state first
    setPlaygroundData(prev => {
      const ticker = prev.ticker || initialTicker || 'VNINDEX'
      info(`[Playground] 🔍 Current state ticker: "${prev.ticker}", initialTicker: "${initialTicker}"`)
      info(`[Playground] 📊 Using ticker: "${ticker}"`)

      if (!ticker || ticker === '') {
        logError('[Playground] ❌ No ticker available for update')
        logError(`[Playground] Debug - prev.ticker: "${prev.ticker}", initialTicker: "${initialTicker}"`)
        return prev // Return unchanged state
      }

      return {
        ...prev,
        isLoading: true,
        error: undefined,
        secondaryIsLoading: prev.secondaryTicker ? true : prev.secondaryIsLoading,
      }
    })

    try {
      const startTime = Date.now()

      // Get the current state with the ticker we need to use
      const currentState = playgroundData
      const ticker = currentState.ticker || initialTicker || 'VNINDEX'

      info(`[Playground] Updating end date to: ${newEndDate} for ticker ${ticker}`)

      // Fetch both primary and secondary tickers in parallel if secondary ticker exists
      const promises = [
        getTickers('Playground.updateDate.primary', {
          symbol: ticker,
          end_date: newEndDate,
          limit: 500,
          mode: 'vn'
        })
      ]

      if (currentState.secondaryTicker) {
        info(`[Playground] Also fetching secondary ticker ${currentState.secondaryTicker}`)
        promises.push(
          getTickers('Playground.updateDate.secondary', {
            symbol: currentState.secondaryTicker,
            end_date: newEndDate,
            limit: 500,
            mode: 'vn'
          })
        )
      }

      const results = await Promise.allSettled(promises)
      const duration = Date.now() - startTime

      // Process primary ticker result
      const primaryResult = results[0]
      if (primaryResult.status === 'fulfilled') {
        const response = primaryResult.value
        const data = response[ticker] || []

        // Simple logic: if changing to earlier date, show end of data; otherwise try to preserve
        const currentDate = currentState.allData[currentState.currentIndex]?.time?.split('T')[0]
        let startIndex

        if (currentDate && new Date(currentDate) > new Date(newEndDate)) {
          // Current date is after new end date, jump to end
          startIndex = data.length - 1
          info(`[Playground] 📍 Jumping to end (index ${startIndex}) since current date is after new end date`)
        } else {
          // Try to preserve position
          startIndex = findPreservedIndex(data, currentState.allData, currentState.currentIndex, info)
        }

        info(`[Playground] ✅ Loaded ${data.length} days for ${ticker} in ${duration}ms`)
        info(`[Playground] 📍 Display index: ${startIndex} (showing ${startIndex + 1} days)`)

        if (data.length > 0) {
          const firstDate = data[0]?.time?.split('T')[0]
          const lastDate = data[data.length - 1]?.time?.split('T')[0]
          info(`[Playground] Primary data range: ${firstDate} to ${lastDate}`)
        }

        // Update state using functional form to ensure we preserve the ticker
        setPlaygroundData(prev => ({
          ...prev,
          ticker: ticker, // Explicitly set ticker to ensure it's preserved
          allData: data,
          currentIndex: startIndex,
          endDate: newEndDate,
          isLoading: false,
        }))
      } else {
        throw primaryResult.reason
      }

      // Process secondary ticker result if it exists
      if (results.length > 1 && currentState.secondaryTicker) {
        const secondaryResult = results[1]
        if (secondaryResult.status === 'fulfilled') {
          const response = secondaryResult.value
          const data = response[currentState.secondaryTicker] || []

          info(`[Playground] ✅ Loaded ${data.length} days for secondary ticker ${currentState.secondaryTicker}`)

          if (data.length > 0) {
            const firstDate = data[0]?.time?.split('T')[0]
            const lastDate = data[data.length - 1]?.time?.split('T')[0]
            info(`[Playground] Secondary data range: ${firstDate} to ${lastDate}`)
          }

          setPlaygroundData(prev => ({
            ...prev,
            secondaryAllData: data,
            secondaryIsLoading: false,
          }))
        } else {
          logError(`[Playground] ❌ Secondary ticker update failed: ${secondaryResult.reason}`)
          setPlaygroundData(prev => ({
            ...prev,
            secondaryIsLoading: false,
            secondaryError: secondaryResult.reason instanceof Error ? secondaryResult.reason.message : 'Failed to update secondary ticker',
          }))
        }
      }

      // Update URL (only primary ticker and endDate)
      if (navigateFn) {
        navigateFn({
          to: '/play',
          search: {
            ticker: ticker,
            endDate: newEndDate,
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
        secondaryIsLoading: false,
        error: errorMessage,
      }))
    }
  }, [playgroundData, getTickers, navigateFn, info, logError, initialTicker])

  // Update secondary ticker method
  const updateSecondaryTicker = useCallback(async (newSecondaryTicker: string) => {
    if (!playgroundData.endDate) {
      logError('[Playground] ❌ No end date available for secondary ticker update')
      return
    }

    info(`[Playground] 📊 User selected secondary ticker: ${newSecondaryTicker}`)
    setPlaygroundData(prev => ({
      ...prev,
      secondaryTicker: newSecondaryTicker,
      secondaryIsLoading: true,
      secondaryError: undefined,
    }))

    try {
      const startTime = Date.now()
      info(`[Playground] Fetching data for secondary ticker: ${newSecondaryTicker}`)

      const response = await getTickers('Playground.updateSecondaryTicker', {
        symbol: newSecondaryTicker,
        end_date: playgroundData.endDate,
        limit: 500,
        mode: 'vn'
      })

      const data = response[newSecondaryTicker] || []
      const duration = Date.now() - startTime

      info(`[Playground] ✅ Loaded ${data.length} days for secondary ticker ${newSecondaryTicker} in ${duration}ms`)

      if (data.length > 0) {
        const firstDate = data[0]?.time?.split('T')[0]
        const lastDate = data[data.length - 1]?.time?.split('T')[0]
        info(`[Playground] Secondary data range: ${firstDate} to ${lastDate}`)
      }

      setPlaygroundData(prev => ({
        ...prev,
        secondaryAllData: data,
        secondaryIsLoading: false,
      }))
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update secondary ticker'
      logError(`[Playground] ❌ Secondary ticker update failed: ${errorMessage}`)
      if (err instanceof Error) {
        logError(`[Playground] Error stack: ${err.stack}`)
      }
      setPlaygroundData(prev => ({
        ...prev,
        secondaryIsLoading: false,
        secondaryError: errorMessage,
      }))
    }
  }, [getTickers, playgroundData.endDate, info, logError])

  // Toggle secondary chart visibility
  const toggleSecondaryChart = useCallback(() => {
    setPlaygroundData(prev => {
      const newState = !prev.showSecondaryChart
      info(`[Playground] 📍 Secondary chart ${newState ? 'shown' : 'hidden'}`)

      // Log secondary ticker data info
      if (newState) {
        info(`[Playground] 📊 Secondary ticker: "${prev.secondaryTicker}"`)
        info(`[Playground] 📊 Secondary data length: ${prev.secondaryAllData?.length || 0} days`)
        if (prev.secondaryAllData && prev.secondaryAllData.length > 0) {
          const firstDate = prev.secondaryAllData[0]?.time?.split('T')[0]
          const lastDate = prev.secondaryAllData[prev.secondaryAllData.length - 1]?.time?.split('T')[0]
          info(`[Playground] 📊 Secondary data range: ${firstDate} to ${lastDate}`)
        }
        if (prev.secondaryError) {
          info(`[Playground] ⚠️ Secondary error: ${prev.secondaryError}`)
        }
      }

      return {
        ...prev,
        showSecondaryChart: newState,
      }
    })
  }, [])

  // Get secondary visible data
  const secondaryVisibleData = useMemo(() => {
    if (!playgroundData.secondaryAllData?.length) return []

    // Show data from index 0 to currentIndex (cumulative view)
    const visible = playgroundData.secondaryAllData.slice(0, playgroundData.currentIndex + 1)

    if (visible.length > 0) {
      const firstDate = visible[0]?.time?.split('T')[0]
      const lastDate = visible[visible.length - 1]?.time?.split('T')[0]
      debug(`[Playground] 📊 Secondary visible data: ${visible.length} days (${firstDate} to ${lastDate})`)
    }

    return visible
  }, [playgroundData.secondaryAllData, playgroundData.currentIndex, debug])

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

  // Secondary viewport range
  const secondaryViewportRange = useMemo(() => {
    const visibleLength = secondaryVisibleData.length
    if (visibleLength <= 100) {
      return { from: 0, to: visibleLength }
    }
    return {
      from: visibleLength - 100,
      to: visibleLength
    }
  }, [secondaryVisibleData])

  
  return {
    playgroundData,
    visibleData,
    viewportRange,
    secondaryVisibleData,
    secondaryViewportRange,
    setCurrentIndex,
    navigate: navigateDate,
    fetchInitialData,
    randomizeData,
    updateTicker,
    updateEndDate,
    updateSecondaryTicker,
    toggleSecondaryChart,
  }
}