import * as React from 'react'
import ReactECharts from 'echarts-for-react'
import * as echarts from 'echarts/core'
import { TreemapChart } from 'echarts/charts'
import {
  TooltipComponent,
} from 'echarts/components'
import { CanvasRenderer } from 'echarts/renderers'
import { useAPI } from '@/contexts/APIContext'
import { useWatchListData } from '@/hooks/useWatchListData'
import { useTranslation } from '@/hooks/useTranslation'
import { MARKET_INDICES } from '@/lib/constants'
import { formatPrice, formatPercent, formatVolume } from '@/lib/format'
import { getSectorDisplayName } from '@/lib/sector-names'
import type { StockData } from '@/lib/api-client'
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
  onSelectTicker?: (symbol: string, sectorTickers: string[]) => void
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
  value?: [number, number, number]
  itemStyle?: { color: string }
  children?: TreemapNode[]
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
      if (!latestData || !latestData.close || latestData.close_changed == null) continue
      const tradedValue = latestData.close * (latestData.volume || 0)
      if (tradedValue === 0) continue
      children.push({
        name: symbol,
        value: [tradedValue, latestData.close_changed, latestData.close],
        itemStyle: { color: getChangeColor(latestData.close_changed) },
      })
    }
    if (children.length === 0) continue
    // Sort by traded value descending, keep top N to prevent outliers from dominating
    children.sort((a, b) => (b.value?.[0] ?? 0) - (a.value?.[0] ?? 0))
    sectorNodes.push({
      name: getSectorDisplayName(sector, language),
      children: children.slice(0, MAX_TICKERS_PER_SECTOR),
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
  onSelectTicker,
}: TradingTreemapProps) {
  const { tickerGroups, cryptoTickerGroups, globalTickerGroups } = useAPI()
  const { stockData, cryptoData, globalData, loading: dataLoading, error: dataError } = useWatchListData({ needsMA: false })
  const { t, language } = useTranslation()

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
        ...buildSectorNodes(tickerGroups, stockData, 'VN Stocks', language),
        ...buildSectorNodes(cryptoTickerGroups, cryptoData, 'Crypto', language),
        ...buildSectorNodes(globalTickerGroups, globalData, 'Global', language),
      ]
    }
    const dataMap = mode === 'crypto' ? cryptoData
      : mode === 'global' ? globalData
      : stockData
    const groups = mode === 'crypto' ? cryptoTickerGroups
      : mode === 'global' ? globalTickerGroups
      : tickerGroups
    return buildSectorNodes(groups, dataMap, null, language)
  }, [mode, tickerGroups, cryptoTickerGroups, globalTickerGroups, stockData, cryptoData, globalData, language])

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
        const val = Array.isArray(params.value) ? params.value as [number, number, number] : null
        if (!val || val.length < 3) return ''
        const [tradedValue, change, price] = val
        const changeColor = change < -6.8 ? '#06b6d4'
          : change < 0 ? '#dc2626'
            : change > 6.7 ? '#9333ea'
              : '#16a34a'
        return `
          <div style="font-weight:600;font-size:15px;margin-bottom:4px">${params.name}</div>
          <div style="display:flex;justify-content:space-between;width:180px;gap:12px">
            <span style="color:${colors.textSecondary}">Price</span>
            <span style="font-weight:500">${formatPrice(price, { symbol: params.name })}</span>
          </div>
          <div style="display:flex;justify-content:space-between;width:180px;gap:12px">
            <span style="color:${colors.textSecondary}">Change</span>
            <span style="color:${changeColor};font-weight:600">${formatPercent(change)}</span>
          </div>
          <div style="display:flex;justify-content:space-between;width:180px;gap:12px;margin-top:4px;border-top:1px solid ${colors.borderColor};padding-top:4px">
            <span style="color:${colors.textSecondary}">Value</span>
            <span>${formatVolume(tradedValue)}</span>
          </div>
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
      roam: false,
      nodeClick: 'zoomToNode',
      breadcrumb: {
        show: true,
        left: 'center',
        bottom: 8,
        height: 22,
        itemStyle: {
          color: 'transparent',
          borderColor: colors.borderColor,
          textStyle: { color: colors.textColor, fontSize: 11, fontWeight: 'bold', fontFamily: 'Inter, Segoe UI, Arial, sans-serif' },
        },
        emphasis: {
          itemStyle: { color: 'transparent' },
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
          const val = Array.isArray(params.value) ? params.value as [number, number, number] : null
          if (!val || val.length < 3) return ''
          const [, change] = val
          return `${params.name}\n${formatPercent(change)}`
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
  }), [treemapData, colors, isDark, isMobile, language])

  // Click handler — find the sector this ticker belongs to and pass sector tickers
  const onEvents = React.useMemo(() => ({
    click: (params: any) => {
      if (!params.data?.value || params.data.value.length < 3 || !onSelectTicker) return
      const symbol = params.name
      const treePath = params.treePathInfo
      if (treePath && treePath.length >= 2) {
        // treePathInfo[0] = root, treePathInfo[1] = sector, treePathInfo[2] = leaf
        const sectorName = treePath[1]?.name
        const sectorNode = treemapData.find(s => s.name === sectorName)
        const sectorTickers = sectorNode?.children?.map(c => c.name) ?? [symbol]
        onSelectTicker(symbol, sectorTickers)
      } else {
        onSelectTicker(symbol, [symbol])
      }
    },
  }), [onSelectTicker, treemapData])

  if (dataLoading) {
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
        onEvents={onEvents}
        opts={{ renderer: 'canvas' }}
        style={{ height: chartHeight, width: '100%' }}
        notMerge={true}
      />
    </div>
  )
}
