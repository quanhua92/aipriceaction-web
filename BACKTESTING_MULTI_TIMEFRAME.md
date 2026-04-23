# Backtesting Playground: Multi-Timeframe Support

## What is the Backtesting "Playground"?

The Playground (`/backtesting` route) is a stock market backtesting simulator for Vietnamese stocks. It allows users to:

- **Navigate through historical data** as if trading in real-time
- **Place virtual orders** (long/short) at specific points in time
- **Observe how strategies would have performed** by moving forward/backward through candles
- **Compare with a secondary ticker** (default: `VNINDEX`) side-by-side

### Current Architecture

```
backtesting.tsx (route)
└── PlaygroundDataProvider (context provider)
    ├── usePlaygroundData hook (core state + fetch logic)
    ├── usePlaygroundOrders hook (order management)
    └── Children:
        ├── PlaygroundInfoPanel    (ticker selector, interval, limit, date range, randomize)
        ├── PlaygroundControls    (slider, back/next buttons, date display)
        ├── PlaygroundChart       (TradingViewChart with overlay markers)
        ├── PlaygroundIntervalWatcher (warns when intraday data unavailable)
        └── PlaygroundOrderBook  (place orders, view PnL)
```

### Key State (`PlaygroundData` interface — `usePlaygroundData.ts:34-50`)

| Field | Type | Description |
|-------|------|-------------|
| `ticker` | `string` | Currently selected stock/index |
| `allData` | `StockData[]` | ALL fetched bars (the display data) |
| `currentIndex` | `number` | Current position within `allData` |
| `endDate` | `string` | End date of the data window |
| `interval` | `PlaygroundInterval` | Currently displayed interval |
| `limit` | `PlaygroundLimit` | Number of bars fetched (default: 500) |
| `isLoading` | `boolean` | Loading state |
| `error` | `string?` | Error message |
| `secondaryTicker` | `string?` | Secondary chart ticker |
| `secondaryAllData` | `StockData[]?` | Secondary ticker data |
| `showSecondaryChart` | `boolean` | Whether secondary chart is visible |

### How Data Fetching Works (`usePlaygroundData.ts:271-375`)

1. **`fetchIntent` state** triggers the centralized fetch effect (line 254)
2. Calls `getTickers()` with `symbol`, `end_date`, `limit`, `interval`, `mode` (lines 282-289)
3. Stores result in `allData` (line 344)
4. Sets `currentIndex` to ~20% of data length (line 336: `Math.min(Math.floor(primaryData.length * 0.2), 100, Math.max(0, primaryData.length - 1))`)
5. **`visibleData`** is derived (lines 678-685): `allData.slice(0, currentIndex + 1)` — cumulative view

### How Navigation Works (`usePlaygroundData.ts:649-675`)

`navigateDate(direction)` updates `currentIndex` (lines 650-675):
- `back1` → `currentIndex - 1` (line 660)
- `back5` → `currentIndex - 5` (line 657)
- `next1` → `currentIndex + 1` (line 663)
- `next5` → `currentIndex + 5` (line 666)

The slider (`PlaygroundControls.tsx:53-56`) also controls `currentIndex` directly via `setCurrentIndex`.

### How Interval Switching Works (Current)

**Only via `PlaygroundInfoPanel`** (`PlaygroundInfoPanel.tsx:238-242`):
```typescript
onValueChange={(value) => {
  updateInterval(newInterval)     // → refetches ALL data with new interval
  setGlobalInterval(newInterval)   // → syncs ChartSettingsContext
}}
```

**NOT via `ChartControlBar`** (in `TradingViewChart`): The `PlaygroundChart` does NOT pass `onIntervalChange` to `TradingViewChart` (`PlaygroundChart.tsx:206-225` — no `onIntervalChange` prop). Clicking 1H/15m in the chart's control bar only updates the **global** interval — not the playground data. This is a known gap.

### Supported Intervals (`usePlaygroundData.ts:8`)

```typescript
export const PLAYGROUND_INTERVALS = ['1m', '5m', '15m', '1h', '4h', '1D', '1W', '2W', '1M'] as const
```

