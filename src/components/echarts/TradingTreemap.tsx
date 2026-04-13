import * as React from 'react'
import ReactECharts from 'echarts-for-react'
import * as echarts from 'echarts/core'
import { TreemapChart } from 'echarts/charts'
import {
  TooltipComponent,
} from 'echarts/components'
import { CanvasRenderer } from 'echarts/renderers'
import { useAPI } from '@/contexts/APIContext'
import { useTranslation } from '@/hooks/useTranslation'
import { MARKET_INDICES } from '@/lib/constants'
import { formatPrice, formatPercent, formatVolume } from '@/lib/format'
import { getSectorDisplayName } from '@/lib/sector-names'
import type { BasicStockData } from '@/lib/api-client'
import { Loader2 } from 'lucide-react'

echarts.use([
  TreemapChart,
  TooltipComponent,
  CanvasRenderer,
])

interface TradingTreemapProps {
  mode?: 'vn' | 'crypto' | 'global' | 'all'
  height?: string
  className?: string
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
  }
}

const MAX_TICKERS_PER_SECTOR = 15

function buildSectorNodes(
  groups: Record<string, string[]> | null | undefined,
  data: Record<string, BasicStockData[]>,
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

export function TradingTreemap({
  mode = 'vn',
  height = '60vh',
  className,
}: TradingTreemapProps) {
  const {
    tickerGroups, cryptoTickerGroups, globalTickerGroups,
    allTickersLastData, allCryptoTickersLastData, allGlobalTickersLastData,
    stockLoading, cryptoLoading, globalLoading,
    stockError, cryptoError, globalError,
  } = useAPI()
  const { t, language } = useTranslation()

  const loading = mode === 'global' ? globalLoading
    : mode === 'crypto' ? cryptoLoading
    : stockLoading
  const dataError = mode === 'global' ? globalError
    : mode === 'crypto' ? cryptoError
    : stockError

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

  // Build treemap data
  const treemapData = React.useMemo<TreemapNode[]>(() => {
    if (mode === 'all') {
      return [
        ...buildSectorNodes(tickerGroups, allTickersLastData, 'VN Stocks', language),
        ...buildSectorNodes(cryptoTickerGroups, allCryptoTickersLastData, 'Crypto', language),
        ...buildSectorNodes(globalTickerGroups, allGlobalTickersLastData, 'Global', language),
      ]
    }
    const dataMap = mode === 'crypto' ? allCryptoTickersLastData
      : mode === 'global' ? allGlobalTickersLastData
      : allTickersLastData
    const groups = mode === 'crypto' ? cryptoTickerGroups
      : mode === 'global' ? globalTickerGroups
      : tickerGroups
    const wrapperName = mode === 'crypto' ? 'Crypto'
      : mode === 'global' ? 'Global'
      : 'VN Stocks'
    return buildSectorNodes(groups, dataMap, wrapperName, language)
  }, [mode, tickerGroups, cryptoTickerGroups, globalTickerGroups, allTickersLastData, allCryptoTickersLastData, allGlobalTickersLastData, language])

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
      backgroundColor: colors.tooltipBg,
      borderColor: colors.borderColor,
      textStyle: { color: colors.tooltipText, fontSize: 13 },
      formatter: (params: any) => {
        const d = params.data?._data
        if (!d) return ''
        const changeColor = d.change < -6.8 ? '#06b6d4'
          : d.change < 0 ? '#dc2626'
            : d.change > 6.7 ? '#9333ea'
              : '#16a34a'
        const row = (label: string, value: string, extraStyle = '') =>
          `<div style="display:flex;justify-content:space-between;width:200px;gap:12px;${extraStyle}"><span style="color:${colors.textSecondary}">${label}</span><span>${value}</span></div>`
        const fmt = (price: number) => formatPrice(price, { symbol: params.name, mode: d.mode as any })
        return `
          <div style="font-weight:600;font-size:15px;margin-bottom:4px">${params.name}</div>
          ${row('Open', fmt(d.open))}
          ${row('High', fmt(d.high))}
          ${row('Low', fmt(d.low))}
          ${row('Close', fmt(d.close), `font-weight:600`)}
          ${row('Change', `<span style="color:${changeColor};font-weight:600">${d.absChange >= 0 ? '+' : ''}${fmt(d.absChange)} (${formatPercent(d.change)})</span>`)}
          ${row('Volume', formatVolume(d.volume))}
          ${d.volumeChanged != null ? row('Vol Chg', `<span style="color:${d.volumeChanged >= 0 ? '#16a34a' : '#dc2626'}">${formatPercent(d.volumeChanged)}</span>`) : ''}
        `
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
  }), [treemapData, colors, isDark, isMobile])

  if (loading) {
    return (
      <div className={className} style={{ height }}>
        <div className="flex items-center justify-center h-full">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      </div>
    )
  }

  if (dataError) {
    return (
      <div className={className} style={{ height }}>
        <div className="text-destructive text-sm p-4">{dataError}</div>
      </div>
    )
  }

  return (
    <div className={className}>
      <div className="flex items-center mb-2 shrink-0 px-3">
        <h3 className="text-lg font-semibold">{t("common.heatmap")}</h3>
      </div>
      <ReactECharts
        echarts={echarts}
        option={option}
        opts={{ renderer: 'canvas' }}
        style={{ height: chartHeight, width: '100%' }}
        notMerge={true}
      />
    </div>
  )
}
