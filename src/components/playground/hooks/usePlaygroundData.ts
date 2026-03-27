import React, { useState, useCallback, useMemo, useEffect } from 'react'
import { useAPI } from '@/contexts/APIContext'
import { type StockData } from '@/lib/api-client'

// Intervals offered in the playground selector
export const PLAYGROUND_INTERVALS = ['1m', '5m', '15m', '1H', '1D', '1W'] as const
export type PlaygroundInterval = typeof PLAYGROUND_INTERVALS[number]

// Check if an interval is intraday (not daily or weekly)
export function isIntradayInterval(interval: string): boolean {
  return interval !== '1D' && interval !== '1W'
}

// Data limit options
export const PLAYGROUND_LIMITS = [100, 200, 300, 500, 1000, 1500, 2000] as const
export type PlaygroundLimit = typeof PLAYGROUND_LIMITS[number]
export const DEFAULT_PLAYGROUND_LIMIT: PlaygroundLimit = 500

function isValidLimit(value: string | number | undefined): value is PlaygroundLimit {
  const num = Number(value)
  return (PLAYGROUND_LIMITS as readonly number[]).includes(num)
}

const MARKET_INDICES = ['VNINDEX', 'VN30']

// localStorage key for smart random toggle
const SMART_RANDOM_KEY = 'playground-smart-random'

// localStorage key for secondary chart visibility
const SECONDARY_CHART_VISIBLE_KEY = 'playground-secondary-chart-visible'

export interface PlaygroundData {
  ticker: string          // Randomly selected Vietnamese stock or index
  allData: StockData[]    // Bars cached from API
  currentIndex: number    // Current position within data
  endDate: string        // End date of the data window
  interval: PlaygroundInterval  // Current interval
  limit: PlaygroundLimit      // Number of bars to fetch
  isLoading: boolean
  error?: string

  // Secondary ticker support
  secondaryTicker?: string
  secondaryAllData?: StockData[]
  secondaryIsLoading?: boolean
  secondaryError?: string
  showSecondaryChart?: boolean
}

// Generate random date between 2016-01-01 and today, weighted towards recent years.
// For intraday intervals, restrict to 2023+ since intraday data only available from then.
const generateRandomDate = (interval?: string): string => {
  const start = isIntradayInterval(interval || '1D')
    ? new Date('2023-01-01')
    : new Date('2016-01-01')
  const end = new Date()

  // Use a power function to bias towards more recent dates
  // Math.random()^bias where bias < 1 gives more weight to recent dates
  const bias = 0.3 // Lower values = stronger bias towards recent dates
  const randomFactor = Math.pow(Math.random(), bias)

  const randomTime = start.getTime() + randomFactor * (end.getTime() - start.getTime())
  return new Date(randomTime).toISOString().split('T')[0]
}

// Derive endDate from a viewDate so that viewDate lands at ~20% into the data window.
// For daily: limit*0.8 trading days before endDate ≈ limit*0.8*1.45 calendar days.
// For intraday: use shorter lookback since bars cover less calendar time.
const deriveEndDate = (viewDate: string, interval?: string, limit: PlaygroundLimit = DEFAULT_PLAYGROUND_LIMIT): string => {
  const d = new Date(viewDate)
  const tradingBars = limit * 0.8
  const calDays = isIntradayInterval(interval || '1D')
    ? Math.ceil(tradingBars * 0.18)
    : Math.ceil(tradingBars * 1.45)
  d.setDate(d.getDate() + calDays)
  return d.toISOString().split('T')[0]
}

// Get random ticker from existing ticker groups
const getRandomTicker = (tickerGroups: Record<string, string[]> | null): string => {
  const allStocks = tickerGroups ? Object.values(tickerGroups).flat() : []
  const allTickers = [...MARKET_INDICES, ...allStocks]
  const uniqueTickers = [...new Set(allTickers)]

  if (uniqueTickers.length === 0) {
    // Fallback if no ticker groups available
    return 'VNINDEX'
  }

  return uniqueTickers[Math.floor(Math.random() * uniqueTickers.length)]
}

