import * as React from 'react'
import { Trash2, Plus } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { SelectTickerDialog } from '@/components/dialogs/SelectTickerDialog'
import {
  getWatchlistTickers,
  saveWatchlist,
  deleteWatchlist,
} from '@/lib/watchlist-storage'

export interface EditWatchListDialogProps {
  children: React.ReactNode
  watchlistName: string
  onWatchlistUpdated?: () => void
  onWatchlistDeleted?: () => void
}

export function EditWatchListDialog({
  children,
  watchlistName,
  onWatchlistUpdated,
  onWatchlistDeleted,
}: EditWatchListDialogProps) {
  const [open, setOpen] = React.useState(false)
  const [tickers, setTickers] = React.useState<string[]>([])
  const [showDeleteConfirm, setShowDeleteConfirm] = React.useState(false)

  // Load tickers when dialog opens
  React.useEffect(() => {
    if (open) {
      const currentTickers = getWatchlistTickers(watchlistName)
      setTickers(currentTickers)
      setShowDeleteConfirm(false)
    }
  }, [open, watchlistName])

  const handleAddTicker = (symbol: string) => {
    // Avoid duplicates
    if (!tickers.includes(symbol)) {
      setTickers([...tickers, symbol])
    }
  }

  const handleRemoveTicker = (symbol: string) => {
    setTickers(tickers.filter(t => t !== symbol))
  }

  const handleSave = () => {
    try {
      saveWatchlist(watchlistName, tickers)
      setOpen(false)
      if (onWatchlistUpdated) {
        onWatchlistUpdated()
      }
    } catch (err) {
      console.error('Failed to save watchlist:', err)
    }
  }

  const handleDeleteWatchlist = () => {
    try {
      deleteWatchlist(watchlistName)
      setOpen(false)
      if (onWatchlistDeleted) {
        onWatchlistDeleted()
      }
    } catch (err) {
      console.error('Failed to delete watchlist:', err)
    }
  }

  const handleCancel = () => {
    setOpen(false)
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {children}
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Edit Watchlist: {watchlistName}</DialogTitle>
          <DialogDescription>
            Add or remove tickers from your watchlist.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Add Ticker Button */}
          <div>
            <SelectTickerDialog onSelectTicker={handleAddTicker}>
              <Button variant="outline" size="sm" className="w-full">
                <Plus className="h-4 w-4 mr-2" />
                Add Ticker
              </Button>
            </SelectTickerDialog>
          </div>

          {/* Ticker List */}
          <div className="space-y-2 max-h-[300px] overflow-y-auto">
            {tickers.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                No tickers in this watchlist
              </p>
            ) : (
              tickers.map((ticker) => (
                <div
                  key={ticker}
                  className="flex items-center justify-between p-2 rounded-md border bg-muted/30 hover:bg-muted/50 transition-colors"
                >
                  <span className="font-mono font-medium text-sm">{ticker}</span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleRemoveTicker(ticker)}
                    className="h-7 w-7 p-0 hover:bg-destructive/10 hover:text-destructive"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    <span className="sr-only">Remove {ticker}</span>
                  </Button>
                </div>
              ))
            )}
          </div>
        </div>

        <DialogFooter className="flex-col sm:flex-col gap-2">
          <div className="flex gap-2 w-full">
            <Button variant="outline" onClick={handleCancel} className="flex-1">
              Cancel
            </Button>
            <Button onClick={handleSave} className="flex-1">
              Save
            </Button>
          </div>

          {/* Delete Watchlist Section */}
          <div className="w-full border-t pt-2">
            {!showDeleteConfirm ? (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowDeleteConfirm(true)}
                className="w-full text-destructive hover:text-destructive hover:bg-destructive/10"
              >
                <Trash2 className="h-3.5 w-3.5 mr-2" />
                Delete Watchlist
              </Button>
            ) : (
              <div className="space-y-2">
                <p className="text-xs text-center text-muted-foreground">
                  Are you sure? This cannot be undone.
                </p>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowDeleteConfirm(false)}
                    className="flex-1"
                  >
                    Cancel
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={handleDeleteWatchlist}
                    className="flex-1"
                  >
                    Delete
                  </Button>
                </div>
              </div>
            )}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