All intervals are fetched as a single API call — switch to 15m and it re-fetches 500 bars of 15m data.

---

## The Problem

### 1. No Native Multi-Timeframe Support

When you switch from 1D to 1H:
- The entire dataset is re-fetched (wastes time/bandwidth)
- Navigation breaks: `currentIndex` = 10 in 1D (10 days) ≠ `currentIndex` = 10 in 1H (10 hours)
- The "current date" concept is lost — 1H bars don't align with 1D bars

### 2. ChartControlBar Doesn't Work for Playground

The `ChartControlBar` inside `TradingViewChart` updates global context but doesn't refetch playground data. Users clicking 1H in the chart controls get a mismatch between global interval and playground data.

### 3. Navigation is Interval-Aware but Not Seamless

For 1D: `next1` = 1 day ✓  
For 15m: `next1` = 1 bar (15 min) ✗ — user expects daily navigation  
For 1H: `next1` = 1 bar (1 hour) ✗ — user expects daily navigation

### 4. PlaygroundIntervalWatcher Limitations

It checks intraday data availability by making an API call per interval switch (`PlaygroundIntervalWatcher.tsx:47-82`). With native multi-timeframe, this becomes unnecessary for pre-fetched intervals.

---

## What We Want to Achieve

### Goal

Make the Playground natively support **1D**, **1W**, and **1H** timeframes with:
- **Single 1D fetch** as the "backbone" (defines the date range)
- **Single 1W fetch** after 1D completes (using the exact date range from 1D)
- **Single 1H fetch** after 1D completes (using the exact date range from 1D)
- **Seamless switching** between 1D/1W/1H without re-fetching
- **Smart navigation** that respects the current interval:
  - In 1D mode: `next1` = 1 day (move through `allData`)
  - In 1W mode: `next1` = 1 week bar (move through `nativeData['1W']`)
  - In 1H mode: `next1` = 1 hour bar (move through `nativeData['1h']`)
- **Extensible design** to add more intervals later

### User Experience

1. User loads Playground → 1D data fetched + 1W + 1H data fetched in background
2. User navigates days with slider/buttons → sees 1D chart
3. User switches to 1H → chart instantly shows 1H bars for the same date range, no fetch
4. User clicks "next hour" → moves to next 1H bar within `nativeData['1h']`
5. User clicks "next day" (while in 1H mode) → jumps to first 1H bar of the next day
6. User switches back to 1D → chart shows the corresponding day in `allData`

---

## Design: Timestamp-Based Index Tracking

### Core Idea

Instead of computing offsets, we track **indices into the respective data arrays** directly.

### State Design (New `PlaygroundData`)

```typescript
export interface PlaygroundData {
  ticker: string
  allData: StockData[]           // 1D bars for native intervals (backbone); interval-specific bars for non-native (15m, 5m, etc.)
  currentIndex: number            // Index into allData (which day)

  // Native multi-timeframe support
  interval: PlaygroundInterval   // Currently displayed interval
  nativeData: Partial<Record<PlaygroundInterval, StockData[]>>
  // e.g. { '1D': [...], '1W': [...], '1h': [...] }
  // 1D is ALWAYS present (it IS allData)
  // 1W and 1h are fetched once and stored here

  nativeSecondaryData: Partial<Record<PlaygroundInterval, StockData[]>>
  // Same as nativeData but for secondary ticker

  currentNativeIndex: number      // Index into nativeData[interval] for non-1D native intervals
  // For 1D: not used (use currentIndex instead)
  // For 1W: index into nativeData['1W']
  // For 1h: index into nativeData['1h']

  nativeDataLoading: boolean      // True while Phase 2 (1W + 1H) is fetching

  endDate: string
  limit: PlaygroundLimit
  isLoading: boolean
  error?: string

  // Existing fields (unchanged)
  secondaryTicker?: string
  secondaryAllData?: StockData[]
  secondaryIsLoading?: boolean
  secondaryError?: string
  showSecondaryChart?: boolean
}
```

### Native Interval Definition

