import { createFileRoute } from '@tanstack/react-router'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import * as React from 'react'
import { VolumeProfileWidget } from '@/components/widgets/VolumeProfileWidget'
import { TradingViewChart } from '@/components/charts/TradingViewChart'
import { useAPI } from '@/contexts/APIContext'
import { useTranslation } from '@/hooks/useTranslation'
import { getTickerMode } from '@/lib/ticker-utils'
import { MARKET_INDICES } from '@/lib/constants'
import { Button } from '@/components/ui/button'

export const Route = createFileRoute('/volume-profile')({
  component: VolumeProfilePage,
})

function VolumeProfilePage() {
  const [ticker, setTicker] = React.useState('VNINDEX')
  const { t } = useTranslation()
  const {
    tickers: stockTickers,
    cryptoTickers,
    globalTickers,
    allTickersLastData,
    allCryptoTickersLastData,
    allGlobalTickersLastData,
  } = useAPI()

  const navigationTickers = React.useMemo(() => {
    const tickerMode = ticker
      ? getTickerMode(ticker, stockTickers, globalTickers, cryptoTickers)
      : 'vn'
    const isCrypto = tickerMode === 'crypto'
    const isGlobal = tickerMode === 'yahoo'

    if (isCrypto) {
      const tickersWithValue = cryptoTickers
        .map((tick) => {
          const data = allCryptoTickersLastData[tick.symbol]
          if (!data || data.length === 0) return null
          const latestData = data[0]
          if (latestData?.close_changed === null || latestData?.close_changed === undefined) return null
          const value = (latestData.close ?? 0) * (latestData.volume ?? 0)
          return { symbol: tick.symbol, value }
        })
        .filter((item): item is { symbol: string; value: number } => item !== null)
      tickersWithValue.sort((a, b) => b.value - a.value)
      return tickersWithValue.map((t) => t.symbol)
    }

    if (isGlobal) {
      const tickersWithValue = globalTickers
        .map((tick) => {
          const data = allGlobalTickersLastData[tick.symbol]
          if (!data || data.length === 0) return null
          const latestData = data[0]
          if (latestData?.close_changed === null || latestData?.close_changed === undefined) return null
          const value = (latestData.close ?? 0) * (latestData.volume ?? 0)
          return { symbol: tick.symbol, value }
        })
        .filter((item): item is { symbol: string; value: number } => item !== null)
      tickersWithValue.sort((a, b) => b.value - a.value)
      return tickersWithValue.map((t) => t.symbol)
    }

    const knownTickerSymbols = new Set(stockTickers.map((t) => t.symbol))
    const tickersWithValue = Object.entries(allTickersLastData)
      .filter(([symbol, data]) => {
        if (!knownTickerSymbols.has(symbol)) return false
        return data && data.length > 0 && data[0]?.close_changed !== null && data[0]?.close_changed !== undefined
      })
      .map(([symbol, data]) => {
        const latestData = data[0]
        const value = (latestData.close ?? 0) * (latestData.volume ?? 0)
        return { symbol, value }
      })
    tickersWithValue.sort((a, b) => b.value - a.value)
    let symbols = tickersWithValue.map((t) => t.symbol)
    symbols = symbols.filter((s) => !MARKET_INDICES.includes(s as any))
    symbols.unshift(...MARKET_INDICES)
    return symbols
  }, [ticker, stockTickers, cryptoTickers, globalTickers, allTickersLastData, allCryptoTickersLastData, allGlobalTickersLastData])

  const currentIndex = navigationTickers.indexOf(ticker)
  const hasNavigation = navigationTickers.length > 1

  const goToPrev = React.useCallback(() => {
    if (currentIndex <= 0) return
    setTicker(navigationTickers[currentIndex - 1])
  }, [currentIndex, navigationTickers])

  const goToNext = React.useCallback(() => {
    if (currentIndex < 0 || currentIndex >= navigationTickers.length - 1) return
    setTicker(navigationTickers[currentIndex + 1])
  }, [currentIndex, navigationTickers])

  // Keyboard navigation
  React.useEffect(() => {
    if (!hasNavigation) return

    const handleKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) {
        return
      }
      if (event.key === 'ArrowLeft') {
        event.preventDefault()
        goToPrev()
      } else if (event.key === 'ArrowRight') {
        event.preventDefault()
        goToNext()
      }
    }

    window.addEventListener('keydown', handleKeyDown, { capture: true })
    return () => {
      window.removeEventListener('keydown', handleKeyDown, { capture: true })
    }
  }, [hasNavigation, goToPrev, goToNext])

  return (
    <div className="p-4 md:p-6 space-y-4">
      <VolumeProfileWidget
        ticker={ticker}
        onTickerChange={setTicker}
        maxHeight="600px"
      />
      <TradingViewChart
        ticker={ticker}
        onTickerChange={setTicker}
        showControls={true}
      />
      {hasNavigation && (
        <div className="flex items-center justify-center gap-2 pt-2 border-t">
          <Button
            variant="outline"
            size="sm"
            onClick={goToPrev}
            disabled={currentIndex <= 0}
            className="h-10 sm:h-8 px-6 sm:px-4"
          >
            <ChevronLeft className="h-4 w-4 mr-1" />
            <span className="hidden sm:inline">{t('common.previous')}</span>
          </Button>
          <div className="px-6 py-3 sm:px-4 sm:py-2 text-sm font-medium bg-muted rounded-md min-w-[90px] text-center">
            {currentIndex + 1} / {navigationTickers.length}
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={goToNext}
            disabled={currentIndex >= navigationTickers.length - 1}
            className="h-10 sm:h-8 px-6 sm:px-4"
          >
            <span className="hidden sm:inline">{t('common.next')}</span>
            <ChevronRight className="h-4 w-4 ml-1" />
          </Button>
        </div>
      )}
    </div>
  )
}
