# Backtesting Playground: Multi-Timeframe Support

## What is the Backtesting "Playground"?

The Playground (`/backtesting` route) is a stock market backtesting simulator for Vietnamese stocks. It allows users to:

- **Navigate through historical data** as if trading in real-time
- **Place virtual orders** (long/short) at specific points in time
- **Observe how strategies would have performed** by moving forward/backward through candles
- **Compare with a secondary ticker** (default: `VNINDEX`) side-by-side

### Architecture

```
backtesting.tsx (route)
└── PlaygroundDataProvider (context provider)
    ├── usePlaygroundData hook (core state + fetch logic)
    ├── usePlaygroundOrders hook (order management)
    └── Children:
        ├── PlaygroundInfoPanel    (ticker selector, limit, date range, randomize)
        ├── PlaygroundControls     (slider, back/next buttons, date display)
        ├── PlaygroundChart        (TradingViewChart with overlay markers)
        ├── PlaygroundIntervalWatcher (warns when intraday data unavailable)
        └── PlaygroundOrderBook    (place orders, view PnL)
```

### Supported Intervals (`usePlaygroundData.ts:8`)

```typescript
export const PLAYGROUND_INTERVALS = ['1m', '5m', '15m', '1h', '4h', '1D', '1W', '2W', '1M'] as const
```

All intervals are **native** — lazy-fetched on first use and cached for instant re-switching:

```typescript
export const NATIVE_INTERVALS: PlaygroundInterval[] = [...PLAYGROUND_INTERVALS]
```

---

## Key State (`PlaygroundData` interface — `usePlaygroundData.ts`)

| Field | Type | Description |
|-------|------|-------------|
| `ticker` | `string` | Currently selected stock/index |
| `allData` | `StockData[]` | 1D bars (always the backbone) |
| `currentIndex` | `number` | Current position within `allData` (day level) |
| `currentNativeIndex` | `number` | Index into `nativeData[interval]` for non-1D intervals |
| `endDate` | `string` | End date of the data window |
| `interval` | `PlaygroundInterval` | Currently displayed interval |
| `limit` | `PlaygroundLimit` | Number of bars fetched (default: 500) |
| `isLoading` | `boolean` | Loading state |
| `error` | `string?` | Error message |
| `nativeData` | `Partial<Record<PlaygroundInterval, StockData[]>>` | Cached data per interval (keyed by interval) |
| `nativeSecondaryData` | `Partial<Record<PlaygroundInterval, StockData[]>>` | Cached secondary data per interval |
| `nativeDataLoading` | `boolean` | True while Phase 2 (1H + 1W) is fetching |
| `secondaryTicker` | `string?` | Secondary chart ticker |
| `secondaryAllData` | `StockData[]?` | Secondary ticker 1D data |
| `showSecondaryChart` | `boolean` | Whether secondary chart is visible |

---

## How It Works

### 1D Backbone

`allData` always contains 1D bars. It is the single source of truth for date range and day-level navigation. The slider, date picker, and `currentIndex` all operate at the day level regardless of the displayed interval.

### Native Data Map

`nativeData` stores interval-specific bar arrays, keyed by interval:

```typescript
nativeData: {
  '1D': [...],  // same reference as allData
  '1h': [...],  // hourly bars for the same date range
  '1W': [...],  // weekly bars for the same date range
  '5m': [...],  // fetched lazily on first use
  // etc.
}
```

`nativeSecondaryData` mirrors this for the secondary ticker.

### Two-Phase Fetch

#### Phase 1: Primary (1D Backbone)

Triggered by `setFetchIntent({ ..., fetchPhase: 'primary' })`.

1. Fetches primary + secondary at **1D** interval using `end_date` + `limit`
2. Stores result as `allData` and `nativeData['1D']`
3. Sets `currentIndex` to ~20% of data length
4. Derives `startDate` from first bar for Phase 2
5. Triggers Phase 2

#### Phase 2: Native (1H + 1W Pre-fetch)

Triggered automatically after Phase 1 by `setFetchIntent({ ..., fetchPhase: 'native' })`.

1. Fetches 4 things in parallel:
   - Primary 1H: `getTickers({ interval: '1h', start_date, end_date })`
   - Primary 1W: `getTickers({ interval: '1W', start_date, end_date })`
   - Secondary 1H (if secondary ticker set)
   - Secondary 1W (if secondary ticker set)
2. Stores results in `nativeData` and `nativeSecondaryData`
3. If the initial URL requested a non-1D interval (e.g. `?interval=1h`), auto-switches to it

**Error handling**: If any Phase 2 fetch fails, logs a warning but does NOT set error state — 1D still works. Empty arrays are stored.

#### Lazy Fetch (Other Intervals)

Intervals not pre-fetched in Phase 2 (e.g., `1m`, `5m`, `15m`, `4h`, `2W`, `1M`) are fetched **on-demand** when the user first clicks them:

