import { Link } from '@tanstack/react-router'

import { useState } from 'react'
import {
  Home,
  LineChart,
  Menu,
  Table,
  X,
  Zap,
  Brain,
} from 'lucide-react'
import { useSiteSettings } from '../contexts/SiteSettingsContext'
import { useRefresh } from '../contexts/RefreshContext'

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
          <button
            onClick={() => setIsOpen(true)}
            className="p-2 hover:bg-gray-700 rounded-lg transition-colors"
            aria-label="Open menu"
          >
            <Menu size={24} />
          </button>
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
            className="px-4 py-1.5 bg-gray-700 hover:bg-gray-600 rounded-md transition-colors border border-gray-600"
            aria-label="Toggle language"
          >
            <span className="text-sm font-bold tracking-wide">{language === 'en' ? 'EN' : 'VN'}</span>
          </button>
        </div>
      </header>

      <aside
        className={`fixed top-0 left-0 h-full w-80 bg-gray-900 text-white shadow-2xl z-50 transform transition-transform duration-300 ease-in-out flex flex-col ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex items-center justify-between p-4 border-b border-gray-700">
          <h2 className="text-xl font-bold">Navigation</h2>
          <button
            onClick={() => setIsOpen(false)}
            className="p-2 hover:bg-gray-800 rounded-lg transition-colors"
            aria-label="Close menu"
          >
            <X size={24} />
          </button>
        </div>

        <nav className="flex-1 p-4 overflow-y-auto">
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
      </aside>
    </>
  )
}
