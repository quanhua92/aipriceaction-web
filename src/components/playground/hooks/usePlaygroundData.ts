import { useState, useCallback, useMemo, useEffect, useRef } from 'react'
import { useAPI } from '@/contexts/APIContext'
import { type StockData } from '@/lib/api-client'
import { getTickerMode } from '@/lib/ticker-utils'
import { SafeLocalStorage } from '@/lib/localStorage'

// Intervals offered in the playground selector
export const PLAYGROUND_INTERVALS = ['1m', '5m', '15m', '1h', '4h', '1D', '1W', '2W', '1M'] as const
export type PlaygroundInterval = typeof PLAYGROUND_INTERVALS[number]

// All intervals are native — lazy-fetched on first use and cached in nativeData
// 1D is always available as the backbone; 1h + 1W are pre-fetched in Phase 2
// Everything else lazy-loads on first interval switch
export const NATIVE_INTERVALS: PlaygroundInterval[] = [...PLAYGROUND_INTERVALS]

export function isNativeInterval(interval: string): boolean {
  return (NATIVE_INTERVALS as readonly string[]).includes(interval)
}

// Map a day-level date to an index in a native interval's bar array
function findNativeIndex(nativeBars: StockData[], interval: PlaygroundInterval, currentDate: string): number {
  if (!currentDate || !nativeBars.length) return 0

  if (['1W', '2W', '1M'].includes(interval)) {
    // Week/month bars: find the bar whose date is <= currentDate (iterate from end)
    for (let i = nativeBars.length - 1; i >= 0; i--) {
      if (nativeBars[i].time.split('T')[0] <= currentDate) return i
    }
    return 0
  }

  // Intraday intervals (1m, 5m, 15m, 30m, 1h, 4h): find first bar matching the date
  const idx = nativeBars.findIndex(bar => bar.time.split('T')[0] === currentDate)
  return idx !== -1 ? idx : 0
}

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
  allData: StockData[]    // 1D bars for native intervals (backbone); interval-specific bars for non-native
  currentIndex: number    // Current position within allData (day level)
  endDate: string        // End date of the data window
  interval: PlaygroundInterval  // Current interval
  limit: PlaygroundLimit      // Number of bars to fetch
  isLoading: boolean
  error?: string

  // Native multi-timeframe support
  nativeData: Partial<Record<PlaygroundInterval, StockData[]>>
  nativeSecondaryData: Partial<Record<PlaygroundInterval, StockData[]>>
  currentNativeIndex: number    // Index into nativeData[interval] for non-1D native intervals
  nativeDataLoading: boolean    // True while Phase 2 (1W + 1H) is fetching

  // Secondary ticker support
  secondaryTicker?: string
  secondaryAllData?: StockData[]
  secondaryIsLoading?: boolean
  secondaryError?: string
  showSecondaryChart?: boolean
}

// Generate random date between 2016-01-01 and maxDate (default: today), weighted towards recent years.
// For intraday intervals, restrict to 2023+ since intraday data only available from then.
const generateRandomDate = (interval?: string, maxDate?: Date): string => {
  const start = isIntradayInterval(interval || '1D')
    ? new Date('2023-01-01')
    : new Date('2016-01-01')
  const end = maxDate || new Date()

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
  d.setDate(d.getDate() + getCalDays(interval, limit))
  return d.toISOString().split('T')[0]
}

