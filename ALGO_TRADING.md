# Algo Trading System Design

## Overview

A browser-based algorithmic trading backtesting engine. Users select or write JavaScript strategies that run entirely client-side against historical OHLCV data from the AIPriceAction API. The system renders buy/sell signals as markers on TradingView charts — reusing the existing playground marker infrastructure.

**Key constraints:**
- No backend — execution happens in the browser via `new Function()`
- SDK is injected into user scripts as a bridge (no direct system access)
- Strategies stored in a single localStorage key, import/export as JSON
- Predefined strategies ship with the app; users can create/edit/delete custom ones

---

## 1. Architecture

The page lives at `/algo` with a query parameter `?mode=edit|report|live` controlling which view is shown. A sub-nav bar at the top lets users switch between modes.

### Page Modes

| Mode | URL | Purpose | Primary Audience |
|------|-----|---------|-----------------|
| **Edit** | `/algo?mode=edit` | Write & debug strategies | Developer / Quant |
| **Report** | `/algo?mode=report` | Backtest results & statistics | Investor |
| **Live** | `/algo?mode=live` | Real-time signal scanner | Active Trader |

**Default mode:** `edit` (when no `?mode=` param).

### File Structure

```
src/
├── routes/
│   ├── algo.tsx                        # Dashboard route
│   ├── algo.$id.tsx                    # Redirect to /algo/:id/report
│   ├── algo.$id.edit.tsx               # Edit mode route
│   ├── algo.$id.report.tsx             # Report mode route
│   └── algo.$id.live.tsx               # Live mode route
├── components/
│   └── algo/
│       ├── AlgoSubNav.tsx              # [Edit] [Report] [Live] tab navigation
│       ├── AlgoDashboard.tsx           # Dashboard: gallery of strategy cards
│       ├── AlgoStrategyCard.tsx        # Single strategy card for dashboard
│       │
│       ├── edit/
│       │   ├── AlgoEditMode.tsx        # Main edit view (orchestrator)
│       │   ├── AlgoCodeEditor.tsx      # CodeMirror editor
│       │   ├── AlgoTestRun.tsx         # Quick test: ticker + interval + run button
│       │   └── AlgoConsoleLog.tsx      # Console output from sdk.log()
│       │
│       ├── report/
│       │   ├── AlgoReportMode.tsx      # Main report view (orchestrator)
│       │   ├── AlgoReportConfig.tsx    # Config form: algorithm, date ranges, capital
│       │   ├── AlgoChart.tsx           # Chart with buy/sell markers
│       │   ├── AlgoResultsSummary.tsx  # KPI cards: win rate, P&L, drawdown
│       │   └── AlgoTradeLog.tsx        # Table of all trades (TanStack Table)
│       │
│       └── live/
│           ├── AlgoLiveMode.tsx        # Main live view (orchestrator)
│           ├── AlgoLiveConfig.tsx      # Ticker list, algorithm, interval picker
│           └── AlgoLiveSignalList.tsx  # Dashboard of current signals
│
├── lib/
│   ├── algo-sdk.ts                    # SDK injected into user scripts
│   ├── algo-runner.ts                 # new Function() execution engine
│   ├── algo-storage.ts                # localStorage CRUD + import/export
│   ├── algo-types.ts                  # TypeScript types
│   ├── algo-indicators.ts             # Pure indicator functions (sma, ema, rsi, ...)
│   └── algo-predefined.ts             # Built-in strategy definitions
└── hooks/
    └── useAlgoRunner.ts               # React hook wrapping the execution engine
```

---

## 2. Data Model

### 2.1 Strategy

```typescript
interface AlgoStrategy {
  id: string                       // UUID
  name: string                     // Display name
  description: string              // Short description
  code: string                     // JavaScript source (must define main())
  isBuiltIn: boolean               // true = predefined, false = user-created
  dataSplits: AlgoDataSplit        // Training/validation/testing date ranges
  createdAt: string                // ISO timestamp
  updatedAt: string                // ISO timestamp
}
```

### 2.2 Execution Result

```typescript
type DataSplitName = 'training' | 'validation' | 'testing'

interface AlgoTrade {
  symbol: string
  entryDate: string                // "2025-01-15"
  entryPrice: number
  exitDate: string | null          // null if still open
  exitPrice: number | null
  side: 'long' | 'short'
  pnl: number                      // in points (close - open)
  pnlPercent: number
  rMultiple: number | null         // (exit - entry) / (entry - stoploss)
  stoploss: number | null
}

interface AlgoResult {
  split: DataSplitName              // Which split this result belongs to
  dateRange: { start: string; end: string }
  trades: AlgoTrade[]
  totalTrades: number
  winRate: number                  // 0-1
  totalPnL: number
  avgPnL: number
  bestTrade: AlgoTrade | null
  worstTrade: AlgoTrade | null
  profitFactor: number             // gross profit / gross loss
  maxDrawdown: number              // peak-to-trough in points
  sharpeRatio: number | null       // simplified
  executionTimeMs: number
  errors: string[]                 // runtime errors collected during execution
}
```

### 2.3 SDK Context (injected into user script)