1. User clicks interval in `ChartControlBar`
2. `updateInterval` checks `nativeData[newInterval]` — no data found
3. Fetches primary + secondary at that interval using `start_date` + `end_date` from `allData`
4. Stores in `nativeData` and `nativeSecondaryData`
5. Maps current day index to native index via `findNativeIndex`
6. Subsequent switches to the same interval are instant (cached)

---

## Date Mapping Between Intervals

### `findNativeIndex` Helper (`usePlaygroundData.ts:21-35`)

Maps a day-level date to an index in a native interval's bar array:

```typescript
function findNativeIndex(nativeBars: StockData[], interval: PlaygroundInterval, currentDate: string): number {
  if (!currentDate || !nativeBars.length) return 0

  if (['1W', '2W', '1M'].includes(interval)) {
    // Week/month: find last bar whose date <= currentDate (iterate from end)
    for (let i = nativeBars.length - 1; i >= 0; i--) {
      if (nativeBars[i].time.split('T')[0] <= currentDate) return i
    }
    return 0
  }

  // Intraday (1m, 5m, 15m, 1h, 4h): find first bar matching the date
  const idx = nativeBars.findIndex(bar => bar.time.split('T')[0] === currentDate)
  return idx !== -1 ? idx : 0
}
```

**Why the distinction?** For weekly/monthly bars, `findIndex` with `<=` would always return index 0 (the oldest bar is always <= any date). We need the **last** bar that is <= the target date.

---

## Interval Switching (`updateInterval`)

Three branches:

### TO 1D

If currently on a native non-1D interval, maps `currentNativeIndex` back to a day index via the current native bar's date:

```typescript
const nativeBars = current.nativeData[current.interval]!
const currentBar = nativeBars[current.currentNativeIndex]
const barDate = currentBar.time.split('T')[0]
const dayIndex = current.allData.findIndex(bar => bar.time.split('T')[0] === barDate)
```

### TO Non-1D — No Data (Lazy Fetch)

Shows loading state, fetches primary + secondary at the new interval, stores in `nativeData`, maps day index to native index:

```typescript
const targetIndex = findNativeIndex(primaryData, newInterval, currentDate)
```

### TO Non-1D — Has Data (Instant Switch)

Maps current day index to native index via `findNativeIndex` and updates `currentNativeIndex`. No fetch needed — sub-millisecond.

---

## Navigation (`navigateDate`)

### 1D Mode

Moves `currentIndex` by delta (±1 or ±5) within `allData`. Standard bar-by-bar navigation.

### Native Non-1D Mode (1H, 1W, etc.)

Moves `currentNativeIndex` by delta within `nativeData[interval]`. Also updates `currentIndex` to keep the day in sync:

```typescript
const currentBar = nativeBars[newNativeIndex]
const barDate = currentBar.time.split('T')[0]
const dayIndex = prev.allData.findIndex(bar => bar.time.split('T')[0] === barDate)
```

---

## Visible Data (`visibleData` / `secondaryVisibleData`)

Derived via `useMemo`:

| Interval | Primary | Secondary |
|----------|---------|-----------|
| `1D` | `allData.slice(0, currentIndex + 1)` | `secondaryAllData.slice(0, currentIndex + 1)` |
| Non-1D with native data | `nativeData[interval].slice(0, currentNativeIndex + 1)` | `nativeSecondaryData[interval].slice(0, currentNativeIndex + 1)` |
| Non-1D without data | `allData.slice(0, currentIndex + 1)` (fallback) | `secondaryAllData.slice(0, currentIndex + 1)` (fallback) |

---

## Chart Integration

### PlaygroundChart.tsx

Passes `cacheData: visibleData` and `cacheMetadata` to `TradingViewChart`, bypassing its internal fetch. Also passes:

- `interval`: current playground interval
- `onIntervalChange`: calls `updateInterval` to trigger native switch or lazy fetch
- `visibleIntervals`: `[Hourly, Daily, Weekly]` — only these three appear in `ChartControlBar`
- `mobileVisibleIntervals`: same as above

### Global Interval Sync

A `useEffect` in `PlaygroundChart.tsx` keeps `ChartSettingsContext.interval` in sync with the playground interval:

```typescript
React.useEffect(() => {
  setGlobalInterval(playgroundData.interval as Interval)
}, [playgroundData.interval, setGlobalInterval])
```

This prevents `TickerContext` inside `TradingViewChart` from re-fetching on every render. Without it, `TickerContext` detects `cacheMetadata.interval !== settings.interval` and triggers a redundant fetch.

### PlaygroundControls.tsx

Navigation button disabled states use a three-way check:

```typescript
const isNativeNonDaily = isNativeInterval(interval) && interval !== '1D'
const isAtStart = isNativeNonDaily ? currentNativeIndex === 0 : currentIndex === 0
const isAtEnd = isNativeNonDaily
  ? currentNativeIndex >= (nativeData?.[interval]?.length ?? 1) - 1
  : currentIndex >= allData.length - 1
```

---

## URL Sync

### State → URL

Interval is **NOT** synced to the URL. Only `ticker`, `endDate`, and `limit` are synced:

