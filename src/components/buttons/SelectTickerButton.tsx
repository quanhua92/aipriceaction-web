import { SelectTickerDialog } from '@/components/dialogs/SelectTickerDialog'
import { Button } from '@/components/ui/button'
import { useTicker } from '@/contexts/TickerContext'

export function SelectTickerButton() {
  const { selectedTicker, setSelectedTicker } = useTicker()

  return (
    <SelectTickerDialog onSelectTicker={setSelectedTicker}>
      <Button variant="outline">{selectedTicker}</Button>
    </SelectTickerDialog>
  )
}