```typescript
interface AlgoSDK {
  // Data access
  getTicker(symbol: string): StockData[]
  getAllSymbols(): string[]

  // Indicators (computed on-the-fly from OHLCV)
  sma(data: StockData[], period: number): (number | null)[]
  ema(data: StockData[], period: number): (number | null)[]
  rsi(data: StockData[], period: number): (number | null)[]
  macd(data: StockData[], fast: number, slow: number, signal: number): { macd: number[], signal: number[], histogram: number[] }
  atr(data: StockData[], period: number): (number | null)[]
  bbands(data: StockData[], period: number, stdDev: number): { upper: number[], middle: number[], lower: number[] }
  highest(data: StockData[], period: number, field?: 'high' | 'close' | 'low'): (number | null)[]
  lowest(data: StockData[], period: number, field?: 'high' | 'close' | 'low'): (number | null)[]
  crossAbove(a: number[], b: number[]): boolean[]
  crossBelow(a: number[], b: number[]): boolean[]

  // Order placement
  buy(symbol: string, date: string, qty?: number, stoploss?: number): void
  sell(symbol: string, date: string, qty?: number, stoploss?: number): void

  // Logging (shows in AlgoExecutionLog panel)
  log(...args: any[]): void
  info(...args: any[]): void
  warn(...args: any[]): void

  // Configuration (user reads these)
  params: Record<string, number | string | boolean>
}
```

---

## 3. Execution Engine

### 3.1 SDK Creation

The SDK is created fresh for each execution. It receives pre-fetched `StockData[]` and collects orders into an internal array.

```typescript
// lib/algo-sdk.ts
export function createAlgoSDK(
  marketData: Record<string, StockData[]>,
  options: { params?: Record<string, any> } = {}
): AlgoSDK {
  const trades: AlgoTrade[] = []
  const logs: { level: string; args: any[] }[] = []

  const sdk: AlgoSDK = {
    getTicker(symbol) {
      return marketData[symbol] || []
    },
    getAllSymbols() {
      return Object.keys(marketData)
    },

    // Indicators are pure functions — no API calls
    sma, ema, rsi, macd, atr, bbands, highest, lowest, crossAbove, crossBelow,

    buy(symbol, date, qty = 1, stoploss = null) {
      const data = marketData[symbol]
      if (!data) { logs.push({ level: 'error', args: [`Unknown symbol: ${symbol}`] }); return }
      const bar = data.find(d => d.time.startsWith(date))
      if (!bar) { logs.push({ level: 'error', args: [`No data for ${symbol} on ${date}`] }); return }
      trades.push({
        symbol, entryDate: date, entryPrice: bar.close,
        exitDate: null, exitPrice: null,
        side: 'long', pnl: 0, pnlPercent: 0,
        rMultiple: null, stoploss,
      })
    },

    sell(symbol, date, qty = 1, stoploss = null) {
      // Same as buy but side: 'short'
      // ...
    },

    log(...args) { logs.push({ level: 'log', args }) },
    info(...args) { logs.push({ level: 'info', args }) },
    warn(...args) { logs.push({ level: 'warn', args }) },

    params: options.params || {},
  }

  return sdk
}
```

### 3.2 Execution via `new Function()`

```typescript
// lib/algo-runner.ts
export function executeAlgo(
  code: string,
  marketData: Record<string, StockData[]>,
  params?: Record<string, any>
): { result: AlgoResult | null; logs: LogEntry[]; error: string | null } {
  const startTime = performance.now()
  const logs: LogEntry[] = []

  try {
    const sdk = createAlgoSDK(marketData, { params })

    const fn = new Function(
      'sdk',
      // Block access to globals
      'window', 'document', 'fetch', 'XMLHttpRequest', 'importScripts',
      'eval', 'Function', 'setTimeout', 'setInterval',
      // Desctructure sdk for user convenience
      `
        "use strict";
        const { getTicker, getAllSymbols, sma, ema, rsi, macd, atr,
                bbands, highest, lowest, crossAbove, crossBelow,
                buy, sell, log, info, warn, params } = sdk;

        ${code}

        if (typeof main === 'function') {
          return main();
        }
        throw new Error('Script must define a main() function');
      `
    )

    fn(sdk, undefined, undefined, undefined, undefined, undefined,
       undefined, undefined, undefined, undefined)

    const elapsed = performance.now() - startTime

    // Post-process: match buy/sell pairs into trades
    const result = postProcessTrades(sdk.__trades, marketData, elapsed)

    return { result, logs: sdk.__logs, error: null }
  } catch (err) {
    return {
      result: null,
      logs,
      error: err instanceof Error ? err.message : String(err),
    }
  }
}
```

### 3.3 Sandbox Security

The `new Function()` approach blocks direct access to `window`, `document`, `fetch`, etc. by passing `undefined` for those parameters. The user's code can only access what is explicitly destructured from `sdk`.

**Limitations (acceptable for this use case):**
- `new Function()` runs in the main thread — long-running scripts will freeze the UI
- A Web Worker would be better but adds complexity with SDK serialization. Defer to V2.
- Users can still access prototype chains, but that's a low-priority concern for a personal trading tool.

**V2 consideration:** Move execution to a Web Worker with `postMessage` for true isolation. The SDK would need to be serialized or the worker would need access to indicator functions.

---

## 4. Post-Processing: Trade Matching

After `main()` executes, the SDK has collected a flat list of buy/sell orders. These need to be matched into round-trip trades:

```typescript
function postProcessTrades(
  orders: AlgoOrder[],
  marketData: Record<string, StockData[]>,
  executionTimeMs: number
): AlgoResult {
  // Group orders by symbol
  // Match buy→sell pairs chronologically per symbol
  // Calculate PnL for each round trip
  // If last order is unmatched (buy without sell), mark as "open"
  // Calculate aggregate stats: win rate, profit factor, max drawdown
}
```

**Matching rules:**
1. Group by symbol
2. Sort by date
3. Match buys with sells in FIFO order
4. Unmatched buys at end = open positions
5. Short trades: sell first, then buy to close (optional for V1 — can start with long-only)

---

## 5. User Script Contract

Every strategy must export a `main()` function. The function receives no arguments — it uses SDK globals.

### Example: MA Crossover

