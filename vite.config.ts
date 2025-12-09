import { defineConfig } from 'vite'
import viteReact from '@vitejs/plugin-react'
import viteTsConfigPaths from 'vite-tsconfig-paths'
import tailwindcss from '@tailwindcss/vite'
import { TanStackRouterVite } from '@tanstack/router-plugin/vite'
import { VitePWA } from 'vite-plugin-pwa'

const config = defineConfig({
  plugins: [
    // this is the plugin that enables path aliases
    viteTsConfigPaths({
      projects: ['./tsconfig.json'],
    }),
    tailwindcss(),
    TanStackRouterVite(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico', 'favicon.png', 'logo.svg', 'logo-16.png', 'logo-32.png', 'logo-64.png', 'logo-128.png', 'logo-192.png', 'logo-256.png', 'logo-512.png'],
      manifest: {
        name: 'AIPriceAction - Vietnamese Stock Market',
        short_name: 'AIPriceAction',
        description: 'Vietnamese stock market analysis and trading insights powered by AI',
        theme_color: '#7c3aed',
        background_color: '#ffffff',
        display: 'standalone',
        orientation: 'portrait',
        scope: '/',
        start_url: '/',
        icons: [
          {
            src: 'logo-16.png',
            sizes: '16x16',
            type: 'image/png',
            purpose: 'any'
          },
          {
            src: 'logo-32.png',
            sizes: '32x32',
            type: 'image/png',
            purpose: 'any'
          },
          {
            src: 'logo-64.png',
            sizes: '64x64',
            type: 'image/png',
            purpose: 'any'
          },
          {
            src: 'logo-128.png',
            sizes: '128x128',
            type: 'image/png',
            purpose: 'any'
          },
          {
            src: 'logo-192.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'any maskable'
          },
          {
            src: 'logo-256.png',
            sizes: '256x256',
            type: 'image/png',
            purpose: 'any'
          },
          {
            src: 'logo-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any maskable'
          }
        ],
        categories: ['finance', 'business', 'productivity']
      },
      workbox: {
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/api\.aipriceaction\.com\/.*/,
            handler: 'StaleWhileRevalidate',
            options: {
              cacheName: 'api-cache',
              expiration: {
                maxEntries: 500,
                maxAgeSeconds: 60 * 15 // 15 minutes
              }
            }
          },
          {
            urlPattern: /^http:\/\/localhost:3000\/.*/,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'api-dev-cache',
              expiration: {
                maxEntries: 200,
                maxAgeSeconds: 60 * 30 // 30 minutes for development
              },
              networkTimeoutSeconds: 3
            }
          },
          {
            urlPattern: /\/aipriceaction-api\/.*/,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'api-proxy-cache',
              expiration: {
                maxEntries: 500,
                maxAgeSeconds: 60 * 15 // 15 minutes for proxy API
              },
              networkTimeoutSeconds: 5
            }
          }
        ]
      },
      devOptions: {
        enabled: true
      }
    }),
    viteReact(),
  ],
  server: {
    proxy: {
      '/aipriceaction-api': {
        target: 'http://127.0.0.1:3000',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/aipriceaction-api/, ''),
        secure: false,
      },
    },
  },
})

export default config
