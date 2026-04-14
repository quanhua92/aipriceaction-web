import {
  Outlet,
  createRootRouteWithContext,
} from '@tanstack/react-router'

import Header from '../components/Header'
import Footer from '../components/Footer'
import { DebugFooter } from '../components/DebugFooter'
import { StatusBar } from '../components/StatusBar'
import { HistoricalDataWarningBar } from '../components/HistoricalDataWarningBar'
import { ThemeProvider } from '../components/ThemeProvider'
import { APIProvider } from '../contexts/APIContext'
import { SiteSettingsProvider } from '../contexts/SiteSettingsContext'
import { ChartSettingsProvider } from '../contexts/ChartSettingsContext'
import { AlertProvider } from '../contexts/AlertContext'
import { NoteProvider } from '../contexts/NoteContext'
import { RefreshProvider } from '../contexts/RefreshContext'
import { DialogProvider } from '../contexts/DialogContext'
import { GoogleAnalyticsProvider } from '../contexts/GoogleAnalyticsProvider'
import { LogsProvider } from '../contexts/LogsContext'
import { PWAInstallProvider } from '../components/PWAInstallBanner'
import { useEffect, useState } from 'react'

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
  const [countdown, setCountdown] = useState(3)

  useEffect(() => {
    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer)
          window.location.href = '/'
          return 0
        }
        return prev - 1
      })
    }, 1000)

    return () => clearInterval(timer)
  }, [])

  return (
    <div className="flex flex-col items-center justify-center min-h-[400px] p-4">
      <h1 className="text-4xl font-bold mb-4">404</h1>
      <p className="text-xl text-muted-foreground mb-4">Page not found</p>
      <p className="text-sm text-muted-foreground mb-8">
        Redirecting to home in {countdown} {countdown === 1 ? 'second' : 'seconds'}...
      </p>
      <a href="/" className="text-primary hover:underline">
        Go back home now
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
          <ThemeProvider>
            <RefreshProvider>
              <DialogProvider>
                <ChartSettingsProvider>
                <APIProvider>
                  <AlertProvider>
                    <NoteProvider>
                      <PWAInstallProvider>
                        <Header />
                        <HistoricalDataWarningBar />
                        <Outlet />
                        <Footer />
                        <StatusBar />
                        <DebugFooter />
                      </PWAInstallProvider>
                    </NoteProvider>
                  </AlertProvider>
                </APIProvider>
              </ChartSettingsProvider>
            </DialogProvider>
          </RefreshProvider>
        </ThemeProvider>
      </SiteSettingsProvider>
      </LogsProvider>
    </GoogleAnalyticsProvider>
  )
}