```javascript
function main() {
  const symbol = params.symbol || 'VCB'
  const fastPeriod = params.fastPeriod || 10
  const slowPeriod = params.slowPeriod || 20
  const data = getTicker(symbol)

  if (data.length < slowPeriod) {
    warn('Not enough data')
    return
  }

  const fastMA = sma(data, fastPeriod)
  const slowMA = sma(data, slowPeriod)
  const crosses = crossAbove(fastMA, slowMA)
  const crossesDown = crossBelow(fastMA, slowMA)

  let inPosition = false

  for (let i = 0; i < data.length; i++) {
    const date = data[i].time.split('T')[0]

    if (crosses[i] && !inPosition) {
      buy(symbol, date, 1, data[i].low * 0.97) // 3% stop-loss
      inPosition = true
      log(`BUY ${symbol} on ${date} at ${data[i].close}`)
    } else if (crossesDown[i] && inPosition) {
      sell(symbol, date, 1)
      inPosition = false
      log(`SELL ${symbol} on ${date} at ${data[i].close}`)
    }
  }
}
```

### Example: Break 20 Days High

```javascript
function main() {
  const symbol = params.symbol || 'VCB'
  const data = getTicker(symbol)
  const lookback = params.lookback || 20

  const highests = highest(data, lookback, 'high')
  let inPosition = false

  for (let i = lookback; i < data.length; i++) {
    const date = data[i].time.split('T')[0]

    // Break above highest of last N days
    if (data[i].close > (highests[i - 1] || 0) && !inPosition) {
      buy(symbol, date, 1, data[i].low * 0.95)
      inPosition = true
      log(`BUY: breakout on ${date} at ${data[i].close}`)
    }

    // Exit after N days (time-based stop) or use trailing stop
    if (inPosition) {
      const entryBar = getTicker(symbol).findIndex(d => d.time.startsWith(date))
      // Simple: exit if close below 10-day low
      const lows = lowest(data, 10, 'low')
      if (data[i].close < (lows[i] || 0)) {
        sell(symbol, date, 1)
        inPosition = false
        log(`SELL: stop on ${date} at ${data[i].close}`)
      }
    }
  }
}
```

---

## 6. Predefined Strategies

Shipped in `algo-predefined.ts`, not stored in localStorage (read-only in UI).

| Name | Logic | Default Params |
|------|-------|----------------|
| MA Crossover | Buy on fast MA crosses above slow MA, sell on cross below | fast=10, slow=20 |
| Breakout | Buy when close breaks N-day high | lookback=20 |
| RSI Oversold | Buy when RSI < 30, sell when RSI > 70 | period=14 |
| Volume Spike | Buy when volume > N * avg(20), close > open | multiplier=2 |
| MA Bounce | Buy when price touches MA20 and bounces | period=20 |
| Donchian Channel | Buy on upper band break, sell on lower band break | period=20 |

Each predefined strategy has:
- A unique `id` (never changes)
- `isBuiltIn: true`
- Default `params` object

---

## 7. Storage (localStorage)

Single key: `ALGO_STRATEGIES_STORAGE_KEY` = `'algo-strategies'`

### Schema

```typescript
// What's stored:
interface AlgoStorage {
  customStrategies: AlgoStrategy[]    // User-created strategies only
  selectedStrategyId: string | null   // Currently selected strategy
}

// Combined view = [...predefined, ...storage.customStrategies]
```

### Import/Export

```typescript
function exportStrategies(): string {
  const storage = loadStorage()
  return JSON.stringify(storage, null, 2)
}

function importStrategies(json: string): { imported: number; errors: string[] } {
  // Parse JSON, validate each strategy has required fields
  // Merge with existing (skip duplicates by id)
  // Return count and any validation errors
}
```

Export format:
```json
{
  "version": 1,
  "exportedAt": "2025-11-09T12:00:00Z",
  "strategies": [
    {
      "id": "uuid",
      "name": "My Strategy",
      "description": "...",
      "code": "function main() { ... }",
      "createdAt": "...",
      "updatedAt": "..."
    }
  ]
}
```

---

## 8. Route & Page Design

### Routing: Dashboard + Strategy ID + Mode

`/algo` is the dashboard (gallery of all strategies). Clicking a strategy goes to `/algo/:id` which has 3 sub-tabs: Edit, Report, Live.

```
/algo                  → Dashboard (gallery of predefined + custom strategies)
/algo/:id              → Strategy detail (redirects to /algo/:id/edit)
/algo/:id/edit         → Edit mode (code editor)
/algo/:id/report       → Report mode (backtest)
/algo/:id/live         → Live mode (signal scanner)
```

**Default:** `/algo/:id` redirects to `/algo/:id/report`.

### Route Files (TanStack Router file-based)

```
src/routes/algo.tsx                      → Dashboard page
src/routes/algo.$id.tsx                  → Strategy detail (redirects to edit)
src/routes/algo.$id.edit.tsx             → Edit mode
src/routes/algo.$id.report.tsx           → Report mode
src/routes/algo.$id.live.tsx             → Live mode
```

### Sub-Navigation

When inside a strategy (`/algo/:id/*`), a tab bar appears with Edit, Report, Live. The active tab matches the current route.

```
┌──────────────────────────────────────────────────────────┐
│  ← Back to Algo Trading      [ Edit ] [ Report ] [ Live ]│
└──────────────────────────────────────────────────────────┘
```

Navigation uses `Link` components from TanStack Router. The strategy `:id` stays in the URL across all 3 tabs.

---

### 8.0 Dashboard (`/algo`)

**Purpose:** Gallery view of all available strategies — predefined and custom. This is the landing page. No code, no charts. Just a clean list of strategies with descriptions so users can browse and pick one.

