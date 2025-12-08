import React, { useState, useEffect } from 'react'
import { Download, X } from 'lucide-react'
import { Button } from './ui/button'

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[]
  readonly userChoice: Promise<{
    outcome: 'accepted' | 'dismissed'
    platform: string
  }>
  prompt(): Promise<void>
}

interface PWAInstallButtonProps {
  mobileStyle?: boolean
}

export function PWAInstallButton({ mobileStyle = false }: PWAInstallButtonProps) {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [showInstallPrompt, setShowInstallPrompt] = useState(false)
  const [isInstalled, setIsInstalled] = useState(false)

  useEffect(() => {
    // Check if app is already installed
    const checkInstalled = () => {
      const isStandalone = window.matchMedia('(display-mode: standalone)').matches
      const isInWebAppiOS = (window.navigator as any).standalone === true
      const isInWebAppChrome = window.matchMedia('(display-mode: minimal-ui)').matches

      setIsInstalled(isStandalone || isInWebAppiOS || isInWebAppChrome)
    }

    // Listen for beforeinstallprompt event
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault()
      const promptEvent = e as BeforeInstallPromptEvent
      setDeferredPrompt(promptEvent)

      // Show install prompt after a delay
      setTimeout(() => {
        if (!localStorage.getItem('pwa-install-dismissed')) {
          setShowInstallPrompt(true)
        }
      }, 3000)
    }

    // Listen for app installed event
    const handleAppInstalled = () => {
      setIsInstalled(true)
      setShowInstallPrompt(false)
      setDeferredPrompt(null)
      localStorage.removeItem('pwa-install-dismissed')
    }

    checkInstalled()
    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
    window.addEventListener('appinstalled', handleAppInstalled)

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
      window.removeEventListener('appinstalled', handleAppInstalled)
    }
  }, [])

  const handleInstallClick = async () => {
    if (!deferredPrompt) return

    try {
      await deferredPrompt.prompt()
      const { outcome } = await deferredPrompt.userChoice

      if (outcome === 'accepted') {
        console.log('PWA installation accepted')
      } else {
        console.log('PWA installation dismissed')
      }

      setDeferredPrompt(null)
      setShowInstallPrompt(false)
    } catch (error) {
      console.error('Error during PWA installation:', error)
    }
  }

  const handleDismiss = () => {
    setShowInstallPrompt(false)
    localStorage.setItem('pwa-install-dismissed', 'true')
  }

  // Don't show anything if already installed (unless mobileStyle is true)
  if (!mobileStyle && (isInstalled || !deferredPrompt)) return null

  // Install prompt banner
  if (showInstallPrompt) {
    return (
      <div className="fixed bottom-4 left-4 right-4 md:left-auto md:right-4 md:w-96 bg-background border border-border rounded-lg shadow-lg p-4 z-50 animate-in slide-in-from-bottom-2">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <Download className="h-4 w-4 text-primary" />
              <h3 className="font-semibold text-sm">Install App</h3>
            </div>
            <p className="text-sm text-muted-foreground">
              Install AIPriceAction on your device for quick access and offline features.
            </p>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleDismiss}
            className="h-6 w-6 p-0"
          >
            <X className="h-3 w-3" />
          </Button>
        </div>
        <div className="flex gap-2 mt-3">
          <Button
            onClick={handleInstallClick}
            size="sm"
            className="flex-1"
          >
            Install Now
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleDismiss}
          >
            Maybe Later
          </Button>
        </div>
      </div>
    )
  }

  // Small install button (for integration in other components)
  const handleButtonClick = () => {
    if (deferredPrompt) {
      handleInstallClick()
    } else if (mobileStyle) {
      // Show manual install instructions
      alert('To install this app:\n\n' +
        'Chrome: Click the install icon in the address bar\n' +
        'Safari: Tap Share → Add to Home Screen\n' +
        'Firefox: Follow your browser\'s PWA installation process')
    }
  }

  return (
    <Button
      onClick={handleButtonClick}
      variant={mobileStyle ? "ghost" : "outline"}
      size={mobileStyle ? "default" : "sm"}
      className={`${mobileStyle ? "w-full h-12 text-base justify-start hover:bg-gray-800 text-white" : "gap-2"}`}
      disabled={isInstalled}
    >
      <Download className={`${mobileStyle ? "h-5 w-5 mr-3" : "h-4 w-4"}`} />
      {isInstalled ? 'App Installed' : 'Install App'}
    </Button>
  )
}