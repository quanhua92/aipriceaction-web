import React, { useState, useEffect, createContext, useContext } from 'react'
import { Download, X } from 'lucide-react'
import { Button } from './ui/button'
import { useLogs } from '../contexts/LogsContext'
import { useTranslation } from '@/hooks/useTranslation'
import { SafeLocalStorage } from '@/lib/localStorage'

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[]
  readonly userChoice: Promise<{
    outcome: 'accepted' | 'dismissed'
    platform: string
  }>
  prompt(): Promise<void>
}

interface PWAInstallContextValue {
  showInstallBanner: () => void
  hideInstallBanner: () => void
  triggerInstall: () => void
  isInstalled: boolean
}

const PWAInstallContext = createContext<PWAInstallContextValue | null>(null)

export function usePWAInstall() {
  const context = useContext(PWAInstallContext)
  if (!context) {
    throw new Error('usePWAInstall must be used within PWAInstallProvider')
  }
  return context
}

function isSamsungInternet(): boolean {
  const ua = navigator.userAgent
  return /SamsungBrowser/i.test(ua)
}

export function PWAInstallProvider({ children }: { children: React.ReactNode }) {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [showInstallPrompt, setShowInstallPrompt] = useState(false)
  const [isInstalled, setIsInstalled] = useState(false)
  const isSamsung = isSamsungInternet()
  const { info, debug, warn, error } = useLogs()
  const { t } = useTranslation()

  // Show install banner
  const showInstallBanner = () => {
    debug('Manual trigger: Showing PWA install banner')
    setShowInstallPrompt(true)
  }

  // Hide install banner
  const hideInstallBanner = () => {
    debug('Manual trigger: Hiding PWA install banner')
    setShowInstallPrompt(false)
  }

  useEffect(() => {
    // Check if app is already installed
    const checkInstalled = () => {
      const isStandalone = window.matchMedia('(display-mode: standalone)').matches
      const isInWebAppiOS = (window.navigator as any).standalone === true
      const isInWebAppChrome = window.matchMedia('(display-mode: minimal-ui)').matches
      const installed = isStandalone || isInWebAppiOS || isInWebAppChrome
      debug('PWA checkInstalled', { isStandalone, isInWebAppiOS, isInWebAppChrome, installed })
      setIsInstalled(installed)
      return installed
    }

    // Check if install prompt should be shown (based on dismiss timestamp)
    const shouldShowInstallPrompt = () => {
      const dismissTimestamp = SafeLocalStorage.getItem('pwa-install-dismissed')
      debug('PWA dismiss timestamp', { dismissTimestamp })

      if (!dismissTimestamp) return true

      const dismissTime = parseInt(dismissTimestamp, 10)
      const now = Date.now()
      const hours24 = 24 * 60 * 60 * 1000 // 24 hours in milliseconds

      // Handle potential parsing errors or very old timestamps
      if (isNaN(dismissTime) || dismissTime <= 0) {
        warn('Invalid PWA dismiss timestamp, removing', { dismissTimestamp, dismissTime })
        SafeLocalStorage.removeItem('pwa-install-dismissed')
        return true
      }

      const timeDiff = now - dismissTime
      const shouldShow = timeDiff > hours24
      const hoursPassed = timeDiff / (1000 * 60 * 60)

      debug('PWA dismiss check', {
        dismissTime,
        now,
        timeDiff,
        hours24,
        shouldShow,
        hoursPassed: Math.round(hoursPassed * 100) / 100
      })

      return shouldShow
    }

    // Listen for beforeinstallprompt event
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault()
      const promptEvent = e as BeforeInstallPromptEvent
      setDeferredPrompt(promptEvent)
      info('PWA beforeinstallprompt event fired!', {
        platforms: promptEvent.platforms,
        userAgent: navigator.userAgent
      })

      // Show install prompt after a delay if not dismissed recently
      setTimeout(() => {
        if (shouldShowInstallPrompt()) {
          info('Showing PWA install prompt banner')
          setShowInstallPrompt(true)
        } else {
          debug('PWA install prompt dismissed recently, not showing')
        }
      }, 3000)
    }

    // Listen for app installed event
    const handleAppInstalled = () => {
      info('PWA appinstalled event fired - app was successfully installed')
      setIsInstalled(true)
      setShowInstallPrompt(false)
      setDeferredPrompt(null)
      SafeLocalStorage.removeItem('pwa-install-dismissed')
    }

    // Initial check
    const initialInstalled = checkInstalled()

    // Set up event listeners
    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
    window.addEventListener('appinstalled', handleAppInstalled)

    // Only show banner when deferredPrompt is available (native install prompt ready)
    // Fallback: If no beforeinstallprompt after 5 seconds, don't show banner
    if (!initialInstalled && shouldShowInstallPrompt()) {
      debug('Setting up PWA banner check timer...')
      setTimeout(() => {
        if (deferredPrompt && !initialInstalled) {
          info('beforeinstallprompt received, showing PWA install banner')
          setShowInstallPrompt(true)
        } else {
          debug('No beforeinstallprompt received, not showing banner')
        }
      }, 5000)
    } else {
      debug('PWA banner conditions not met', {
        isInstalled: initialInstalled,
        shouldShow: shouldShowInstallPrompt(),
        hasServiceWorker: 'serviceWorker' in navigator
      })
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
      window.removeEventListener('appinstalled', handleAppInstalled)
    }
  }, [])

  const handleDismiss = () => {
    info('User dismissed PWA install prompt')
    setShowInstallPrompt(false)
    SafeLocalStorage.setItem('pwa-install-dismissed', Date.now().toString())
  }

  const triggerInstall = async () => {
    // Clear any previous dismiss when user manually clicks install
    SafeLocalStorage.removeItem('pwa-install-dismissed')
    info('Cleared PWA dismiss timestamp - user manually clicked install')

    if (!deferredPrompt) {
      // Show manual instructions if no native prompt available
      if (isInstalled) {
        info('User tried to install but app is already installed')
        alert(t('common.pwa.alreadyInstalled'))
      } else {
        info('No native PWA prompt available, showing manual instructions')
        alert(t('common.pwa.noNativePrompt'))
      }
      return
    }

    try {
      info('User triggered PWA installation, showing native prompt')
      await deferredPrompt.prompt()
      const { outcome } = await deferredPrompt.userChoice

      if (outcome === 'accepted') {
        info('PWA installation accepted by user')
      } else {
        info('PWA installation dismissed by user', { outcome })
      }

      setDeferredPrompt(null)
      setShowInstallPrompt(false)
    } catch (error) {
      error('Error during PWA installation', { error })
    }
  }

  const contextValue: PWAInstallContextValue = {
    showInstallBanner,
    hideInstallBanner,
    triggerInstall,
    isInstalled
  }

  return (
    <PWAInstallContext.Provider value={contextValue}>
      {children}

      {/* PWA Install Banner */}
      {showInstallPrompt && (
        <div className="fixed bottom-4 left-4 right-4 md:left-auto md:right-4 md:w-96 bg-background border border-border rounded-lg shadow-lg p-4 z-50 animate-in slide-in-from-bottom-2">
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <Download className="h-4 w-4 text-primary" />
                <h3 className="font-semibold text-sm">{t('common.pwa.installTitle')}</h3>
              </div>
              <p className="text-sm text-muted-foreground">
                {t('common.pwa.installDescription')}
              </p>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleDismiss}
              className="h-6 w-6 p-0"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
          {isSamsung && (
            <p className="text-xs text-muted-foreground bg-muted/50 rounded-md p-2 mt-2">
              {t('common.pwa.samsungWarning')}
            </p>
          )}
          <div className="flex gap-2 mt-3">
            <Button
              onClick={triggerInstall}
              size="sm"
              className="flex-1"
            >
              {t('common.pwa.installNow')}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleDismiss}
            >
              {t('common.pwa.maybeLater')}
            </Button>
          </div>
        </div>
      )}
    </PWAInstallContext.Provider>
  )
}