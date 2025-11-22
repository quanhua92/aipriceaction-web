# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Vietnamese stock market analysis web application built with React 19, TypeScript, Vite 7, TanStack Router, and TailwindCSS 4. Uses a custom API client SDK for the AIPriceAction API.

## Development Commands

```bash
pnpm dev          # Dev server on 0.0.0.0:5173
pnpm build        # Production build
pnpm serve        # Preview production build
pnpm test         # Run Vitest tests
pnpm format       # Format with Biome
pnpm lint         # Lint with Biome
pnpm check        # Full Biome check
```

## Architecture: Context Provider Hierarchy

The app uses React Context for state management with a **specific dependency order**:

```
GoogleAnalyticsProvider
├── LogsProvider (no dependencies - base layer)
├── SiteSettingsProvider
├── RefreshProvider (depends on LogsContext)
├── APIProvider (depends on LogsContext + RefreshContext)
│   └── ChartSettingsProvider
│       └── <Router>
```

**Critical: This order matters!**
- `LogsProvider` must be innermost because all other contexts use it
- `RefreshProvider` uses `LogsContext` to log refresh state changes
- `APIProvider` depends on both:
  - Watches `RefreshContext.lastRefresh` to trigger re-fetching
  - Uses `LogsContext.info()` and `error()` to log all API calls

See `src/routes/__root.tsx` for the provider tree.

## Key Contexts & Their Responsibilities

### LogsContext (`src/contexts/LogsContext.tsx`)
- In-app logging system with max 500 logs (circular buffer)
- Ref-based storage for performance, state trigger for re-renders
- Four levels: `info()`, `warn()`, `error()`, `debug()`
- **Always use LogsContext for API observability** - don't just console.log

### RefreshContext (`src/contexts/RefreshContext.tsx`)
- 30-second auto-refresh toggle
- `triggerRefresh()` updates `lastRefresh` timestamp
- **Pattern**: Other contexts watch `lastRefresh` in useEffect dependencies to auto-refetch

### APIContext (`src/contexts/APIContext.tsx`)
- Orchestrates all API data fetching
- Provides `getTickers()` wrapper that **automatically logs** to LogsContext
- Fetches on mount AND when `lastRefresh` changes
- Populates `allTickersLastData` (latest bar only, `limit: 1`) used by BasicWatchList and other components for displaying current prices/volumes

### TickerContext (`src/contexts/TickerContext.tsx`)
- Manages single ticker + chart data
- Implements retry logic (3 attempts, exponential backoff 1s→2s→4s)
- Smart caching: tracks recent requests, skips delay if likely cached (<15s)
- Random delay 0-50ms to prevent thundering herd
- **Also watches `lastRefresh`** to auto-update charts

### ChartSettingsContext (`src/contexts/ChartSettingsContext.tsx`)
- Chart UI settings (interval, date range, MA visibility, etc.)
- MA visibility logic tied to interval (e.g., hide MA200 on short intervals)

## API Client Architecture

### Two-Layer Design

1. **SDK Layer** (`src/integrations/aipriceaction/src/client.ts`)
   - `AIPriceActionClient` class with retry logic, timeout handling
   - Custom errors: `APIError`, `NetworkError`, `RateLimitError`, `ValidationError`
   - Supports JSON/CSV formats (CSV default for performance)
   - Optional metadata return (duration, retry count, headers)

2. **Wrapper Layer** (`src/lib/api-client.ts`)
   - `getTickers()` - basic wrapper without logging
   - `getTickersWithLogging()` - **logs to LogsContext** with metadata
   - Normalizes API timestamps to UTC ISO 8601
   - Two singleton instances: one with metadata (for logging), one without (for performance)

### getTickers Pattern

**Rule: All components that fetch data should react to RefreshContext**

Components using `getTickers()` from `APIContext`:
```typescript
const { getTickers } = useAPI()
const { lastRefresh } = useRefresh()  // ← Add this

useEffect(() => {
  // fetch logic
}, [...otherDeps, lastRefresh])  // ← Add to dependencies
```

**Current implementations:**
- ✅ `APIContext` - refetches `allTickersLastData`
- ✅ `MarketMatrix` - refreshes matrix view
- ✅ `TickerContext` - updates chart data
- ✅ `ai.tsx` route - refreshes selected tickers
- ⚠️ `BasicWatchList.prefetch` - intentionally skipped (cache warming only)

## Data Flow: API → Chart

```
1. APIContext.getTickers() [with logging]
   ↓
2. TickerContext uses getTickers() in useEffect
   ↓
3. Fetches when: selectedTicker OR settings change OR lastRefresh updates
   ↓
4. Retry logic: 3 attempts, exponential backoff
   ↓
5. Random delay: 0-50ms (skipped if cached <15s ago)
   ↓
6. Returns StockData[] → setChartData()
   ↓
7. TradingViewChart renders with lightweight-charts
```

## Timestamp Normalization

**Critical**: API returns various timestamp formats. Always normalize to UTC ISO 8601:

- Date-only: `"2025-11-09"` → `"2025-11-09T02:00:00Z"` (assumes 02:00 UTC for daily data)
- Datetime: `"2025-11-09 14:00:00"` → `"2025-11-09T14:00:00Z"`

**Where**: `normalizeAPITimestamp()` in `src/lib/api-client.ts`

**Why**: Vietnam timezone conversion happens in UI components (`src/lib/format.ts`), not during API fetch.

**Important**: After normalization, `StockData` objects use the field name `time` (not `timestamp`):
```typescript
// ✅ Correct
const date = stockData.time.split('T')[0]

// ❌ Wrong
const date = stockData.timestamp.split('T')[0]  // undefined!
```

## Vietnamese Stock Market Domain