```typescript
// Near line 8 in usePlaygroundData.ts
export const NATIVE_INTERVALS: PlaygroundInterval[] = ['1D', '1W', '1h']

export function isNativeInterval(interval: string): boolean {
  return (NATIVE_INTERVALS as readonly string[]).includes(interval)
}
```

### Key Insight: Mapping Between Intervals

**1D `currentIndex` → Date:**
```typescript
const currentDate = allData[currentIndex].time.split('T')[0]
```

**Date → 1H index (find first 1H bar of that day):**
```typescript
const hourlyBars = nativeData['1h'] || []
const firstBarOfDay = hourlyBars.findIndex(bar =>
  bar.time.split('T')[0] === currentDate
)
```

**Date → 1W index (find the week bar containing that date):**
```typescript
const weeklyBars = nativeData['1W'] || []
// IMPORTANT: Must use findLastIndex (not findIndex) — findIndex would always
// return the oldest week (index 0) since its date is always <= currentDate.
// We want the LAST week whose start date is <= currentDate.
const weekIndex = weeklyBars.findLastIndex(bar =>
  bar.time.split('T')[0] <= currentDate
)
```

**1H `currentNativeIndex` → Date → 1D index:**
```typescript
const currentHourlyBar = nativeData['1h']![currentNativeIndex]
const hourDate = currentHourlyBar.time.split('T')[0]
const dayIndex = allData.findIndex(bar =>
  bar.time.split('T')[0] === hourDate
)
```

---

## Implementation Plan

### 1. `src/components/playground/hooks/usePlaygroundData.ts`

#### A. Add Constants and Types (near line 8)

```typescript
export const NATIVE_INTERVALS: PlaygroundInterval[] = ['1D', '1W', '1h']

export function isNativeInterval(interval: string): boolean {
  return (NATIVE_INTERVALS as readonly string[]).includes(interval)
}
```

#### B. Extend `PlaygroundData` Interface (lines 34-50)

Add to existing interface:
```typescript
// Native multi-timeframe support
nativeData: Partial<Record<PlaygroundInterval, StockData[]>>
currentNativeIndex: number
```

#### C. Initialize New Fields (lines 235-248)

```typescript
const [playgroundData, setPlaygroundData] = useState<PlaygroundData>({
  ticker: '',
  allData: [],
  currentIndex: 0,
  currentNativeIndex: 0,          // ← ADD
  endDate: '',
  interval: resolvedInterval,
  limit: resolvedLimit,
  isLoading: true,
  nativeData: {},                      // ← ADD (1D will be set after fetch)
  nativeSecondaryData: {},             // ← ADD (populated in Phase 2)
  nativeDataLoading: false,            // ← ADD (true during Phase 2)
  // ...rest unchanged
})
```

#### D. Rewrite Fetch Effect for Sequential 1D → 1W → 1H (lines 269-375)

**Approach**: Add a `fetchPhase` field to `FetchIntent` to handle multi-phase fetching.

```typescript
interface FetchIntent {
  ticker: string
  endDate: string
  interval: PlaygroundInterval
  limit: PlaygroundLimit
  secondaryTicker?: string
  source: string
  preserveIndex?: boolean
  _currentAllData?: StockData[]
  _currentIndex?: number
  fetchPhase?: 'primary' | 'native'     // ← ADD (for Phase 2+)
}
```

**Phase 1 (Primary — 1D backbone):**
```
setFetchIntent({ ticker, endDate, interval:'1D', limit, fetchPhase:'primary' })
         │
         ▼
Fetch Effect:
  → getTickers({ interval: '1D', end_date, limit, ... })
  → primaryData = 1D bars
  → set playgroundData with allData = primaryData
  → nativeData['1D'] = primaryData
  → derive startDate from primaryData[0].time
         │
         ▼
  If native mode: trigger Phase 2 (1W/1H fetch)
```