const getCalDays = (interval?: string, limit: PlaygroundLimit = DEFAULT_PLAYGROUND_LIMIT): number => {
  const tradingBars = limit * 0.8
  return isIntradayInterval(interval || '1D')
    ? Math.ceil(tradingBars * 0.18)
    : Math.ceil(tradingBars * 1.45)
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
  // Multi-phase fetch support
  fetchPhase?: 'primary' | 'native'
  _derivedStartDate?: string // Used by Phase 2 to know the date range
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
  const { getTickers, tickerGroups, tickers, cryptoTickers, globalTickers, ema } = useAPI()

  const getMode = (symbol: string) =>
    getTickerMode(symbol, tickers, globalTickers, cryptoTickers)

  // Ref to track if initialization has already happened
  const hasInitialized = useRef(false)
  // Ref to track playgroundData for use in effects without adding to deps
  const playgroundDataRef = useRef<PlaygroundData>({} as PlaygroundData)
  // Ref to skip the URL→State sync after a State→URL navigation
  const skipNextUrlSync = useRef(false)
  // Track whether the initial interval was non-1D (for auto-switch after Phase 2)
  const pendingInitialInterval = useRef<PlaygroundInterval | null>(null)

  // Get initial value from localStorage
  const initialShowSecondaryChart = SafeLocalStorage.getItem(SECONDARY_CHART_VISIBLE_KEY) === 'true'

  // Resolve initial interval
  const resolvedInterval: PlaygroundInterval = isValidInterval(initialInterval || '')
    ? initialInterval as PlaygroundInterval
    : '1D'

  // If initial interval is a native non-1D, remember it for auto-switch after Phase 2
  if (resolvedInterval !== '1D' && isNativeInterval(resolvedInterval)) {
    pendingInitialInterval.current = resolvedInterval
  }

  // Resolve initial limit
  const resolvedLimit: PlaygroundLimit = isValidLimit(initialLimit)
    ? initialLimit as PlaygroundLimit
    : DEFAULT_PLAYGROUND_LIMIT

  const [playgroundData, setPlaygroundData] = useState<PlaygroundData>({
    ticker: '',
    allData: [],
    currentIndex: 0,
    currentNativeIndex: 0,
    endDate: '',
    interval: resolvedInterval,
    limit: resolvedLimit,
    isLoading: true,
    nativeData: {},
    nativeSecondaryData: {},
    nativeDataLoading: false,
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
  // Supports two phases: 'primary' (1D backbone) and 'native' (1H + 1W background fetch)
  useEffect(() => {
    if (!fetchIntent) return

    const { ticker, endDate, interval, limit, secondaryTicker, source, preserveIndex, _currentAllData, _currentIndex, fetchPhase, _derivedStartDate } = fetchIntent
    const controller = new AbortController()

    // === Phase 1: Primary fetch (1D backbone for native intervals, or any interval for non-native) ===
    if (!fetchPhase || fetchPhase === 'primary') {
      const fetchData = async () => {
        // For native intervals, always fetch 1D as the backbone
        const fetchInterval = isNativeInterval(interval) ? '1D' as PlaygroundInterval : interval

        setPlaygroundData(prev => ({ ...prev, isLoading: true, error: undefined, secondaryIsLoading: !!secondaryTicker }))

        try {
          const promises = [
            getTickers(`${source}.primary`, {
              symbol: ticker,
              end_date: endDate,
              limit,
              mode: getMode(ticker),
              interval: fetchInterval,
              ema: ema || undefined,
            })
          ]

          if (secondaryTicker) {
            promises.push(
              getTickers(`${source}.secondary`, {
                symbol: secondaryTicker,
                end_date: endDate,
                limit,
                mode: getMode(secondaryTicker),
                interval: fetchInterval,
                ema: ema || undefined,
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

          // Derive start date from primary data for Phase 2
          const startDate = primaryData[0]?.time?.split('T')[0] || ''

          // Clear intent BEFORE setting data to avoid stale-intent issues
          setFetchIntent(null)

          // For native intervals, set the interval to '1D' initially (backbone)
          // For non-native intervals, keep the requested interval
          const displayInterval = isNativeInterval(interval) ? '1D' as PlaygroundInterval : interval

          setPlaygroundData({
            ticker,
            allData: primaryData,
            currentIndex: startIndex,
            currentNativeIndex: 0,
            endDate,
            interval: displayInterval,
            limit,
            isLoading: false,
            nativeData: isNativeInterval(interval) ? { '1D': primaryData } : {},
            nativeSecondaryData: {},
            nativeDataLoading: false,
            error: primaryError,
            secondaryTicker,
            secondaryAllData: secondaryData,
            secondaryIsLoading: false,
            secondaryError,
            showSecondaryChart: SafeLocalStorage.getItem(SECONDARY_CHART_VISIBLE_KEY) === 'true',
          })

          // Mark that we wrote state so URL→State sync should skip
          skipNextUrlSync.current = true

          // Trigger Phase 2 if this is a native interval fetch
          if (isNativeInterval(interval) && startDate) {
            setFetchIntent({
              ticker,
              endDate,
              interval: '1D', // Not used by Phase 2, but required by interface
              limit,
              secondaryTicker,
              source: `${source}.native`,
              fetchPhase: 'native',
              _derivedStartDate: startDate,
            })
          }
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
    }

    // === Phase 2: Native fetch (1H + 1W for primary AND secondary) ===
    if (fetchPhase === 'native' && _derivedStartDate) {
      const fetchNativeData = async () => {
        setPlaygroundData(prev => ({ ...prev, nativeDataLoading: true }))

        try {
          // Fetch 1H and 1W for primary and secondary in parallel
          const promises: Promise<Record<string, StockData[]>>[] = [
            getTickers(`${source}.1h.primary`, {
              symbol: ticker,
              interval: '1h',
              start_date: _derivedStartDate,
              end_date: endDate,
              mode: getMode(ticker),
              ema: ema || undefined,
            }),
            getTickers(`${source}.1W.primary`, {
              symbol: ticker,
              interval: '1W',
              start_date: _derivedStartDate,
              end_date: endDate,
              mode: getMode(ticker),
              ema: ema || undefined,
            }),
          ]

          if (secondaryTicker) {
            promises.push(
              getTickers(`${source}.1h.secondary`, {
                symbol: secondaryTicker,
                interval: '1h',
                start_date: _derivedStartDate,
                end_date: endDate,
                mode: getMode(secondaryTicker),
                ema: ema || undefined,
              }),
              getTickers(`${source}.1W.secondary`, {
                symbol: secondaryTicker,
                interval: '1W',
                start_date: _derivedStartDate,
                end_date: endDate,
                mode: getMode(secondaryTicker),
                ema: ema || undefined,
              })
            )
          }

          const results = await Promise.allSettled(promises)

          // Process primary 1H
          const primary1h = results[0].status === 'fulfilled' ? results[0].value[ticker] || [] : []
          // Process primary 1W
          const primary1W = results[1].status === 'fulfilled' ? results[1].value[ticker] || [] : []

          let secondary1h: StockData[] = []
          let secondary1W: StockData[] = []

          if (results.length > 2 && secondaryTicker) {
            secondary1h = results[2].status === 'fulfilled' ? results[2].value[secondaryTicker] || [] : []
            secondary1W = results[3].status === 'fulfilled' ? results[3].value[secondaryTicker] || [] : []
          }

          // Clear intent
          setFetchIntent(null)

          // Get existing 1D data from nativeData
          const existingNativeData = playgroundDataRef.current.nativeData
          const existingNativeSecondaryData = playgroundDataRef.current.nativeSecondaryData

          setPlaygroundData(prev => ({
            ...prev,
            nativeDataLoading: false,
            nativeData: {
              ...existingNativeData,
              '1h': primary1h,
              '1W': primary1W,
            },
            nativeSecondaryData: {
              ...existingNativeSecondaryData,
              '1h': secondary1h,
              '1W': secondary1W,
            },
          }))

          // Auto-switch to initial interval if it was non-1D native
          const pending = pendingInitialInterval.current
          if (pending && (pending === '1h' ? primary1h.length > 0 : pending === '1W' ? primary1W.length > 0 : false)) {
            pendingInitialInterval.current = null
            // Use setTimeout to ensure state is updated before switching
            setTimeout(() => {
              // updateInterval will be defined below — use the ref pattern
              // We'll trigger it via setPlaygroundData directly
              setPlaygroundData(prev => {
                const nativeBars = prev.nativeData[pending]
                if (!nativeBars?.length) return prev
                const currentDate = prev.allData[prev.currentIndex]?.time?.split('T')[0] || ''
                let targetIndex = 0
                if (pending === '1h') {
                  targetIndex = nativeBars.findIndex(bar => bar.time.split('T')[0] === currentDate)
                } else if (pending === '1W') {
                  // findLastIndex polyfill for ES2022
                  for (let i = nativeBars.length - 1; i >= 0; i--) {
                    if (nativeBars[i].time.split('T')[0] <= currentDate) { targetIndex = i; break }
                  }
                }
                return {
                  ...prev,
                  interval: pending,
                  currentNativeIndex: targetIndex !== -1 ? targetIndex : 0,
                }
              })
            }, 0)
          }
        } catch (err) {
          setFetchIntent(null)
          // Phase 2 failure is non-critical — 1D still works
          console.warn('[Playground] Phase 2 native fetch failed:', err)
          setPlaygroundData(prev => ({ ...prev, nativeDataLoading: false }))
        }
      }

      fetchNativeData()
      return () => controller.abort()
    }
  }, [fetchIntent, getTickers, ema])

  // === State → URL sync effect ===
  // Watches playgroundData URL-relevant fields, updates URL one-way
  // NOTE: interval is NOT synced to URL — always defaults to 1D on page load
  useEffect(() => {
    if (!navigateFn || !playgroundData.ticker || !playgroundData.endDate) return
    console.log(`[PG] URL sync: ticker=${playgroundData.ticker} endDate=${playgroundData.endDate} interval=${playgroundData.interval}`)
    skipNextUrlSync.current = true
    navigateFn({
      to: '/backtesting',
      search: buildSearchParams(playgroundData.ticker, playgroundData.endDate, '1D', playgroundData.limit),
    })
  }, [playgroundData.ticker, playgroundData.endDate, playgroundData.limit, navigateFn, buildSearchParams])

  // === URL → State sync effect ===
  // Watches initial* URL params, updates state if they differ (skips when skipNextUrlSync is set)
  // NOTE: interval is ignored from URL — always starts at 1D
  useEffect(() => {
    if (skipNextUrlSync.current) {
      skipNextUrlSync.current = false
      return
    }

    const urlTicker = initialTicker || undefined
    const urlEndDate = initialEndDate || undefined
    const urlLimit = isValidLimit(initialLimit) ? initialLimit as PlaygroundLimit : undefined

    const current = playgroundDataRef.current

    // Skip if no URL params or all match current state
    if (!urlTicker && !urlEndDate && !urlLimit) return
    if (
      urlTicker === current.ticker &&
      urlEndDate === current.endDate &&
      urlLimit === current.limit
    ) return

    console.log(`[PG] URL→State sync: ticker=${urlTicker} endDate=${urlEndDate} limit=${urlLimit}`)

    // Only fire fetch intent if we have a ticker (skip if data hasn't loaded yet)
    const ticker = urlTicker || current.ticker
    const endDate = urlEndDate || current.endDate
    const limit = urlLimit || current.limit

    if (!ticker || !endDate) return

    setPlaygroundData(prev => ({ ...prev, ticker, endDate, interval: '1D', limit, isLoading: true, error: undefined }))

    setFetchIntent({
      ticker,
      endDate,
      interval: '1D',
      limit,
      secondaryTicker: current.secondaryTicker,
      source: 'Playground.urlChange',
    })
  }, [initialTicker, initialEndDate, initialLimit])

  // === Initialization ===
  // Fire initial fetch once on mount
  useEffect(() => {
    if (!hasInitialized.current) {
      hasInitialized.current = true
      if (onIntervalInit) {
        onIntervalInit(resolvedInterval)
      }
      const stored = SafeLocalStorage.getItem(SMART_RANDOM_KEY)
      const useSmartRandom = stored === null ? true : stored === 'true'

      const doInit = async () => {
        let ticker: string
        let endDate: string
        const useInitial = initialTicker && initialEndDate

        if (useInitial) {
          endDate = initialEndDate
          ticker = initialTicker
        } else if (useSmartRandom) {
          const maxDate = new Date()
          maxDate.setDate(maxDate.getDate() - getCalDays(resolvedInterval, resolvedLimit))
          const viewDate = generateRandomDate(resolvedInterval, maxDate)
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

    const currentLimit = playgroundDataRef.current.limit

    let ticker: string
    let endDate: string

    if (randomTicker === false) {
      // Date-only randomization: keep current ticker, randomize date
      ticker = playgroundDataRef.current.ticker
      endDate = generateRandomDate('1D')
    } else if (smartRandom) {
      const maxDate = new Date()
      maxDate.setDate(maxDate.getDate() - getCalDays('1D', currentLimit))
      const viewDate = generateRandomDate('1D', maxDate)
      ticker = await getTopTickersByValue(getTickers, viewDate, tickerGroups)
      endDate = deriveEndDate(viewDate, '1D', currentLimit)
    } else {
      endDate = generateRandomDate('1D')
      ticker = getRandomTicker(tickerGroups)
    }

    setPlaygroundData(prev => ({ ...prev, ticker, endDate, isLoading: true }))
    setFetchIntent({
      ticker,
      endDate,
      interval: '1D', // Always start with 1D backbone
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

  // Update interval — all intervals are native (lazy-fetched on first use, instant after)
  const updateInterval = useCallback((newInterval: PlaygroundInterval) => {
    const t0 = performance.now()
    if (newInterval === playgroundDataRef.current.interval) return

    const current = playgroundDataRef.current
    console.log(`[PG] updateInterval(${newInterval}) from=${current.interval} hasNative=${!!current.nativeData[newInterval]?.length} nativeDataLoading=${current.nativeDataLoading}`)
    const hasNativeData = (iv: PlaygroundInterval) => !!current.nativeData[iv]?.length

    // Switching TO 1D
    if (newInterval === '1D') {
      if (current.interval !== '1D' && hasNativeData(current.interval)) {
        // Map native index → day index
        const nativeBars = current.nativeData[current.interval]!
        const currentBar = nativeBars[current.currentNativeIndex]
        if (currentBar) {
          const barDate = currentBar.time.split('T')[0]
          const dayIndex = current.allData.findIndex(bar => bar.time.split('T')[0] === barDate)
          setPlaygroundData(prev => ({
            ...prev,
            interval: '1D',
            currentIndex: dayIndex !== -1 ? dayIndex : prev.currentIndex,
          }))
        } else {
          setPlaygroundData(prev => ({ ...prev, interval: '1D' }))
        }
      } else {
        setPlaygroundData(prev => ({ ...prev, interval: '1D' }))
      }
      return
    }

    // Switching TO any non-1D interval
    if (!hasNativeData(newInterval)) {
      // Data not available yet — lazy fetch on demand
      if (current.nativeDataLoading) {
        setPlaygroundData(prev => ({ ...prev, interval: newInterval, isLoading: true }))
        return
      }
      console.log(`[PG] updateInterval(${newInterval}) → lazy fetch`)
      setPlaygroundData(prev => ({ ...prev, interval: newInterval, isLoading: true, error: undefined }))

      const ticker = current.ticker || 'VNINDEX'
      const endDate = current.endDate
      const startDate = current.allData[0]?.time?.split('T')[0] || ''

      const fetchLazy = async () => {
        try {
          const promises: Promise<Record<string, StockData[]>>[] = [
            getTickers(`Playground.lazyNative.${newInterval}.primary`, {
              symbol: ticker,
              interval: newInterval,
              start_date: startDate,
              end_date: endDate,
              mode: getMode(ticker),
              ema: ema || undefined,
            }),
          ]
          if (current.secondaryTicker) {
            promises.push(
              getTickers(`Playground.lazyNative.${newInterval}.secondary`, {
                symbol: current.secondaryTicker,
                interval: newInterval,
                start_date: startDate,
                end_date: endDate,
                mode: getMode(current.secondaryTicker),
                ema: ema || undefined,
              })
            )
          }
          const results = await Promise.allSettled(promises)
          const primaryData = results[0].status === 'fulfilled' ? results[0].value[ticker] || [] : []
          const secondaryData = results.length > 1 && current.secondaryTicker
            ? (results[1].status === 'fulfilled' ? results[1].value[current.secondaryTicker] || [] : [])
            : []

          if (!primaryData.length) {
            setPlaygroundData(prev => ({
              ...prev,
              isLoading: false,
              nativeData: { ...prev.nativeData, [newInterval]: [] },
            }))
            return
          }

          // Map current day → native index
          const currentDate = current.allData[current.currentIndex]?.time?.split('T')[0] || ''
          const targetIndex = findNativeIndex(primaryData, newInterval, currentDate)

          setPlaygroundData(prev => ({
            ...prev,
            isLoading: false,
            currentNativeIndex: targetIndex,
            nativeData: { ...prev.nativeData, [newInterval]: primaryData },
            nativeSecondaryData: { ...prev.nativeSecondaryData, [newInterval]: secondaryData },
          }))
          console.log(`[PG] updateInterval(${newInterval}) → lazy fetch done, ${primaryData.length} bars, nativeIndex=${targetIndex}`)
        } catch (err) {
          console.warn(`[Playground] Lazy native fetch failed for ${newInterval}:`, err)
          setPlaygroundData(prev => ({ ...prev, isLoading: false, error: `Failed to fetch ${newInterval} data` }))
        }
      }
      fetchLazy()
      return
    }

    // Data already cached — instant switch
    const currentDate = current.allData[current.currentIndex]?.time?.split('T')[0] || ''
    const nativeBars = current.nativeData[newInterval]!
    const nativeStart = nativeBars[0]?.time?.split('T')[0] || ''
    const nativeEnd = nativeBars[nativeBars.length - 1]?.time?.split('T')[0] || ''
    console.log(`[PG] updateInterval(${newInterval}) mapping: currentDate=${currentDate} dayIdx=${current.currentIndex} nativeBars=${nativeBars.length} nativeRange=[${nativeStart}..${nativeEnd}]`)
    const targetIndex = findNativeIndex(nativeBars, newInterval, currentDate)

    setPlaygroundData(prev => ({
      ...prev,
      interval: newInterval,
      currentNativeIndex: targetIndex,
    }))
    console.log(`[PG] updateInterval(${newInterval}) → instant switch in ${(performance.now() - t0).toFixed(1)}ms, nativeIndex=${targetIndex}`)
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
        interval: '1D', // Always fetch 1D backbone for secondary
        ema: ema || undefined,
      })

      const data = response[newSecondaryTicker] || []
      setPlaygroundData(prev => ({
        ...prev,
        secondaryAllData: data,
        secondaryIsLoading: false,
      }))

      // Also fetch native data for secondary if we have native data for primary
      const nativeIntervalsWithData = (Object.keys(current.nativeData) as PlaygroundInterval[]).filter(
        iv => current.nativeData[iv]?.length
      )
      if (nativeIntervalsWithData.length > 0) {
        const startDate = current.allData[0]?.time?.split('T')[0] || ''
        if (startDate) {
          const secResults = await Promise.allSettled(
            nativeIntervalsWithData.map(iv =>
              getTickers(`Playground.updateSecondaryTicker.${iv}`, {
                symbol: newSecondaryTicker,
                interval: iv,
                start_date: startDate,
                end_date: current.endDate,
                mode: getMode(newSecondaryTicker),
                ema: ema || undefined,
              })
            )
          )

          const secNativeData: Partial<Record<PlaygroundInterval, StockData[]>> = {}
          nativeIntervalsWithData.forEach((iv, i) => {
            secNativeData[iv] = secResults[i].status === 'fulfilled'
              ? secResults[i].value[newSecondaryTicker] || []
              : []
          })

          setPlaygroundData(prev => ({
            ...prev,
            nativeSecondaryData: secNativeData,
          }))
        }
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update secondary ticker'
      setPlaygroundData(prev => ({
        ...prev,
        secondaryIsLoading: false,
        secondaryError: errorMessage,
      }))
    }
  }, [getTickers])

  // Navigate to new index — updates both currentIndex and currentNativeIndex as needed
  const setCurrentIndex = useCallback((newIndex: number) => {
    setPlaygroundData(prev => {
      const clampedIndex = Math.max(0, Math.min(prev.allData.length - 1, newIndex))
      const newState: Partial<PlaygroundData> = { currentIndex: clampedIndex }

      // If in native non-1D mode, also update currentNativeIndex to match day
      if (prev.interval !== '1D' && prev.nativeData[prev.interval]) {
        const newDate = prev.allData[clampedIndex]?.time?.split('T')[0]
        const nativeBars = prev.nativeData[prev.interval]!
        const targetIndex = nativeBars.findIndex(bar => bar.time.split('T')[0] === newDate)
        newState.currentNativeIndex = targetIndex !== -1 ? targetIndex : 0
      }

      return { ...prev, ...newState }
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

  // Navigation helpers — handles 1D, native non-1D, and non-native intervals
  const navigateDate = useCallback((direction: 'back5' | 'back1' | 'next1' | 'next5') => {
    const t0 = performance.now()
    setPlaygroundData(prev => {
      const isNative = prev.interval !== '1D' && !!prev.nativeData[prev.interval]?.length

      if (!isNative) {
        // 1D and non-native interval navigation (existing behavior)
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
        console.log(`[PG] navigate(${direction}) 1D/non-native: idx=${prevIndex}→${newIndex}/${prev.allData.length - 1}`)
        return { ...prev, currentIndex: newIndex }
      }

      // Native non-1D navigation (1W, 1h)
      const nativeBars = prev.nativeData[prev.interval]!
      const maxIndex = nativeBars.length - 1
      let newNativeIndex = prev.currentNativeIndex

      const delta = direction === 'back5' ? -5 : direction === 'next5' ? 5
                    : direction === 'back1' ? -1 : 1
      newNativeIndex = Math.max(0, Math.min(maxIndex, newNativeIndex + delta))

      if (newNativeIndex === prev.currentNativeIndex) return prev

      // Also update currentIndex (day) for consistency
      const currentBar = nativeBars[newNativeIndex]
      const barDate = currentBar.time.split('T')[0]
      const dayIndex = prev.allData.findIndex(bar => bar.time.split('T')[0] === barDate)

      console.log(`[PG] navigate(${direction}) native: interval=${prev.interval} nativeIdx=${prev.currentNativeIndex}→${newNativeIndex}/${maxIndex} barDate=${barDate} dayIdx=${dayIndex}`)

      return {
        ...prev,
        currentNativeIndex: newNativeIndex,
        currentIndex: dayIndex !== -1 ? dayIndex : prev.currentIndex,
      }
    })
    console.log(`[PG] navigateDate(${direction}) done in ${(performance.now() - t0).toFixed(1)}ms`)
  }, [])

  // Get visible data based on current index and interval
  const visibleData = useMemo(() => {
    const t0 = performance.now()
    if (!playgroundData.allData.length) return []

    // 1D: cumulative view up to currentIndex (existing behavior)
    if (playgroundData.interval === '1D') {
      return playgroundData.allData.slice(0, playgroundData.currentIndex + 1)
    }

    // Native non-1D (1W, 1h): use nativeData
    const nativeBars = playgroundData.nativeData[playgroundData.interval]
    if (nativeBars?.length) {
      return nativeBars.slice(0, playgroundData.currentNativeIndex + 1)
    }

    // Fallback for non-native intervals (15m, etc.)
    const result = playgroundData.allData.slice(0, playgroundData.currentIndex + 1)
    console.log(`[PG] visibleData: interval=${playgroundData.interval} idx=${playgroundData.currentIndex} nativeIdx=${playgroundData.currentNativeIndex} len=${result.length} in ${(performance.now() - t0).toFixed(1)}ms`)
    return result
  }, [playgroundData.allData, playgroundData.nativeData, playgroundData.currentIndex, playgroundData.currentNativeIndex, playgroundData.interval])

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

    // 1D: cumulative view up to currentIndex
    if (playgroundData.interval === '1D') {
      return playgroundData.secondaryAllData.slice(0, playgroundData.currentIndex + 1)
    }

    // Native non-1D: use nativeSecondaryData
    const nativeBars = playgroundData.nativeSecondaryData?.[playgroundData.interval]
    if (nativeBars?.length) {
      return nativeBars.slice(0, playgroundData.currentNativeIndex + 1)
    }

    // Fallback for non-native intervals
    return playgroundData.secondaryAllData.slice(0, playgroundData.currentIndex + 1)
  }, [playgroundData.secondaryAllData, playgroundData.nativeSecondaryData, playgroundData.currentIndex, playgroundData.currentNativeIndex, playgroundData.interval])


  return {
    playgroundData,
    visibleData,
    secondaryVisibleData,
    currentNativeIndex: playgroundData.currentNativeIndex,
    setCurrentNativeIndex: useCallback((index: number) => {
      setPlaygroundData(prev => ({ ...prev, currentNativeIndex: index }))
    }, []),
    nativeDataLoading: playgroundData.nativeDataLoading,
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
