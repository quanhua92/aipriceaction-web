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
        <div className="flex items-center">
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
                      'flex items-center gap-3 p-3 rounded-lg bg-cyan-600 hover:bg-cyan-700 transition-colors mb-2',
                  }}
                >
                  <Home size={20} />
                  <span className="font-medium">Home</span>
                </Link>

                <Link
                  to="/chart"
                  onClick={() => setIsOpen(false)}
                  className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-800 transition-colors mb-2"
                  activeProps={{
                    className:
                      'flex items-center gap-3 p-3 rounded-lg bg-cyan-600 hover:bg-cyan-700 transition-colors mb-2',
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
                      'flex items-center gap-3 p-3 rounded-lg bg-cyan-600 hover:bg-cyan-700 transition-colors mb-2',
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
                      'flex items-center gap-3 p-3 rounded-lg bg-cyan-600 hover:bg-cyan-700 transition-colors mb-2',
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
                      'flex items-center gap-3 p-3 rounded-lg bg-cyan-600 hover:bg-cyan-700 transition-colors mb-2',
                  }}
                >
                  <Brain size={20} />
                  <span className="font-medium">AI Context</span>
                </Link>
              </nav>
            </SheetContent>
          </Sheet>
          <h1 className="ml-4 text-xl font-semibold">
            <Link to="/" className="text-white hover:text-cyan-400 transition-colors">
              AIPriceAction
            </Link>
          </h1>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={toggleRefresh}
            className={`p-2 rounded-md transition-colors border ${
              isRefreshEnabled
                ? 'bg-green-600 hover:bg-green-700 border-green-500 text-white'
                : 'bg-gray-700 hover:bg-gray-600 border-gray-600 text-gray-400'
            }`}
            aria-label={isRefreshEnabled ? 'Auto-refresh: ON (30s)' : 'Auto-refresh: OFF'}
            title={isRefreshEnabled ? 'Auto-refresh: ON (30s)' : 'Auto-refresh: OFF'}
          >
            <Zap size={18} />
          </button>

          <button
            onClick={toggleLanguage}
            className="p-2 bg-gray-700 hover:bg-gray-600 rounded-md transition-colors border border-gray-600"
            aria-label="Toggle language"
          >
            <span className="text-sm text-gray-300 leading-none flex items-center justify-center w-[18px] h-[18px]">{language === 'en' ? 'EN' : 'VN'}</span>
          </button>
        </div>
      </header>
    </>
  )
}