**Phase 2 (Native — 1W and 1H data for primary AND secondary):**
```
setFetchIntent({ ticker, startDate, endDate, interval:'1h', fetchPhase:'native', secondaryTicker })
         │
         ▼
Fetch Effect:
  → getTickers({ interval: '1h', start_date: startDate, end_date: endDate, ... })          // primary
  → getTickers({ interval: '1h', start_date: startDate, end_date: endDate, symbol: secondaryTicker, ... }) // secondary
  → hourlyData = 1H bars for full range (primary)
  → secondaryHourlyData = 1H bars for full range (secondary)
  → set playgroundData with nativeData = { ...prev.nativeData, '1h': hourlyData }
  → set playgroundData with nativeSecondaryData = { ...prev.nativeSecondaryData, '1h': secondaryHourlyData }
```

**Key**: 1H uses `start_date` + `end_date` from the 1D range — no need to guess or use `limit`. Both primary and secondary native data are fetched in parallel to keep charts aligned.

**Note on 1W**: Fetched from the API with `interval: '1W'` using the same `start_date` + `end_date` range, same as 1H. All native intervals (1D, 1W, 1H) are fetched from the API — no client-side derivation.

#### E. Rewrite `updateInterval` (lines 557-570)

```typescript
const updateInterval = useCallback((newInterval: PlaygroundInterval) => {
  if (newInterval === playgroundDataRef.current.interval) return

  const current = playgroundDataRef.current
  const hasNativeData = (interval: string) => !!current.nativeData[interval]?.length

  // Switching TO 1D
  if (newInterval === '1D') {
    if (current.interval !== '1D' && hasNativeData(current.interval)) {
      // Map native index → day index
      const nativeBars = current.nativeData[current.interval]!
      const currentBar = nativeBars[current.currentNativeIndex]
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
    setGlobalInterval('1D')
    return
  }

  // Switching TO native interval (1W, 1h)
  if (isNativeInterval(newInterval)) {
    if (!hasNativeData(newInterval)) {
      // Native data not available yet
      if (current.nativeDataLoading) {
        // Phase 2 still loading — show loading state, don't trigger duplicate fetch
        setPlaygroundData(prev => ({ ...prev, interval: newInterval, isLoading: true }))
        return
      }
      // Not loading and no data — trigger fetch as fallback
      setFetchIntent({
        ticker: current.ticker || 'VNINDEX',
        endDate: current.endDate,
        interval: newInterval,
        limit: current.limit,
        secondaryTicker: current.secondaryTicker,
        source: 'Playground.updateInterval',
      })
      return
    }

    // Map current day → first bar of that day/week
    const currentDate = current.allData[current.currentIndex].time.split('T')[0]
    const nativeBars = current.nativeData[newInterval]!
    let targetIndex: number

    if (newInterval === '1h') {
      // Find first 1H bar of current day
      targetIndex = nativeBars.findIndex(bar => bar.time.split('T')[0] === currentDate)
    } else if (newInterval === '1W') {
      // Find the week bar containing currentDate
      // IMPORTANT: findLastIndex (not findIndex) — findIndex would return index 0 (oldest week)
      targetIndex = nativeBars.findLastIndex(bar => bar.time.split('T')[0] <= currentDate)
    } else {
      targetIndex = 0
    }

    setPlaygroundData(prev => ({
      ...prev,
      interval: newInterval,
      currentNativeIndex: targetIndex !== -1 ? targetIndex : 0,
    }))
    setGlobalInterval(newInterval)
    return
  }

  // Non-native interval (15m, 5m, etc.) — single fetch as before
  setPlaygroundData(prev => ({ ...prev, interval: newInterval, isLoading: true, error: undefined }))
  setFetchIntent({
    ticker: current.ticker || 'VNINDEX',
    endDate: current.endDate,
    interval: newInterval,
    limit: current.limit,
    secondaryTicker: current.secondaryTicker,
    source: 'Playground.updateInterval',
  })
  setGlobalInterval(newInterval)  // Sync global context for non-native intervals too
}, [setGlobalInterval])
```

#### F. Rewrite `navigateDate` (lines 649-675)

