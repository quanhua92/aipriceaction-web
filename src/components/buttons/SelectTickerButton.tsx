import { useState } from 'react'
import { SelectTickerDialog } from '@/components/dialogs/SelectTickerDialog'
import { Button } from '@/components/ui/button'

export function SelectTickerButton() {
  const [selectedTicker, setSelectedTicker] = useState('VNINDEX')

  return (
    <SelectTickerDialog onSelectTicker={setSelectedTicker}>
      <Button variant="outline">{selectedTicker}</Button>
    </SelectTickerDialog>
  )
}
