import { Link } from '@tanstack/react-router'

import { useState } from 'react'
import {
  Zap,
  Settings,
} from 'lucide-react'
import { useSiteSettings } from '../contexts/SiteSettingsContext'
import { useRefresh } from '../contexts/RefreshContext'
import { useChartSettings } from '../contexts/ChartSettingsContext'
import { Toggle } from '@/components/ui/toggle'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { ChartSettingsDialog } from '@/components/dialogs/ChartSettingsDialog'
import { MobileNavigation } from './MobileNavigation'
import { ThemeToggle } from './ThemeToggle'
import { LanguageToggle } from './LanguageToggle'
import { useTranslation } from '@/hooks/useTranslation'

export default function Header() {
  const [isOpen, setIsOpen] = useState(false)
  const { t } = useTranslation()
  const { language, setLanguage } = useSiteSettings()
  const { isRefreshEnabled, toggleRefresh } = useRefresh()
  const { limit, setLimit } = useChartSettings()

  const toggleLanguage = () => {
    setLanguage(language === 'en' ? 'vn' : 'en')
  }

  return (
    <>
      <header className="p-4 flex items-center justify-between bg-gray-800 text-white shadow-lg">
        <div className="flex items-center gap-6">
          {/* Mobile: Hamburger Menu + Drawer */}
          <MobileNavigation isOpen={isOpen} setIsOpen={setIsOpen} />

          {/* Logo/Brand */}
          <h1 className="text-xl font-semibold">
            <Link to="/" className="text-white hover:text-green-400 transition-colors">
              AIPriceAction
            </Link>
          </h1>

          {/* Desktop: Horizontal Navigation */}
          <nav className="hidden lg:flex lg:items-center lg:gap-1">
            <Link
              to="/"
              className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm hover:bg-gray-700 transition-colors"
              activeProps={{
                className:
                  'flex items-center gap-2 px-3 py-2 rounded-lg text-sm bg-green-600 hover:bg-green-700 transition-colors',
              }}
            >
              <span className="font-medium">Home</span>
            </Link>

            <Link
              to="/crypto"
              className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm hover:bg-gray-700 transition-colors"
              activeProps={{
                className:
                  'flex items-center gap-2 px-3 py-2 rounded-lg text-sm bg-green-600 hover:bg-green-700 transition-colors',
              }}
            >
              <span className="font-medium">Crypto Market</span>
            </Link>

            <Link
              to="/global"
              className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm hover:bg-gray-700 transition-colors"
              activeProps={{
                className:
                  'flex items-center gap-2 px-3 py-2 rounded-lg text-sm bg-green-600 hover:bg-green-700 transition-colors',
              }}
            >
              <span className="font-medium">Global Market</span>
            </Link>

            <Link
              to="/ai"
              className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm hover:bg-gray-700 transition-colors"
              activeProps={{
                className:
                  'flex items-center gap-2 px-3 py-2 rounded-lg text-sm bg-green-600 hover:bg-green-700 transition-colors',
              }}
            >
              <span className="font-medium">AI Context</span>
            </Link>

            <Link
              to="/alert"
              className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm hover:bg-gray-700 transition-colors"
              activeProps={{
                className:
                  'flex items-center gap-2 px-3 py-2 rounded-lg text-sm bg-green-600 hover:bg-green-700 transition-colors',
              }}
            >
              <span className="font-medium">Alerts</span>
            </Link>

            <Link
              to="/backtesting"
              search={{ ticker: undefined, endDate: undefined, interval: undefined, limit: undefined }}
              className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm hover:bg-gray-700 transition-colors"
              activeProps={{
                className:
                  'flex items-center gap-2 px-3 py-2 rounded-lg text-sm bg-green-600 hover:bg-green-700 transition-colors',
              }}
            >
              <span className="font-medium">Backtesting</span>
            </Link>

            <Link
              to="/watch"
              className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm hover:bg-gray-700 transition-colors"
              activeProps={{
                className:
                  'flex items-center gap-2 px-3 py-2 rounded-lg text-sm bg-green-600 hover:bg-green-700 transition-colors',
              }}
            >
              <span className="font-medium">Watchlist</span>
            </Link>

            <Link
              to="/heatmap"
              className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm hover:bg-gray-700 transition-colors"
              activeProps={{
                className:
                  'flex items-center gap-2 px-3 py-2 rounded-lg text-sm bg-green-600 hover:bg-green-700 transition-colors',
              }}
            >
              <span className="font-medium">Heatmap</span>
            </Link>
          </nav>
        </div>

        <div className="flex items-center gap-2">
          <ThemeToggle />

          <Toggle
            pressed={isRefreshEnabled}
            onPressedChange={toggleRefresh}
            className="data-[state=on]:bg-green-600 data-[state=on]:text-white data-[state=on]:border-green-500 border border-gray-600"
            aria-label={isRefreshEnabled ? 'Auto-refresh: ON (30s)' : 'Auto-refresh: OFF'}
            title={isRefreshEnabled ? 'Auto-refresh: ON (30s)' : 'Auto-refresh: OFF'}
          >
            <Zap size={18} />
          </Toggle>

          <Popover>
            <PopoverTrigger asChild>
              <Toggle
                pressed={false}
                className="border border-gray-600"
                aria-label="Settings"
                title="Settings"
              >
                <Settings size={18} />
              </Toggle>
            </PopoverTrigger>
            <PopoverContent align="end" className="w-48 p-2">
              <div className="space-y-1">
                <div className="flex items-center justify-between px-3 py-2 text-sm">
                  <span>{t('common.settingsPopover.bars')}</span>
                  <Select value={String(limit)} onValueChange={(value) => setLimit(Number(value))}>
                    <SelectTrigger className="w-[80px] h-7 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="100">100 bars</SelectItem>
                      <SelectItem value="150">150 bars</SelectItem>
                      <SelectItem value="200">200 bars</SelectItem>
                      <SelectItem value="256">256 bars</SelectItem>
                      <SelectItem value="512">512 bars</SelectItem>
                      <SelectItem value="768">768 bars</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <ChartSettingsDialog>
                  <button className="w-full flex items-center justify-between px-3 py-2 text-sm rounded hover:bg-muted transition-colors">
                    <span>{t('common.settingsPopover.chartSettings')}</span>
                    <Settings size={16} />
                  </button>
                </ChartSettingsDialog>
                <button
                  onClick={toggleLanguage}
                  className="w-full flex items-center justify-between px-3 py-2 text-sm rounded hover:bg-muted transition-colors"
                >
                  <span>{t('common.settingsPopover.language')}</span>
                  <span className="font-medium">{language.toUpperCase()}</span>
                </button>
              </div>
            </PopoverContent>
          </Popover>

          <div className="max-lg:hidden">
            <LanguageToggle />
          </div>
        </div>
      </header>
    </>
  )
}
