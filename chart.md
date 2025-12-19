# BaseTradingViewChart Component Documentation

## Overview
`BaseTradingViewChart` is a streamlined React component that wraps the Lightweight Charts library to display financial candlestick charts with volume overlays and moving averages. It's specifically designed for Vietnamese stock market data with timezone handling and responsive design. The component has been optimized for smooth touch interactions and simplified from 1472 to 1285 lines.

## Key Improvements (Latest Version)
- **Smooth Touch Scrolling**: Removed complex viewport management that caused jumping
- **Configuration-Driven**: MA series creation uses centralized configuration
- **Modular Architecture**: Extracted components and utilities for better maintainability
- **Reduced Complexity**: 13% fewer lines while maintaining all functionality

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
13. [Modular Architecture](#modular-architecture)

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

### Simplified State (Removed Complex Viewport Tracking)
```typescript
const [isDataInitialized, setIsDataInitialized] = useState(false)    // Track initial data load
const [crosshairData, setCrosshairData] = useState<StockData | null>(null)     // Current hover data
const [clickedCrosshairData, setClickedCrosshairData] = useState<StockData | null>(null) // Locked click data
const [containerWidth, setContainerWidth] = useState(0)  // For responsive calculations
```

**Removed Complex State**:
- ❌ `userViewportSet` - Caused viewport fighting with user scrolling
- ❌ `lastViewportRange` - Complex viewport restoration logic

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

### Chart Creation (Lines 254-291)
The chart is initialized once on mount with optimized touch-friendly configurations:

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

### Configuration-Driven MA Series Creation (Lines 335-347)
Moving averages are created using centralized configuration:

```typescript
// Add moving average series (initially empty) using configuration
MA_CONFIG.forEach(({ key, color }) => {
  const series = chart.addSeries(LineSeries, {
    color,
    ...MA_SERIES_OPTIONS,
  });
  // Map to existing refs for backward compatibility
  if (key === 'ma10') ma10SeriesRef.current = series;
  else if (key === 'ma20') ma20SeriesRef.current = series;
  else if (key === 'ma50') ma50SeriesRef.current = series;
  else if (key === 'ma100') ma100SeriesRef.current = series;
  else if (key === 'ma200') ma200SeriesRef.current = series;
});
```

## Data Transformation

### Timestamp Conversion (Lines 189-202)
```typescript
data.forEach((point, index) => {
  const dateTime = parseUTCISOString(point.time) // Parse UTC ISO string
  const time = toVietnamUnixTime(dateTime) as Time // Convert to Vietnam timezone
  // ...create candlestick data
})
```

### Volume Color Logic (Lines 203-210)
```typescript
const volumeColor = prevPoint
  ? point.close >= prevPoint.close
    ? '#16a34a' : '#dc2626'
  : point.close >= point.open
    ? '#16a34a' : '#dc2626'
```

### Configuration-Driven MA Data Processing (Lines 227-237)
```typescript
// Add moving averages if available using configuration
MA_CONFIG.forEach(({ key }) => {
  const maValue = point[key as keyof typeof point] as number | undefined;
  if (maValue !== undefined && maValue !== null) {
    if (key === 'ma10') ma10.push({ time, value: maValue });
    else if (key === 'ma20') ma20.push({ time, value: maValue });
    else if (key === 'ma50') ma50.push({ time, value: maValue });
    else if (key === 'ma100') ma100.push({ time, value: maValue });
    else if (key === 'ma200') ma200.push({ time, value: maValue });
  }
});
```

## Tooltip System

### Tooltip Element Creation (Lines 365-377)
- **Positioning**: Absolutely positioned relative to chart
- **Styling**: Dark theme with blur backdrop
- **Sizing**: Dynamic width (180px min, 200px max)
- **Z-index**: 10 to appear above chart elements

### Unified Tooltip Builder (Lines 379-553)
The `buildTooltipHTML` function creates consistent tooltip content with:
- Header with symbol and date/time
- OHLC grid with change percentages
- Volume with change percentage
- Moving averages with scores (if visible)

## Crosshair Interaction

### Simplified Click Handler (Lines 613-785)
**Clean Logic**:
- First click locks the crosshair position
- Second click (on locked position) unlocks it
- No competing viewport management

### Hover Handler (Lines 791-1026)
- **Conflict Prevention**: No tooltip when crosshair is locked
- **Boundary Detection**: Hide tooltip when mouse leaves chart area
- **Real-time Updates**: Updates on every mouse movement

## Viewport Management (Simplified)

### Natural Scrolling Approach (Lines 1056-1072)
**Key Change**: Let lightweight-charts library handle scrolling naturally

```typescript
// Only set viewport on initial load or when explicitly requested
if (!isDataInitialized || scrollToLatest) {
  const viewportSize = viewportSizeOverride || responsiveViewportSize;
  const actualViewportSize = Math.min(viewportSize, chartData.candlestick.length);
  const startIndex = chartData.candlestick.length - actualViewportSize;
  const from = chartData.candlestick[startIndex].time;
  const to = chartData.candlestick[chartData.candlestick.length - 1].time;

  chartRef.current.timeScale().setVisibleRange({ from, to });
}
```

**Removed Complex Logic**:
- ❌ `handleVisibleTimeRangeChange` - No more viewport fighting
- ❌ `userViewportSet` tracking - Let library handle user interactions
- ❌ `lastViewportRange` restoration - No more aggressive correction
- ❌ Complex restoration thresholds - Let scrolling be natural

**Benefits**:
- ✅ Smooth touch scrolling without jumping
- ✅ Responsive user interactions
- ✅ Simpler, more maintainable code
- ✅ Better performance

## Responsive Design

### ResizeObserver (Lines 1030-1045)
```typescript
const resizeObserver = new ResizeObserver(() => {
  handleResize();
});

if (chartContainerRef.current) {
  resizeObserver.observe(chartContainerRef.current);
  setContainerWidth(chartContainerRef.current.clientWidth);
}
```

### Responsive Viewport Calculation (Lines 162-165)
```typescript
const responsiveViewportSize = useMemo(() => {
  return containerWidth > 0 ? getResponsiveViewportSize(containerWidth) : 40;
}, [containerWidth]);
```

## Moving Averages

### Configuration-Driven Visibility (chartConfig.ts)
```typescript
export const MA_CONFIG = [
  { key: 'ma10', color: '#dc2626' },
  { key: 'ma20', color: '#16a34a' },
  { key: 'ma50', color: '#2563eb' },
  { key: 'ma100', color: '#a1a1aa' },
  { key: 'ma200', color: '#71717a' },
] as const;

export const MA_SERIES_OPTIONS = {
  lineWidth: 2,
  crosshairMarkerVisible: false,
  lastValueVisible: false,
  priceLineVisible: false,
} as const;
```

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

### Code Reduction
- **BaseTradingViewChart**: 1472 → 1285 lines (-13%)
- **MA Series Creation**: 44 lines → 12 lines using configuration
- **MA Data Processing**: 15 lines → 11 lines using iteration
- **Viewport Logic**: 60+ lines of complex logic → 15 lines simple logic

### Memoization
- `chartData`: Memoized transformation of raw data
- `responsiveViewportSize`: Memoized based on container width

### Efficient Data Updates
```typescript
// Update series data (even if empty - this clears the chart)
candlestickSeriesRef.current.setData(chartData.candlestick);
volumeSeriesRef.current.setData(chartData.volume);

// MA series only updated if visible
ma10SeriesRef.current.setData(maVisibility.ma10 ? chartData.ma10 : []);
```

### Touch Optimization
- **Natural Scrolling**: Removed viewport fighting
- **Simplified Event Handling**: Fewer redundant operations
- **Reduced State Updates**: Less re-rendering during interactions

## Development Logging

All console logging is wrapped with development environment checks:
```typescript
if (process.env.NODE_ENV === "development") {
  console.log("[BaseTradingViewChart] Debug message")
}
```

**Logging Categories:**
- **Data Changes**: Chart data updates and initialization
- **Viewport Management**: Simplified viewport tracking
- **Click Interactions**: Crosshair locking/unlocking
- **Hover Interactions**: Tooltip generation and positioning
- **Error Handling**: Invalid dates, missing data, tooltip failures

## Modular Architecture

### Available Components (Extracted for Future Use)
- **`ChartOverlay.tsx`**: Overlay data display component (145 lines)
- **`useTooltip.ts`**: Unified tooltip management hook (243 lines)
- **`useChartViewport.ts`**: Simplified viewport logic (140 lines)
- **`chartConfig.ts`**: MA configuration constants (18 lines)

### Benefits
- **Reusability**: Components can be used in other charts
- **Maintainability**: Focused, testable units
- **Separation of Concerns**: Clear responsibility boundaries
- **Future Development**: Easy to extend and modify

### Current Implementation
The main component uses a conservative approach:
- ✅ MA configuration from chartConfig.ts (currently integrated)
- 📦 Other modules available but not integrated to maintain stability
- 🎯 Focus on smooth scrolling and reduced complexity

## Special Features

### Watermark (Lines 349-357)
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

## Migration Notes

### What Changed in Latest Version
1. **Removed Complex Viewport Management**: Eliminated state tracking that caused jumping
2. **Configuration-Driven MA**: Uses centralized MA_CONFIG and MA_SERIES_OPTIONS
3. **Simplified State**: Removed `userViewportSet` and `lastViewportRange`
4. **Natural Scrolling**: Lets lightweight-charts handle touch interactions
5. **Modular Components**: Extracted reusable modules for future development

### Benefits for Touch Users
- ✅ **Smooth scrolling**: No more jumping back and forth
- ✅ **Responsive interactions**: Immediate feedback to gestures
- ✅ **Better performance**: Fewer state updates and conflicts
- ✅ **Natural behavior**: Feels like native chart interactions