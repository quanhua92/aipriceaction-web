import { Link } from '@tanstack/react-router'

import { useState } from 'react'
import {
  Home,
  LineChart,
  Menu,
  Table,
  Zap,
  Brain,
  Eye,
  Globe,
  Coins,
} from 'lucide-react'
import { useSiteSettings } from '../contexts/SiteSettingsContext'
import { useRefresh } from '../contexts/RefreshContext'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet'
import { Toggle } from '@/components/ui/toggle'

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
          <div className="md:hidden">
            <Sheet open={isOpen} onOpenChange={setIsOpen}>
              <SheetTrigger asChild>
                <button
                  className="p-2 hover:bg-gray-700 rounded-lg transition-colors"
                  aria-label="Open menu"
                >
                  <Menu size={24} />
                </button>
              </SheetTrigger>
              <SheetContent side="left" className="w-80 bg-gray-900 text-white border-gray-700">
                <SheetHeader className="border-b border-gray-700 pb-4">
                  <SheetTitle className="text-xl font-bold text-white">Navigation</SheetTitle>
                </SheetHeader>

                <nav className="flex-1 mt-4 overflow-y-auto">
                  <Link
                    to="/"
                    onClick={() => setIsOpen(false)}
                    className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-800 transition-colors mb-2"
                    activeProps={{
                      className:
                        'flex items-center gap-3 p-3 rounded-lg bg-green-600 hover:bg-green-700 transition-colors mb-2',
                    }}
                  >
                    <Home size={20} />
                    <span className="font-medium">Home</span>
                  </Link>

                  <Link
                    to="/crypto"
                    onClick={() => setIsOpen(false)}
                    className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-800 transition-colors mb-2"
                    activeProps={{
                      className:
                        'flex items-center gap-3 p-3 rounded-lg bg-green-600 hover:bg-green-700 transition-colors mb-2',
                    }}
                  >
                    <Coins size={20} />
                    <span className="font-medium">Crypto</span>
                  </Link>

                  <Link
                    to="/chart"
                    onClick={() => setIsOpen(false)}
                    className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-800 transition-colors mb-2"
                    activeProps={{
                      className:
                        'flex items-center gap-3 p-3 rounded-lg bg-green-600 hover:bg-green-700 transition-colors mb-2',
                    }}
                  >
                    <LineChart size={20} />
                    <span className="font-medium">Chart</span>
                  </Link>

                  <Link
                    to="/watch"
                    onClick={() => setIsOpen(false)}
                    className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-800 transition-colors mb-2"
                    activeProps={{
                      className:
                        'flex items-center gap-3 p-3 rounded-lg bg-green-600 hover:bg-green-700 transition-colors mb-2',
                    }}
                  >
                    <Eye size={20} />
                    <span className="font-medium">Watch</span>
                  </Link>

                  <Link
                    to="/matrix"
                    onClick={() => setIsOpen(false)}
                    className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-800 transition-colors mb-2"
                    activeProps={{
                      className:
                        'flex items-center gap-3 p-3 rounded-lg bg-green-600 hover:bg-green-700 transition-colors mb-2',
                    }}
                  >
                    <Table size={20} />
                    <span className="font-medium">Market Matrix</span>
                  </Link>

                  <Link
                    to="/ai"
                    onClick={() => setIsOpen(false)}
                    className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-800 transition-colors mb-2"
                    activeProps={{
                      className:
                        'flex items-center gap-3 p-3 rounded-lg bg-green-600 hover:bg-green-700 transition-colors mb-2',
                    }}
                  >
                    <Brain size={20} />
                    <span className="font-medium">AI Context</span>
                  </Link>
                </nav>
              </SheetContent>
            </Sheet>
          </div>

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
              <Home size={18} />
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
              <Coins size={18} />
              <span className="font-medium">Crypto</span>
            </Link>

            <Link
              to="/chart"
              className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm hover:bg-gray-700 transition-colors"
              activeProps={{
                className:
                  'flex items-center gap-2 px-3 py-2 rounded-lg text-sm bg-green-600 hover:bg-green-700 transition-colors',
              }}
            >
              <LineChart size={18} />
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
              <Eye size={18} />
              <span className="font-medium">Watch</span>
            </Link>

            <Link
              to="/matrix"
              className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm hover:bg-gray-700 transition-colors"
              activeProps={{
                className:
                  'flex items-center gap-2 px-3 py-2 rounded-lg text-sm bg-green-600 hover:bg-green-700 transition-colors',
              }}
            >
              <Table size={18} />
              <span className="font-medium">Market Matrix</span>
            </Link>

            <Link
              to="/ai"
              className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm hover:bg-gray-700 transition-colors"
              activeProps={{
                className:
                  'flex items-center gap-2 px-3 py-2 rounded-lg text-sm bg-green-600 hover:bg-green-700 transition-colors',
              }}
            >
              <Brain size={18} />
              <span className="font-medium">AI Context</span>
            </Link>
          </nav>
        </div>

        <div className="flex items-center gap-2">
          <Toggle
            pressed={isRefreshEnabled}
            onPressedChange={toggleRefresh}
            className="data-[state=on]:bg-green-600 data-[state=on]:text-white data-[state=on]:border-green-500 border border-gray-600"
            aria-label={isRefreshEnabled ? 'Auto-refresh: ON (30s)' : 'Auto-refresh: OFF'}
            title={isRefreshEnabled ? 'Auto-refresh: ON (30s)' : 'Auto-refresh: OFF'}
          >
            <Zap size={18} />
          </Toggle>

          <Toggle
            pressed={false}
            onClick={toggleLanguage}
            className="border border-gray-600"
            aria-label="Toggle language"
          >
            <Globe size={18} />
            <span className="ml-1.5 text-xs font-medium">{language.toUpperCase()}</span>
          </Toggle>
        </div>
      </header>
    </>
  )
}
