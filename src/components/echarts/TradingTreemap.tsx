import * as React from 'react'
import ReactECharts from 'echarts-for-react'
import * as echarts from 'echarts/core'
import { TreemapChart } from 'echarts/charts'
import {
  TooltipComponent,
} from 'echarts/components'
import { CanvasRenderer } from 'echarts/renderers'
import { useAPI } from '@/contexts/APIContext'
import { useChartSettings } from '@/contexts/ChartSettingsContext'
import { useTranslation } from '@/hooks/useTranslation'
import {
  ALL_WATCHLIST_NAME,
  CRYPTO_WATCHLIST_NAME,
  GLOBAL_WATCHLIST_NAME,
  MARKET_INDICES,
} from '@/lib/constants'
import { formatPrice, formatPercent, formatVolume } from '@/lib/format'
import { getBasicChangeColor, getMAColor } from '@/lib/chartColors'
import { getSectorDisplayName } from '@/lib/sector-names'
import { TickerGroupSelector } from '@/components/TickerGroupSelector'
import { useWatchListData } from '@/hooks/useWatchListData'
import { getPredefinedWatchlistTickers, isPredefinedWatchlist } from '@/lib/predefined-watchlists'
import { getWatchlistTickers } from '@/lib/watchlist-storage'
import type { StockData } from '@/lib/api-client'
import { Loader2 } from 'lucide-react'

echarts.use([
  TreemapChart,
  TooltipComponent,
  CanvasRenderer,
])

interface TradingTreemapProps {
  defaultWatchlist?: string
  height?: string
  className?: string
  onSelectTicker?: (symbol: string) => void
}

function getChangeColor(change: number): string {
  if (change < -6.8) return '#06b6d4'
  if (change < -0.01) return '#dc2626'
  if (change > 6.7) return '#9333ea'
  if (change > 0.01) return '#16a34a'
  return '#eab308'
}

interface TreemapNode {
  name: string
  value?: number
  itemStyle?: { color: string }
  children?: TreemapNode[]
  // Extra data for tooltip (not used by ECharts layout)
  _data?: {
    open: number
    high: number
    low: number
    close: number
    volume: number
    change: number
    volumeChanged?: number | null
    absChange?: number
    mode?: string
    symbol: string
    time: string
    ma10?: number | null
    ma20?: number | null
    ma50?: number | null
    ma100?: number | null
    ma200?: number | null
    ma10_score?: number | null
    ma20_score?: number | null
    ma50_score?: number | null
    ma100_score?: number | null
    ma200_score?: number | null
  }
}

const MAX_TICKERS_PER_SECTOR = 15

function buildSectorNodes(
  groups: Record<string, string[]> | null | undefined,
  data: Record<string, StockData[]>,
  wrapperName: string | null,
  language: 'vn' | 'en',
): TreemapNode[] {
  if (!groups) return []

  const sectorNodes: TreemapNode[] = []

  for (const [sector, symbols] of Object.entries(groups)) {
    if (MARKET_INDICES.includes(sector as typeof MARKET_INDICES[number])) continue
    const children: TreemapNode[] = []
    for (const symbol of symbols) {
      const latestData = data[symbol]?.[0]
      if (!latestData) continue
      const price = latestData.close || 0
      const change = latestData.close_changed ?? 0
      const tradedValue = price * (latestData.volume || 0)
      const rawSize = tradedValue > 0 ? tradedValue : price
      if (rawSize === 0) continue
      const size = Math.sqrt(rawSize)
      children.push({
        name: symbol,
        value: size,
        itemStyle: { color: getChangeColor(change) },
        _data: {
          open: latestData.open || 0,
          high: latestData.high || 0,
          low: latestData.low || 0,
          close: price,
          volume: latestData.volume || 0,
          change,
          volumeChanged: latestData.volume_changed,
          absChange: (change !== 0 && change !== -100) ? price - (price / (1 + change / 100)) : 0,
          mode: latestData.mode,
          symbol: latestData.symbol,
          time: latestData.time,
          ma10: latestData.ma10,
          ma20: latestData.ma20,
          ma50: latestData.ma50,
          ma100: latestData.ma100,
          ma200: latestData.ma200,
          ma10_score: latestData.ma10_score,
          ma20_score: latestData.ma20_score,
          ma50_score: latestData.ma50_score,
          ma100_score: latestData.ma100_score,
          ma200_score: latestData.ma200_score,
        },
      })
    }
    if (children.length === 0) continue
    // Sort by raw size descending, keep top N to prevent outliers from dominating
    children.sort((a, b) => (b.value ?? 0) - (a.value ?? 0))
    const sectorName = getSectorDisplayName(sector, language)
    const included = children.slice(0, MAX_TICKERS_PER_SECTOR)
    sectorNodes.push({
      name: sectorName,
      children: included,
    })
  }

  if (wrapperName) {
    return [{ name: wrapperName, children: sectorNodes }]
  }
  return sectorNodes
}

