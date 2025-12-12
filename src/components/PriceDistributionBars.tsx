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
      purple: 'from-purple-600 to-purple-400',
      green: 'from-green-600 to-green-400',
      gray: 'from-gray-600 to-gray-400',
      red: 'from-red-600 to-red-400',
      cyan: 'from-cyan-600 to-cyan-400'
    }
    return colors[color] || 'from-gray-600 to-gray-400'
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

      {/* Summary Cards - 5 cards layout */}
      <div className="grid grid-cols-5 gap-2">
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