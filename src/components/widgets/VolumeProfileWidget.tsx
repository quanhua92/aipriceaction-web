import * as React from 'react'
import { ChevronDown, ChevronLeft, ChevronRight, Calendar, Star } from 'lucide-react'
import { formatPrice, formatVolume, formatPercent } from '@/lib/format'
import { SelectTickerDialog } from '@/components/dialogs/SelectTickerDialog'
import { QuickAddWatchListDialog } from '@/components/dialogs/QuickAddWatchListDialog'
import { Skeleton } from '@/components/ui/skeleton'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { getVolumeProfile } from '@/lib/api-client'
import type { VolumeProfileData, PriceLevelVolume } from '@/lib/api-client'

interface VolumeProfileWidgetProps {
  initialTicker?: string
  ticker?: string
  initialDate?: string // YYYY-MM-DD, default today
  date?: string
  onTickerChange?: (ticker: string) => void
  onDateChange?: (date: string) => void
}

function getTodayDate(): string {
  const now = new Date()
  return now.toISOString().split('T')[0]
}

export function VolumeProfileWidget({
  initialTicker = 'VNINDEX',
  ticker,
  initialDate,
  date,
  onTickerChange,
  onDateChange,
}: VolumeProfileWidgetProps) {
  const [selectedTicker, setSelectedTicker] = React.useState(ticker ?? initialTicker)
  const [selectedDate, setSelectedDate] = React.useState(date ?? initialDate ?? getTodayDate())
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)
  const [profileData, setProfileData] = React.useState<VolumeProfileData | null>(null)
  const [bins, setBins] = React.useState(10)

  // Sync with external ticker prop
  React.useEffect(() => {
    if (ticker !== undefined && ticker !== selectedTicker) {
      setSelectedTicker(ticker)
    }
  }, [ticker, selectedTicker])

  // Sync with external date prop
  React.useEffect(() => {
    if (date !== undefined && date !== selectedDate) {
      setSelectedDate(date)
    }
  }, [date, selectedDate])

  // Fetch volume profile data
  React.useEffect(() => {
    let cancelled = false

    async function fetchData() {
      setLoading(true)
      setError(null)

      try {
        const response = await getVolumeProfile({
          symbol: selectedTicker,
          date: selectedDate,
          bins,
        })

        if (!cancelled) {
          setProfileData(response.data)
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to fetch volume profile')
          setProfileData(null)
        }
      } finally {
        if (!cancelled) {
          setLoading(false)
        }
      }
    }

    fetchData()

    return () => {
      cancelled = true
    }
  }, [selectedTicker, selectedDate, bins])

  const handleSelectTicker = (newTicker: string) => {
    setSelectedTicker(newTicker)
    onTickerChange?.(newTicker)
  }

  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newDate = e.target.value
    setSelectedDate(newDate)
    onDateChange?.(newDate)
  }

  const handlePrevDate = () => {
    const current = new Date(selectedDate)
    current.setDate(current.getDate() - 1)
    const newDate = current.toISOString().split('T')[0]
    setSelectedDate(newDate)
    onDateChange?.(newDate)
  }

  const handleNextDate = () => {
    const current = new Date(selectedDate)
    current.setDate(current.getDate() + 1)
    const newDate = current.toISOString().split('T')[0]
    setSelectedDate(newDate)
    onDateChange?.(newDate)
  }

  // Loading state
  if (loading) {
    return (
      <div className="border rounded-lg p-4 bg-card">
        <div className="flex items-center justify-between mb-4">
          <div>
            <Skeleton className="h-6 w-20 mb-2" />
            <Skeleton className="h-3 w-24" />
          </div>
          <div className="text-right">
            <Skeleton className="h-4 w-32 mb-2 ml-auto" />
            <Skeleton className="h-3 w-24 ml-auto" />
          </div>
        </div>
        <div className="space-y-2">
          {[...Array(8)].map((_, i) => (
            <Skeleton key={i} className="h-8 w-full" />
          ))}
        </div>
      </div>
    )
  }

  // Error state
  if (error) {
    return (
      <div className="border rounded-lg p-4 bg-card">
        <div className="flex items-center justify-between mb-4">
          <SelectTickerDialog onSelectTicker={handleSelectTicker} defaultSectionFilter="stocks">
            <div className="text-lg font-bold hover:bg-muted/50 transition-colors duration-200 inline-flex items-center cursor-pointer px-1 -ml-1">
              {selectedTicker}
              <ChevronDown className="ml-1 h-4 w-4 opacity-60" />
            </div>
          </SelectTickerDialog>
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm" className="h-8">
                <Calendar className="mr-2 h-4 w-4" />
                {selectedDate}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-2" align="end">
              <Input
                type="date"
                value={selectedDate}
                onChange={handleDateChange}
                className="w-auto"
              />
            </PopoverContent>
          </Popover>
        </div>
        <div className="text-center text-destructive py-8">
          <p className="text-sm">{error}</p>
        </div>
      </div>
    )
  }

  // No data state
  if (!profileData) {
    return (
      <div className="border rounded-lg p-4 bg-card">
        <div className="text-center text-muted-foreground">
          <p className="text-sm">No data available</p>
        </div>
      </div>
    )
  }

  const { poc, value_area, profile, total_volume } = profileData
  const maxVolume = Math.max(...profile.map((p) => p.volume))

  return (
    <div className="border rounded-lg p-4 bg-card">
      {/* Header */}
      <div className="flex items-center justify-between mb-2">
        <div>
          <SelectTickerDialog onSelectTicker={handleSelectTicker} defaultSectionFilter="stocks">
            <div className="text-lg font-bold hover:bg-muted/50 transition-colors duration-200 inline-flex items-center cursor-pointer px-1 -ml-1">
              {selectedTicker}
              <ChevronDown className="ml-1 h-4 w-4 opacity-60" />
            </div>
          </SelectTickerDialog>
        </div>
        <div className="flex items-center gap-2">
          <QuickAddWatchListDialog ticker={selectedTicker}>
            <Button variant="ghost" size="sm" className="h-6 w-6 p-0 hover:bg-muted/50">
              <Star className="h-3.5 w-3.5" />
              <span className="sr-only">Add to watchlist</span>
            </Button>
          </QuickAddWatchListDialog>
          <Select value={String(bins)} onValueChange={(v) => setBins(Number(v))}>
            <SelectTrigger className="w-16 h-7 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="10">10</SelectItem>
              <SelectItem value="20">20</SelectItem>
              <SelectItem value="50">50</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Date Navigation Row */}
      <div className="flex items-center justify-center gap-1 mb-4">
        <Button variant="outline" size="sm" className="h-8 w-8 p-0" onClick={handlePrevDate}>
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" size="sm" className="h-8">
              <Calendar className="mr-2 h-4 w-4" />
              {selectedDate}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-2" align="center">
            <Input
              type="date"
              value={selectedDate}
              onChange={handleDateChange}
              className="w-auto"
            />
          </PopoverContent>
        </Popover>
        <Button variant="outline" size="sm" className="h-8 w-8 p-0" onClick={handleNextDate}>
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4 pb-4 border-b">
        <div className="space-y-1">
          <p className="text-xs text-muted-foreground uppercase tracking-wide">POC</p>
          <p className="text-sm font-semibold text-yellow-600 dark:text-yellow-500">
            {formatPrice(poc.price, { mode: 'vn' } as any)}
          </p>
        </div>
        <div className="space-y-1">
          <p className="text-xs text-muted-foreground uppercase tracking-wide">VA Low</p>
          <p className="text-sm font-semibold">{formatPrice(value_area.low, { mode: 'vn' } as any)}</p>
        </div>
        <div className="space-y-1">
          <p className="text-xs text-muted-foreground uppercase tracking-wide">VA High</p>
          <p className="text-sm font-semibold">{formatPrice(value_area.high, { mode: 'vn' } as any)}</p>
        </div>
        <div className="space-y-1">
          <p className="text-xs text-muted-foreground uppercase tracking-wide">Total Vol</p>
          <p className="text-sm font-semibold">{formatVolume(total_volume)}</p>
        </div>
      </div>

      {/* Volume Profile Bars */}
      <div className="space-y-1 max-h-[600px] md:max-h-[300px] overflow-y-auto">
        {profile.map((level) => (
          <VolumeProfileRow
            key={level.price}
            level={level}
            maxVolume={maxVolume}
            poc={poc}
            valueArea={value_area}
          />
        ))}
      </div>
    </div>
  )
}

