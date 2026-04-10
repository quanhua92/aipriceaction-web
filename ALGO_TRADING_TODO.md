# Algo Trading — Implementation Phases

10-phase roadmap for the `/algo` system. Each phase prioritizes low-hanging fruit so you can run and iterate as early as possible. MVP is usable after Phase 2-3.

**Reference:** [ALGO_TRADING.md](./ALGO_TRADING.md) for the full system design, data model, SDK spec, and UI layouts.

---

## Phase 1: The Core Engine

**Goal:** Execute a basic JavaScript strategy and get back an array of buy/sell orders.

**Tasks:**
- [ ] Create `lib/algo-sdk.ts` — SDK bridge with `getTicker()`, `buy()`, `sell()`, `log()`
- [ ] Create `lib/algo-runner.ts` — `new Function()` sandbox execution with blocked globals
- [ ] Create `lib/algo-types.ts` — `AlgoTrade`, `AlgoResult`, `AlgoStrategy`, `AlgoDataSplit`
- [ ] Implement trade matching in `algo-runner.ts` — FIFO buy/sell pairing, P&L calculation
- [ ] Create route `src/routes/algo.$id.edit.tsx` with a basic `textarea` for code input and a "Run" button
- [ ] Wire up a hardcoded `StockData[]` (no API yet) so the engine can run end-to-end

**Deliverable:** Type `function main() { buy('VCB', '2025-01-15'); sell('VCB', '2025-02-01'); }`, click Run, see 1 trade with P&L in a log panel.

---

## Phase 2: Persistence & Built-in Strategies

**Goal:** Save strategies to localStorage and have working examples to test against.

**Tasks:**
- [ ] Create `lib/algo-storage.ts` — CRUD for `AlgoStrategy[]` in localStorage (`ALGO_STRATEGIES_STORAGE_KEY`)
- [ ] Create `lib/algo-predefined.ts` — 2 built-in strategies: **MA Crossover** and **Breakout 20-Day**
- [ ] Implement import/export as JSON with validation
- [ ] Add `@uiw/react-codemirror` with `@codemirror/lang-javascript` and `vscodeDark` theme
- [ ] Replace `textarea` with CodeMirror in Edit mode
- [ ] Create `src/routes/algo.tsx` — Dashboard page with strategy cards (grid layout)

**Deliverable:** Dashboard shows built-in strategies as cards. Click one to open Edit mode with CodeMirror. Code persists across reloads.

---

## Phase 3: Market Data Integration

**Goal:** Connect to real API data instead of hardcoded arrays.

**Tasks:**
- [ ] Integrate `APIContext.getTickers()` in Edit mode to fetch real `StockData[]` before execution
- [ ] Add ticker selector dropdown and interval picker (1D, 1W, 1h, 4h, etc.) to Edit mode
- [ ] Pass fetched data into `executeAlgo()` as the `marketData` argument
- [ ] Render `sdk.log()` output in a Console panel below the editor
- [ ] Handle loading states, API errors, and empty data gracefully
- [ ] Add `ALGO_MAX_LOG_ENTRIES = 500` cap to console output

**Deliverable:** Select VCB + 1D, run MA Crossover, see real buy/sell markers logged with actual dates and prices from API.

---

## Phase 4: Chart Visualization

**Goal:** See buy/sell signals plotted on a TradingView chart.

**Tasks:**
- [ ] Create `src/routes/algo.$id.report.tsx` — Report mode route
- [ ] Create `components/algo/report/AlgoChart.tsx` — wrapper around `TradingViewChart`
- [ ] Create `tradesToMarkers()` function — convert `AlgoTrade[]` to `SeriesMarker<Time>[]` (green up arrows for buys, red down arrows for sells)
- [ ] Render stop-loss price lines for open positions (dashed red, same pattern as `PlaygroundChart`)
- [ ] Create `AlgoSubNav.tsx` — shared [Edit] [Report] [Live] tab navigation with back arrow
- [ ] Create `src/routes/algo.$id.tsx` — redirect to `/algo/:id/report` (report is default)

**Deliverable:** Run MA Crossover on VCB, navigate to Report tab, see green/red arrows on the candlestick chart at entry/exit points.

---

## Phase 5: Report Dashboard & KPIs

**Goal:** Display quantitative performance metrics and a trade log table.

**Tasks:**
- [ ] Create `components/algo/report/AlgoResultsSummary.tsx` — KPI cards: Total Trades, Win Rate, Total P&L, Profit Factor, Max Drawdown, Avg P&L
- [ ] Create `components/algo/report/AlgoTradeLog.tsx` — TanStack Table with columns: #, Entry Date, Exit Date, Side, Entry Price, Exit Price, P&L, P&L %, R-Multiple
- [ ] Implement sorting and filtering on the trade log table
- [ ] Add initial capital input and compute P&L in both points and percentage
- [ ] Add chart height selector and equity curve toggle (stretch goal)

**Deliverable:** Full report page with summary stats at top, chart with markers in the middle, and a sortable trade log table at the bottom.

---

## Phase 6: Training / Validation / Testing Splits

**Goal:** Split historical data into 3 periods to detect overfitting.

**Tasks:**
- [ ] Add `dataSplits: AlgoDataSplit` field to `AlgoStrategy` model
- [ ] Create date range picker UI in Edit mode (3 rows: Training, Validation, Testing)
- [ ] Implement `splitData()` — slice `StockData[]` into 3 arrays based on date ranges
- [ ] Add "Run All 3 Splits" button that executes 3x and prints comparative summary to console
- [ ] Store splits per-strategy in localStorage (shared between Edit and Report)
- [ ] In Report mode, show **Comparative Summary** table (Training vs Validation vs Testing KPIs side-by-side)
- [ ] Add chart split tabs (Training / Validation / Testing) to switch which markers are displayed

