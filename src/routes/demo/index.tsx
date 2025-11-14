import { createFileRoute, Link } from '@tanstack/react-router'
import {
  SquareFunction,
  Network,
  StickyNote,
  Table,
  ClipboardType,
} from 'lucide-react'

export const Route = createFileRoute('/demo/')({
  component: DemoPage,
})

function DemoPage() {
  return (
    <div className="p-4 md:p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">TanStack Demos</h1>
        <p className="text-muted-foreground">
          Explore various TanStack features and examples
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* Start - Server Functions */}
        <Link
          to="/demo/start/server-funcs"
          className="flex items-start gap-4 p-4 rounded-lg border border-border hover:bg-accent transition-colors"
        >
          <SquareFunction className="h-6 w-6 text-green-500 flex-shrink-0 mt-1" />
          <div>
            <h3 className="font-semibold mb-1">Server Functions</h3>
            <p className="text-sm text-muted-foreground">
              Learn how to use TanStack Start server functions
            </p>
          </div>
        </Link>

        {/* Start - API Request */}
        <Link
          to="/demo/start/api-request"
          className="flex items-start gap-4 p-4 rounded-lg border border-border hover:bg-accent transition-colors"
        >
          <Network className="h-6 w-6 text-green-500 flex-shrink-0 mt-1" />
          <div>
            <h3 className="font-semibold mb-1">API Request</h3>
            <p className="text-sm text-muted-foreground">
              Example of making API requests with TanStack Start
            </p>
          </div>
        </Link>

        {/* Start - SSR */}
        <Link
          to="/demo/start/ssr"
          className="flex items-start gap-4 p-4 rounded-lg border border-border hover:bg-accent transition-colors"
        >
          <StickyNote className="h-6 w-6 text-green-500 flex-shrink-0 mt-1" />
          <div>
            <h3 className="font-semibold mb-1">SSR Demos</h3>
            <p className="text-sm text-muted-foreground">
              Server-side rendering examples (SPA Mode, Full SSR, Data Only)
            </p>
          </div>
        </Link>

        {/* TanStack Query */}
        <Link
          to="/demo/tanstack-query"
          className="flex items-start gap-4 p-4 rounded-lg border border-border hover:bg-accent transition-colors"
        >
          <Network className="h-6 w-6 text-green-500 flex-shrink-0 mt-1" />
          <div>
            <h3 className="font-semibold mb-1">TanStack Query</h3>
            <p className="text-sm text-muted-foreground">
              Data fetching and caching with TanStack Query
            </p>
          </div>
        </Link>

        {/* TanStack Table */}
        <Link
          to="/demo/table"
          className="flex items-start gap-4 p-4 rounded-lg border border-border hover:bg-accent transition-colors"
        >
          <Table className="h-6 w-6 text-green-500 flex-shrink-0 mt-1" />
          <div>
            <h3 className="font-semibold mb-1">TanStack Table</h3>
            <p className="text-sm text-muted-foreground">
              Powerful table features with TanStack Table
            </p>
          </div>
        </Link>

        {/* Simple Form */}
        <Link
          to="/demo/form/simple"
          className="flex items-start gap-4 p-4 rounded-lg border border-border hover:bg-accent transition-colors"
        >
          <ClipboardType className="h-6 w-6 text-green-500 flex-shrink-0 mt-1" />
          <div>
            <h3 className="font-semibold mb-1">Simple Form</h3>
            <p className="text-sm text-muted-foreground">
              Basic form handling example
            </p>
          </div>
        </Link>

        {/* Address Form */}
        <Link
          to="/demo/form/address"
          className="flex items-start gap-4 p-4 rounded-lg border border-border hover:bg-accent transition-colors"
        >
          <ClipboardType className="h-6 w-6 text-green-500 flex-shrink-0 mt-1" />
          <div>
            <h3 className="font-semibold mb-1">Address Form</h3>
            <p className="text-sm text-muted-foreground">
              Complex form with address fields
            </p>
          </div>
        </Link>
      </div>
    </div>
  )
}
