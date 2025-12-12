import * as React from 'react'
import { TrendingUp, TrendingDown, Activity, Minus } from 'lucide-react'

interface PriceDistributionData {
  extremeGains: number
  normalGains: number
  neutral: number
  normalLosses: number
  extremeLosses: number
}

interface PriceDistributionBarsProps {
  distribution: PriceDistributionData
  totalTickers: number
}

export function PriceDistributionBars({ distribution, totalTickers }: PriceDistributionBarsProps) {
  const segments = [
    { key: 'extremeLosses', label: '<-6.5%', color: 'cyan', icon: Activity },
    { key: 'normalLosses', label: '-6.5% to 0%', color: 'red', icon: TrendingDown },
    { key: 'neutral', label: '0%', color: 'gray', icon: Minus },
    { key: 'normalGains', label: '0% to 6.5%', color: 'green', icon: TrendingUp },
    { key: 'extremeGains', label: '>6.5%', color: 'purple', icon: TrendingUp },
  ]

  const calculatePercentage = (count: number) =>
    totalTickers > 0 ? (count / totalTickers) * 100 : 0

  const getBarColor = (color: string) => {
    const colors: Record<string, string> = {
      purple: 'bg-purple-500',
      green: 'bg-green-500',
      gray: 'bg-gray-500', // Changed from yellow/amber to gray for neutral
      red: 'bg-red-500',
      cyan: 'bg-cyan-500'
    }
    return colors[color] || 'bg-gray-500'
  }

  const getTextColor = (color: string) => {
    const colors: Record<string, string> = {
      purple: 'text-purple-600',
      green: 'text-green-600',
      gray: 'text-gray-600', // Changed from yellow/amber to gray for neutral
      red: 'text-red-600',
      cyan: 'text-cyan-600'
    }
    return colors[color] || 'text-gray-600'
  }

  // Calculate cumulative positions for segments
  let cumulativePosition = 0
  const segmentData = segments.map(section => {
    const percentage = calculatePercentage(distribution[section.key as keyof PriceDistributionData])
    const start = cumulativePosition
    cumulativePosition += percentage
    return {
      ...section,
      percentage,
      start,
      end: cumulativePosition,
      count: distribution[section.key as keyof PriceDistributionData]
    }
  })

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-semibold text-gray-800 dark:text-gray-200">Price Distribution</h4>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1">
            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-xs text-gray-600 dark:text-gray-400">Live</span>
          </div>
          <span className="text-xs text-gray-500 dark:text-gray-500">Total: {totalTickers}</span>
        </div>
      </div>

      {/* Main Distribution Bar */}
      <div className="relative group">
        {/* Background with gradient */}
        <div className="w-full bg-gradient-to-r from-slate-100 via-gray-100 to-slate-100 dark:from-slate-800 dark:via-slate-800 dark:to-slate-800 rounded-full h-8 shadow-inner overflow-hidden border border-slate-200 dark:border-slate-700">
          {/* Animated segments */}
          {segmentData.map((segment, index) => (
            <div
              key={segment.key}
              className={`absolute top-0 h-full transition-all duration-700 ease-out ${getBarColor(segment.color)} hover:brightness-110`}
              style={{
                left: `${segment.start}%`,
                width: `${segment.percentage}%`,
                zIndex: segmentData.length - index,
                boxShadow: segment.percentage > 0 ? 'inset 0 0 10px rgba(0,0,0,0.1)' : 'none',
                animation: `slideIn 0.5s ease-out ${index * 0.1}s both`
              }}
            >
              {/* Subtle gradient overlay for depth */}
              <div className="absolute inset-0 bg-gradient-to-b from-white/20 to-transparent opacity-50" />
            </div>
          ))}
        </div>

        {/* Percentage Labels with enhanced styling */}
        <div className="absolute inset-0 flex items-center">
          {segmentData.map(segment => (
            segment.percentage > 5 && (
              <span
                key={`text-${segment.key}`}
                className="text-sm font-bold text-white drop-shadow-lg"
                style={{
                  position: 'absolute',
                  left: `${segment.start + segment.percentage / 2}%`,
                  transform: 'translateX(-50%)',
                  textShadow: '0 1px 2px rgba(0,0,0,0.5)'
                }}
              >
                {Math.round(segment.percentage)}%
              </span>
            )
          ))}
        </div>

        {/* Hover tooltip background */}
        <div className="absolute -top-8 left-0 right-0 h-6 bg-slate-900/90 dark:bg-slate-700/90 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center justify-center backdrop-blur-sm">
          <span className="text-xs text-white">Market Sentiment Distribution</span>
        </div>
      </div>

      {/* Enhanced Legend with cards */}
      <div className="grid grid-cols-5 gap-2">
        {segmentData.map(segment => {
          const Icon = segment.icon
          const percentage = Math.round(segment.percentage)
          return (
            <div
              key={`legend-${segment.key}`}
              className={`relative p-3 rounded-lg border transition-all duration-200 hover:shadow-md hover:scale-105 cursor-pointer flex flex-col items-center justify-center ${
                segment.percentage > 0
                  ? 'border-slate-200 bg-white dark:border-slate-600 dark:bg-slate-800'
                  : 'border-slate-100 bg-slate-50 opacity-60 dark:border-slate-700 dark:bg-slate-900/50'
              }`}
            >
              {/* Icon */}
              <div className="flex items-center justify-center mb-1">
                <Icon className={`h-4 w-4 ${getTextColor(segment.color)}`} />
              </div>

              {/* Percentage */}
              <div className={`text-sm font-bold ${getTextColor(segment.color)}`}>
                {percentage}%
              </div>
            </div>
          )
        })}
      </div>

      {/* Summary metrics row */}
      <div className="flex justify-between items-center pt-2 border-t border-slate-200 dark:border-slate-700">
        <div className="flex items-center gap-4 text-xs">
          <div className="flex items-center gap-1">
            <div className="w-2 h-2 bg-emerald-500 rounded-full" />
            <span className="text-slate-600 dark:text-slate-400">Gainers: {distribution.normalGains + distribution.extremeGains}</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-2 h-2 bg-amber-500 rounded-full" />
            <span className="text-slate-600 dark:text-slate-400">Neutral: {distribution.neutral}</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-2 h-2 bg-red-500 rounded-full" />
            <span className="text-slate-600 dark:text-slate-400">Losers: {distribution.normalLosses + distribution.extremeLosses}</span>
          </div>
        </div>
      </div>

      <style jsx>{`
        @keyframes slideIn {
          from {
            transform: scaleX(0);
            transform-origin: left;
          }
          to {
            transform: scaleX(1);
          }
        }
      `}</style>
    </div>
  )
}