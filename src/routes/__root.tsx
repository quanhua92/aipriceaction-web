import {
  Outlet,
  createRootRouteWithContext,
} from '@tanstack/react-router'
import { TanStackRouterDevtoolsPanel } from '@tanstack/react-router-devtools'
import { TanStackDevtools } from '@tanstack/react-devtools'

import Header from '../components/Header'
import { DebugFooter } from '../components/DebugFooter'
import { StatusBar } from '../components/StatusBar'
import { APIProvider } from '../contexts/APIContext'
import { SiteSettingsProvider } from '../contexts/SiteSettingsContext'
import { ChartSettingsProvider } from '../contexts/ChartSettingsContext'
import { AlertProvider } from '../contexts/AlertContext'
import { NoteProvider } from '../contexts/NoteContext'
import { RefreshProvider } from '../contexts/RefreshContext'
import { GoogleAnalyticsProvider } from '../contexts/GoogleAnalyticsProvider'
import { LogsProvider } from '../contexts/LogsContext'

import TanStackQueryDevtools from '../integrations/tanstack-query/devtools'
import { PWAInstallProvider } from '../components/PWAInstallBanner'

import '../styles.css'

import type { QueryClient } from '@tanstack/react-query'

declare global {
	interface Window {
		GA_MEASUREMENT_ID?: string;
	}
}

interface MyRouterContext {
  queryClient: QueryClient
}

function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[400px] p-4">
      <h1 className="text-4xl font-bold mb-4">404</h1>
      <p className="text-xl text-muted-foreground mb-8">Page not found</p>
      <a href="/" className="text-primary hover:underline">
        Go back home
      </a>
    </div>
  )
}

export const Route = createRootRouteWithContext<MyRouterContext>()({
  component: RootComponent,
  notFoundComponent: NotFound,
})

function RootComponent() {
  const measurementId = typeof window !== 'undefined' ? window.GA_MEASUREMENT_ID : undefined;

  return (
    <GoogleAnalyticsProvider measurementId={measurementId}>
      <LogsProvider>
        <SiteSettingsProvider>
          <RefreshProvider>
            <ChartSettingsProvider>
              <APIProvider>
                <AlertProvider>
                  <NoteProvider>
                    <PWAInstallProvider>
                      <Header />
                      <Outlet />
                      <StatusBar />
                      <DebugFooter />
                      {import.meta.env.DEV && (
                        <TanStackDevtools
                          config={{
                            position: 'bottom-right',
                          }}
                          plugins={[
                            {
                              name: 'Tanstack Router',
                              render: <TanStackRouterDevtoolsPanel />,
                            },
                            TanStackQueryDevtools,
                          ]}
                        />
                      )}
                    </PWAInstallProvider>
                  </NoteProvider>
                </AlertProvider>
              </APIProvider>
            </ChartSettingsProvider>
          </RefreshProvider>
        </SiteSettingsProvider>
      </LogsProvider>
    </GoogleAnalyticsProvider>
  )
}
