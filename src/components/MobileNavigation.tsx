import { Link } from '@tanstack/react-router'
import {
  Home,
  LineChart,
  Menu,
  Table,
  Brain,
  Eye,
  Bell,
  Coins,
  FileText,
  TrendingUp,
  Dices,
} from 'lucide-react'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet'
import { PWAInstallButton } from './PWAInstallButton'

interface MobileNavigationProps {
  isOpen: boolean
  setIsOpen: (open: boolean) => void
}

export function MobileNavigation({ isOpen, setIsOpen }: MobileNavigationProps) {
  return (
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
              to="/alert"
              onClick={() => setIsOpen(false)}
              className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-800 transition-colors mb-2"
              activeProps={{
                className:
                  'flex items-center gap-3 p-3 rounded-lg bg-green-600 hover:bg-green-700 transition-colors mb-2',
              }}
            >
              <Bell size={20} />
              <span className="font-medium">Alerts</span>
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
              to="/signals"
              onClick={() => setIsOpen(false)}
              className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-800 transition-colors mb-2"
              activeProps={{
                className:
                  'flex items-center gap-3 p-3 rounded-lg bg-green-600 hover:bg-green-700 transition-colors mb-2',
              }}
            >
              <TrendingUp size={20} />
              <span className="font-medium">Signals</span>
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

            <Link
              to="/play"
              onClick={() => setIsOpen(false)}
              className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-800 transition-colors mb-2"
              activeProps={{
                className:
                  'flex items-center gap-3 p-3 rounded-lg bg-green-600 hover:bg-green-700 transition-colors mb-2',
              }}
            >
              <Dices size={20} />
              <span className="font-medium">Playground</span>
            </Link>

            <Link
              to="/notes"
              onClick={() => setIsOpen(false)}
              className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-800 transition-colors mb-2"
              activeProps={{
                className:
                  'flex items-center gap-3 p-3 rounded-lg bg-green-600 hover:bg-green-700 transition-colors mb-2',
              }}
            >
              <FileText size={20} />
              <span className="font-medium">Notes</span>
            </Link>

            {/* Mobile PWA Install Button */}
            <div className="pt-4 mt-4 border-t border-gray-700">
              <PWAInstallButton mobileStyle />
            </div>
          </nav>
        </SheetContent>
      </Sheet>
    </div>
  )
}