```typescript
const navigateDate = useCallback((direction: 'back5' | 'back1' | 'next1' | 'next5') => {
  setPlaygroundData(prev => {
    const isNative = prev.interval !== '1D' && !!prev.nativeData[prev.interval]

    if (!isNative) {
      // 1D and non-native interval navigation (existing behavior for 1D, 15m, 5m, etc.)
      let newIndex = prev.currentIndex
      switch (direction) {
        case 'back5': newIndex = Math.max(0, prev.currentIndex - 5); break
        case 'back1': newIndex = Math.max(0, prev.currentIndex - 1); break
        case 'next1': newIndex = Math.min(prev.allData.length - 1, prev.currentIndex + 1); break
        case 'next5': newIndex = Math.min(prev.allData.length - 1, prev.currentIndex + 5); break
      }
      if (newIndex === prev.currentIndex) return prev
      return { ...prev, currentIndex: newIndex }
    }

    // Native non-1D navigation (1W, 1h, etc.)
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

    return {
      ...prev,
      currentNativeIndex: newNativeIndex,
      currentIndex: dayIndex !== -1 ? dayIndex : prev.currentIndex,
    }
  })
}, [])
```

#### G. Rewrite `visibleData` (lines 677-685)

```typescript
const visibleData = useMemo(() => {
  if (!playgroundData.allData.length) return []

  // 1D: cumulative view up to currentIndex (existing behavior)
  if (playgroundData.interval === '1D') {
    return playgroundData.allData.slice(0, playgroundData.currentIndex + 1)
  }

  // Native non-1D (1W, 1h, etc.): use nativeData
  const nativeBars = playgroundData.nativeData[playgroundData.interval]
  if (nativeBars?.length) {
    return nativeBars.slice(0, playgroundData.currentNativeIndex + 1)
  }

  // Fallback for non-native intervals (15m, etc.)
  return playgroundData.allData.slice(0, playgroundData.currentIndex + 1)
}, [playgroundData.allData, playgroundData.nativeData, playgroundData.currentIndex, playgroundData.currentNativeIndex, playgroundData.interval])
```

#### H. Update `secondaryVisibleData` (lines 722-730)

Secondary chart mirrors primary behavior — fetches native data for secondary ticker too and shows the same range.

Add `nativeSecondaryData` to `PlaygroundData`:
```typescript
// In PlaygroundData interface
nativeSecondaryData: Partial<Record<PlaygroundInterval, StockData[]>>
```

Phase 2 fetches native data for **both** primary and secondary tickers in parallel.

```typescript
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
```

#### I. Update `setCurrentIndex` (lines 625-631)

```typescript
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
```

#### J. Expose `currentNativeIndex` and Setter in Return (lines 732-748)

```typescript
return {
  playgroundData,
  visibleData,
  secondaryVisibleData,
  currentNativeIndex: playgroundData.currentNativeIndex,    // ← ADD
  setCurrentNativeIndex: (index: number) => {              // ← ADD
    setPlaygroundData(prev => ({ ...prev, currentNativeIndex: index }))
  },
  nativeDataLoading: playgroundData.nativeDataLoading,      // ← ADD
  setCurrentIndex,
  navigate: navigateDate,
  // ...rest unchanged
}
```

---

### 2. `src/components/playground/PlaygroundDataProvider.tsx`

#### A. Extend Context Interface (lines 9-40)

```typescript
interface PlaygroundContextValue {
  playgroundData: ReturnType<typeof usePlaygroundData>["playgroundData"]
  visibleData: ReturnType<typeof usePlaygroundData>["visibleData"]
  secondaryVisibleData: ReturnType<typeof usePlaygroundData>["secondaryVisibleData"]
  currentNativeIndex: number                     // ← ADD
  setCurrentNativeIndex: (index: number) => void // ← ADD
  nativeDataLoading: boolean                     // ← ADD
  setCurrentIndex: ReturnType<typeof usePlaygroundData>["setCurrentIndex"]
  // ...rest unchanged
}
```

#### B. Update Value Object (lines 111-134)