```typescript
navigateFn({
  to: '/backtesting',
  search: buildSearchParams(playgroundData.ticker, playgroundData.endDate, '1D', playgroundData.limit),
})
```

This prevents URL changes from triggering re-fetches when switching intervals. The playground always defaults to 1D on page load.

### URL → State

Interval is **ignored** from URL params. Only `ticker`, `endDate`, and `limit` trigger a re-fetch when the URL changes.

### PlaygroundInfoPanel

The interval selector has been **removed** from `PlaygroundInfoPanel`. Users switch intervals exclusively via the `ChartControlBar` inside the chart.

---

## Fetch Flow Diagram

```
User loads /backtesting or clicks "Randomize"
         │
         ▼
  setFetchIntent({ ticker, endDate, interval:'1D', limit, fetchPhase:'primary' })
         │
         ▼
┌──────────────────────────────────────────────────┐
│  Phase 1: Fetch 1D (Primary Backbone)            │
│  → getTickers({ interval:'1D', end_date, limit })  │
│  → allData = nativeData['1D'] = 1D bars            │
│  → secondaryAllData = secondary 1D bars            │
│  → startDate = allData[0].time                      │
│  → currentIndex = ~20%                              │
└──────────────────────────────────────────────────┘
         │
         ▼ (automatic)
  setFetchIntent({ ticker, startDate, endDate, fetchPhase:'native' })
         │
         ▼
┌──────────────────────────────────────────────────┐
│  Phase 2: Pre-fetch 1H + 1W (Primary + Secondary)│
│  → 4 parallel fetches:                             │
│    getTickers({ interval:'1h', start_date, end_date })  // primary
│    getTickers({ interval:'1W', start_date, end_date })  // primary
│    getTickers({ interval:'1h', start_date, end_date })  // secondary
│    getTickers({ interval:'1W', start_date, end_date })  // secondary
│  → nativeData = { '1D': [...], '1h': [...], '1W': [...] }
│  → nativeSecondaryData = { '1h': [...], '1W': [...] }
└──────────────────────────────────────────────────┘
         │
         ▼
  User sees 1D chart, can switch intervals freely
         │
         ├── Switch to 1H/1W → instant (cached from Phase 2)
         ├── Switch to 5m/15m/4h → lazy fetch, then cached
         └── Switch back to 1D → instant (always in allData)
```

---

## Secondary Ticker

When the user changes the secondary ticker, `updateSecondaryTicker`:

1. Fetches 1D data for the new ticker (stored in `secondaryAllData`)
2. Checks which intervals have primary native data
3. Fetches secondary data for all those intervals in parallel
4. Stores in `nativeSecondaryData`

This ensures the secondary chart is always aligned with the primary chart's interval.

---

## Edge Cases

### Missing Intraday Data for Historical Dates

For far historical dates (e.g., 2020), the API may not have intraday data. `findNativeIndex` returns 0 in this case, and the chart shows from the beginning of whatever data is available. The `PlaygroundIntervalWatcher` skips its availability check for native intervals.

### Initial Non-1D Interval via URL

If the user loads with `?interval=1h`:
1. Phase 1 fetches 1D backbone (always)
2. Phase 2 fetches 1H + 1W
3. After Phase 2, auto-switches to 1H if data is available
4. If no 1H data, stays on 1D

### Lazy Fetch Failure

If a lazy fetch for an interval fails (e.g., network error), an error message is shown but 1D navigation continues to work. The empty result is cached in `nativeData` to prevent repeated failed fetches.

---

## Files Modified

| File | Key Changes |
|------|-------------|
| `hooks/usePlaygroundData.ts` | `NATIVE_INTERVALS` = all intervals; `findNativeIndex` helper; two-phase fetch (1D → 1H+1W); lazy fetch for other intervals; `updateInterval` with instant switch or lazy fetch; `navigateDate` with native index tracking; `visibleData`/`secondaryVisibleData` from `nativeData`; URL sync hardcoded to '1D'; `updateSecondaryTicker` fetches all cached intervals |
| `PlaygroundDataProvider.tsx` | Expose `currentNativeIndex`, `setCurrentNativeIndex`, `nativeDataLoading` in context |
| `PlaygroundChart.tsx` | `useEffect` syncing global interval; pass `interval`/`onIntervalChange`/`visibleIntervals` to `TradingViewChart` |
| `TradingViewChart.tsx` | Added `visibleIntervals`/`mobileVisibleIntervals` props, passed to `ChartControlBar` |
| `PlaygroundControls.tsx` | Three-way disabled state (1D vs native non-1D) using `currentNativeIndex` |
| `PlaygroundInfoPanel.tsx` | Removed interval selector; removed `setGlobalInterval`/`useChartSettings` dependency |
| `PlaygroundIntervalWatcher.tsx` | Skip availability check for all native intervals |
| `hooks/usePlaygroundOrders.ts` | `currentBar = visibleData[visibleData.length - 1]` instead of `visibleData[currentIndex]` |
