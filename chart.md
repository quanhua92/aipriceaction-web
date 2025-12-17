# BaseTradingViewChart Component Documentation

## Overview
`BaseTradingViewChart` is a comprehensive React component that wraps the Lightweight Charts library to display financial candlestick charts with volume overlays and moving averages. It's specifically designed for Vietnamese stock market data with timezone handling and responsive design. The component includes extensive development-only logging for debugging while maintaining clean production builds.

## Table of Contents
1. [Props Interface](#props-interface)
2. [State Management](#state-management)
3. [Context Dependencies](#context-dependencies)
4. [Chart Initialization](#chart-initialization)
5. [Data Transformation](#data-transformation)
6. [Tooltip System](#tooltip-system)
7. [Crosshair Interaction](#crosshair-interaction)
8. [Viewport Management](#viewport-management)
9. [Responsive Design](#responsive-design)
10. [Moving Averages](#moving-averages)
11. [Performance Optimizations](#performance-optimizations)
12. [Development Logging](#development-logging)

## Props Interface

```typescript
interface BaseTradingViewChartProps {
  title?: string                // Chart title displayed above
  height?: number              // Chart height in pixels (overrides global)
  showControls?: boolean       // Whether to display title section (default: true)
  viewportSizeOverride?: number // Override responsive viewport calculation
  noDataMessage?: string       // Custom message when no data available
  scrollToLatest?: boolean     // Force scroll to latest candle on data change
  maVisibility?: {             // Override global MA visibility settings
    ma10: boolean
    ma20: boolean
    ma50: boolean
    ma100: boolean
    ma200: boolean
  }
}
```

## State Management

### Chart References
```typescript
const chartContainerRef = useRef<HTMLDivElement>(null)         // Container DOM element
const chartRef = useRef<IChartApi | null>(null)                // Main chart instance
const candlestickSeriesRef = useRef<ISeriesApi<'Candlestick'> | null>(null)
const volumeSeriesRef = useRef<ISeriesApi<'Histogram'> | null>(null)
const ma10SeriesRef = useRef<ISeriesApi<'Line'> | null>(null)
const ma20SeriesRef = useRef<ISeriesApi<'Line'> | null>(null)
const ma50SeriesRef = useRef<ISeriesApi<'Line'> | null>(null)
const ma100SeriesRef = useRef<ISeriesApi<'Line'> | null>(null)
const ma200SeriesRef = useRef<ISeriesApi<'Line'> | null>(null)
```

### Viewport State
```typescript
const [userViewportSet, setUserViewportSet] = useState(false)  // Track if user manually scrolled
const [lastViewportRange, setLastViewportRange] = useState<{
  from: Time
  to: Time
} | null>(null)  // Last known viewport position
const [isDataInitialized, setIsDataInitialized] = useState(false) // Track initial data load
```

### Crosshair State
```typescript
const [crosshairData, setCrosshairData] = useState<StockData | null>(null)     // Current hover data
const [clickedCrosshairData, setClickedCrosshairData] = useState<StockData | null>(null) // Locked click data
const [containerWidth, setContainerWidth] = useState(0)  // For responsive calculations
```

## Context Dependencies

The component consumes multiple React Contexts:

```typescript
const { interval, rulerVisible, ...globalSettings } = useChartSettings()
const { loading, error, chartData: data } = useTicker()
```

- **ChartSettingsContext**: Provides interval, height, MA visibility, and other UI settings
- **TickerContext**: Provides loading state, error handling, and chart data
- **LogsProvider**: Used indirectly through APIContext for logging

## Chart Initialization

### Chart Creation (Lines 202-248)
The chart is initialized once on mount with these configurations:

```typescript
const chart = createChart(chartContainerRef.current, {
  width: chartContainerRef.current.clientWidth,
  height: height,
  layout: {
    background: { type: ColorType.Solid, color: 'transparent' },
    textColor: '#71717a',
    attributionLogo: false,
  },
  grid: {
    vertLines: { visible: false },
    horzLines: { visible: false },
  },
  crosshair: {
    mode: CrosshairMode.Normal,
  },
  rightPriceScale: {
    borderColor: '#27272a',
    scaleMargins: {
      top: 0.1,
      bottom: 0.25, // Reserve 25% for volume
    },
  },
  timeScale: {
    borderColor: '#27272a',
    timeVisible: true,
    secondsVisible: false,
  },
  handleScroll: {
    mouseWheel: true,
    pressedMouseMove: true,
    horzTouchDrag: true,
  },
  handleScale: {
    axisPressedMouseMove: true,
    mouseWheel: true,
    pinch: true,
  },
})
```

### Series Configuration

#### Candlestick Series (Lines 249-266)
```typescript
const candlestickSeries = chart.addSeries(CandlestickSeries, {
  upColor: '#16a34a',      // Green for bullish
  downColor: '#dc2626',    // Red for bearish
  borderVisible: false,
  wickUpColor: '#16a34a',
  wickDownColor: '#dc2626',
  priceFormat: {
    type: 'custom',
    formatter: (price: number) => formatPrice(price, currentData),
    minMove: latestData ? getOptimalMinMove(latestData.close, latestData.mode) : 0.001,
  },
})
```

#### Volume Series (Lines 268-283)
```typescript
const volumeSeries = chart.addSeries(HistogramSeries, {
  priceFormat: { type: 'volume' },
  priceScaleId: 'volume', // Separate scale for volume
})

volumeSeries.priceScale().applyOptions({
  scaleMargins: {
    top: 0.8,    // Volume in bottom 20%
    bottom: 0,
  },
})
```

#### Moving Average Series (Lines 285-329)
Five moving average lines are added with different colors:
- MA10: Red (#dc2626)
- MA20: Green (#16a34a)
- MA50: Blue (#2563eb)
- MA100: Gray (#a1a1aa)
- MA200: Dark Gray (#71717a)

All MAs have:
- `lineWidth: 2`
- `crosshairMarkerVisible: false`
- `lastValueVisible: false`
- `priceLineVisible: false`

## Data Transformation

### Timestamp Conversion (Lines 145-156)
```typescript
data.forEach((point, index) => {
  const dateTime = parseUTCISOString(point.time) // Parse UTC ISO string
  const time = toVietnamUnixTime(dateTime) as Time // Convert to Vietnam timezone
  // ...create candlestick data
})
```

### Volume Color Logic (Lines 158-164)
```typescript
const volumeColor = prevPoint
  ? point.close >= prevPoint.close
    ? '#16a34a' : '#dc2626'
  : point.close >= point.open
    ? '#16a34a' : '#dc2626'
```

### Moving Average Data Processing (Lines 180-196)
```typescript
if (point.ma10 !== undefined && point.ma10 !== null) {
  ma10.push({ time, value: point.ma10 })
}
// Similar pattern for MA20, MA50, MA100, MA200
```

## Tooltip System

### Tooltip Element Creation (Lines 343-370)
- **Positioning**: Absolutely positioned relative to chart
- **Styling**: Dark theme with blur backdrop
- **Sizing**: Dynamic width (180px min, 200px max)
- **Z-index**: 10 to appear above chart elements

### Unified Tooltip Builder (Lines 397-502)
The `buildTooltipHTML` function creates consistent tooltip content:

```typescript
const buildTooltipHTML = (currentDataPoint: StockData, paramTime: any) => {
  // Format date/time
  // Find chart data for time
  // Calculate price/volume changes
  // Build HTML grid with OHLC data
  // Add moving averages if visible
}
```

### Tooltip Content Structure
1. **Header**: Symbol and date/time
2. **OHLC Grid**: Open, High, Low, Close with change percentages
3. **Volume**: With change percentage
4. **Moving Averages**: Visible MAs with scores (if available)

## Crosshair Interaction

### Click Handler (Lines 504-602)
**Hybrid Behavior**:
- First click locks the crosshair position
- Second click (on locked position) unlocks it

```typescript
const handleChartClick = (param: any) => {
  if (clickedCrosshairData) {
    // Already locked - clear it
    setClickedCrosshairData(null)
    setCrosshairData(null)
    tooltip.style.display = 'none'
  } else {
    // Lock at new position
    setClickedCrosshairData(clickedDataPoint)
    // Show tooltip at clicked position
  }
}
```

### Hover Handler (Lines 607-730)
- **Conflict Prevention**: No tooltip when crosshair is locked
- **Boundary Detection**: Hide tooltip when mouse leaves chart area
- **Real-time Updates**: Updates on every mouse movement

### Crosshair Data State Management
Two separate states:
- `crosshairData`: Real-time hover data
- `clickedCrosshairData`: Locked position data

## Viewport Management

### Smart Viewport Logic (Lines 818-878)

#### Initial Load
```typescript
if (!userViewportSet || !lastViewportRange) {
  // Show responsive number of candles by default
  const actualViewportSize = Math.min(responsiveViewportSize, chartData.candlestick.length)
  const startIndex = chartData.candlestick.length - actualViewportSize
  // Set viewport to show latest candles
}
```

#### User Scroll Preservation
```typescript
// User has manually scrolled - preserve their viewport position
// Only restore if the current viewport is way off from expected
if (Math.abs(Number(currentRange.from) - Number(lastViewportRange.from)) > 1000) {
  chartRef.current.timeScale().setVisibleRange(lastViewportRange)
}
```

#### Forced Navigation
```typescript
if (scrollToLatest) {
  // Navigate to new data - show last viewportSizeOverride bars
  const startIndex = chartData.candlestick.length - viewportSizeOverride
  chartRef.current.timeScale().setVisibleRange({ from, to })
  setUserViewportSet(false) // Reset flag
}
```

## Responsive Design

### ResizeObserver (Lines 732-752)
```typescript
const resizeObserver = new ResizeObserver(() => {
  handleResize()
})

if (chartContainerRef.current) {
  resizeObserver.observe(chartContainerRef.current)
  setContainerWidth(chartContainerRef.current.clientWidth)
}
```

### Responsive Viewport Calculation (Lines 126-129)
```typescript
const responsiveViewportSize = useMemo(() => {
  return containerWidth > 0 ? getResponsiveViewportSize(containerWidth) : 40
}, [containerWidth])
```

## Moving Averages

### Visibility Control
MA visibility is controlled by:
1. **Global settings** from ChartSettingsContext
2. **Interval-specific defaults** (defined in ChartSettingsContext)
3. **Manual prop override** (maVisibility prop)

### Conditional Rendering
```typescript
// Only show MA if both:
// 1. Visibility is enabled
// 2. Score data is available (not null/undefined)
if (ma10Data && maVisibility.ma10 && currentDataPoint?.ma10_score !== null) {
  // Display MA10 with score
}
```

### Score Color Coding
```typescript
const maColor = currentDataPoint.ma10_score >= 0 ? '#16a34a' : '#dc2626'
```

## Performance Optimizations

### Memoization
- `chartData`: Memoized transformation of raw data
- `responsiveViewportSize`: Memoized based on container width

### Event Handler Optimization
- **Unified tooltip builder**: Reuses same function for hover and click
- **ResizeObserver**: Efficient container size watching
- **Debounced viewport updates**: Only update when necessary

### Efficient Data Updates
```typescript
// Update series data - even if empty (clears the chart)
candlestickSeriesRef.current.setData(chartData.candlestick)
volumeSeriesRef.current.setData(chartData.volume)

// MA series only updated if visible
ma10SeriesRef.current.setData(maVisibility.ma10 ? chartData.ma10 : [])
```

### Smart Caching
Component relies on TickerContext's caching:
- 15-second cache window
- Skip delay for recent requests
- Request tracking to prevent memory leaks

### Development-Only Logging
All console logging is wrapped with development environment checks:
```typescript
if (process.env.NODE_ENV === "development") {
  console.log("[BaseTradingViewChart] Debug message")
}
```

**Logging Categories:**
- **Data Changes**: Chart data updates and initialization
- **Viewport Management**: User scrolling, zooming, and automatic viewport adjustments
- **Click Interactions**: Crosshair locking/unlocking with state tracking
- **Hover Interactions**: Tooltip generation and positioning
- **Error Handling**: Invalid dates, missing data, tooltip failures

**Benefits:**
- Production builds remain clean without console spam
- Development debugging fully preserved
- Improved performance in production (no logging overhead)
- All debugging information available during development

## Special Features

### Watermark (Lines 331-340)
```typescript
const watermark = createTextWatermark(chart.panes()[0], {
  horzAlign: 'center',
  vertAlign: 'center',
  lines: [{
    text: 'aipriceaction.com',
    color: 'rgba(113, 113, 122, 0.15)',
    fontSize: 20,
  }],
})
```

### Price Formatting
- **Market-aware formatting**: Different precision for Vietnamese stocks vs crypto
- **Dynamic decimal places**: Based on price magnitude
- **Custom minMove**: Optimized for each market type

### Timezone Handling
- **Input**: UTC ISO 8601 timestamps from API
- **Conversion**: To Vietnam timezone for display
- **Formatting**: Localized date/time strings

## Error Handling

### Data Validation
```typescript
// Skip invalid dates
if (isNaN(dateTime.getTime())) {
  console.error('Invalid date in chart data:', point.time)
  return
}
```

### Error States
- **Loading state**: Shows spinner with "Loading chart data..."
- **Error state**: Displays error message
- **No data state**: Shows custom noDataMessage

### Cleanup
Comprehensive cleanup in useEffect return:
- Remove event listeners
- Disconnect ResizeObserver
- Remove tooltip and watermark
- Dispose chart instance
- Clear all refs

## Integration Points

### RulerSection
```typescript
{rulerVisible && (
  <div className="bg-muted/50 border-b p-2">
    <RulerSection
      data={data}
      crosshairData={crosshairData ?? clickedCrosshairData}
      latestData={latestData}
    />
  </div>
)}
```

### Overlay Data Display
Top-left overlay shows:
- Symbol, price, and percentage change
- Volume with change percentage
- Current timestamp
- Visible moving averages

## Key Constants and Defaults

```typescript
const tooltipWidth = 200
const tooltipHeight = 90
const tooltipMargin = 15

// Colors
const BULLISH_COLOR = '#16a34a'
const BEARISH_COLOR = '#dc2626'
const BACKGROUND_COLOR = 'rgba(24, 24, 27, 0.95)'
const BORDER_COLOR = '#27272a'

// Viewport percentages
const PRICE_SCALE_TOP_MARGIN = 0.1
const VOLUME_SCALE_BOTTOM_MARGIN = 0.25
const VOLUME_SERIES_TOP_MARGIN = 0.8
```