```typescript
const value: PlaygroundContextValue = {
  playgroundData: playgroundDataValue.playgroundData,
  visibleData: playgroundDataValue.visibleData,
  secondaryVisibleData: playgroundDataValue.secondaryVisibleData,
  currentNativeIndex: playgroundDataValue.currentNativeIndex,       // ← ADD
  setCurrentNativeIndex: playgroundDataValue.setCurrentNativeIndex, // ← ADD
  nativeDataLoading: playgroundDataValue.nativeDataLoading,         // ← ADD
  setCurrentIndex: playgroundDataValue.setCurrentIndex,
  // ...rest unchanged
}
```

---

### 3. `src/components/playground/PlaygroundChart.tsx`

#### A. Read `currentNativeIndex` from Context (near line 38)

```typescript
const {
  playgroundData,
  visibleData,
  secondaryVisibleData,
  currentNativeIndex,     // ← ADD
  setCurrentIndex,
  updateTicker,
  updateSecondaryTicker,
  orders,
  showAlertLines,
  showChartLines,
} = usePlayground()
```

#### B. Pass `interval` and `onIntervalChange` to `TradingViewChart` (lines 206-225)

```typescript
const primaryChartProps = {
  ticker: playgroundData.ticker,
  interval: playgroundData.interval,                    // ← ADD
  onIntervalChange: (newInterval: Interval) => {       // ← ADD
    updateInterval(newInterval as PlaygroundInterval)
  },
  // Show only native intervals (1H, 1D, 1W) in the ChartControlBar — hide minute intervals
  visibleIntervals: [Interval.Hourly, Interval.Daily, Interval.Weekly],
  mobileVisibleIntervals: [Interval.Hourly, Interval.Daily, Interval.Weekly],
  endDateOverride: currentEndDate,
  showControls: true,
  height: chartHeight,
  preserveViewport: true,
  infiniteHistory: false,
  showAlertLines,
  showChartLines,
  cacheData: visibleData,
  cacheMetadata: {
    symbol: playgroundData.ticker,
    interval: playgroundData.interval as Interval,       // Use actual interval
    startDate: currentStartDate || "",
    endDate: currentEndDate || "",
    mode: getMode(playgroundData.ticker, tickers, globalTickers, cryptoTickers),
  },
  onTickerChange: updateTicker,
  overlay,
}
```

#### C. Update Overlay Logic (line 111)

The overlay uses `visibleData[visibleData.length - 1]?.time` as `currentBarTime` (line 111). With native multi-timeframe, `visibleData` correctly derives from the right source (`nativeData` or `allData`), so **no change needed** — it just works.

---

### 4. `src/components/playground/PlaygroundControls.tsx`

#### A. Read `currentNativeIndex` and `interval` (line 28)

```typescript
const { currentIndex, allData, interval, currentNativeIndex } = playgroundData
```

#### B. Update Navigation Button Disabled States

**IMPORTANT**: Must distinguish three cases — 1D, native non-1D (1W/1h), and non-native (15m/5m/etc.).
For non-native intervals, `nativeData[interval]` doesn't exist, so using `currentNativeIndex` would be wrong.

```typescript
import { isNativeInterval } from './hooks/usePlaygroundData'

// Three-way check: 1D vs native non-1D vs non-native
const isNativeNonDaily = isNativeInterval(interval) && interval !== '1D'

const isAtStart = isNativeNonDaily
  ? currentNativeIndex === 0
  : currentIndex === 0

const isAtEnd = isNativeNonDaily
  ? currentNativeIndex >= (playgroundData.nativeData?.[interval]?.length ?? 1) - 1
  : currentIndex >= allData.length - 1
```

#### C. Update Date Display for 1H Mode (lines 188-201)

```typescript
// Show current hour info when in 1h mode
const displayDate = (interval === '1h' || interval === '1W') && visibleData.length > 0
  ? visibleData[visibleData.length - 1]?.time?.replace('T', ' ').slice(0, interval === '1h' ? 16 : 10) // "2026-04-23 14:00" or "2026-04-23"
  : currentDate
```

#### D. Slider Behavior

**Keep slider controlling `currentIndex` (day level)** — this is simpler and more intuitive. When slider changes:
- Reset `currentNativeIndex` to first bar of the new day
- This matches the behavior: slider = day-level navigation

