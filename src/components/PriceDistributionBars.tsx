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
  return (
    <div className="space-y-2">
      {/* Extreme Gains Bar (>6.5%) */}
      <div className="flex items-center gap-2">
        <TrendingUp className="h-4 w-4 text-purple-600 flex-shrink-0" />
        <div className="flex-1 bg-gray-100 rounded-full h-4 relative">
          <div
            className="bg-purple-500 h-full rounded-full transition-all duration-300"
            style={{
              width: `${totalTickers > 0
                ? (distribution.extremeGains / totalTickers) * 100
                : 0}%`
            }}
          />
          {(() => {
            const percentage = totalTickers > 0
              ? (distribution.extremeGains / totalTickers) * 100
              : 0;
            const isOver80 = percentage > 80;
            return (
              <div
                className="absolute top-0 h-full flex items-center"
                style={{
                  left: isOver80
                    ? `${percentage - 8}%`  // Position 8% before the end
                    : `${percentage}%`,
                  transform: isOver80
                    ? 'translateX(-100%)'  // Align to the left of the position
                    : 'translateX(4px)',
                  paddingRight: isOver80 ? '4px' : '0'
                }}
              >
                <span className="text-xs font-medium text-purple-600">
                  {distribution.extremeGains}
                </span>
                <span className="text-xs text-muted-foreground ml-1">
                  ({Math.round(percentage)}%)
                </span>
              </div>
            );
          })()}
        </div>
      </div>

      {/* Normal Gains Bar (0% to 6.5%) */}
      <div className="flex items-center gap-2">
        <TrendingUp className="h-4 w-4 text-green-600 flex-shrink-0" />
        <div className="flex-1 bg-gray-100 rounded-full h-4 relative">
          <div
            className="bg-green-500 h-full rounded-full transition-all duration-300"
            style={{
              width: `${totalTickers > 0
                ? (distribution.normalGains / totalTickers) * 100
                : 0}%`
            }}
          />
          {(() => {
            const percentage = totalTickers > 0
              ? (distribution.normalGains / totalTickers) * 100
              : 0;
            const isOver80 = percentage > 80;
            return (
              <div
                className="absolute top-0 h-full flex items-center"
                style={{
                  left: isOver80
                    ? `${percentage - 8}%`  // Position 8% before the end
                    : `${percentage}%`,
                  transform: isOver80
                    ? 'translateX(-100%)'  // Align to the left of the position
                    : 'translateX(4px)',
                  paddingRight: isOver80 ? '4px' : '0'
                }}
              >
                <span className="text-xs font-medium text-green-600">
                  {distribution.normalGains}
                </span>
                <span className="text-xs text-muted-foreground ml-1">
                  ({Math.round(percentage)}%)
                </span>
              </div>
            );
          })()}
        </div>
      </div>

      {/* Neutral Bar (exactly 0%) */}
      <div className="flex items-center gap-2">
        <Minus className="h-4 w-4 text-yellow-600 flex-shrink-0" />
        <div className="flex-1 bg-gray-100 rounded-full h-4 relative">
          <div
            className="bg-yellow-500 h-full rounded-full transition-all duration-300"
            style={{
              width: `${totalTickers > 0
                ? (distribution.neutral / totalTickers) * 100
                : 0}%`
            }}
          />
          {(() => {
            const percentage = totalTickers > 0
              ? (distribution.neutral / totalTickers) * 100
              : 0;
            const isOver80 = percentage > 80;
            return (
              <div
                className="absolute top-0 h-full flex items-center"
                style={{
                  left: isOver80
                    ? `${percentage - 8}%`  // Position 8% before the end
                    : `${percentage}%`,
                  transform: isOver80
                    ? 'translateX(-100%)'  // Align to the left of the position
                    : 'translateX(4px)',
                  paddingRight: isOver80 ? '4px' : '0'
                }}
              >
                <span className="text-xs font-medium text-yellow-600">
                  {distribution.neutral}
                </span>
                <span className="text-xs text-muted-foreground ml-1">
                  ({Math.round(percentage)}%)
                </span>
              </div>
            );
          })()}
        </div>
      </div>

      {/* Normal Losses Bar (-6.5% to 0%) */}
      <div className="flex items-center gap-2">
        <TrendingDown className="h-4 w-4 text-red-600 flex-shrink-0" />
        <div className="flex-1 bg-gray-100 rounded-full h-4 relative">
          <div
            className="bg-red-500 h-full rounded-full transition-all duration-300"
            style={{
              width: `${totalTickers > 0
                ? (distribution.normalLosses / totalTickers) * 100
                : 0}%`
            }}
          />
          {(() => {
            const percentage = totalTickers > 0
              ? (distribution.normalLosses / totalTickers) * 100
              : 0;
            const isOver80 = percentage > 80;
            return (
              <div
                className="absolute top-0 h-full flex items-center"
                style={{
                  left: isOver80
                    ? `${percentage - 8}%`  // Position 8% before the end
                    : `${percentage}%`,
                  transform: isOver80
                    ? 'translateX(-100%)'  // Align to the left of the position
                    : 'translateX(4px)',
                  paddingRight: isOver80 ? '4px' : '0'
                }}
              >
                <span className="text-xs font-medium text-red-600">
                  {distribution.normalLosses}
                </span>
                <span className="text-xs text-muted-foreground ml-1">
                  ({Math.round(percentage)}%)
                </span>
              </div>
            );
          })()}
        </div>
      </div>

      {/* Extreme Losses Bar (<-6.5%) */}
      <div className="flex items-center gap-2">
        <Activity className="h-4 w-4 text-cyan-600 flex-shrink-0" />
        <div className="flex-1 bg-gray-100 rounded-full h-4 relative">
          <div
            className="bg-cyan-500 h-full rounded-full transition-all duration-300"
            style={{
              width: `${totalTickers > 0
                ? (distribution.extremeLosses / totalTickers) * 100
                : 0}%`
            }}
          />
          {(() => {
            const percentage = totalTickers > 0
              ? (distribution.extremeLosses / totalTickers) * 100
              : 0;
            const isOver80 = percentage > 80;
            return (
              <div
                className="absolute top-0 h-full flex items-center"
                style={{
                  left: isOver80
                    ? `${percentage - 8}%`  // Position 8% before the end
                    : `${percentage}%`,
                  transform: isOver80
                    ? 'translateX(-100%)'  // Align to the left of the position
                    : 'translateX(4px)',
                  paddingRight: isOver80 ? '4px' : '0'
                }}
              >
                <span className="text-xs font-medium text-cyan-600">
                  {distribution.extremeLosses}
                </span>
                <span className="text-xs text-muted-foreground ml-1">
                  ({Math.round(percentage)}%)
                </span>
              </div>
            );
          })()}
        </div>
      </div>
    </div>
  )
}