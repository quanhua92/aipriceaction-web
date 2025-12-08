import React from 'react'
import { Download } from 'lucide-react'
import { Button } from './ui/button'
import { usePWAInstall } from './PWAInstallBanner'

interface PWAInstallButtonProps {
  mobileStyle?: boolean
}

export function PWAInstallButton({ mobileStyle = false }: PWAInstallButtonProps) {
  const { triggerInstall, isInstalled } = usePWAInstall()

  const handleClick = () => {
    triggerInstall()
  }

  // Don't show the button at all if app is already installed
  if (isInstalled) {
    return null
  }

  return (
    <Button
      onClick={handleClick}
      variant="ghost"
      size={mobileStyle ? "default" : "sm"}
      className={`${mobileStyle ? "w-full h-12 text-base justify-start hover:bg-gray-800 text-white" : "gap-2"}`}
    >
      <Download className={`${mobileStyle ? "h-5 w-5 mr-3" : "h-4 w-4"}`} />
      Install App
    </Button>
  )
}