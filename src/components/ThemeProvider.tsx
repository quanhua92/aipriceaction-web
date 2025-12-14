import { useSiteSettings } from '@/contexts/SiteSettingsContext'
import { useEffect } from 'react'

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const { theme } = useSiteSettings()

  useEffect(() => {
    if (typeof window === 'undefined') return

    const applyTheme = () => {
      const root = document.documentElement
      root.classList.remove('light', 'dark')

      if (theme === 'system') {
        const systemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
        root.classList.add(systemTheme)
      } else {
        root.classList.add(theme)
      }
    }

    applyTheme()

    // Listen for system theme changes when theme is 'system'
    if (theme === 'system') {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
      const handleChange = () => applyTheme()
      mediaQuery.addEventListener('change', handleChange)

      return () => mediaQuery.removeEventListener('change', handleChange)
    }
  }, [theme])

  return <>{children}</>
}