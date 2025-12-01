import * as React from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { MoreVertical, Download, Upload, RotateCcw } from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

interface SimpleTestWidgetProps {
  className?: string
}

export function SimpleTestWidget({ className }: SimpleTestWidgetProps) {
  const [count, setCount] = React.useState(0)

  // Simple handlers like MarketMatrix
  const handleExport = () => {
    console.log('Export clicked')
    alert('Export functionality')
  }

  const handleImport = () => {
    console.log('Import clicked')
    alert('Import functionality')
  }

  const handleReset = () => {
    if (window.confirm('Are you sure you want to reset all data? This action cannot be undone.')) {
      console.log('Reset confirmed')
      setCount(0)
    }
  }

  return (
    <div className={`border rounded-lg p-4 bg-card space-y-4 ${className || ''}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-medium">Simple Test Widget</h3>
          <Badge variant="secondary" className="text-xs">
            Count: {count}
          </Badge>
        </div>

        {/* 3-dot Menu - Exact copy from MarketMatrix */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
              <MoreVertical className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={handleExport}>
              <Download className="h-4 w-4 mr-2" />
              Export
            </DropdownMenuItem>
            <DropdownMenuItem onClick={handleImport}>
              <Upload className="h-4 w-4 mr-2" />
              Import
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleReset} className="text-red-600 dark:text-red-500">
              <RotateCcw className="h-4 w-4 mr-2" />
              Reset All Data
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Simple content */}
      <div className="space-y-4">
        <Button onClick={() => setCount(count + 1)}>
          Increment Count
        </Button>
        <p className="text-sm text-muted-foreground">
          This is a minimal test widget to isolate the infinite loop issue.
        </p>
      </div>
    </div>
  )
}