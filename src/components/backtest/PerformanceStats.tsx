import * as React from 'react'
import { formatPrice, formatPercent } from '@/lib/format'
import { getPriceChangeColor } from '@/lib/colors'
import { PortfolioStats } from '@/lib/backtest-calculations'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { TrendingUp, TrendingDown, Target, Wallet, DollarSign, BarChart3 } from 'lucide-react'
import { useTranslation } from '@/hooks/useTranslation'

interface PerformanceStatsProps {
  stats: PortfolioStats | null
  loading?: boolean
  className?: string
}

export function PerformanceStats({ stats, loading, className }: PerformanceStatsProps) {
  const { t } = useTranslation()

  if (loading) {
    return (
      <div className={`space-y-4 ${className || ''}`}>
        <div className="space-y-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i} className="py-2">
              <CardContent className="px-3 py-2">
                <div className="flex items-center justify-between">
                  <div className="h-4 w-20 bg-muted rounded animate-pulse" />
                  <div className="h-4 w-4 bg-muted rounded animate-pulse" />
                </div>
                <div className="h-5 w-24 bg-muted rounded animate-pulse mt-2" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    )
  }

  if (!stats) {
    return (
      <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
        <BarChart3 className="h-8 w-8 mb-2 opacity-50" />
        <p className="text-sm font-medium mb-1">{t('common.backtest.noPortfolioData')}</p>
        <p className="text-xs">{t('common.backtest.startTrading')}</p>
      </div>
    )
  }

  const isPositive = stats.totalPnL >= 0

  const StatCard = ({
    title,
    value,
    icon: Icon,
    color = 'default'
  }: {
    title: string
    value: string | React.ReactNode
    icon: React.ComponentType<{ className?: string }>
    color?: 'default' | 'positive' | 'negative' | 'neutral'
  }) => {
    const colorClasses = {
      default: 'text-foreground',
      positive: 'text-green-600 dark:text-green-500',
      negative: 'text-red-600 dark:text-red-500',
      neutral: 'text-muted-foreground'
    }

    return (
      <Card className="py-2 gap-1">
        <CardContent className="px-3 py-2">
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground uppercase tracking-wide">{title}</span>
            <Icon className="h-3 w-3 text-muted-foreground" />
          </div>
          <div className={`text-sm font-bold ${colorClasses[color]}`}>
            {value}
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className={`space-y-3 ${className || ''}`}>
      {/* Main Statistics */}
      <div className="space-y-2">
        <StatCard
          title={t('common.backtest.portfolioValue')}
          value={formatPrice(stats.totalValue, { mode: 'vn' })}
          icon={Wallet}
        />

        <StatCard
          title={t('common.backtest.totalInvested')}
          value={formatPrice(stats.totalCost, { mode: 'vn' })}
          icon={DollarSign}
        />

        <StatCard
          title={t('common.backtest.totalPnL')}
          value={
            <div className="flex items-center gap-1">
              {isPositive ? (
                <TrendingUp className="h-4 w-4" />
              ) : (
                <TrendingDown className="h-4 w-4" />
              )}
              <span>
                {formatPrice(stats.totalPnL, { mode: 'vn' })}
              </span>
            </div>
          }
          icon={Target}
          color={isPositive ? 'positive' : 'negative'}
        />

        <StatCard
          title={t('common.backtest.pnlPercent')}
          value={
            <div className="flex items-center gap-1">
              {stats.totalPnLPercent >= 0 ? (
                <TrendingUp className="h-4 w-4" />
              ) : (
                <TrendingDown className="h-4 w-4" />
              )}
              <span className={getPriceChangeColor(stats.totalPnLPercent)}>
                {stats.totalPnLPercent >= 0 ? '+' : ''}{stats.totalPnLPercent.toFixed(2)}%
              </span>
            </div>
          }
          icon={BarChart3}
          color={stats.totalPnLPercent >= 0 ? 'positive' : 'negative'}
        />
      </div>

      {/* Detailed Breakdown */}
      <div className="space-y-2">
        <Card className="py-3 gap-2">
          <CardHeader className="pb-2 px-4">
            <CardTitle className="text-sm font-medium">{t('common.backtest.performanceBreakdown')}</CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-3 space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">{t('common.backtest.realizedPnL')}</span>
              <span className={`text-sm font-medium ${getPriceChangeColor(stats.realizedPnL)}`}>
                {formatPrice(stats.realizedPnL, { mode: 'vn' })}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">{t('common.backtest.unrealizedPnL')}</span>
              <span className={`text-sm font-medium ${getPriceChangeColor(stats.unrealizedPnL)}`}>
                {formatPrice(stats.unrealizedPnL, { mode: 'vn' })}
              </span>
            </div>
          </CardContent>
        </Card>

        <Card className="py-3 gap-2">
          <CardHeader className="pb-2 px-4">
            <CardTitle className="text-sm font-medium">{t('common.backtest.positionAnalysis')}</CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-3 space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">{t('common.backtest.totalPositions')}</span>
              <span className="text-sm font-medium">{stats.totalPositions}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">{t('common.backtest.winning')}</span>
              <span className="text-sm font-medium text-green-600 dark:text-green-500">
                {stats.winningPositions}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">{t('common.backtest.losing')}</span>
              <span className="text-sm font-medium text-red-600 dark:text-red-500">
                {stats.losingPositions}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">{t('common.backtest.winRate')}</span>
              <span className="text-sm font-medium">
                {stats.totalPositions > 0
                  ? formatPercent((stats.winningPositions / stats.totalPositions) * 100)
                  : '0%'
                }
              </span>
            </div>
          </CardContent>
        </Card>

        <Card className="py-3 gap-2">
          <CardHeader className="pb-2 px-4">
            <CardTitle className="text-sm font-medium">{t('common.backtest.topPerformers')}</CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-3 space-y-2">
            <div className="space-y-2">
              <div className="text-xs text-muted-foreground">{t('common.backtest.best')}</div>
              {stats.bestPerformer ? (
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium">{stats.bestPerformer.ticker}</span>
                  <span className={`text-sm font-medium ${getPriceChangeColor(stats.bestPerformer.percent)}`}>
                    +{stats.bestPerformer.percent.toFixed(2)}%
                  </span>
                </div>
              ) : (
                <div className="text-sm text-muted-foreground">—</div>
              )}
            </div>

            <div className="space-y-2">
              <div className="text-xs text-muted-foreground">{t('common.backtest.worst')}</div>
              {stats.worstPerformer ? (
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium">{stats.worstPerformer.ticker}</span>
                  <span className={`text-sm font-medium ${getPriceChangeColor(stats.worstPerformer.percent)}`}>
                    {stats.worstPerformer.percent.toFixed(2)}%
                  </span>
                </div>
              ) : (
                <div className="text-sm text-muted-foreground">—</div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}