```
┌──────────────────────────────────────────────────────────┐
│  Algo Trading                                            │
├──────────────────────────────────────────────────────────┤
│                                                          │
│  Predefined Strategies                                   │
│  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐    │
│  │ MA Crossover │ │ Breakout 20d │ │ RSI Oversold │    │
│  │ Fast crosses │ │ Break N-day  │ │ Buy RSI < 30 │    │
│  │ above slow.. │ │ high, sell.. │ │ sell RSI > 70│    │
│  │              │ │              │ │              │    │
│  │ [Open →]     │ │ [Open →]     │ │ [Open →]     │    │
│  └──────────────┘ └──────────────┘ └──────────────┘    │
│  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐    │
│  │ Volume Spike │ │ MA Bounce    │ │ Donchian     │    │
│  │ Vol > N*avg..│ │ Touch MA20.. │ │ Upper/Lower..│    │
│  │              │ │              │ │              │    │
│  │ [Open →]     │ │ [Open →]     │ │ [Open →]     │    │
│  └──────────────┘ └──────────────┘ └──────────────┘    │
│                                                          │
│  My Strategies                          [+ New] [Import] │
│  ┌──────────────┐ ┌──────────────┐                      │
│  │ My Custom 1  │ │ My Custom 2  │                      │
│  │ Custom desc..│ │ Another alg..│                      │
│  │              │ │              │                      │
│  │ [Open →]     │ │ [Open →]     │                      │
│  └──────────────┘ └──────────────┘                      │
│                                                          │
│  [Export All]                                            │
└──────────────────────────────────────────────────────────┘
```

**Key behaviors:**
- Strategies shown as cards in a responsive grid (3 cols desktop, 2 cols tablet, 1 col mobile).
- Each card shows: name, short description (1-2 lines), built-in badge or custom badge.
- "Open" navigates to `/algo/:id/report` (report is the default view).
- "+ New" creates a new custom strategy from the template and navigates to `/algo/:newId/edit`.
- "Import" opens a dialog to paste JSON or upload a `.json` file.
- "Export All" downloads all custom strategies as JSON.
- Built-in strategies always shown first, then custom strategies sorted by `updatedAt`.

**Mobile layout:**
- Single column, full-width cards.
- Sticky bottom bar with [+ New] and [Import] buttons.

---

### 8.1 Edit Mode (`/algo/edit` or `/algo/edit/:id`)

**Purpose:** "Laboratory" for writing and debugging strategies. Code editor is the star of the show.

```
┌──────────────────────────────────────────────────────────┐
│  Algo Trading          [ Edit ]  [ Report ]  [ Live ]    │
├─────────────┬────────────────────────────────────────────┤
│             │  ┌──────────────────────────────────────┐  │
│  Strategies │  │  // MA Crossover                      │  │
│  ─────────  │  │  function main() {                    │  │
│  ▸ Built-in │  │    const symbol = params.symbol;      │  │
│    ○ MA X   │  │    const data = getTicker(symbol);    │  │
│    ○ Break  │  │    ...                                │  │
│    ○ RSI    │  │                                      │  │
│  ▸ Custom   │  │                                      │  │
│    ○ My #1  │  │                                      │  │
│  ─────────  │  │                                      │  │
│  [+ New]    │  └──────────────────────────────────────┘  │
│  [Import]   │                                            │
│  [Export]   │                                            │
│             │  ── Data Splits ──────────────────────────  │
│             │  [Ticker: VCB ▼]  [Interval: 1D ▼]       │
│             │  Training:    [2020-01-01] → [2023-12-31]  │
│             │  Validation:  [2024-01-01] → [2024-12-31]  │
│             │  Testing:     [2025-01-01] → [now]         │
│             │                                            │
│             │  [▶ Run on Training] [▶ Run on Validation] │
│             │  [▶ Run on Testing]  [▶ Run All 3 Splits] │
│             │                                            │
│             │  ── Console ──────────────────────────────  │
│             │  > BUY VCB on 2025-01-15 at 58200         │
│             │  > SELL VCB on 2025-02-03 at 62100        │
│             │  > Training: 3 trades, 2 wins (66.7%)      │
│             │  > Validation: 1 trade, 1 win (100%)       │
│             │  > Testing: 0 trades                       │
│             │                                            │
│             │  [ Save & Run Report → ]                    │
└─────────────┴────────────────────────────────────────────┘
```

**Key behaviors:**
- Strategy list on the left (~20% width). Clicking a strategy loads its code into the editor and updates URL to `/algo/edit/:id`.
- CodeMirror editor takes ~80% of the space.
- **Data Splits bar** defines 3 non-overlapping date ranges: Training, Validation, Testing.
  - Training: where you develop and iterate on the strategy.
  - Validation: where you tune parameters and check for overfitting.
  - Testing: held-out data — the final unbiased evaluation.
  - These 3 ranges are **shared between Edit and Report** (stored per-strategy in localStorage).
  - The strategy list sidebar is removed here — the strategy is already selected via `:id` in the URL.
- **Run buttons** execute the script against the selected split's date range only. "Run All 3" runs on all 3 splits sequentially and prints a comparative summary to the console.
- Console log panel shows `sdk.log()` output and a per-split summary (trade count, win rate, P&L).
- **"Save & Run Report"** button saves the strategy to localStorage and navigates to `/algo/report/:id`.
- Built-in strategies are read-only (code shown but not editable). User must "+ New" to create a copy.
- When `/algo/edit/:id` is loaded with a built-in strategy ID, the strategy is shown in read-only mode.

**Mobile layout:**
- Strategy list becomes a dropdown/select at the top.
- Code editor fills the screen.
- Data Splits and Console in collapsible panels below the editor.
- "Save & Run Report" as a sticky bottom button.

---

### 8.2 Report Mode (`/algo/report` or `/algo/report/:id`)

