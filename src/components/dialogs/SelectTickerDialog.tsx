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
import { SortableTickerList } from '@/components/lists'

interface SelectTickerDialogProps {
  children: React.ReactNode
  onSelectTicker: (ticker: string) => void
}

export function SelectTickerDialog({ children, onSelectTicker }: SelectTickerDialogProps) {
  const [open, setOpen] = React.useState(false)
  const [search, setSearch] = React.useState('')
  const { tickers, loading, error, allTickersData } = useAPI()
  const { t } = useTranslation()

  const handleSelectTicker = (symbol: string) => {
    onSelectTicker(symbol)
    setOpen(false)
    setSearch('')
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-2xl h-[700px] flex flex-col p-0 gap-0" showCloseButton={false}>
        <DialogTitle className="sr-only">{t('dialogs.selectTicker.title')}</DialogTitle>
        <div className="p-4 shrink-0 border-b">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder={t('dialogs.selectTicker.searchPlaceholder')}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 h-9 text-sm bg-muted/50 border-0 focus-visible:ring-1"
              autoFocus
            />
          </div>
        </div>

        <SortableTickerList
          tickers={tickers}
          allTickersData={allTickersData}
          searchQuery={search}
          marketIndices={[...MARKET_INDICES]}
          onSelectTicker={handleSelectTicker}
          loading={loading}
          error={error}
          maxHeight="100%"
          className="flex-1"
        />
      </DialogContent>
    </Dialog>
  )
}