### Market Indices
- `VNINDEX` (VNX) - main index
- `VN30` - large caps

### Sectors (from API)
Common sectors with abbreviations (used in MarketMatrix):
- `NGAN_HANG` (NH) - Banking
- `CHUNG_KHOAN` (CK) - Securities
- `BAT_DONG_SAN` (BDS) - Real Estate
- `XAY_DUNG` (XD) - Construction
- `THEP` - Steel
- `BAN_LE` - Retail

See `PRIORITY_GROUPS` and `SECTOR_ABBREVIATIONS` in `src/lib/constants.ts`

### Moving Average Scores
- Percentage distance from MA: `((price - MA) / MA) × 100`
- Used to identify momentum/trend strength
- Available periods: MA10, 20, 50, 100, 200

## Key Constants

```typescript
// src/lib/constants.ts
MARKET_INDICES = ['VNINDEX', 'VN30']
DEFAULT_CHART_LIMIT = 128
API_RETRY_ATTEMPTS = 3
API_CALL_DELAY_MS = {min: 0, max: 50}
API_CACHE_WINDOW_MS = 15000  // 15 seconds
BASIC_WATCHLIST_PREFETCH_COUNT = 3
MATRIX_DAYS_PER_PAGE = 40
MAX_LOGS = 500
```

## Routing (TanStack Router)

- File-based routing in `src/routes/`
- Route tree auto-generated to `src/routeTree.gen.ts`
- `__root.tsx` contains all provider wrappers
- Routes: `/` (home), `/ai` (AI context builder), `/matrix`, `/chart`, `/demo/*`

## UI Components (Shadcn)

Use this command to add new components:
```bash
pnpx shadcn@latest add [component]
```

Shadcn components are in `src/components/ui/`

## LocalStorage Keys

Defined in `src/lib/constants.ts`:
- `CUSTOM_WATCHLISTS_STORAGE_KEY` - user watchlists
- `AI_SELECTED_TICKERS_STORAGE_KEY` - AI page ticker selection
- `MATRIX_OPEN_SECTORS_STORAGE_KEY` - MarketMatrix collapsed/expanded state
- Chart settings persisted by ChartSettingsContext

## Environment Variables

```bash
VITE_GA_MEASUREMENT_ID  # Google Analytics tracking ID (optional)
```

**API URLs:**
- Development: `/aipriceaction-api` (Vite proxy to `localhost:3000`)
- Production: `https://api.aipriceaction.com`

## Important Patterns

### 1. Logging API Calls
Always use the wrapper that logs:
```typescript
const { getTickers } = useAPI()  // ✅ Logged
// vs
import { getTickers } from '@/lib/api-client'  // ❌ Not logged (use only in routes)
```

**Signature & Response:**
```typescript
// APIContext.getTickers signature
getTickers(source: string, params?: TickersQueryParams) => Promise<Record<string, StockData[]>>

// Usage example
const response = await getTickers('ComponentName.action', {
  symbol: 'VNINDEX',
  limit: 1,
  mode: 'vn'
})
const data = response['VNINDEX'] // Access by ticker symbol
```

**Common mistakes:**
- ❌ Missing source string: `getTickers({ symbol: 'VNINDEX' })`
- ❌ Wrong response access: `response.data`
- ✅ Correct: `getTickers('Source', { symbol: 'VNINDEX' })` then `response['VNINDEX']`

### 2. Smart Caching in TickerContext
- Tracks recent requests: `Map<"ticker:interval", timestamp>`
- Skips random delay if request was made within 15 seconds
- Prevents memory leak by limiting map to 10 entries

### 3. Error Handling
Use custom error types from SDK:
```typescript
try {
  const data = await getTickers(...)
} catch (error) {
  if (error instanceof RateLimitError) {
    // Handle rate limit
  } else if (error instanceof APIError) {
    // Handle API error
  }
}
```

### 4. Moving Average Visibility Logic
In `ChartSettingsContext`, MA visibility is **interval-dependent**:
- Short intervals (<1H): MA10, 20, 50 enabled by default
- Longer intervals: MA100 also enabled
- MA200 always hidden by default (too noisy)

### 5. RefreshContext Integration
When adding new components that fetch data:
1. Import `useRefresh()` hook
2. Extract `lastRefresh` value
3. Add to useEffect dependency array
4. Component will now auto-refresh every 30 seconds when enabled

## Translations (i18n)

- English & Vietnamese support
- Translations in `src/translations/`
- Use `useTranslation()` hook: `const { t, language } = useTranslation()`
- Key format: `t('common.aiContext.title')`

## Performance Optimizations

1. **CSV vs JSON**: API defaults to CSV (faster parsing for large datasets)
2. **Random delays**: 0-50ms on API calls to prevent thundering herd
3. **Smart caching**: Skip delay for likely-cached requests (<15s old)
4. **Prefetching**: BasicWatchList prefetches next 3 tickers for navigation
5. **Ref-based logs**: LogsContext uses refs + minimal state updates
6. **MarketMatrix optimization**: When "ALL" watchlist selected, omit symbol parameter to avoid super long URLs (API returns all tickers when symbol is undefined)

## Recent Work Context

Recent commits focused on:
- Logs tab enhancements (search filter, copy filtered logs)
- MarketMatrix optimization (eliminate redundant VNINDEX calls)
- RefreshContext integration across all data-fetching components

## Common Pitfalls

1. **Don't break context provider order** in `__root.tsx`
2. **Don't forget to normalize timestamps** from API before storing
3. **Don't use console.log for API calls** - use LogsContext
4. **Don't forget `lastRefresh`** when adding new data-fetching components
5. **Remember the 15-second cache window** in TickerContext when debugging "stale" data
