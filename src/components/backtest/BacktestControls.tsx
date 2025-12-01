import * as React from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { TrendingUp, TrendingDown, Plus, Minus } from 'lucide-react'

interface BacktestControlsProps {
  onBuyClick: () => void
  onSellClick: () => void
  loading?: boolean
  disabled?: boolean
  className?: string
}

export function BacktestControls({
  onBuyClick,
  onSellClick,
  loading = false,
  disabled = false,
  className
}: BacktestControlsProps) {
  return (
    <Card className={className}>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium">Quick Actions</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Button
            onClick={onBuyClick}
            disabled={disabled || loading}
            className="w-full h-12 flex items-center gap-2"
            variant="default"
          >
            <TrendingUp className="h-4 w-4" />
            <span>BUY</span>
            <Badge variant="secondary" className="ml-auto text-xs">
              Long
            </Badge>
          </Button>

          <Button
            onClick={onSellClick}
            disabled={disabled || loading}
            className="w-full h-12 flex items-center gap-2"
            variant="outline"
          >
            <TrendingDown className="h-4 w-4" />
            <span>SELL</span>
            <Badge variant="secondary" className="ml-auto text-xs">
              Short
            </Badge>
          </Button>
        </div>

        <div className="text-xs text-muted-foreground space-y-1 pt-2 border-t">
          <p className="flex items-center gap-1">
            <Plus className="h-3 w-3" />
            <span>Buy: Open new long position</span>
          </p>
          <p className="flex items-center gap-1">
            <Minus className="h-3 w-3" />
            <span>Sell: Close position partially or fully</span>
          </p>
        </div>

        {loading && (
          <div className="flex items-center justify-center py-2">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
            <span className="ml-2 text-xs text-muted-foreground">Processing...</span>
          </div>
        )}
      </CardContent>
    </Card>
  )
}