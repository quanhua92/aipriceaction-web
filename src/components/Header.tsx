import { Link } from '@tanstack/react-router'

import { useState } from 'react'
import {
  Zap,
  Settings,
} from 'lucide-react'
import { useSiteSettings } from '../contexts/SiteSettingsContext'
import { useRefresh } from '../contexts/RefreshContext'
import { Toggle } from '@/components/ui/toggle'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { ChartSettingsDialog } from '@/components/dialogs/ChartSettingsDialog'
import { PWAInstallButton } from './PWAInstallButton'
import { MobileNavigation } from './MobileNavigation'
import { ThemeToggle } from './ThemeToggle'

export default function Header() {
  const [isOpen, setIsOpen] = useState(false)
  const { language, setLanguage } = useSiteSettings()
  const { isRefreshEnabled, toggleRefresh } = useRefresh()

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
          <nav className="hidden md:flex md:items-center md:gap-1">
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
              to="/chart"
              className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm hover:bg-gray-700 transition-colors"
              activeProps={{
                className:
                  'flex items-center gap-2 px-3 py-2 rounded-lg text-sm bg-green-600 hover:bg-green-700 transition-colors',
              }}
            >
              <span className="font-medium">Chart</span>
            </Link>

            <Link
              to="/watch"
              className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm hover:bg-gray-700 transition-colors"
              activeProps={{
                className:
                  'flex items-center gap-2 px-3 py-2 rounded-lg text-sm bg-green-600 hover:bg-green-700 transition-colors',
              }}
            >
              <span className="font-medium">Watch</span>
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
              to="/crypto"
              className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm hover:bg-gray-700 transition-colors"
              activeProps={{
                className:
                  'flex items-center gap-2 px-3 py-2 rounded-lg text-sm bg-green-600 hover:bg-green-700 transition-colors',
              }}
            >
              <span className="font-medium">Crypto</span>
            </Link>

            <Link
              to="/matrix"
              className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm hover:bg-gray-700 transition-colors"
              activeProps={{
                className:
                  'flex items-center gap-2 px-3 py-2 rounded-lg text-sm bg-green-600 hover:bg-green-700 transition-colors',
              }}
            >
              <span className="font-medium">Market Matrix</span>
            </Link>

            <Link
              to="/signals"
              className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm hover:bg-gray-700 transition-colors"
              activeProps={{
                className:
                  'flex items-center gap-2 px-3 py-2 rounded-lg text-sm bg-green-600 hover:bg-green-700 transition-colors',
              }}
            >
              <span className="font-medium">Signals</span>
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
              to="/play"
              className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm hover:bg-gray-700 transition-colors"
              activeProps={{
                className:
                  'flex items-center gap-2 px-3 py-2 rounded-lg text-sm bg-green-600 hover:bg-green-700 transition-colors',
              }}
            >
              <span className="font-medium">Playground</span>
            </Link>

            <Link
              to="/notes"
              className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm hover:bg-gray-700 transition-colors"
              activeProps={{
                className:
                  'flex items-center gap-2 px-3 py-2 rounded-lg text-sm bg-green-600 hover:bg-green-700 transition-colors',
              }}
            >
              <span className="font-medium">Notes</span>
            </Link>
          </nav>
        </div>

        <div className="flex items-center gap-2">
          <div className="max-md:hidden">
            <PWAInstallButton />
          </div>

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
                <ChartSettingsDialog>
                  <button className="w-full flex items-center justify-between px-3 py-2 text-sm rounded hover:bg-muted transition-colors">
                    <span>Chart Settings</span>
                    <Settings size={16} />
                  </button>
                </ChartSettingsDialog>
                <button
                  onClick={toggleLanguage}
                  className="w-full flex items-center justify-between px-3 py-2 text-sm rounded hover:bg-muted transition-colors"
                >
                  <span>Language</span>
                  <span className="font-medium">{language.toUpperCase()}</span>
                </button>
              </div>
            </PopoverContent>
          </Popover>
        </div>
      </header>
    </>
  )
}
