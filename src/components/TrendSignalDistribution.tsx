import * as React from 'react'
import { TrendingDown, Minus, TrendingUp } from 'lucide-react'

interface SignalDistributionData {
  sell: number
  none: number
  buy: number
}

interface TrendSignalDistributionProps {
  distribution: SignalDistributionData
  totalSignals: number
}

export function TrendSignalDistribution({ distribution, totalSignals }: TrendSignalDistributionProps) {
  const segments = [
    { key: 'sell', label: 'SELL', color: 'red', icon: TrendingDown },
    { key: 'none', label: 'NONE', color: 'gray', icon: Minus },
    { key: 'buy', label: 'BUY', color: 'green', icon: TrendingUp },
  ]

  const calculatePercentage = (count: number) =>
    totalSignals > 0 ? (count / totalSignals) * 100 : 0

  const getBarColor = (color: string) => {
    const colors: Record<string, string> = {
      green: 'from-green-600 to-green-400',
      gray: 'from-gray-600 to-gray-400',
      red: 'from-red-600 to-red-400',
    }
    return colors[color] || 'from-gray-600 to-gray-400'
  }

  const getTextColor = (color: string) => {
    const colors: Record<string, string> = {
      green: 'text-green-600',
      gray: 'text-gray-600',
      red: 'text-red-600',
    }
    return colors[color] || 'text-gray-600'
  }

  // Calculate cumulative positions for segments
  let cumulativePosition = 0
  const segmentData = segments.map(section => {
    const percentage = calculatePercentage(distribution[section.key as keyof SignalDistributionData])
    const start = cumulativePosition
    cumulativePosition += percentage
    return {
      ...section,
      percentage,
      start,
      end: cumulativePosition,
      count: distribution[section.key as keyof SignalDistributionData]
    }
  })

  return (
    <div className="space-y-4">
      {/* Main Distribution Bar */}
      <div className="relative">
        {/* Background with iPhone-style appearance */}
        <div className="w-full h-10 rounded-lg overflow-hidden bg-black/5 backdrop-blur-sm border border-black/10 dark:bg-white/5 dark:border-white/10">
          {/* Animated gradient segments */}
          {segmentData.map((segment, index) => (
            <div
              key={segment.key}
              className={`absolute top-0 h-full transition-all duration-700 ease-out bg-gradient-to-r ${getBarColor(segment.color)} hover:opacity-90`}
              style={{
                left: `${segment.start}%`,
                width: `${segment.percentage}%`,
                zIndex: segmentData.length - index,
                animation: `slideIn 0.6s ease-out ${index * 0.1}s both`
              }}
            >
              {/* iPhone-style shimmer effect */}
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent opacity-60" />
            </div>
          ))}
        </div>

        {/* Percentage Labels with clean text */}
        <div className="absolute inset-0 flex items-center">
          {segmentData.map(segment => (
            segment.percentage > 3 && (
              <span
                key={`text-${segment.key}`}
                className="text-xs font-semibold text-white"
                style={{
                  position: 'absolute',
                  left: `${segment.start + segment.percentage / 2}%`,
                  transform: 'translateX(-50%)'
                }}
              >
                {Math.round(segment.percentage)}%
              </span>
            )
          ))}
        </div>
      </div>

      {/* Summary Cards - 3 cards layout */}
      <div className="grid grid-cols-3 gap-2">
        {segmentData.map(segment => {
          const Icon = segment.icon
          const percentage = Math.round(segment.percentage)
          return (
            <div
              key={`card-${segment.key}`}
              className={`relative p-3 rounded-lg border transition-all duration-200 hover:shadow-md hover:scale-105 cursor-pointer flex flex-col items-center justify-center ${
                segment.percentage > 0
                  ? 'border-slate-200 bg-white dark:border-slate-600 dark:bg-slate-800'
                  : 'border-slate-100 bg-slate-50 opacity-60 dark:border-slate-700 dark:bg-slate-900/50'
              }`}
            >
              {/* Icon */}
              <Icon className={`h-4 w-4 ${getTextColor(segment.color)} mb-1`} />

              {/* Count */}
              <span className="text-sm font-medium text-slate-900 dark:text-slate-100">
                {segment.count}
              </span>
            </div>
          )
        })}
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