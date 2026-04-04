import { useState, useCallback, useMemo, useEffect, useRef } from 'react'
import { useAPI } from '@/contexts/APIContext'
import { type StockData } from '@/lib/api-client'
import { isCryptoTicker } from '@/lib/ticker-utils'

// Intervals offered in the playground selector
export const PLAYGROUND_INTERVALS = ['1m', '5m', '15m', '1h', '4h', '1D', '1W', '2W', '1M'] as const
export type PlaygroundInterval = typeof PLAYGROUND_INTERVALS[number]

// Check if an interval is intraday (not daily or weekly)
export function isIntradayInterval(interval: string): boolean {
  return !['1D', '1W', '2W', '1M'].includes(interval)
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
    return Math.min(Math.floor(newData.length * 0.2), 100, Math.max(0, newData.length - 1))
  }

  const currentDate = currentData[currentIndex]?.time?.split('T')[0]
  if (!currentDate) {
    return Math.min(Math.floor(newData.length * 0.2), 100, Math.max(0, newData.length - 1))
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

// Fetch intent — describes what data to fetch and how to integrate it
interface FetchIntent {
  ticker: string
  endDate: string
  interval: PlaygroundInterval
  limit: PlaygroundLimit
  secondaryTicker?: string
  source: string
  preserveIndex?: boolean
  // Snapshot of current data at intent creation (for findPreservedIndex)
  _currentAllData?: StockData[]
  _currentIndex?: number
}

export function usePlaygroundData(
  initialTicker?: string,
  initialEndDate?: string,
  navigateFn?: (options: { to: string; search?: Record<string, string> }) => void,
  initialSecondaryTicker?: string,
  initialInterval?: string,
  onIntervalInit?: (interval: string) => void,
  initialLimit?: number,
) {
  const { getTickers, tickerGroups, tickers, cryptoTickers } = useAPI()

  const getMode = (symbol: string) =>
    isCryptoTicker(symbol, tickers, cryptoTickers) ? 'crypto' : 'vn'

  // Ref to track if initialization has already happened
  const hasInitialized = useRef(false)
  // Ref to track playgroundData for use in effects without adding to deps
  const playgroundDataRef = useRef<PlaygroundData>({} as PlaygroundData)
  // Ref to skip the URL→State sync after a State→URL navigation
  const skipNextUrlSync = useRef(false)

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
    ? initialLimit as PlaygroundLimit
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

  // Keep ref in sync
  playgroundDataRef.current = playgroundData

  // Fetch intent state — the centralized fetch effect watches this
  const [fetchIntent, setFetchIntent] = useState<FetchIntent | null>(null)

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

  // === Centralized fetch effect ===
  // Watches fetchIntent, fetches data, updates playgroundData
  useEffect(() => {
    if (!fetchIntent) return

    const { ticker, endDate, interval, limit, secondaryTicker, source, preserveIndex, _currentAllData, _currentIndex } = fetchIntent
    const controller = new AbortController()

    const fetchData = async () => {
      setPlaygroundData(prev => ({ ...prev, isLoading: true, error: undefined, secondaryIsLoading: !!secondaryTicker }))

      try {
        const promises = [
          getTickers(`${source}.primary`, {
            symbol: ticker,
            end_date: endDate,
            limit,
            mode: getMode(ticker),
            interval,
          })
        ]

        if (secondaryTicker) {
          promises.push(
            getTickers(`${source}.secondary`, {
              symbol: secondaryTicker,
              end_date: endDate,
              limit,
              mode: getMode(secondaryTicker),
              interval,
            })
          )
        }

        const results = await Promise.allSettled(promises)

        // Process primary
        const primaryResult = results[0]
        let primaryData: StockData[] = []
        let primaryError: string | undefined

        if (primaryResult.status === 'fulfilled') {
          primaryData = primaryResult.value[ticker] || []
        } else {
          primaryError = primaryResult.reason?.message || 'Failed to fetch data'
        }

        // Process secondary
        let secondaryData: StockData[] = playgroundDataRef.current.secondaryAllData || []
        let secondaryError: string | undefined = playgroundDataRef.current.secondaryError

        if (results.length > 1 && secondaryTicker) {
          const secondaryResult = results[1]
          if (secondaryResult.status === 'fulfilled') {
            secondaryData = secondaryResult.value[secondaryTicker] || []
          } else {
            secondaryError = secondaryResult.reason?.message || 'Failed to fetch secondary data'
          }
        }

        // Calculate start index
        let startIndex: number
        if (preserveIndex && _currentAllData?.length && primaryData.length) {
          startIndex = findPreservedIndex(primaryData, _currentAllData, _currentIndex ?? 0)
        } else {
          startIndex = Math.min(Math.floor(primaryData.length * 0.2), 100, Math.max(0, primaryData.length - 1))
        }

        // Clear intent BEFORE setting data to avoid stale-intent issues
        setFetchIntent(null)

        setPlaygroundData({
          ticker,
          allData: primaryData,
          currentIndex: startIndex,
          endDate,
          interval,
          limit,
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

        // Mark that we wrote state so URL→State sync should skip
        skipNextUrlSync.current = true
      } catch (err) {
        setFetchIntent(null)
        const errorMessage = err instanceof Error ? err.message : 'Failed to fetch data'
        setPlaygroundData(prev => ({
          ...prev,
          isLoading: false,
          secondaryIsLoading: false,
          error: errorMessage,
        }))
      }
    }

    fetchData()

    return () => controller.abort()
  }, [fetchIntent, getTickers])

  // === State → URL sync effect ===
  // Watches playgroundData URL-relevant fields, updates URL one-way
  useEffect(() => {
    if (!navigateFn || !playgroundData.ticker || !playgroundData.endDate) return
    skipNextUrlSync.current = true
    navigateFn({
      to: '/backtesting',
      search: buildSearchParams(playgroundData.ticker, playgroundData.endDate, playgroundData.interval, playgroundData.limit),
    })
  }, [playgroundData.ticker, playgroundData.endDate, playgroundData.interval, playgroundData.limit, navigateFn, buildSearchParams])

  // === URL → State sync effect ===
  // Watches initial* URL params, updates state if they differ (skips when skipNextUrlSync is set)
  useEffect(() => {
    if (skipNextUrlSync.current) {
      skipNextUrlSync.current = false
      return
    }

    const urlTicker = initialTicker || undefined
    const urlEndDate = initialEndDate || undefined
    const urlInterval = isValidInterval(initialInterval || '') ? initialInterval as PlaygroundInterval : undefined
    const urlLimit = isValidLimit(initialLimit) ? initialLimit as PlaygroundLimit : undefined

    const current = playgroundDataRef.current

    // Skip if no URL params or all match current state
    if (!urlTicker && !urlEndDate && !urlInterval && !urlLimit) return
    if (
      urlTicker === current.ticker &&
      urlEndDate === current.endDate &&
      urlInterval === current.interval &&
      urlLimit === current.limit
    ) return

    // Only fire fetch intent if we have a ticker (skip if data hasn't loaded yet)
    const ticker = urlTicker || current.ticker
    const endDate = urlEndDate || current.endDate
    const interval = urlInterval || current.interval
    const limit = urlLimit || current.limit

    if (!ticker || !endDate) return

    setPlaygroundData(prev => ({ ...prev, ticker, endDate, interval, limit, isLoading: true, error: undefined }))

    setFetchIntent({
      ticker,
      endDate,
      interval,
      limit,
      secondaryTicker: current.secondaryTicker,
      source: 'Playground.urlChange',
    })
  }, [initialTicker, initialEndDate, initialInterval, initialLimit])

  // === Initialization ===
  // Fire initial fetch once on mount
  useEffect(() => {
    if (!hasInitialized.current) {
      hasInitialized.current = true
      if (onIntervalInit) {
        onIntervalInit(resolvedInterval)
      }
      const stored = localStorage.getItem(SMART_RANDOM_KEY)
      const useSmartRandom = stored === null ? true : stored === 'true'

      const doInit = async () => {
        let ticker: string
        let endDate: string
        const useInitial = initialTicker && initialEndDate

        if (useInitial) {
          endDate = initialEndDate
          ticker = initialTicker
        } else if (useSmartRandom) {
          const viewDate = generateRandomDate(resolvedInterval)
          ticker = await getTopTickersByValue(getTickers, viewDate, tickerGroups)
          endDate = deriveEndDate(viewDate, resolvedInterval, resolvedLimit)
        } else {
          endDate = generateRandomDate(resolvedInterval)
          ticker = getRandomTicker(tickerGroups)
        }

        setFetchIntent({
          ticker,
          endDate,
          interval: resolvedInterval,
          limit: resolvedLimit,
          secondaryTicker: initialSecondaryTicker || 'VNINDEX',
          source: 'Playground.initialLoad',
        })
      }

      doInit()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // === Update functions ===

  // Randomize data with new ticker and/or date
  const randomizeData = useCallback(async (smartRandom?: boolean, randomTicker?: boolean) => {
    setPlaygroundData(prev => ({ ...prev, isLoading: true, error: undefined }))

    const currentInterval = playgroundDataRef.current.interval
    const currentLimit = playgroundDataRef.current.limit

    let ticker: string
    let endDate: string

    if (randomTicker === false) {
      // Date-only randomization: keep current ticker, randomize date
      ticker = playgroundDataRef.current.ticker
      endDate = generateRandomDate(currentInterval)
    } else if (smartRandom) {
      const viewDate = generateRandomDate(currentInterval)
      ticker = await getTopTickersByValue(getTickers, viewDate, tickerGroups)
      endDate = deriveEndDate(viewDate, currentInterval, currentLimit)
    } else {
      endDate = generateRandomDate(currentInterval)
      ticker = getRandomTicker(tickerGroups)
    }

    setPlaygroundData(prev => ({ ...prev, ticker, endDate, isLoading: true }))
    setFetchIntent({
      ticker,
      endDate,
      interval: currentInterval,
      limit: currentLimit,
      secondaryTicker: playgroundDataRef.current.secondaryTicker,
      source: 'Playground.randomize',
    })
  }, [getTickers, tickerGroups])

  // Manual ticker change
  const updateTicker = useCallback((newTicker: string) => {
    if (newTicker === playgroundDataRef.current.ticker) return

    setPlaygroundData(prev => ({ ...prev, ticker: newTicker, isLoading: true, error: undefined }))
    setFetchIntent({
      ticker: newTicker,
      endDate: playgroundDataRef.current.endDate,
      interval: playgroundDataRef.current.interval,
      limit: playgroundDataRef.current.limit,
      secondaryTicker: playgroundDataRef.current.secondaryTicker,
      source: 'Playground.updateTicker',
    })
  }, [])

  // Manual date change
  const updateEndDate = useCallback((newEndDate: string) => {
    const current = playgroundDataRef.current
    const ticker = current.ticker
    if (!ticker) return

    setPlaygroundData(prev => ({
      ...prev,
      endDate: newEndDate,
      isLoading: true,
      error: undefined,
      secondaryIsLoading: !!prev.secondaryTicker,
    }))

    setFetchIntent({
      ticker,
      endDate: newEndDate,
      interval: current.interval,
      limit: current.limit,
      secondaryTicker: current.secondaryTicker,
      source: 'Playground.updateDate',
      preserveIndex: true,
      _currentAllData: current.allData,
      _currentIndex: current.currentIndex,
    })
  }, [])

  // Update interval
  const updateInterval = useCallback((newInterval: PlaygroundInterval) => {
    if (newInterval === playgroundDataRef.current.interval) return

    setPlaygroundData(prev => ({ ...prev, interval: newInterval, isLoading: true, error: undefined }))
    setFetchIntent({
      ticker: playgroundDataRef.current.ticker || 'VNINDEX',
      endDate: playgroundDataRef.current.endDate,
      interval: newInterval,
      limit: playgroundDataRef.current.limit,
      secondaryTicker: playgroundDataRef.current.secondaryTicker,
      source: 'Playground.updateInterval',
    })
  }, [])

  // Update limit
  const updateLimit = useCallback((newLimit: PlaygroundLimit) => {
    if (newLimit === playgroundDataRef.current.limit) return

    setPlaygroundData(prev => ({ ...prev, limit: newLimit, isLoading: true, error: undefined }))
    setFetchIntent({
      ticker: playgroundDataRef.current.ticker || 'VNINDEX',
      endDate: playgroundDataRef.current.endDate,
      interval: playgroundDataRef.current.interval,
      limit: newLimit,
      secondaryTicker: playgroundDataRef.current.secondaryTicker,
      source: 'Playground.updateLimit',
    })
  }, [])

  // Update secondary ticker
  const updateSecondaryTicker = useCallback(async (newSecondaryTicker: string) => {
    if (!playgroundDataRef.current.endDate) return

    setPlaygroundData(prev => ({
      ...prev,
      secondaryTicker: newSecondaryTicker,
      secondaryIsLoading: true,
      secondaryError: undefined,
    }))

    try {
      const current = playgroundDataRef.current
      const response = await getTickers('Playground.updateSecondaryTicker', {
        symbol: newSecondaryTicker,
        end_date: current.endDate,
        limit: current.limit,
        mode: getMode(newSecondaryTicker),
        interval: current.interval,
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
  }, [getTickers])

  // Navigate to new index
  const setCurrentIndex = useCallback((newIndex: number) => {
    setPlaygroundData(prev => {
      const clampedIndex = Math.max(0, Math.min(prev.allData.length - 1, newIndex))
      return { ...prev, currentIndex: clampedIndex }
    })
  }, [])

  // Toggle secondary chart visibility
  const toggleSecondaryChart = useCallback(() => {
    setPlaygroundData(prev => ({
      ...prev,
      showSecondaryChart: !prev.showSecondaryChart,
    }))
  }, [])

  // Set secondary chart visibility directly
  const setShowSecondaryChart = useCallback((visible: boolean) => {
    setPlaygroundData(prev => ({
      ...prev,
      showSecondaryChart: visible,
    }))
  }, [])

  // Navigation helpers
  const navigateDate = useCallback((direction: 'back5' | 'back1' | 'next1' | 'next5') => {
    setPlaygroundData(prev => {
      const prevIndex = prev.currentIndex
      let newIndex: number

      switch (direction) {
        case 'back5':
          newIndex = Math.max(0, prevIndex - 5)
          break
        case 'back1':
          newIndex = Math.max(0, prevIndex - 1)
          break
        case 'next1':
          newIndex = Math.min(prev.allData.length - 1, prevIndex + 1)
          break
        case 'next5':
          newIndex = Math.min(prev.allData.length - 1, prevIndex + 5)
          break
        default:
          newIndex = prevIndex
      }

      if (newIndex === prevIndex) return prev
      return { ...prev, currentIndex: newIndex }
    })
  }, [])

  // Get visible data based on current index
  const visibleData = useMemo(() => {
    if (!playgroundData.allData.length) return []

    // Show data from index 0 to currentIndex (cumulative view)
    const visible = playgroundData.allData.slice(0, playgroundData.currentIndex + 1)

    return visible
  }, [playgroundData.allData, playgroundData.currentIndex])

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


  return {
    playgroundData,
    visibleData,
    secondaryVisibleData,
    setCurrentIndex,
    navigate: navigateDate,
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