**Deliverable:** Set Training=2021-2023, Validation=2024, Testing=2025. Run All 3. Report shows if the strategy overfits (Training 70% win rate, Testing 40%).

---

## Phase 7: Strategy Parameters

**Goal:** Let users tune parameters (e.g., MA period) without editing code.

**Tasks:**
- [ ] Add `params` object to SDK — user accesses via `params.fastPeriod` in their script
- [ ] Add optional `getParams()` convention in strategy code — returns parameter definitions with type, label, default
- [ ] Create auto-generated parameter form UI from `getParams()` definitions (number inputs, text inputs, toggles)
- [ ] Pass user-edited params into `new Function()` execution
- [ ] Store last-used params per strategy in localStorage

**Deliverable:** MA Crossover has `fastPeriod` and `slowPeriod` sliders. User adjusts from 10/20 to 5/50, re-runs, sees results change without touching code.

---

## Phase 8: Advanced Indicators Library

**Goal:** Provide a full technical analysis toolkit in the SDK.

**Tasks:**
- [ ] Create `lib/algo-indicators.ts` with pure functions:
  - [ ] `sma()`, `ema()` — already in design doc
  - [ ] `rsi()` — already in design doc
  - [ ] `macd()` — returns { macd[], signal[], histogram[] }
  - [ ] `atr()` — Average True Range
  - [ ] `bbands()` — Bollinger Bands (upper, middle, lower)
  - [ ] `highest()`, `lowest()` — rolling max/min over N periods
  - [ ] `crossAbove()`, `crossBelow()` — boolean crossover detection
- [ ] All functions return `(number | null)[]` with nulls for insufficient data periods
- [ ] Register all indicators in the SDK `createAlgoSDK()` function
- [ ] Add more predefined strategies: **RSI Oversold**, **Volume Spike**, **Bollinger Bounce**

**Deliverable:** User can write `const rsiVals = rsi(data, 14); if (rsiVals[i] < 30) buy(...)` in their strategy. 6+ built-in strategies available on dashboard.

---

## Phase 9: Live Scanner

**Goal:** Scan a list of tickers for real-time signals.

**Tasks:**
- [ ] Create `src/routes/algo.$id.live.tsx` — Live mode route
- [ ] Create `components/algo/live/AlgoLiveConfig.tsx` — ticker list input (comma-separated), algorithm picker, interval picker
- [ ] Create `components/algo/live/AlgoLiveSignalList.tsx` — signals table + no-signal ticker list
- [ ] Implement `extractSignals()` — check the last trade per symbol: unmatched buy = BUY signal, unmatched sell = SELL signal, else HOLD
- [ ] Fetch data for all tickers, run algorithm on each, display results in a dashboard list
- [ ] Store live config in localStorage (`ALGO_LIVE_TICKERS_KEY`, `ALGO_LIVE_INTERVAL_KEY`)

**Deliverable:** Enter "VCB, HPG, VNM, FPT, SSI", select MA Crossover, click Scan. See a table showing which tickers currently have a BUY/SELL signal and which are HOLD.

---

## Phase 10: UX Polish & Final Features

**Goal:** Production-ready experience.

**Tasks:**
- [ ] Live mode auto-refresh via `RefreshContext` integration (re-scan on 30s cycle)
- [ ] Mobile-responsive layouts for all 3 modes (responsive grid, collapsible panels, sticky buttons)
- [ ] Equity curve overlay on chart (cumulative P&L line)
- [ ] SDK autocomplete in CodeMirror via custom completion source
- [ ] Commission and slippage model (optional deduct from P&L)
- [ ] Strategy comparison — run 2+ strategies side-by-side on the same ticker/date range
- [ ] Web Worker execution for true isolation and timeout handling
- [ ] Dashboard: filter/search strategies, built-in vs custom badges, card descriptions
- [ ] Error boundary around the execution engine (catch infinite loops, syntax errors gracefully)

**Deliverable:** Full production system with mobile support, auto-refreshing live scanner, and equity curves on charts.

---

## Phase Dependencies

```
Phase 1 (Core Engine)
    ↓
Phase 2 (Persistence)  ←── can start in parallel with Phase 3
    ↓
Phase 3 (Market Data)
    ↓
Phase 4 (Chart) ────── depends on Phase 3 (needs real data for markers)
    ↓
Phase 5 (KPIs) ─────── depends on Phase 4 (chart + stats shown together)
    ↓
Phase 6 (Data Splits) ─ depends on Phase 5 (comparative stats need KPIs)
    ↓
Phase 7 (Parameters) ─ can start after Phase 3 (independent of 4-6)
    ↓
Phase 8 (Indicators) ─ can start after Phase 3 (independent of 4-7)
    ↓
Phase 9 (Live Scanner) ─ depends on Phase 3 + Phase 8 (needs indicators + API)
    ↓
Phase 10 (Polish) ───── all above complete
```

**Fast path to MVP:** Phase 1 → 2 → 3 → 4 → 5. You have a working backtesting tool after Phase 5.

## What's NOT in scope

These are explicitly deferred beyond Phase 10:
- Multi-symbol portfolio strategies (one strategy trading multiple tickers with position sizing)
- Monte Carlo simulation
- Walk-forward optimization
- Short selling support (long-only throughout all phases)
- Kelly criterion or dynamic position sizing
- Backend execution or paper trading broker integration
