import * as React from 'react'
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
import { Input } from '@/components/ui/input'
import { DEFAULT_WATCHLIST_TICKERS } from '@/lib/constants'
import { saveWatchlist, watchlistExists } from '@/lib/watchlist-storage'

export interface CreateWatchListDialogProps {
  children: React.ReactNode
  onWatchlistCreated?: (name: string) => void
}

export function CreateWatchListDialog({
  children,
  onWatchlistCreated
}: CreateWatchListDialogProps) {
  const [open, setOpen] = React.useState(false)
  const [name, setName] = React.useState('')
  const [error, setError] = React.useState('')

  const handleSave = () => {
    // Validate name
    const trimmedName = name.trim()
    if (!trimmedName) {
      setError('Watchlist name cannot be empty')
      return
    }

    if (watchlistExists(trimmedName)) {
      setError('A watchlist with this name already exists')
      return
    }

    try {
      // Create watchlist with default tickers
      const defaultTickers = DEFAULT_WATCHLIST_TICKERS.split(',').map(t => t.trim())
      saveWatchlist(trimmedName, defaultTickers)

      // Reset and close
      setName('')
      setError('')
      setOpen(false)

      // Notify parent
      if (onWatchlistCreated) {
        onWatchlistCreated(trimmedName)
      }
    } catch (err) {
      setError('Failed to create watchlist')
      console.error(err)
    }
  }

  const handleCancel = () => {
    setName('')
    setError('')
    setOpen(false)
  }

  const handleOpenChange = (newOpen: boolean) => {
    setOpen(newOpen)
    if (!newOpen) {
      // Reset state when dialog closes
      setName('')
      setError('')
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      handleSave()
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        {children}
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Create New Watchlist</DialogTitle>
          <DialogDescription>
            Create a custom watchlist to track your favorite tickers.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <label htmlFor="watchlist-name" className="text-sm font-medium">
              Watchlist Name
            </label>
            <Input
              id="watchlist-name"
              value={name}
              onChange={(e) => {
                setName(e.target.value)
                setError('')
              }}
              onKeyDown={handleKeyDown}
              placeholder="e.g., My Favorites"
              autoFocus
            />
            {error && (
              <p className="text-sm text-destructive">{error}</p>
            )}
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={handleCancel}>
            Cancel
          </Button>
          <Button onClick={handleSave}>
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