**Purpose:** Detailed backtest results. For investors who care about numbers, not code. Code is hidden.

```
┌──────────────────────────────────────────────────────────┐
│  Algo Trading          [ Edit ]  [ Report ]  [ Live ]    │
├──────────────────────────────────────────────────────────┤
│  Config                                                │
│  [Ticker: VCB ▼]  [Interval: 1D ▼]  [Capital: 100M]    │
│  Data Splits (shared with Edit):                        │
│  Training:    2020-01-01 → 2023-12-31                   │
│  Validation:  2024-01-01 → 2024-12-31                   │
│  Testing:     2025-01-01 → now                          │
│  [▶ Run Backtest]                                       │
├──────────────────────────────────────────────────────────┤
│  Comparative Summary                                    │
│  ┌────────────┬──────────┬──────────┬──────────┐       │
│  │            │ Training │ Valid.   │ Testing  │       │
│  ├────────────┼──────────┼──────────┼──────────┤       │
│  │ Trades     │ 24       │ 8        │ 3        │       │
│  │ Win Rate   │ 58%      │ 50%      │ 67%      │       │
│  │ P&L        │ +12.5M   │ +3.1M    │ +1.8M    │       │
│  │ Max DD     │ -3.4M    │ -1.2M    │ -0.4M    │       │
│  │ Profit F.  │ 1.8      │ 1.4      │ 2.1      │       │
│  └────────────┴──────────┴──────────┴──────────┘       │
├──────────────────────────────────────────────────────────┤
│  [Training] [Validation] [Testing]  ← chart tabs        │
│  Chart (TradingView with buy/sell markers)              │
│  ┌──────────────────────────────────────────────────┐   │
│  │  VCB - 1D (Training)                            │   │
│  │  ▲ BUY  ▼ SELL  - - SL (dashed)                 │   │
│  │                                                  │   │
│  └──────────────────────────────────────────────────┘   │
│  [Equity Curve toggle]  [Height ▼]                      │
├──────────────────────────────────────────────────────────┤
│  Trade Log — filtered by selected split                 │
│  ┌────┬──────────┬──────┬──────────┬───────┬─────┐     │
│  │ #  │ Entry    │ Exit │ Side     │ P&L   │ R   │     │
│  ├────┼──────────┼──────┼──────────┼───────┼─────┤     │
│  │ 1  │ 01-15 VCB│ 02-03│ Long     │+3,900 │+1.3R│     │
│  │ 2  │ 03-10 VCB│ 04-22│ Long     │-1,200 │-0.4R│     │
│  │ 3  │ 05-01 VCB│ 06-15│ Long     │+5,100 │+1.7R│     │
│  └────┴──────────┴──────┴──────────┴───────┴─────┘     │
│  Showing 1-20 of 24 trades (Training split)             │
└──────────────────────────────────────────────────────────┘
```

**Key behaviors:**
- When loaded with `:id`, the strategy is pre-selected. No algorithm dropdown needed.
- **Data Splits** are the same 3 ranges defined in Edit mode. They are displayed read-only here (user goes back to Edit to change them).
- **"Run Backtest"** runs the algorithm on all 3 splits sequentially.
- **Comparative Summary** table shows KPIs side-by-side across Training, Validation, and Testing. This is the key view — lets the user instantly spot overfitting (training looks great but testing is flat).
- **Chart tabs** let the user switch which split's data/markers are shown on the chart. Default to "Training".
- **Trade Log** filters by the selected split tab. Column headers show the split name.
- **Chart** uses `TradingViewChart` with `overlay.markers` (same pattern as `PlaygroundChart`). Optional equity curve toggle.
- Trade Log is a sortable, filterable TanStack Table with columns: #, entry date, exit date, side, entry price, exit price, P&L, P&L %, R-multiple.
- "Edit Strategy" link navigates to `/algo/edit/:id`.

**Mobile layout:**
- Config and comparative summary stack vertically.
- Summary table scrolls horizontally.
- Chart full-width with scrollable height.
- Trade Log in a horizontally scrollable table or card list.

---

### 8.3 Live Mode (`/algo/live`)

**Purpose:** Real-time signal scanner. Monitor a list of tickers for signals during market hours.

```
┌──────────────────────────────────────────────────────────┐
│  Algo Trading          [ Edit ]  [ Report ]  [ Live ]    │
├──────────────────────────────────────────────────────────┤
│  Config                                                │
│  ┌────────────────────────────────────────────────────┐ │
│  │ Tickers: VCB, HPG, VNM, FPT, SSI, VPB, MWG, TCB  │ │
│  └────────────────────────────────────────────────────┘ │
│  ┌────────────┐ ┌────────────┐ ┌──────────────────────┐ │
│  │Algorithm:  │ │ Interval:  │ │ Auto-refresh: [ON]   │ │
│  │ MA Xover ▼ │ │ 1D    ▼    │ │ Every: 30s     ▼     │ │
│  └────────────┘ └────────────┘ └──────────────────────┘ │
│  [▶ Start Scanning]   Last scan: 14:35:02               │
├──────────────────────────────────────────────────────────┤
│  Signals (8 tickers scanned, 3 signals found)            │
│  ┌──────────────────────────────────────────────────┐   │
│  │ VCB  │ BUY  │ MA Cross  │ 58,200 │ 14:35:02     │   │
│  │ HPG  │ BUY  │ RSI < 30  │ 28,500 │ 14:35:02     │   │
│  │ SSI  │ SELL │ Break DN  │ 22,100 │ 14:35:02     │   │
│  └──────────────────────────────────────────────────┘   │
├──────────────────────────────────────────────────────────┤
│  No Signal Tickers                                      │
│  VNM — HOLD  │  FPT — HOLD  │  VPB — HOLD  │  MWG — HOLD│
│  TCB — HOLD                                            │
└──────────────────────────────────────────────────────────┘
```

