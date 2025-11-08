import type { StockData } from '@/lib/api-client'
import { TrendingUp, TrendingDown } from 'lucide-react'

interface BasicTickerWidgetProps {
  data: StockData
}

export function BasicTickerWidget({ data }: BasicTickerWidgetProps) {
  const priceChange = data.close_changed ?? 0
  const volumeChange = data.volume_changed ?? 0
  const isPricePositive = priceChange >= 0
  const isVolumePositive = volumeChange >= 0

  const formatNumber = (num: number) => {
    return new Intl.NumberFormat('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(num)
  }

  const formatVolume = (vol: number) => {
    if (vol >= 1_000_000) {
      return `${(vol / 1_000_000).toFixed(2)}M`
    }
    if (vol >= 1_000) {
      return `${(vol / 1_000).toFixed(2)}K`
    }
    return vol.toFixed(0)
  }

  return (
    <div className="border rounded-lg p-4 bg-card">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-lg font-bold">{data.symbol}</h3>
          <p className="text-xs text-muted-foreground">{data.time}</p>
        </div>
        <div className="text-right">
          <div className="text-2xl font-bold">{formatNumber(data.close)}</div>
          {data.close_changed !== null && data.close_changed !== undefined && (
            <div
              className={`flex items-center justify-end gap-1 text-sm font-medium ${
                isPricePositive ? 'text-green-600' : 'text-red-600'
              }`}
            >
              {isPricePositive ? (
                <TrendingUp className="h-4 w-4" />
              ) : (
                <TrendingDown className="h-4 w-4" />
              )}
              <span>
                {isPricePositive ? '+' : ''}
                {priceChange.toFixed(2)}%
              </span>
            </div>
          )}
        </div>
      </div>

      {/* OHLCV Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <div className="space-y-1">
          <p className="text-xs text-muted-foreground uppercase tracking-wide">Open</p>
          <p className="text-sm font-semibold">{formatNumber(data.open)}</p>
        </div>
        <div className="space-y-1">
          <p className="text-xs text-muted-foreground uppercase tracking-wide">High</p>
          <p className="text-sm font-semibold text-green-600">{formatNumber(data.high)}</p>
        </div>
        <div className="space-y-1">
          <p className="text-xs text-muted-foreground uppercase tracking-wide">Low</p>
          <p className="text-sm font-semibold text-red-600">{formatNumber(data.low)}</p>
        </div>
        <div className="space-y-1">
          <p className="text-xs text-muted-foreground uppercase tracking-wide">Close</p>
          <p className="text-sm font-semibold">{formatNumber(data.close)}</p>
        </div>
        <div className="space-y-1 col-span-2 sm:col-span-2">
          <p className="text-xs text-muted-foreground uppercase tracking-wide">Volume</p>
          <div className="flex items-center gap-2">
            <p className="text-sm font-semibold">{formatVolume(data.volume)}</p>
            {data.volume_changed !== null && data.volume_changed !== undefined && (
              <span
                className={`text-xs font-medium ${
                  isVolumePositive ? 'text-green-600' : 'text-red-600'
                }`}
              >
                {isVolumePositive ? '+' : ''}
                {volumeChange.toFixed(2)}%
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