/** Group a list of ticker symbols by their sector, scanning VN → Crypto → Global groups */
function groupBySector(
  symbols: string[],
  tickerGroups: Record<string, string[]> | null | undefined,
  cryptoTickerGroups: Record<string, string[]> | null | undefined,
  globalTickerGroups: Record<string, string[]> | null | undefined,
): Record<string, string[]> {
  const result: Record<string, string[]> = {}
  for (const symbol of symbols) {
    let found = false
    for (const groups of [tickerGroups, cryptoTickerGroups, globalTickerGroups]) {
      if (!groups) continue
      for (const [sector, syms] of Object.entries(groups)) {
        if (syms.includes(symbol)) {
          if (!result[sector]) result[sector] = []
          result[sector].push(symbol)
          found = true
          break
        }
      }
      if (found) break
    }
  }
  return result
}

export function TradingTreemap({
  defaultWatchlist = ALL_WATCHLIST_NAME,
  height = '60vh',
  className,
  onSelectTicker,
}: TradingTreemapProps) {
  const {
    tickerGroups, cryptoTickerGroups, globalTickerGroups,
    stockLoading, cryptoLoading, globalLoading,
    stockError, cryptoError, globalError,
  } = useAPI()
  const { t, language } = useTranslation()

  const [selectedWatchlist, setSelectedWatchlist] = React.useState(defaultWatchlist)

  // Fetch watchlist data (stock/crypto/global combined)
  const { combinedData, loading: dataLoading, error: dataError } = useWatchListData({ needsMA: true })
  const { maVisibility } = useChartSettings()
  const { ema } = useAPI()

  // Merge loading/error states
  const loading = stockLoading || cryptoLoading || globalLoading || dataLoading
  const error = stockError || cryptoError || globalError || dataError

  // Theme + viewport detection
  const [isDark, setIsDark] = React.useState(
    () => typeof document !== 'undefined' && document.documentElement.classList.contains('dark'),
  )
  const [isMobile, setIsMobile] = React.useState(
    () => typeof window !== 'undefined' && window.innerWidth < 768,
  )
  const chartHeight = isMobile ? '80vh' : '60vh'
  React.useEffect(() => {
    const observer = new MutationObserver(() => {
      setIsDark(document.documentElement.classList.contains('dark'))
    })
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] })
    const handleResize = () => setIsMobile(window.innerWidth < 768)
    window.addEventListener('resize', handleResize)
    return () => {
      observer.disconnect()
      window.removeEventListener('resize', handleResize)
    }
  }, [])

  // Build treemap data based on selected watchlist
  const treemapData = React.useMemo<TreemapNode[]>(() => {
    if (selectedWatchlist === ALL_WATCHLIST_NAME) {
      return buildSectorNodes(tickerGroups, combinedData, null, language)
    }

    if (selectedWatchlist === CRYPTO_WATCHLIST_NAME) {
      return buildSectorNodes(cryptoTickerGroups, combinedData, 'Crypto', language)
    }

    if (selectedWatchlist === GLOBAL_WATCHLIST_NAME) {
      return buildSectorNodes(globalTickerGroups, combinedData, 'Global', language)
    }

    // Check if it's a VN sector group
    if (tickerGroups && selectedWatchlist in tickerGroups) {
      return buildSectorNodes(
        { [selectedWatchlist]: tickerGroups[selectedWatchlist] },
        combinedData,
        null,
        language,
      )
    }

    // Check if it's a crypto sector group
    if (cryptoTickerGroups && selectedWatchlist in cryptoTickerGroups) {
      return buildSectorNodes(
        { [selectedWatchlist]: cryptoTickerGroups[selectedWatchlist] },
        combinedData,
        null,
        language,
      )
    }

    // Check if it's a global sector group
    if (globalTickerGroups && selectedWatchlist in globalTickerGroups) {
      return buildSectorNodes(
        { [selectedWatchlist]: globalTickerGroups[selectedWatchlist] },
        combinedData,
        null,
        language,
      )
    }

    // Check if it's a predefined watchlist
    if (isPredefinedWatchlist(selectedWatchlist)) {
      const tickers = getPredefinedWatchlistTickers(selectedWatchlist)
      const sectors = groupBySector(tickers, tickerGroups, cryptoTickerGroups, globalTickerGroups)
      return buildSectorNodes(sectors, combinedData, null, language)
    }

    // Otherwise it's a custom watchlist
    const tickers = getWatchlistTickers(selectedWatchlist)
    if (tickers.length > 0) {
      const sectors = groupBySector(tickers, tickerGroups, cryptoTickerGroups, globalTickerGroups)
      return buildSectorNodes(sectors, combinedData, null, language)
    }

    return []
  }, [
    selectedWatchlist,
    tickerGroups,
    cryptoTickerGroups,
    globalTickerGroups,
    combinedData,
    language,
  ])

  // Theme-dependent colors
  const colors = React.useMemo(() => ({
    textColor: isDark ? '#e2e8f0' : '#1e293b',
    textSecondary: isDark ? '#94a3b8' : '#64748b',
    borderColor: isDark ? '#334155' : '#cbd5e1',
    tooltipBg: isDark ? 'rgba(30,41,59,0.95)' : 'rgba(255,255,255,0.95)',
    tooltipText: isDark ? '#e2e8f0' : '#1e293b',
  }), [isDark])

  // ECharts option
  const option = React.useMemo(() => ({
    backgroundColor: 'transparent',

    tooltip: {
      backgroundColor: 'rgba(24, 24, 27, 0.95)',
      borderColor: '#27272a',
      borderWidth: 1,
      borderRadius: 4,
      padding: [6, 8],
      textStyle: {
        color: '#fafafa',
        fontSize: 11,
        fontFamily: "-apple-system, BlinkMacSystemFont, 'Trebuchet MS', Roboto, Ubuntu, sans-serif",
      },
      extraCssText: 'backdrop-filter:blur(8px);-webkit-font-smoothing:antialiased;-moz-osx-font-smoothing:grayscale;',
      formatter: (params: any) => {
        const d = params.data?._data
        if (!d) return ''
        const dateStr = d.time ? d.time.split('T')[0] : ''
        const fmt = (price: number) => formatPrice(price, { symbol: d.symbol, mode: d.mode as any })
        const changeColor = getBasicChangeColor(d.change)
        const absChange = (d.change !== 0 && d.change !== -100) ? d.close - (d.close / (1 + d.change / 100)) : 0
        const absChangeStr = `${absChange >= 0 ? '+' : ''}${fmt(absChange)}`

        let html = `
          <div style="display:flex;justify-content:space-between;align-items:center;color:#a1a1aa;font-size:10px;margin-bottom:4px;">
            <span><span style="font-weight:bold;">${d.symbol}</span> <span style="color:${changeColor};">${absChangeStr}</span></span>
            <span>${dateStr}</span>
          </div>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:2px 8px;font-size:10px;">
            <div><span style="color:#a1a1aa;">O</span> ${fmt(d.open)}</div>
            <div><span style="color:#a1a1aa;">C</span> ${fmt(d.close)} <span style="color:${changeColor};font-size:9px;">${formatPercent(d.change)}</span></div>
            <div><span style="color:#a1a1aa;">H</span> <span style="color:#16a34a;">${fmt(d.high)}</span></div>
            <div><span style="color:#a1a1aa;">L</span> <span style="color:#dc2626;">${fmt(d.low)}</span></div>
        `

        // Volume row (full width)
        html += `<div style="grid-column:1/-1;"><span style="color:#a1a1aa;">Vol</span> ${formatVolume(d.volume)}`
        if (d.volumeChanged != null) {
          const volColor = getBasicChangeColor(d.volumeChanged)
          html += ` <span style="color:${volColor};font-size:9px;">${formatPercent(d.volumeChanged)}</span>`
        }
        html += `</div>`

        // MA section
        const maPrefix = ema ? 'EMA' : 'MA'
        const hasMA = d.ma10 || d.ma20 || d.ma50 || d.ma100 || d.ma200
        if (hasMA) {
          html += `<div style="grid-column:1/-1;margin-top:4px;padding-top:4px;border-top:1px solid #27272a;"></div>`

          if (maVisibility.ma10 && d.ma10 != null && d.ma10_score != null) {
            const scoreColor = getMAColor(d.ma10_score)
            html += `<div><span style="color:#dc2626;display:inline-block;width:40px;">${maPrefix}10</span> ${fmt(d.ma10)}</div>`
            html += `<div><span style="color:#dc2626;display:inline-block;width:40px;">Score</span> <span style="color:${scoreColor};font-size:9px;">${formatPercent(d.ma10_score)}</span></div>`
          }
          if (maVisibility.ma20 && d.ma20 != null && d.ma20_score != null) {
            const scoreColor = getMAColor(d.ma20_score)
            html += `<div><span style="color:#16a34a;display:inline-block;width:40px;">${maPrefix}20</span> ${fmt(d.ma20)}</div>`
            html += `<div><span style="color:#16a34a;display:inline-block;width:40px;">Score</span> <span style="color:${scoreColor};font-size:9px;">${formatPercent(d.ma20_score)}</span></div>`
          }
          if (maVisibility.ma50 && d.ma50 != null && d.ma50_score != null) {
            const scoreColor = getMAColor(d.ma50_score)
            html += `<div><span style="color:#2563eb;display:inline-block;width:40px;">${maPrefix}50</span> ${fmt(d.ma50)}</div>`
            html += `<div><span style="color:#2563eb;display:inline-block;width:40px;">Score</span> <span style="color:${scoreColor};font-size:9px;">${formatPercent(d.ma50_score)}</span></div>`
          }
          if (maVisibility.ma100 && d.ma100 != null && d.ma100_score != null) {
            const scoreColor = getMAColor(d.ma100_score)
            html += `<div><span style="color:#a1a1aa;display:inline-block;width:40px;">${maPrefix}100</span> ${fmt(d.ma100)}</div>`
            html += `<div><span style="color:#a1a1aa;display:inline-block;width:40px;">Score</span> <span style="color:${scoreColor};font-size:9px;">${formatPercent(d.ma100_score)}</span></div>`
          }
          if (maVisibility.ma200 && d.ma200 != null && d.ma200_score != null) {
            const scoreColor = getMAColor(d.ma200_score)
            html += `<div style="grid-column:1/-1;"><span style="color:#71717a;display:inline-block;width:40px;">${maPrefix}200</span> ${fmt(d.ma200)} <span style="color:#71717a;">Score</span> <span style="color:${scoreColor};font-size:9px;">${formatPercent(d.ma200_score)}</span></div>`
          }
        }

        return html + `</div>`
      },
    },

    series: [{
      type: 'treemap',
      id: 'trading-treemap',
      width: '98%',
      height: '90%',
      top: 10,
      left: 'center',
      roam: true,
      nodeClick: 'zoomToNode',
      breadcrumb: {
        show: true,
        left: 'center',
        bottom: 8,
        height: 22,
        itemStyle: {
          color: '#ffffff',
          borderColor: '#e2e8f0',
          textStyle: { color: '#1e293b', fontSize: 11, fontWeight: 'bold', fontFamily: 'Inter, Segoe UI, Arial, sans-serif' },
        },
        emphasis: {
          itemStyle: { color: '#f1f5f9' },
        },
      },
      animationDurationUpdate: 500,
      animationEasing: 'cubicOut',

      squareRatio: 0.5 * (1 + Math.sqrt(5)),

      itemStyle: {
        borderColor: colors.borderColor,
        borderWidth: 1,
        gapWidth: 1,
      },

      label: {
        show: true,
        position: 'inside',
        formatter: (params: any) => {
          const d = params.data?._data
          if (!d) return ''
          return `${params.name}\n${formatPercent(d.change)}`
        },
        fontSize: isMobile ? 12 : 14,
        fontWeight: 'bold',
        color: '#fff',
        fontFamily: 'Inter, Segoe UI, Arial, sans-serif',
        lineHeight: 18,
      },

      upperLabel: {
        show: true,
        height: 20,
        formatter: (params: any) => params.name,
        color: colors.textColor,
        fontSize: 11,
        fontWeight: 'bold',
        fontFamily: 'Inter, Segoe UI, Arial, sans-serif',
      },

      levels: [
        {
          // Level 0 — implicit root (ECharts auto-creates this)
          itemStyle: {
            borderColor: colors.borderColor,
            borderWidth: 1,
            gapWidth: 3,
          },
          upperLabel: { show: false },
          colorSaturation: [0, 0],
          color: ['transparent'],
        },
        {
          // Level 1 — sectors (show sector name header)
          itemStyle: {
            borderColor: colors.borderColor,
            borderWidth: 2,
            gapWidth: 2,
          },
          upperLabel: { show: true },
          colorSaturation: [0, 0],
          color: ['transparent'],
          colorMappingBy: 'index',
        },
        {
          // Level 2+ — individual stocks (colored by change%)
          colorSaturation: [0.3, 0.7],
          colorMappingBy: 'value',
          itemStyle: {
            gapWidth: 1,
            borderWidth: 1,
            borderColor: colors.borderColor,
          },
        },
      ],

      data: treemapData,
    }],
  }), [treemapData, colors, isDark, isMobile, ema, maVisibility])

  if (loading) {
    return (
      <div className={className} style={{ height }}>
        <div className="flex items-center justify-center h-full">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className={className} style={{ height }}>
        <div className="text-destructive text-sm p-4">{error}</div>
      </div>
    )
  }

  return (
    <div className={className}>
      <div className="flex flex-col gap-2 mb-2 shrink-0 px-3">
        <h3 className="text-lg font-semibold">{t("common.heatmap")}</h3>
        <TickerGroupSelector
          value={selectedWatchlist}
          onValueChange={setSelectedWatchlist}
          className="w-36"
        />
      </div>
      <ReactECharts
        echarts={echarts}
        option={option}
        opts={{ renderer: 'canvas' }}
        style={{ height: chartHeight, width: '100%' }}
        notMerge={true}
        onEvents={{
          click: (params: any) => {
            if (params.data?._data?.symbol) {
              onSelectTicker?.(params.data._data.symbol)
            }
          },
        }}
      />
    </div>
  )
}
