import {
  HeadContent,
  Scripts,
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

import appCss from '../styles.css?url'

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
  head: () => ({
    meta: [
      {
        charSet: 'utf-8',
      },
      {
        name: 'viewport',
        content: 'width=device-width, initial-scale=1',
      },
      {
        title: 'AIPriceAction',
      },
    ],
    links: [
      {
        rel: 'stylesheet',
        href: appCss,
      },
    ],
    scripts: [
      {
        type: 'text/javascript',
        children: `
          // Vite replaces import.meta.env.VITE_GA_MEASUREMENT_ID at build time
          window.GA_MEASUREMENT_ID = '${import.meta.env.VITE_GA_MEASUREMENT_ID || ''}';

          if (window.GA_MEASUREMENT_ID && window.GA_MEASUREMENT_ID !== '' && !window.GA_MEASUREMENT_ID.includes('undefined')) {
            // Google tag (gtag.js)
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            gtag('config', window.GA_MEASUREMENT_ID);

            // Load gtag script
            var script = document.createElement('script');
            script.async = true;
            script.src = 'https://www.googletagmanager.com/gtag/js?id=' + window.GA_MEASUREMENT_ID;
            document.head.appendChild(script);
          }
        `,
      },
    ],
  }),

  notFoundComponent: NotFound,
  shellComponent: RootDocument,
})

function RootDocument({ children }: { children: React.ReactNode }) {
  const measurementId = typeof window !== 'undefined' ? window.GA_MEASUREMENT_ID : undefined;

  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body>
        <GoogleAnalyticsProvider measurementId={measurementId}>
          <LogsProvider>
            <SiteSettingsProvider>
              <RefreshProvider>
                <ChartSettingsProvider>
                  <APIProvider>
                    <AlertProvider>
                      <NoteProvider>
                        <Header />
                        {children}
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
                      </NoteProvider>
                    </AlertProvider>
                  </APIProvider>
                </ChartSettingsProvider>
              </RefreshProvider>
            </SiteSettingsProvider>
          </LogsProvider>
        </GoogleAnalyticsProvider>
        <Scripts />
      </body>
    </html>
  )
}
