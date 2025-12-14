import { Sun, Moon, Monitor } from 'lucide-react'
import { useSiteSettings } from '@/contexts/SiteSettingsContext'
import { Toggle } from '@/components/ui/toggle'

export function ThemeToggle() {
  const { theme, setTheme } = useSiteSettings()

  const getNextTheme = (current: string) => {
    switch (current) {
      case 'light': return 'dark'
      case 'dark': return 'system'
      default: return 'light'
    }
  }

  const getIcon = () => {
    switch (theme) {
      case 'light': return <Sun size={18} />
      case 'dark': return <Moon size={18} />
      default: return <Monitor size={18} />
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