---

### 5. `src/components/playground/PlaygroundInfoPanel.tsx`

#### Update Interval Switching (lines 238-242)

Remove the `setGlobalInterval` call since `updateInterval` now handles it internally:
```typescript
// BEFORE:
updateInterval(newInterval)
setGlobalInterval(newInterval)

// AFTER:
updateInterval(newInterval)  // handles setGlobalInterval internally
```

#### Update Date Range Display (lines 436-448)

May need to show native interval info when in 1H/1W mode:
```typescript
const currentDisplayDate = (interval === '1h' || interval === '1W') && visibleData.length > 0
  ? visibleData[visibleData.length - 1]?.time?.replace('T', ' ').slice(0, interval === '1h' ? 16 : 10)
  : currentDate
```

---

### 6. `src/components/playground/PlaygroundIntervalWatcher.tsx`

#### Skip Availability Check for Native Intervals (near line 41)

```typescript
// Skip availability check for native intervals we pre-fetch
const isNative = ['1D', '1W', '1h'].includes(interval)
if (isNative) {
  setIsDataAvailable(true)
  return
}

const isIntraday = !['1D', '1W', '2W', '1M'].includes(interval)
// ...rest unchanged
```

---

### 7. `src/components/playground/hooks/usePlaygroundOrders.ts`

#### Update Current Bar Resolution (line 19)

Change from `visibleData[currentIndex]` to `visibleData[visibleData.length - 1]`:

```typescript
// OLD (broken for 1H/1W mode — currentIndex is 1D index, not native index):
const currentBar = visibleData[currentIndex]

// NEW (works for all intervals):
const currentBar = visibleData[visibleData.length - 1]  // Last visible bar = current
```

This way, in 1H/1W mode, `currentBar` correctly points to the current hourly/weekly bar, and order placement uses the right timestamp.

---

## Fetch Flow Diagram

```
User loads /backtesting or clicks "Randomize"
         │
         ▼
  setFetchIntent({ ticker, endDate, interval:'1D', limit:500, fetchPhase:'primary' })
         │
         ▼
┌──────────────────────────────────────────────┐
│  Phase 1: Fetch 1D (Primary Backbone)       │
│  → getTickers({ interval:'1D', end_date, limit })    │
│  → allData = 1D bars                               │
│  → nativeData['1D'] = allData                        │
│  → startDate = allData[0].time.split('T')[0]        │
│  → setPlaygroundData({ allData, currentIndex: ~20% })│
└──────────────────────────────────────────────┘
         │
         ▼ (if native mode)
  setFetchIntent({ ticker, startDate, endDate, interval:'1h', fetchPhase:'native' })
         │
         ▼
┌──────────────────────────────────────────────┐
│  Phase 2: Fetch 1W + 1H (Native Data)        │
│  → getTickers({ interval:'1h', start_date, end_date })   // primary + secondary
│  → getTickers({ interval:'1W', start_date, end_date })   // primary + secondary
│  → hourlyData = 1H bars for full range (primary)
│  → weeklyData = 1W bars for full range (primary)
│  → secondaryHourlyData, secondaryWeeklyData (secondary)
│  → nativeData = { '1h': hourlyData, '1W': weeklyData }
│  → nativeSecondaryData = { '1h': secHourly, '1W': secWeekly }
│  → setPlaygroundData({ nativeData, nativeSecondaryData })
└──────────────────────────────────────────────┘
         │
         ▼
  User sees 1D chart (interval='1D') or switches to 1W/1h
         │
         ▼
  Switching to 1h: Map currentIndex → first 1H bar of that day
  Switching to 1W: Map currentIndex → week bar containing that day
  Switching to 1D: Map currentNativeIndex → corresponding day in allData
```

---

## Edge Cases

### Missing 1H Data for Historical Dates

For far historical dates (e.g., 2020), the API may only have 1D and 1W data — no 1H bars exist. This can happen in two places:

**1. Phase 2 fetch returns empty 1H data:**