interface VolumeProfileRowProps {
  level: PriceLevelVolume
  maxVolume: number
  poc: { price: number; volume: number; percentage: number }
  valueArea: { low: number; high: number; volume: number; percentage: number }
}

function VolumeProfileRow({ level, maxVolume, poc, valueArea }: VolumeProfileRowProps) {
  const isPOC = Math.abs(level.price - poc.price) < 0.01
  const inVA = level.price >= valueArea.low && level.price <= valueArea.high
  const isHVN = level.percentage >= 3.0
  const isLVN = level.percentage < 1.0

  // Calculate bar width
  const barWidth = (level.volume / maxVolume) * 100
  const displayWidth = Math.max(level.volume > 0 ? 2 : 0, barWidth)

  // Determine bar color
  let barColor = 'bg-indigo-500'
  if (isPOC) {
    barColor = 'bg-yellow-500'
  } else if (isHVN) {
    barColor = 'bg-green-500'
  } else if (isLVN) {
    barColor = 'bg-orange-400'
  }

  // Background for value area
  const bgClass = inVA ? 'bg-blue-50 dark:bg-blue-950/30' : ''

  return (
    <div className={`py-1.5 px-2 rounded ${bgClass} hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors`}>
      {/* Row 1: Price + Bar */}
      <div className="flex items-center gap-2">
        <div
          className={`w-20 text-xs font-mono text-right font-semibold ${isPOC ? 'text-yellow-700 dark:text-yellow-500' : 'text-gray-700 dark:text-gray-300'}`}
        >
          {formatPrice(level.price, { mode: 'vn' } as any)}
        </div>
        <div className="flex-1 relative h-5">
          <div
            className={`${barColor} h-full rounded transition-all`}
            style={{ width: `${displayWidth}%` }}
          />
        </div>
      </div>
      {/* Row 2: Volume/Percentage + Badges */}
      <div className="flex items-center justify-between mt-1 text-xs text-gray-500 dark:text-gray-400 pl-22">
        <span>
          {formatVolume(level.volume)} ({formatPercent(level.percentage)})
        </span>
        <span className="flex items-center gap-1">
          {isPOC && (
            <>
              <span className="text-yellow-600 mr-1">⭐</span>
              <span className="px-1.5 py-0.5 bg-yellow-100 dark:bg-yellow-900/50 text-yellow-700 dark:text-yellow-400 rounded font-semibold">
                POC
              </span>
            </>
          )}
          {isHVN && !isPOC && (
            <span className="px-1.5 py-0.5 bg-green-100 dark:bg-green-900/50 text-green-700 dark:text-green-400 rounded font-semibold">
              HVN
            </span>
          )}
          {isLVN && (
            <span className="px-1.5 py-0.5 bg-orange-100 dark:bg-orange-900/50 text-orange-700 dark:text-orange-400 rounded font-semibold">
              LVN
            </span>
          )}
        </span>
      </div>
    </div>
  )
}
