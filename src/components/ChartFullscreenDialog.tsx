import * as React from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { TradingViewChart } from '@/components/charts/TradingViewChart'

interface ChartFullscreenDialogProps {
  ticker: string | null
  onClose: () => void
}

export function ChartFullscreenDialog({
  ticker,
  onClose,
}: ChartFullscreenDialogProps) {
  const isOpen = ticker !== null
  const [chartHeight, setChartHeight] = React.useState(600)
  const dialogContentRef = React.useRef<HTMLDivElement>(null)

  // Measure available height when dialog opens or window resizes
  React.useEffect(() => {
    if (!isOpen) return

    const updateHeight = () => {
      if (dialogContentRef.current) {
        const dialogHeight = dialogContentRef.current.clientHeight
        const headerElement = dialogContentRef.current.querySelector('[data-slot="header"]') as HTMLElement
        const headerHeight = headerElement?.offsetHeight || 50
        const gap = 8 // gap-2
        const padding = 12 * 2 // p-3 top + bottom

        const available = dialogHeight - headerHeight - gap - padding

        // Account for control bar (~32px) + space-y-4 gap (~16px) = 48px
        const CONTROL_BAR_HEIGHT = 48
        setChartHeight(Math.max(available - CONTROL_BAR_HEIGHT, 300))
      }
    }

    // Use ResizeObserver for more reliable measurement
    const resizeObserver = new ResizeObserver(() => {
      updateHeight()
    })

    // Observe the dialog content element
    const timer = setTimeout(() => {
      if (dialogContentRef.current) {
        resizeObserver.observe(dialogContentRef.current)
        updateHeight()
      }
    }, 100)

    // Update on window resize
    window.addEventListener('resize', updateHeight)

    return () => {
      clearTimeout(timer)
      resizeObserver.disconnect()
      window.removeEventListener('resize', updateHeight)
    }
  }, [isOpen])

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent ref={dialogContentRef} className="max-w-[98vw] w-[98vw] h-[95vh] h-[95dvh] p-3 gap-2 flex flex-col">
        <DialogHeader data-slot="header" className="flex-shrink-0 pb-2">
          <DialogTitle className="text-base">{ticker}</DialogTitle>
        </DialogHeader>

        {ticker && (
          <div className="flex-1 min-h-0 w-full">
            <TradingViewChart
              ticker={ticker}
              height={chartHeight}
              showControls={true}
            />
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