```typescript
// In Phase 2 fetch effect:
const hourlyData = primaryResult.value[ticker] || []
if (hourlyData.length === 0) {
  // No 1H data available for this date range
  // Simply don't populate nativeData['1h'] — treat as if native interval doesn't exist
  // User can still use 1D and 1W
  info(`[Playground] No 1H data available for ${ticker} in range ${startDate} → ${endDate}`)
}
// Store whatever we got (even empty) — the UI handles it
nativeData['1h'] = hourlyData
```

**2. User tries to switch to 1H when no data exists:**

The `updateInterval` function checks `hasNativeData(newInterval)`. If `nativeData['1h']` is empty or undefined:
- If `nativeDataLoading` is true → show loading (Phase 2 still running)
- If loading is done and no data → the existing fallback triggers a fetch, which returns empty → show the interval but with no bars visible

**Better approach**: Track which native intervals have data after Phase 2, and disable those interval buttons in the UI.

```typescript
// After Phase 2 completes, track availability:
const availableNativeIntervals = NATIVE_INTERVALS.filter(
  iv => !!playgroundData.nativeData[iv]?.length
)
```

Then in `PlaygroundInfoPanel`, disable 1H button if `nativeData['1h']` is empty and Phase 2 is done. In `ChartControlBar`, the `onIntervalChange` handler should show a toast/tooltip explaining "1H data not available for this date range."

**Key rule**: If native data for an interval is empty after Phase 2, that interval is effectively "not available" — same as if it were non-native. The UI should reflect this by disabling the button or showing a warning.

### Initial Interval Behavior

If the user loads the playground with `interval=1h` in the URL:
1. Phase 1 fetches 1D backbone (always)
2. Phase 2 fetches 1H + 1W
3. After Phase 2 completes, auto-switch to 1H if the initial interval was 1H:
```typescript
// After Phase 2 completes:
if (resolvedInterval === '1h' && nativeData['1h']?.length) {
  // Auto-switch to the requested initial interval
  updateInterval('1h')
}
```
4. If Phase 2 returns empty 1H data, stay on 1D and show a warning

### URL Sync

The existing `skipNextUrlSync` logic continues to work — Phase 1 triggers `skipNextUrlSync.current = true` just like the current fetch effect. Phase 2 does NOT trigger URL sync since it doesn't change `currentIndex` or the primary data.

---

## Summary of Changes

| File | Key Changes |
|------|-------------|
| `hooks/usePlaygroundData.ts` | Add `nativeData`, `nativeSecondaryData`, `currentNativeIndex`, `nativeDataLoading`, `NATIVE_INTERVALS`; rewrite fetch effect for multi-phase (1D→1W→1H) for both primary and secondary; rewrite `updateInterval`, `navigateDate`, `visibleData`, `secondaryVisibleData`, `setCurrentIndex`; expose `setCurrentNativeIndex` |
| `PlaygroundDataProvider.tsx` | Expose `currentNativeIndex`, `setCurrentNativeIndex`, `nativeDataLoading` in context |
| `PlaygroundChart.tsx` | Pass `interval` + `onIntervalChange` to `TradingViewChart`; pass `visibleIntervals` to show only 1h/1D/1W in ChartControlBar; read `currentNativeIndex` |
| `PlaygroundControls.tsx` | Handle native interval in navigation disabled states and date display |
| `PlaygroundInfoPanel.tsx` | Update date display for 1H/1W mode (optional) |
| `PlaygroundIntervalWatcher.tsx` | Skip availability check for native 1W + 1H |
| `hooks/usePlaygroundOrders.ts` | Use `visibleData[visibleData.length - 1]` as current bar |

---

## Benefits of This Approach

1. **No offset math** — just integer indices into arrays
2. **Indices are always valid** for their respective data arrays
3. **Extensible** — just add interval to `NATIVE_INTERVALS`, fetch it, store in `nativeData`
4. **Date mapping only on interval switch** — not on every navigation step
5. **Seamless UX** — switching 1D↔1W↔1H is instant, no re-fetch
6. **Backward compatible** — non-native intervals (15m, 5m, etc.) still work as before
7. **Secondary chart aligned** — fetches native data for both primary and secondary tickers
