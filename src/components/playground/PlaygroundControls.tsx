import * as React from 'react'
import { Button } from '@/components/ui/button'
import { usePlayground } from './PlaygroundDataProvider'
import { useLogs } from '@/contexts/LogsContext'
import {
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
} from 'lucide-react'
import { useTranslation } from '@/hooks/useTranslation'

export function PlaygroundControls() {
  const { playgroundData, navigate, setCurrentIndex } = usePlayground()
  const { info } = useLogs()
  const { t } = useTranslation()

  const { currentIndex, allData } = playgroundData

  // Get current and end dates for display
  const currentDate = allData[currentIndex]?.time?.split('T')[0] || ''
  const endDate = allData[allData.length - 1]?.time?.split('T')[0] || ''

  // Navigation button handlers
  const handleBack5 = () => navigate('back5')
  const handleBack1 = () => navigate('back1')
  const handleNext1 = () => navigate('next1')
  const handleNext5 = () => navigate('next5')

  // Quick jump handlers
  const handleJumpToStart = () => {
    info('[Playground] ⏮️ User jumped to start (index 0)')
    setCurrentIndex(0)
  }

  const handleJumpToEnd = () => {
    const endIndex = allData.length - 1
    info(`[Playground] ⏭️ User jumped to end (index ${endIndex})`)
    setCurrentIndex(endIndex)
  }

  // Slider change handler
  const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setCurrentIndex(Number(e.target.value))
  }

  // Calculate progress percentage
  const progress = allData.length > 0 ? (currentIndex / (allData.length - 1)) * 100 : 0

  // Check if buttons should be disabled
  const isAtStart = currentIndex === 0
  const isAtEnd = currentIndex >= allData.length - 1

  return (
    <div className="space-y-4">
      {/* Navigation buttons */}
      <div className="flex items-center justify-center gap-3">
        <Button
          variant="outline"
          size="sm"
          onClick={handleBack5}
          disabled={isAtStart}
          className="h-10 w-10 p-0 border-green-600 text-green-600 hover:bg-green-50 hover:border-green-700 hover:text-green-700"
          title={t('common.playground.controls.back5Days')}
        >
          <ChevronsLeft className="h-4 w-4" />
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={handleBack1}
          disabled={isAtStart}
          className="h-10 w-10 p-0 border-green-600 text-green-600 hover:bg-green-50 hover:border-green-700 hover:text-green-700"
          title={t('common.playground.controls.back1Day')}
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={handleNext1}
          disabled={isAtEnd}
          className="h-10 w-10 p-0 border-green-600 text-green-600 hover:bg-green-50 hover:border-green-700 hover:text-green-700"
          title={t('common.playground.controls.next1Day')}
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={handleNext5}
          disabled={isAtEnd}
          className="h-10 w-10 p-0 border-green-600 text-green-600 hover:bg-green-50 hover:border-green-700 hover:text-green-700"
          title={t('common.playground.controls.next5Days')}
        >
          <ChevronsRight className="h-4 w-4" />
        </Button>
      </div>

      {/* Navigation guide text */}
      <div className="text-center text-sm text-muted-foreground">
        {t('common.playground.controls.navigationGuide')}
      </div>

      {/* Slider for fine control */}
      {allData.length > 0 && (
        <div className="space-y-2">
          <input
            type="range"
            min="0"
            max={allData.length - 1}
            value={currentIndex}
            onChange={handleSliderChange}
            className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-700 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-primary"
            style={{
              background: `linear-gradient(to right, hsl(var(--primary)) ${progress}%, hsl(var(--muted)) ${progress}%)`
            }}
          />
        </div>
      )}

      {/* Date info - 3 columns */}
      {allData.length > 0 && (
        <div className="space-y-2">
          <div className="grid grid-cols-3 gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleJumpToStart}
              disabled={isAtStart}
              className="text-xs flex flex-col items-center p-2 h-auto"
            >
              <span className="text-xs">{t('common.playground.controls.start')}</span>
              <span className="text-xs text-muted-foreground font-mono">{allData[0]?.time?.split('T')[0] || ''}</span>
            </Button>

            {/* Current date in middle - matching button style but not clickable */}
            <Button
              variant="ghost"
              size="sm"
              onClick={(e) => e.preventDefault()}
              className="text-xs flex flex-col items-center p-2 h-auto"
            >
              <span className="text-xs">{t('common.playground.controls.current')}</span>
              <span className="text-xs font-mono font-semibold">{currentDate || '-'}</span>
            </Button>

            <Button
              variant="ghost"
              size="sm"
              onClick={handleJumpToEnd}
              disabled={isAtEnd}
              className="text-xs flex flex-col items-center p-2 h-auto"
            >
              <span className="text-xs">{t('common.playground.controls.end')}</span>
              <span className="text-xs text-muted-foreground font-mono">{endDate || ''}</span>
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}