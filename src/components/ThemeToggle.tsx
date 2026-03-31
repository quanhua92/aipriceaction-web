import { Sun, Moon, Lightbulb } from 'lucide-react'
import { useSiteSettings } from '@/contexts/SiteSettingsContext'
import { Toggle } from '@/components/ui/toggle'

export function ThemeToggle() {
  const { theme, setTheme } = useSiteSettings()

  const getNextTheme = (current: string) => {
    if (current === 'system') {
      return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'light' : 'dark'
    }
    return current === 'dark' ? 'light' : 'dark'
  }

  const getIcon = () => {
    switch (theme) {
      case 'light': return <Sun size={18} />
      case 'dark': return <Moon size={18} />
      default: return <Lightbulb size={18} />
    }
  }

  const getLabel = () => {
    switch (theme) {
      case 'light': return 'Light'
      case 'dark': return 'Dark'
      default: return 'System'
    }
  }

  return (
    <Toggle
      pressed={false}
      onPressedChange={() => setTheme(getNextTheme(theme))}
      className="border border-gray-600"
      aria-label={`Theme: ${getLabel()}. Click to switch.`}
      title={`Theme: ${getLabel()}. Click to switch between Light, Dark, and System themes.`}
    >
      {getIcon()}
    </Toggle>
  )
}