import { Globe } from 'lucide-react'
import { useSiteSettings } from '@/contexts/SiteSettingsContext'
import { Toggle } from '@/components/ui/toggle'

export function LanguageToggle() {
  const { language, setLanguage } = useSiteSettings()

  const toggleLanguage = () => {
    setLanguage(language === 'en' ? 'vn' : 'en')
  }

  const getLabel = () => {
    return language === 'en' ? 'EN' : 'VN'
  }

  return (
    <Toggle
      pressed={false}
      onPressedChange={toggleLanguage}
      className="border border-gray-600 text-xs font-bold"
      aria-label={`Language: ${getLabel()}. Click to switch.`}
      title={`Language: ${getLabel()}. Click to switch between English and Vietnamese.`}
    >
      <Globe size={16} />
      <span className="ml-1">{getLabel()}</span>
    </Toggle>
  )
}