// Fetch all tickers' last bar as of a date, sort by trading value, pick random from top 10
const getTopTickersByValue = async (
  getTickers: (source: string, params: Record<string, unknown>) => Promise<Record<string, StockData[]>>,
  viewDate: string,
  tickerGroups: Record<string, string[]> | null,
): Promise<string> => {
  try {
    const response = await getTickers('Playground.smartRandom.allTickers', {
      end_date: viewDate,
      limit: 1,
      mode: 'vn',
    })

    // Build value list, excluding market indices
    const candidates: { ticker: string; value: number }[] = []
    for (const [ticker, data] of Object.entries(response)) {
      if (MARKET_INDICES.includes(ticker)) continue
      const bar = data?.[0]
      if (!bar) continue
      const tradingValue = (bar.close || 0) * (bar.volume || 0)
      if (tradingValue > 0) {
        candidates.push({ ticker, value: tradingValue })
      }
    }

    if (candidates.length === 0) {
      return getRandomTicker(tickerGroups)
    }

    // Sort descending by value, take top 10
    candidates.sort((a, b) => b.value - a.value)
    const top10 = candidates.slice(0, 10)
    return top10[Math.floor(Math.random() * top10.length)].ticker
  } catch {
    return getRandomTicker(tickerGroups)
  }
}

// Utility function to preserve position when updating data
const findPreservedIndex = (
  newData: StockData[],
  currentData: StockData[],
  currentIndex: number,
): number => {
  if (!currentData.length || !newData.length) {
    return Math.min(Math.floor(newData.length * 0.2), Math.max(0, newData.length - 1))
  }

  const currentDate = currentData[currentIndex]?.time?.split('T')[0]
  if (!currentDate) {
    return Math.min(Math.floor(newData.length * 0.2), Math.max(0, newData.length - 1))
  }

  // Try to find the exact date in new data
  const exactMatch = newData.findIndex(d => d.time?.split('T')[0] === currentDate)
  if (exactMatch !== -1) {
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
    return closestIndex
  }

  // Last resort: use same absolute index if within bounds
  const sameIndex = Math.min(currentIndex, newData.length - 1)
  return sameIndex
}

// Validate that a string is a valid playground interval
function isValidInterval(value: string): value is PlaygroundInterval {
  return (PLAYGROUND_INTERVALS as readonly string[]).includes(value)
}