**Key behaviors:**
- User enters a comma-separated list of tickers (or picks from a predefined watchlist).
- Picks an algorithm and interval.
- "Start Scanning" fetches data for all tickers and runs the algorithm on each.
- Results split into **Signals** (buy/sell generated on the LAST bar) and **No Signal** (ticker holds current position or has no signal).
- **Auto-refresh** uses `RefreshContext` integration: re-fetches and re-runs on each refresh cycle.
- Clicking a ticker row navigates to the chart page or opens a mini-chart.
- The "signal" is determined by checking if the algorithm's last action was a `buy()` or `sell()` on the most recent bar.
- Selected strategy ID is stored in `localStorage` (not URL) since there's no `:id` param on this route.

**How Live Mode determines signals:**
```typescript
// After executing the algo, check the LAST order per symbol
function extractSignals(trades: AlgoTrade[]): AlgoSignal[] {
  // Group by symbol, get the last trade
  // If last trade is 'buy' with no matching sell → SIGNAL: BUY
  // If last trade is 'sell' (and was closing a long) → SIGNAL: SELL
  // If no trades or fully closed → NO SIGNAL (HOLD)
}
```

**Mobile layout:**
- Config form stacks vertically.
- Signals as swipeable cards.
- No-signal tickers collapsed by default.

---

### Mode Transitions

```
/algo                   → Dashboard (gallery of strategies)
/algo/:id               → redirects to /algo/:id/report

/algo/:id/edit          → Edit strategy code, quick test
/algo/:id/report        → Run backtest, view results (DEFAULT)
/algo/:id/live          → Scan for live signals

Edit  ──[Save & Run Report]──→ Report (same :id)
Report ──[Edit Strategy]─────→ Edit (same :id)
Report ──[Scan Live]─────────→ Live (same :id)
Live ───[Edit Strategy]──────→ Edit (same :id)
Any tab ──[← Back]───────────→ Dashboard /algo
```

### localStorage Keys for Live Mode

```typescript
// Remember the last-selected strategy and config for Live Mode
ALGO_LIVE_STRATEGY_ID_KEY = 'algo-live-strategy-id'
ALGO_LIVE_TICKERS_KEY = 'algo-live-tickers'
ALGO_LIVE_INTERVAL_KEY = 'algo-live-interval'
```

---

## 9. Code Editor

**Using `@uiw/react-codemirror` (CodeMirror 6).** Lightweight, modular, supports JavaScript syntax highlighting, line numbers, bracket matching, and dark theme.

### Install

```bash
pnpm add @uiw/react-codemirror @codemirror/lang-javascript @uiw/codemirror-theme-vscode
```

### Usage

```tsx
import CodeMirror from '@uiw/react-codemirror';
import { javascript } from '@codemirror/lang-javascript';
import { vscodeDark } from '@uiw/codemirror-theme-vscode';

<CodeMirror
  value={code}
  height="400px"
  theme={vscodeDark}
  extensions={[javascript({ jsx: true })]}
  onChange={(value) => setCode(value)}
/>
```

### Features (out of the box)
- JavaScript syntax highlighting
- Line numbers
- Bracket matching and auto-closing
- Active line highlighting
- Dark theme (vscodeDark)
- Responsive height

### V2 enhancement: SDK autocomplete

Add a custom CodeMirror completion source that suggests SDK functions (`getTicker`, `sma`, `ema`, `rsi`, `buy`, `sell`, etc.) with inline documentation. This uses CodeMirror 6's `autocompletion` extension.

### Template

```javascript
// {{strategyName}}
// {{description}}

function main() {
  const symbol = params.symbol || 'VCB';
  const data = getTicker(symbol);

  if (data.length < 20) {
    warn('Not enough data');
    return;
  }

  // Your logic here
  for (let i = 0; i < data.length; i++) {
    const date = data[i].time.split('T')[0];
    const bar = data[i];

    // Example: buy when RSI < 30
    // const rsiValues = rsi(data, 14);
    // if (rsiValues[i] < 30) {
    //   buy(symbol, date, 1, bar.low * 0.95);
    // }
  }
}
```

---

## 10. Indicators Library

Pure functions in `lib/algo-indicators.ts`. No external dependencies.

### SMA

```typescript
export function sma(data: StockData[], period: number): (number | null)[] {
  return data.map((_, i) => {
    if (i < period - 1) return null
    let sum = 0
    for (let j = i - period + 1; j <= i; j++) sum += data[j].close
    return sum / period
  })
}
```

### EMA

```typescript
export function ema(data: StockData[], period: number): (number | null)[] {
  const result: (number | null)[] = []
  const k = 2 / (period + 1)

  for (let i = 0; i < data.length; i++) {
    if (i < period - 1) { result.push(null); continue }
    if (i === period - 1) {
      let sum = 0
      for (let j = 0; j < period; j++) sum += data[j].close
      result.push(sum / period)
      continue
    }
    result.push(data[i].close * k + (result[i - 1]!) * (1 - k))
  }
  return result
}
```

### RSI

```typescript
export function rsi(data: StockData[], period: number = 14): (number | null)[] {
  const result: (number | null)[] = []
  let avgGain = 0, avgLoss = 0

  for (let i = 0; i < data.length; i++) {
    if (i === 0) { result.push(null); continue }

    const change = data[i].close - data[i - 1].close
    const gain = change > 0 ? change : 0
    const loss = change < 0 ? -change : 0

    if (i <= period) {
      avgGain += gain
      avgLoss += loss
      if (i === period) {
        avgGain /= period
        avgLoss /= period
        const rs = avgLoss === 0 ? 100 : avgGain / avgLoss
        result.push(100 - 100 / (1 + rs))
      } else {
        result.push(null)
      }
    } else {
      avgGain = (avgGain * (period - 1) + gain) / period
      avgLoss = (avgLoss * (period - 1) + loss) / period
      const rs = avgLoss === 0 ? 100 : avgGain / avgLoss
      result.push(100 - 100 / (1 + rs))
    }
  }
  return result
}
```

