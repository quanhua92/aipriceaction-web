import React from 'react'
import ReactDOM from 'react-dom/client'
import { RouterProvider, createRouter } from '@tanstack/react-router'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

import { getRouter } from './router'
import { routeTree } from './routeTree.gen'

// PWA Service Worker Registration
import { registerSW } from 'virtual:pwa-register'

// Register the service worker
if ('serviceWorker' in navigator) {
  registerSW({
    onOfflineReady() {
      console.log('App now works offline!')
      // You could show a toast notification here
    },
    onNeedRefresh() {
      console.log('New content available, please refresh')
      // You could show a refresh prompt here
    },
    onRegisterError(error) {
      console.error('Service worker registration error:', error)
    }
  })
}

// Create a client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      refetchOnWindowFocus: false,
    },
  },
})

// Create a new router instance
const router = createRouter({
  routeTree,
  context: { queryClient },
  defaultPreload: 'intent',
})

// Register the router instance for type safety
declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router
  }
}

const rootElement = document.getElementById('root')!
const root = ReactDOM.createRoot(rootElement)

root.render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>
  </React.StrictMode>
)