export function usePlaygroundData(
  initialTicker?: string,
  initialEndDate?: string,
  navigateFn?: (options: { to: string; search?: Record<string, string> }) => void,
  initialSecondaryTicker?: string,
  initialInterval?: string,
  onIntervalInit?: (interval: string) => void,
  initialLimit?: string,
) {
  const { getTickers, tickerGroups } = useAPI()

  // Ref to track if initialization has already happened
  const hasInitialized = React.useRef(false)
  // Get initial value from localStorage
  const initialShowSecondaryChart = typeof window !== 'undefined'
    ? localStorage.getItem(SECONDARY_CHART_VISIBLE_KEY) === 'true'
    : false

  // Resolve initial interval
  const resolvedInterval: PlaygroundInterval = isValidInterval(initialInterval || '')
    ? initialInterval as PlaygroundInterval
    : '1D'

  // Resolve initial limit
  const resolvedLimit: PlaygroundLimit = isValidLimit(initialLimit)
    ? Number(initialLimit) as PlaygroundLimit
    : DEFAULT_PLAYGROUND_LIMIT

  const [playgroundData, setPlaygroundData] = useState<PlaygroundData>({
    ticker: '',
    allData: [],
    currentIndex: 0,
    endDate: '',
    interval: resolvedInterval,
    limit: resolvedLimit,
    isLoading: true,
    secondaryTicker: initialSecondaryTicker || 'VNINDEX',
    secondaryAllData: undefined,
    secondaryIsLoading: false,
    secondaryError: undefined,
    showSecondaryChart: initialShowSecondaryChart,
  })

  // Helper to build search params with current state
  const buildSearchParams = useCallback((
    ticker: string,
    endDate: string,
    interval: PlaygroundInterval,
    limit: PlaygroundLimit,
  ): Record<string, string> => ({
    ticker,
    endDate,
    interval,
    limit: String(limit),
  }), [])

  // Fetch initial data
  const fetchInitialData = useCallback(async (smartRandom?: boolean) => {
    setPlaygroundData(prev => ({ ...prev, isLoading: true, error: undefined }))

    try {
      const currentInterval = playgroundData.interval
      const currentLimit = playgroundData.limit

      // Use provided values or generate random ones
      // If initial values were provided, use them. Otherwise, generate random ones.
      const useInitial = initialTicker && initialEndDate
      let endDate: string
      let ticker: string

      if (useInitial) {
        // Shared URL params — use them directly
        endDate = initialEndDate
        ticker = initialTicker
      } else if (smartRandom) {
        // Smart random: generate viewDate first, pick ticker by activity at that date,
        // then derive endDate so viewDate lands at ~20% into the data window
        const viewDate = generateRandomDate(currentInterval)
        ticker = await getTopTickersByValue(getTickers, viewDate, tickerGroups)
        endDate = deriveEndDate(viewDate, currentInterval, currentLimit)
      } else {
        // Plain random: generate endDate and pick any ticker
        endDate = generateRandomDate(currentInterval)
        ticker = getRandomTicker(tickerGroups)
      }

      // Fetch both primary and secondary tickers in parallel if secondary ticker is set
      const promises = [
        getTickers('Playground.initialLoad.primary', {
          symbol: ticker,
          end_date: endDate,
          limit: currentLimit,
          mode: 'vn',
          interval: currentInterval,
        })
      ]

      const secondaryTicker = initialSecondaryTicker || 'VNINDEX'
      promises.push(
        getTickers('Playground.initialLoad.secondary', {
          symbol: secondaryTicker,
          end_date: endDate,
          limit: currentLimit,
          mode: 'vn',
          interval: currentInterval,
        })
      )

      const results = await Promise.allSettled(promises)

      // Process primary ticker result
      const primaryResult = results[0]
      let primaryData: StockData[] = []
      let primaryError: string | undefined

      if (primaryResult.status === 'fulfilled') {
        const response = primaryResult.value
        primaryData = response[ticker] || []
      } else {
        primaryError = primaryResult.reason?.message || 'Failed to fetch primary ticker'
      }

      // Process secondary ticker result
      const secondaryResult = results[1]
      let secondaryData: StockData[] = []
      let secondaryError: string | undefined

      if (secondaryResult.status === 'fulfilled') {
        const response = secondaryResult.value
        secondaryData = response[secondaryTicker] || []
      } else {
        secondaryError = secondaryResult.reason?.message || 'Failed to fetch secondary ticker'
      }

      // Start at ~20% of data window
      const startIndex = Math.min(Math.floor(primaryData.length * 0.2), Math.max(0, primaryData.length - 1))

      setPlaygroundData({
        ticker,
        allData: primaryData,
        currentIndex: startIndex,
        endDate,
        interval: currentInterval,
        limit: currentLimit,
        isLoading: false,
        error: primaryError,
        secondaryTicker,
        secondaryAllData: secondaryData,
        secondaryIsLoading: false,
        secondaryError,
        showSecondaryChart: typeof window !== 'undefined'
          ? localStorage.getItem(SECONDARY_CHART_VISIBLE_KEY) === 'true'
          : false,
      })

      // Update URL if we have navigate function and this wasn't from initial URL params
      if (navigateFn && !useInitial) {
        navigateFn({
          to: '/backtesting',
          search: buildSearchParams(ticker, endDate, currentInterval, currentLimit),
        })
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load playground data'
      setPlaygroundData(prev => ({
        ...prev,
        isLoading: false,
        error: errorMessage,
      }))
    }
  }, [getTickers, tickerGroups, navigateFn, initialTicker, initialEndDate, initialSecondaryTicker, playgroundData.interval, playgroundData.limit, buildSearchParams])

  // Randomize data with new ticker and date
  const randomizeData = useCallback(async (smartRandom?: boolean) => {
    setPlaygroundData(prev => ({ ...prev, isLoading: true, error: undefined }))

    try {
      const currentInterval = playgroundData.interval
      const currentLimit = playgroundData.limit

      let endDate: string
      let ticker: string

      if (smartRandom) {
        // Smart random: generate viewDate first, pick ticker by activity at that date,
        // then derive endDate so viewDate lands at ~20% into the data window
        const viewDate = generateRandomDate(currentInterval)
        ticker = await getTopTickersByValue(getTickers, viewDate, tickerGroups)
        endDate = deriveEndDate(viewDate, currentInterval, currentLimit)
      } else {
        // Plain random
        endDate = generateRandomDate(currentInterval)
        ticker = getRandomTicker(tickerGroups)
      }

      // Fetch with current interval and limit
      const response = await getTickers('Playground.randomize', {
        symbol: ticker,
        end_date: endDate,
        limit: currentLimit,
        mode: 'vn',
        interval: currentInterval,
      })

      const data = response[ticker] || []

      // Start at ~20% of data window
      const startIndex = Math.min(Math.floor(data.length * 0.2), Math.max(0, data.length - 1))

      setPlaygroundData(prev => ({
        ticker,
        allData: data,
        currentIndex: startIndex,
        endDate,
        interval: prev.interval,
        limit: prev.limit,
        isLoading: false,
        secondaryTicker: prev.secondaryTicker,
        secondaryAllData: prev.secondaryAllData,
        secondaryIsLoading: prev.secondaryIsLoading,
        secondaryError: prev.secondaryError,
        showSecondaryChart: prev.showSecondaryChart,
      }))

      // Update URL with new random values
      if (navigateFn) {
        navigateFn({
          to: '/backtesting',
          search: buildSearchParams(ticker, endDate, playgroundData.interval, playgroundData.limit),
        })
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to randomize playground data'
      setPlaygroundData(prev => ({
        ...prev,
        isLoading: false,
        error: errorMessage,
      }))
    }
  }, [getTickers, tickerGroups, navigateFn, playgroundData.interval, playgroundData.limit, buildSearchParams])

  // Fetch data on mount (only once)
  useEffect(() => {
    if (!hasInitialized.current) {
      hasInitialized.current = true
      // Sync the resolved interval to global ChartSettings (handles URL param case)
      if (onIntervalInit) {
        onIntervalInit(resolvedInterval)
      }
      // Read smart random preference from localStorage (defaults to true)
      const stored = localStorage.getItem(SMART_RANDOM_KEY)
      const useSmartRandom = stored === null ? true : stored === 'true'
      fetchInitialData(useSmartRandom)
    }
  }, [onIntervalInit]) // Run only once on mount

  // Navigate to new index
  const setCurrentIndex = useCallback((newIndex: number) => {
    setPlaygroundData(prev => {
      const clampedIndex = Math.max(0, Math.min(prev.allData.length - 1, newIndex))
      return { ...prev, currentIndex: clampedIndex }
    })
  }, [])

  // Get visible data based on current index
  const visibleData = useMemo(() => {
    if (!playgroundData.allData.length) return []

    // Show data from index 0 to currentIndex (cumulative view)
    const visible = playgroundData.allData.slice(0, playgroundData.currentIndex + 1)

    return visible
  }, [playgroundData.allData, playgroundData.currentIndex])


  // Watch for URL param changes (e.g., when user manually changes URL in browser)
  useEffect(() => {
    // Only react to URL changes if they differ from current state
    const urlTicker = initialTicker || undefined
    const urlEndDate = initialEndDate || undefined
    const urlLimit = isValidLimit(initialLimit) ? Number(initialLimit) as PlaygroundLimit : undefined

    // Skip if URL params are empty (not provided) or match current state
    if ((!urlTicker && !urlEndDate && !urlLimit) ||
        (urlTicker === playgroundData.ticker && urlEndDate === playgroundData.endDate && urlLimit === playgroundData.limit)) {
      return
    }

    // If only limit changed, handle it directly (updateLimit not yet defined here)
    if (urlLimit && urlLimit !== playgroundData.limit && urlTicker === playgroundData.ticker && urlEndDate === playgroundData.endDate) {
      setPlaygroundData(prev => ({ ...prev, isLoading: true, error: undefined }))
      const handleLimitOnlyChange = async () => {
        try {
          const ticker = playgroundData.ticker || 'VNINDEX'
          const promises = [
            getTickers('Playground.urlLimitChange.primary', {
              symbol: ticker,
              end_date: playgroundData.endDate,
              limit: urlLimit,
              mode: 'vn',
              interval: playgroundData.interval,
            })
          ]
          if (playgroundData.secondaryTicker) {
            promises.push(
              getTickers('Playground.urlLimitChange.secondary', {
                symbol: playgroundData.secondaryTicker,
                end_date: playgroundData.endDate,
                limit: urlLimit,
                mode: 'vn',
                interval: playgroundData.interval,
              })
            )
          }
          const results = await Promise.allSettled(promises)
          const primaryResult = results[0]
          let primaryData: StockData[] = []
          let primaryError: string | undefined
          if (primaryResult.status === 'fulfilled') {
            const response = primaryResult.value
            primaryData = response[ticker] || []
          } else {
            primaryError = primaryResult.reason?.message || 'Failed to fetch data for new limit'
          }
          let secondaryData: StockData[] = playgroundData.secondaryAllData || []
          let secondaryError: string | undefined = playgroundData.secondaryError
          if (results.length > 1 && playgroundData.secondaryTicker) {
            const secondaryResult = results[1]
            if (secondaryResult.status === 'fulfilled') {
              const response = secondaryResult.value
              secondaryData = response[playgroundData.secondaryTicker!] || []
            } else {
              secondaryError = secondaryResult.reason?.message || 'Failed to fetch secondary data for new limit'
            }
          }
          const startIndex = Math.min(Math.floor(primaryData.length * 0.2), Math.max(0, primaryData.length - 1))
          setPlaygroundData(prev => ({
            ...prev,
            limit: urlLimit,
            allData: primaryData,
            currentIndex: startIndex,
            isLoading: false,
            error: primaryError,
            secondaryAllData: secondaryData,
            secondaryError,
          }))
          if (navigateFn) {
            navigateFn({
              to: '/backtesting',
              search: buildSearchParams(playgroundData.ticker, playgroundData.endDate, playgroundData.interval, urlLimit),
            })
          }
        } catch (err) {
          const errorMessage = err instanceof Error ? err.message : 'Failed to update limit'
          setPlaygroundData(prev => ({ ...prev, isLoading: false, error: errorMessage }))
        }
      }
      handleLimitOnlyChange()
      return
    }

    setPlaygroundData(prev => ({ ...prev, isLoading: true, error: undefined }))

    const fetchDataForParams = async (ticker: string, endDate: string, limit: PlaygroundLimit) => {
      try {
        const currentInterval = playgroundData.interval

        const response = await getTickers('Playground.urlChange', {
          symbol: ticker,
          end_date: endDate,
          limit,
          mode: 'vn',
          interval: currentInterval,
        })

        const data = response[ticker] || []

        // Start at ~20% of data window
        const startIndex = Math.min(Math.floor(data.length * 0.2), Math.max(0, data.length - 1))

        setPlaygroundData(prev => ({
          ticker,
          allData: data,
          currentIndex: startIndex,
          endDate,
          interval: prev.interval,
          limit,
          isLoading: false,
          secondaryTicker: prev.secondaryTicker,
          secondaryAllData: prev.secondaryAllData,
          secondaryIsLoading: prev.secondaryIsLoading,
          secondaryError: prev.secondaryError,
          showSecondaryChart: prev.showSecondaryChart,
        }))
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to load data from URL params'
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
    const limitToUse = urlLimit || playgroundData.limit

    fetchDataForParams(tickerToLoad, endDateToUse, limitToUse)
  }, [initialTicker, initialEndDate, initialLimit, playgroundData.ticker, playgroundData.endDate, playgroundData.limit, playgroundData.interval, getTickers])

  // Navigation helpers
  const navigateDate = useCallback((direction: 'back5' | 'back1' | 'next1' | 'next5') => {
    const prevIndex = playgroundData.currentIndex
    let newIndex: number

    switch (direction) {
      case 'back5':
        newIndex = Math.max(0, prevIndex - 5)
        break
      case 'back1':
        newIndex = Math.max(0, prevIndex - 1)
        break
      case 'next1':
        newIndex = Math.min(playgroundData.allData.length - 1, prevIndex + 1)
        break
      case 'next5':
        newIndex = Math.min(playgroundData.allData.length - 1, prevIndex + 5)
        break
      default:
        newIndex = prevIndex
    }

    setCurrentIndex(newIndex)
  }, [playgroundData.currentIndex, playgroundData.allData.length, setCurrentIndex])

  // Manual ticker change method
  const updateTicker = useCallback(async (newTicker: string) => {
    setPlaygroundData(prev => ({ ...prev, isLoading: true, error: undefined }))

    try {
      const currentInterval = playgroundData.interval
      const currentLimit = playgroundData.limit

      const response = await getTickers('Playground.updateTicker', {
        symbol: newTicker,
        end_date: playgroundData.endDate,
        limit: currentLimit,
        mode: 'vn',
        interval: currentInterval,
      })

      const data = response[newTicker] || []

      // Start at ~20% of data window
      const startIndex = Math.min(Math.floor(data.length * 0.2), Math.max(0, data.length - 1))

      setPlaygroundData(prev => ({
        ticker: newTicker,
        allData: data,
        currentIndex: startIndex,
        endDate: prev.endDate,
        interval: prev.interval,
        limit: prev.limit,
        isLoading: false,
        secondaryTicker: prev.secondaryTicker,
        secondaryAllData: prev.secondaryAllData,
        secondaryIsLoading: prev.secondaryIsLoading,
        secondaryError: prev.secondaryError,
        showSecondaryChart: prev.showSecondaryChart,
      }))

      // Update URL
      if (navigateFn) {
        navigateFn({
          to: '/backtesting',
          search: buildSearchParams(newTicker, playgroundData.endDate, playgroundData.interval, playgroundData.limit),
        })
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update ticker'
      setPlaygroundData(prev => ({
        ...prev,
        isLoading: false,
        error: errorMessage,
      }))
    }
  }, [getTickers, playgroundData.endDate, playgroundData.interval, playgroundData.limit, navigateFn, buildSearchParams])

  // Manual date change method
  const updateEndDate = useCallback(async (newEndDate: string) => {
    // Set loading state first
    setPlaygroundData(prev => {
      const ticker = prev.ticker || initialTicker || 'VNINDEX'

      if (!ticker || ticker === '') {
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
      // Get the current state with the ticker we need to use
      const currentState = playgroundData
      const ticker = currentState.ticker || initialTicker || 'VNINDEX'
      const currentInterval = currentState.interval
      const currentLimit = currentState.limit

      // Fetch both primary and secondary tickers in parallel if secondary ticker exists
      const promises = [
        getTickers('Playground.updateDate.primary', {
          symbol: ticker,
          end_date: newEndDate,
          limit: currentLimit,
          mode: 'vn',
          interval: currentInterval,
        })
      ]

      if (currentState.secondaryTicker) {
        promises.push(
          getTickers('Playground.updateDate.secondary', {
            symbol: currentState.secondaryTicker,
            end_date: newEndDate,
            limit: currentLimit,
            mode: 'vn',
            interval: currentInterval,
          })
        )
      }

      const results = await Promise.allSettled(promises)

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
        } else {
          // Try to preserve position
          startIndex = findPreservedIndex(data, currentState.allData, currentState.currentIndex)
        }

        // Update state using functional form to ensure we preserve the ticker
        setPlaygroundData(prev => ({
          ...prev,
          ticker: ticker, // Explicitly set ticker to ensure it's preserved
          allData: data,
          currentIndex: startIndex,
          endDate: newEndDate,
          interval: prev.interval,
          limit: prev.limit,
          isLoading: false,
          secondaryTicker: prev.secondaryTicker,
          secondaryAllData: prev.secondaryAllData,
          secondaryIsLoading: prev.secondaryIsLoading,
          secondaryError: prev.secondaryError,
          showSecondaryChart: prev.showSecondaryChart,
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

          setPlaygroundData(prev => ({
            ...prev,
            secondaryAllData: data,
            secondaryIsLoading: false,
          }))
        } else {
          setPlaygroundData(prev => ({
            ...prev,
            secondaryIsLoading: false,
            secondaryError: secondaryResult.reason instanceof Error ? secondaryResult.reason.message : 'Failed to update secondary ticker',
          }))
        }
      }

      // Update URL (only primary ticker, endDate, interval, limit)
      if (navigateFn) {
        navigateFn({
          to: '/backtesting',
          search: buildSearchParams(ticker, newEndDate, playgroundData.interval, playgroundData.limit),
        })
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update end date'
      setPlaygroundData(prev => ({
        ...prev,
        isLoading: false,
        secondaryIsLoading: false,
        error: errorMessage,
      }))
    }
  }, [playgroundData, getTickers, navigateFn, initialTicker, buildSearchParams])

  // Update secondary ticker method
  const updateSecondaryTicker = useCallback(async (newSecondaryTicker: string) => {
    if (!playgroundData.endDate) {
      return
    }

    setPlaygroundData(prev => ({
      ...prev,
      secondaryTicker: newSecondaryTicker,
      secondaryIsLoading: true,
      secondaryError: undefined,
    }))

    try {
      const response = await getTickers('Playground.updateSecondaryTicker', {
        symbol: newSecondaryTicker,
        end_date: playgroundData.endDate,
        limit: playgroundData.limit,
        mode: 'vn',
        interval: playgroundData.interval,
      })

      const data = response[newSecondaryTicker] || []

      setPlaygroundData(prev => ({
        ...prev,
        secondaryAllData: data,
        secondaryIsLoading: false,
      }))
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update secondary ticker'
      setPlaygroundData(prev => ({
        ...prev,
        secondaryIsLoading: false,
        secondaryError: errorMessage,
      }))
    }
  }, [getTickers, playgroundData.endDate, playgroundData.interval])

  // Update interval method
  const updateInterval = useCallback(async (newInterval: PlaygroundInterval) => {
    if (newInterval === playgroundData.interval) return

    setPlaygroundData(prev => ({ ...prev, isLoading: true, error: undefined }))

    try {
      const currentState = playgroundData
      const ticker = currentState.ticker || 'VNINDEX'
      const currentLimit = currentState.limit

      // Fetch both primary and secondary in parallel
      const promises = [
        getTickers('Playground.updateInterval.primary', {
          symbol: ticker,
          end_date: currentState.endDate,
          limit: currentLimit,
          mode: 'vn',
          interval: newInterval,
        })
      ]

      if (currentState.secondaryTicker) {
        promises.push(
          getTickers('Playground.updateInterval.secondary', {
            symbol: currentState.secondaryTicker,
            end_date: currentState.endDate,
            limit: currentLimit,
            mode: 'vn',
            interval: newInterval,
          })
        )
      }

      const results = await Promise.allSettled(promises)

      // Process primary
      const primaryResult = results[0]
      let primaryData: StockData[] = []
      let primaryError: string | undefined

      if (primaryResult.status === 'fulfilled') {
        const response = primaryResult.value
        primaryData = response[ticker] || []
      } else {
        primaryError = primaryResult.reason?.message || 'Failed to fetch data for new interval'
      }

      // Process secondary
      let secondaryData: StockData[] = currentState.secondaryAllData || []
      let secondaryError: string | undefined = currentState.secondaryError

      if (results.length > 1 && currentState.secondaryTicker) {
        const secondaryResult = results[1]
        if (secondaryResult.status === 'fulfilled') {
          const response = secondaryResult.value
          secondaryData = response[currentState.secondaryTicker!] || []
        } else {
          secondaryError = secondaryResult.reason?.message || 'Failed to fetch secondary data for new interval'
        }
      }

      // Reset current index to ~20% of data window
      const startIndex = Math.min(Math.floor(primaryData.length * 0.2), Math.max(0, primaryData.length - 1))

      setPlaygroundData(prev => ({
        ...prev,
        interval: newInterval,
        allData: primaryData,
        currentIndex: startIndex,
        isLoading: false,
        error: primaryError,
        secondaryAllData: secondaryData,
        secondaryError,
      }))

      // Update URL with new interval
      if (navigateFn) {
        navigateFn({
          to: '/backtesting',
          search: buildSearchParams(ticker, currentState.endDate, newInterval, currentState.limit),
        })
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update interval'
      setPlaygroundData(prev => ({
        ...prev,
        isLoading: false,
        error: errorMessage,
      }))
    }
  }, [playgroundData, getTickers, navigateFn, buildSearchParams])

  // Update limit method
  const updateLimit = useCallback(async (newLimit: PlaygroundLimit) => {
    if (newLimit === playgroundData.limit) return

    setPlaygroundData(prev => ({ ...prev, isLoading: true, error: undefined }))

    try {
      const currentState = playgroundData
      const ticker = currentState.ticker || 'VNINDEX'

      // Fetch both primary and secondary in parallel
      const promises = [
        getTickers('Playground.updateLimit.primary', {
          symbol: ticker,
          end_date: currentState.endDate,
          limit: newLimit,
          mode: 'vn',
          interval: currentState.interval,
        })
      ]

      if (currentState.secondaryTicker) {
        promises.push(
          getTickers('Playground.updateLimit.secondary', {
            symbol: currentState.secondaryTicker,
            end_date: currentState.endDate,
            limit: newLimit,
            mode: 'vn',
            interval: currentState.interval,
          })
        )
      }

      const results = await Promise.allSettled(promises)

      // Process primary
      const primaryResult = results[0]
      let primaryData: StockData[] = []
      let primaryError: string | undefined

      if (primaryResult.status === 'fulfilled') {
        const response = primaryResult.value
        primaryData = response[ticker] || []
      } else {
        primaryError = primaryResult.reason?.message || 'Failed to fetch data for new limit'
      }

      // Process secondary
      let secondaryData: StockData[] = currentState.secondaryAllData || []
      let secondaryError: string | undefined = currentState.secondaryError

      if (results.length > 1 && currentState.secondaryTicker) {
        const secondaryResult = results[1]
        if (secondaryResult.status === 'fulfilled') {
          const response = secondaryResult.value
          secondaryData = response[currentState.secondaryTicker!] || []
        } else {
          secondaryError = secondaryResult.reason?.message || 'Failed to fetch secondary data for new limit'
        }
      }

      // Reset current index to ~20% of data window
      const startIndex = Math.min(Math.floor(primaryData.length * 0.2), Math.max(0, primaryData.length - 1))

      setPlaygroundData(prev => ({
        ...prev,
        limit: newLimit,
        allData: primaryData,
        currentIndex: startIndex,
        isLoading: false,
        error: primaryError,
        secondaryAllData: secondaryData,
        secondaryError,
      }))

      // Update URL with new limit
      if (navigateFn) {
        navigateFn({
          to: '/backtesting',
          search: buildSearchParams(ticker, currentState.endDate, currentState.interval, newLimit),
        })
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update limit'
      setPlaygroundData(prev => ({
        ...prev,
        isLoading: false,
        error: errorMessage,
      }))
    }
  }, [playgroundData, getTickers, navigateFn, buildSearchParams])

  // Toggle secondary chart visibility
  const toggleSecondaryChart = useCallback(() => {
    setPlaygroundData(prev => {
      const newState = !prev.showSecondaryChart

      return {
        ...prev,
        showSecondaryChart: newState,
      }
    })
  }, [])

  // Set secondary chart visibility directly
  const setShowSecondaryChart = useCallback((visible: boolean) => {
    setPlaygroundData(prev => ({
      ...prev,
      showSecondaryChart: visible,
    }))
  }, [])

  // Align primary and secondary data to common date range
  useEffect(() => {
    if (playgroundData.allData?.length && playgroundData.secondaryAllData?.length) {
      // Get start and end dates from both arrays
      const primaryStartDate = playgroundData.allData[0]?.time?.split('T')[0]
      const primaryEndDate = playgroundData.allData[playgroundData.allData.length - 1]?.time?.split('T')[0]

      const secondaryStartDate = playgroundData.secondaryAllData[0]?.time?.split('T')[0]
      const secondaryEndDate = playgroundData.secondaryAllData[playgroundData.secondaryAllData.length - 1]?.time?.split('T')[0]

      // Use LATER start date and EARLIER end date (intersection)
      const commonStartDate = primaryStartDate > secondaryStartDate ? primaryStartDate : secondaryStartDate
      const commonEndDate = primaryEndDate < secondaryEndDate ? primaryEndDate : secondaryEndDate

      // Filter both arrays to common date range
      const alignedPrimary = playgroundData.allData.filter(item => {
        const itemDate = item.time?.split('T')[0]
        return itemDate && itemDate >= commonStartDate && itemDate <= commonEndDate
      })

      const alignedSecondary = playgroundData.secondaryAllData.filter(item => {
        const itemDate = item.time?.split('T')[0]
        return itemDate && itemDate >= commonStartDate && itemDate <= commonEndDate
      })

      // Update state with aligned data
      setPlaygroundData(prev => ({
        ...prev,
        allData: alignedPrimary,
        secondaryAllData: alignedSecondary,
        currentIndex: Math.min(prev.currentIndex, alignedPrimary.length - 1, alignedSecondary.length - 1)
      }))
    }
  }, [playgroundData.allData?.length, playgroundData.secondaryAllData?.length])

  // Get secondary visible data
  const secondaryVisibleData = useMemo(() => {
    if (!playgroundData.secondaryAllData?.length) return []

    // Show data from index 0 to currentIndex (cumulative view)
    const visible = playgroundData.secondaryAllData.slice(0, playgroundData.currentIndex + 1)

    return visible
  }, [playgroundData.secondaryAllData, playgroundData.currentIndex])

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
    updateInterval,
    updateLimit,
    updateSecondaryTicker,
    toggleSecondaryChart,
    setShowSecondaryChart,
  }
}