### Other indicators

- `macd(data, fast=12, slow=26, signal=9)` — returns { macd[], signal[], histogram[] }
- `atr(data, period=14)` — Average True Range
- `bbands(data, period=20, stdDev=2)` — Bollinger Bands
- `highest(data, period, field='high')` — Rolling highest
- `lowest(data, period, field='low')` — Rolling lowest
- `crossAbove(a[], b[])` — Returns true when a crosses above b
- `crossBelow(a[], b[])` — Returns true when a crosses below b

All functions operate on `StockData[]` and return arrays of the same length (with `null` for insufficient data periods).

---

## 11. Chart Integration

Reuses `TradingViewChart` component with the `overlay` prop — same pattern as `PlaygroundChart`.

### Marker Generation

```typescript
function tradesToMarkers(trades: AlgoTrade[]): SeriesMarker<Time>[] {
  const markers: SeriesMarker<Time>[] = []

  for (const trade of trades) {
    // Entry marker
    const entryTime = toVietnamUnixTime(parseUTCISOString(trade.entryDate)) as Time
    markers.push({
      time: entryTime,
      position: trade.side === 'long' ? 'belowBar' : 'aboveBar',
      shape: trade.side === 'long' ? 'arrowUp' : 'arrowDown',
      color: trade.side === 'long' ? '#22c55e' : '#ef4444',
      text: `B ${trade.entryPrice.toFixed(2)}`,
    })

    // Exit marker (if closed)
    if (trade.exitDate && trade.exitPrice != null) {
      const exitTime = toVietnamUnixTime(parseUTCISOString(trade.exitDate)) as Time
      const color = trade.pnl >= 0 ? '#22c55e' : '#ef4444'
      markers.push({
        time: exitTime,
        position: trade.pnl >= 0 ? 'belowBar' : 'aboveBar',
        shape: trade.pnl >= 0 ? 'arrowUp' : 'arrowDown',
        color,
        text: `${trade.pnl >= 0 ? '+' : ''}${trade.pnl.toFixed(2)}`,
      })
    }
  }

  markers.sort((a, b) => (a.time as number) - (b.time as number))
  return markers
}
```

### Price Lines

Open positions render stop-loss lines (dashed red) — same pattern as `PlaygroundChart`.

---

## 12. Data Fetching Flow

```
User selects strategy + ticker + interval + date range
          │
          ▼
Run button clicked
          │
          ▼
AlgoRunControls fetches data via APIContext.getTickers()
  symbol: 'VCB', interval: '1D', limit: 256, end_date: '...'
          │
          ▼
Data stored in component state: Record<string, StockData[]>
          │
          ▼
executeAlgo(code, marketData, params) called
          │
          ▼
SDK created with market data, indicators registered
          │
          ▼
new Function() executes user's main()
  → main() calls buy(), sell(), log(), getTicker(), sma(), etc.
          │
          ▼
Post-process: match orders into trades, calculate stats
          │
          ▼
AlgoChart renders markers on TradingViewChart
AlgoResultsPanel shows summary
AlgoExecutionLog shows sdk.log() output
```

**Important:** The data is fetched ONCE before execution. The user's script does NOT make API calls. The `getTicker()` in the SDK only reads from the pre-fetched data object.

---

## 13. Parameters System

Each strategy can define configurable parameters. These are presented as form fields in the UI.

### Strategy Metadata Convention

Strategy code can optionally export a `getParams()` function that returns parameter definitions:

```javascript
function getParams() {
  return [
    { key: 'symbol', label: 'Ticker', type: 'text', default: 'VCB' },
    { key: 'fastPeriod', label: 'Fast MA Period', type: 'number', default: 10 },
    { key: 'slowPeriod', label: 'Slow MA Period', type: 'number', default: 20 },
  ]
}
```

### Parameter Types

| Type | UI Control | Notes |
|------|-----------|-------|
| `text` | Input | For symbol names |
| `number` | Input (number) | With min/max optional |
| `select` | Dropdown | With `options: [{value, label}]` |
| `boolean` | Toggle switch | Checkbox |

If `getParams()` is not defined, the strategy uses `params` as-is (or an empty object).

---

## 14. Data Splits (Training / Validation / Testing)

Each strategy stores 3 non-overlapping date ranges. These are shared across Edit and Report modes.

### Why 3 splits?

This follows the standard ML framework:

| Split | Purpose | How to use |
|-------|---------|-----------|
| **Training** | Develop and iterate on your strategy | Edit mode: run scripts here, iterate fast |
| **Validation** | Tune parameters, check for overfitting | Edit mode: confirm strategy isn't curve-fit |
| **Testing** | Final unbiased evaluation | Report mode: the "real" performance number |

If Training win rate is 70% but Testing is 40%, the strategy is overfit.

### Data Model

```typescript
interface AlgoDataSplit {
  training: { start: string; end: string }    // e.g., { start: '2020-01-01', end: '2023-12-31' }
  validation: { start: string; end: string }   // e.g., { start: '2024-01-01', end: '2024-12-31' }
  testing: { start: string; end: string }     // e.g., { start: '2025-01-01', end: '' }
}
```

