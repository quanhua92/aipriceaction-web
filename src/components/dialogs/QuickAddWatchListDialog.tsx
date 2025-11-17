import * as React from 'react'
import { Star, Check, X } from 'lucide-react'
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
import {
  getWatchlistNames,
  getWatchlistTickers,
  saveWatchlist,
} from '@/lib/watchlist-storage'

export interface QuickAddWatchListDialogProps {
  children: React.ReactNode
  ticker: string
}

export function QuickAddWatchListDialog({
  children,
  ticker,
}: QuickAddWatchListDialogProps) {
  const [open, setOpen] = React.useState(false)
  const [watchlists, setWatchlists] = React.useState<string[]>([])
  const [addedWatchlists, setAddedWatchlists] = React.useState<Set<string>>(new Set())

  // Load watchlists when dialog opens
  React.useEffect(() => {
    if (open) {
      const names = getWatchlistNames()
      setWatchlists(names)

      // Check which watchlists already contain this ticker
      const alreadyAdded = new Set<string>()
      names.forEach(name => {
        const tickers = getWatchlistTickers(name)
        if (tickers.includes(ticker)) {
          alreadyAdded.add(name)
        }
      })
      setAddedWatchlists(alreadyAdded)
    }
  }, [open, ticker])

  const handleAddToWatchlist = (watchlistName: string) => {
    try {
      const currentTickers = getWatchlistTickers(watchlistName)

      // Avoid duplicates
      if (!currentTickers.includes(ticker)) {
        const updatedTickers = [...currentTickers, ticker]
        saveWatchlist(watchlistName, updatedTickers)

        // Update UI to show it's been added
        setAddedWatchlists(prev => new Set([...prev, watchlistName]))
      }
    } catch (err) {
      console.error('Failed to add ticker to watchlist:', err)
    }
  }

  const handleRemoveFromWatchlist = (watchlistName: string) => {
    try {
      const currentTickers = getWatchlistTickers(watchlistName)
      const updatedTickers = currentTickers.filter(t => t !== ticker)
      saveWatchlist(watchlistName, updatedTickers)

      // Update UI to show it's been removed
      setAddedWatchlists(prev => {
        const newSet = new Set(prev)
        newSet.delete(watchlistName)
        return newSet
      })
    } catch (err) {
      console.error('Failed to remove ticker from watchlist:', err)
    }
  }

  const handleClose = () => {
    setOpen(false)
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {children}
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add {ticker} to Watchlist</DialogTitle>
          <DialogDescription>
            Choose a watchlist to add this ticker to.
          </DialogDescription>
        </DialogHeader>

        <div className="py-4">
          {watchlists.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-sm text-muted-foreground mb-2">
                No custom watchlists found
              </p>
              <p className="text-xs text-muted-foreground">
                Create a watchlist first to add tickers
              </p>
            </div>
          ) : (
            <div className="space-y-2 max-h-[300px] overflow-y-auto">
              {watchlists.map((watchlistName) => {
                const isAdded = addedWatchlists.has(watchlistName)

                return (
                  <div
                    key={watchlistName}
                    className="flex items-center justify-between p-3 rounded-md border bg-muted/30 hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      <Star className="h-3.5 w-3.5 fill-primary text-primary" />
                      <span className="font-medium text-sm">{watchlistName}</span>
                    </div>
                    <Button
                      variant={isAdded ? "outline" : "default"}
                      size="sm"
                      onClick={() => isAdded ? handleRemoveFromWatchlist(watchlistName) : handleAddToWatchlist(watchlistName)}
                      className={`h-7 text-xs ${isAdded ? 'hover:bg-destructive hover:text-destructive-foreground' : ''}`}
                    >
                      {isAdded ? (
                        <>
                          <X className="h-3 w-3 mr-1" />
                          Remove
                        </>
                      ) : (
                        'Add'
                      )}
                    </Button>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
