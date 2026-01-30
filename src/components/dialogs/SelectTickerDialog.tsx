import * as React from 'react'
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Search } from 'lucide-react'
import { useAPI } from '@/contexts/APIContext'
import { MARKET_INDICES } from '@/lib/constants'
import { useTranslation } from '@/hooks/useTranslation'
import { SortableTickerList, type SortableTickerListRef } from '@/components/lists/SortableTickerList'

interface SelectTickerDialogProps {
  children: React.ReactNode
  onSelectTicker: (ticker: string) => void
  defaultSectionFilter?: 'all' | 'stocks' | 'crypto'
}

export function SelectTickerDialog({ children, onSelectTicker, defaultSectionFilter = 'stocks' }: SelectTickerDialogProps) {
  const [open, setOpen] = React.useState(false)
  const [search, setSearch] = React.useState('')
  const tickerListRef = React.useRef<SortableTickerListRef>(null)
  const {
    tickers,
    loading,
    error,
    allTickersLastData,
    cryptoTickers,
    cryptoLoading,
    cryptoError,
    allCryptoTickersLastData
  } = useAPI()
  const { t } = useTranslation()

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      tickerListRef.current?.selectFirstVisible()
    }
  }

  const handleSelectTicker = (symbol: string) => {
    onSelectTicker(symbol)
    setOpen(false)
    setSearch('')
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-2xl h-[700px] flex flex-col p-6 gap-4" showCloseButton={false}>
        <DialogTitle className="sr-only">{t('dialogs.selectTicker.title')}</DialogTitle>
        <div className="shrink-0 border-b pb-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder={t('dialogs.selectTicker.searchPlaceholder')}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={handleKeyDown}
              className="pl-9 h-9 text-sm bg-muted/50 border-0 focus-visible:ring-1"
              autoFocus
            />
          </div>
        </div>

        <div className="flex-1 min-h-0">
          <SortableTickerList
            ref={tickerListRef}
            tickers={tickers}
            allTickersLastData={allTickersLastData}
            searchQuery={search}
            marketIndices={[...MARKET_INDICES]}
            onSelectTicker={handleSelectTicker}
            loading={loading || cryptoLoading}
            error={error || cryptoError}
            maxHeight="none"
            className="h-full"
            cryptoTickers={cryptoTickers}
            allCryptoTickersLastData={allCryptoTickersLastData}
            defaultSectionFilter={defaultSectionFilter}
          />
        </div>
      </DialogContent>
    </Dialog>
  )
}