- Splits are stored **per-strategy** in the `AlgoStrategy` object.
- If a split's `end` is empty, it defaults to "today".
- Default splits when creating a new strategy:
  - Training: last 4 years (e.g., 2021→2024)
  - Validation: last 1 year (e.g., 2025)
  - Testing: empty (user must explicitly set this)

### Data Fetching

When "Run All 3 Splits" is clicked:
1. Fetch data once covering the full date range (training.start → testing.end)
2. Slice the `StockData[]` into 3 arrays based on the split dates
3. Execute the algorithm 3 times (once per split)
4. Return 3 `AlgoResult` objects for comparison

```typescript
function splitData(
  data: StockData[],
  splits: AlgoDataSplit
): { training: StockData[], validation: StockData[], testing: StockData[] } {
  const parse = (d: string) => d.split('T')[0]
  return {
    training: data.filter(d => {
      const date = parse(d.time)
      return date >= splits.training.start && date <= splits.training.end
    }),
    validation: data.filter(d => {
      const date = parse(d.time)
      return date >= splits.validation.start && date <= splits.validation.end
    }),
    testing: data.filter(d => {
      const date = parse(d.time)
      return date >= splits.testing.start && (date <= splits.testing.end || !splits.testing.end)
    }),
  }
}
```

### Run Configuration

Before running, the user also configures:

1. **Ticker** (required) — e.g., `VCB`
2. **Interval** (required) — `1D`, `1W`, `1h`, etc.
3. **Capital** (for Report mode) — e.g., `100,000,000` VND
4. **Strategy parameters** — from `getParams()` definitions

The UI fetches data and then calls the execution engine. There is no "paper trading" or live execution mode in V1.

---

## 15. Error Handling

| Error Type | Source | Handling |
|-----------|--------|----------|
| Syntax error | `new Function()` | Caught, displayed in execution log |
| Runtime error | User code throws | Caught, displayed in execution log |
| Missing `main()` | No main function | Explicit error message |
| Unknown symbol | `getTicker('BAD')` | Logged as warning, returns empty array |
| No data for date | `buy('VCB', '2020-01-01')` but no bar | Logged as error, order skipped |
| Infinite loop | User code never returns | **V1:** No timeout. **V2:** Web Worker with `terminate()` |
| Division by zero | Indicator math | Returns `null` for that bar |

---

## 16. Constants (to add to `constants.ts`)

```typescript
export const ALGO_STRATEGIES_STORAGE_KEY = 'algo-strategies'
export const ALGO_EXECUTION_TIMEOUT_MS = 10000  // V2: Web Worker timeout
export const ALGO_MAX_LOG_ENTRIES = 500
```

---

## 17. Implementation Phases

### Phase 1: Core (this branch)
- Routes: `/algo` (dashboard), `/algo/:id` (redirect), `/algo/:id/edit`, `/algo/:id/report`, `/algo/:id/live`
- Sub-nav component (Edit / Report / Live tabs with back link)
- Dashboard: gallery of strategy cards (predefined + custom)
- Strategy storage (localStorage CRUD + import/export)
- Predefined strategies (MA Crossover, Breakout, RSI)
- SDK with basic indicators (sma, ema, rsi, highest, lowest, crossAbove, crossBelow)
- Execution engine (`new Function()` with sandbox)
- **Report mode**: chart with buy/sell markers, summary KPIs, trade log table
- **Edit mode**: CodeMirror editor, quick test, console log
- **Live mode**: signal scanner (basic — manual trigger, no auto-refresh yet)

### Phase 2: Enhancements
- More indicators (macd, atr, bbands)
- Parameters UI (auto-generated from `getParams()`)
- More predefined strategies
- Live mode auto-refresh (RefreshContext integration)
- Trade log table (sortable, filterable)
- Equity curve overlay on chart
- SDK autocomplete in CodeMirror
- Walk-forward analysis using the 3-split framework

### Phase 3: Advanced
- Web Worker execution (true isolation, timeout)
- Multi-symbol strategies
- Portfolio-level backtesting (multiple tickers)
- Monte Carlo simulation
- Walk-forward analysis
- Strategy comparison (run multiple strategies side by side)

---

## 18. Open Questions

1. **Short selling?** Vietnamese stock market has limited short selling. Should we support short strategies in V1?
   - Suggestion: Long-only for V1. Short can be added as a flag in V2.

2. **Position sizing?** Should the SDK support portfolio-level position sizing (fixed %, Kelly criterion)?
   - Suggestion: V1 uses fixed quantity (default 1). V2 adds sizing options.

3. **Commission/slippage model?** Should we deduct simulated costs from P&L?
   - Suggestion: Add optional `commission` and `slippage` params in V2. V1 shows raw P&L.

4. **Chart price lines for stop-loss?** Should open trade stop-losses render as dashed lines like in PlaygroundChart?
   - Yes, reuse the same pattern.

5. **Indicator caching?** Should `sma(data, 20)` cache results if called twice with same args?
   - V1: No caching (scripts are short). V2: WeakMap cache if needed.

---

## 19. Relation to Existing Playground

The existing `/backtesting` route (Playground) is for **manual** step-by-step trading simulation where the user manually places orders while navigating through historical data. It's a learning/practice tool.

The `/algo` route is for **automated** strategy backtesting where a script generates all buy/sell signals at once and the results are displayed.

**Shared infrastructure:**
- `TradingViewChart` with `overlay.markers` and `overlay.priceLines`
- `toVietnamUnixTime()` / `parseUTCISOString()` for time conversion
- `StockData` type from the API client
- `APIContext.getTickers()` for data fetching
- `SafeLocalStorage` for persistence

**Not shared:**
- PlaygroundContext — algo trading has its own state
- PlaygroundOrderBook — algo trading auto-generates orders from scripts
- Step-by-step navigation — algo trading processes all bars at once
