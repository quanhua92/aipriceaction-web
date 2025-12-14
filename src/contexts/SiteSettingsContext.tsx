import * as React from 'react'
import { SafeLocalStorage } from '@/lib/localStorage'

export type Language = 'en' | 'vn'
export type Theme = 'light' | 'dark' | 'system'

interface SiteSettingsContextType {
  language: Language
  setLanguage: (language: Language) => void
  theme: Theme
  setTheme: (theme: Theme) => void
}

const SiteSettingsContext = React.createContext<SiteSettingsContextType | undefined>(undefined)

const STORAGE_KEY = 'site-settings-language'
const THEME_STORAGE_KEY = 'site-settings-theme'
const DEFAULT_LANGUAGE: Language = 'vn'
const DEFAULT_THEME: Theme = 'system'

export function SiteSettingsProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguageState] = React.useState<Language>(() => {
    // Check if we're in browser environment
    if (typeof window === 'undefined') {
      return DEFAULT_LANGUAGE
    }

    // Priority 1: Check URL parameter
    const urlParams = new URLSearchParams(window.location.search)
    const urlLang = urlParams.get('lang')
    if (urlLang === 'en' || urlLang === 'vn') {
      return urlLang
    }

    // Priority 2: Check localStorage safely
    const storedLang = SafeLocalStorage.getItem(STORAGE_KEY)
    if (storedLang === 'en' || storedLang === 'vn') {
      return storedLang
    }

    // Priority 3: Default to Vietnamese
    return DEFAULT_LANGUAGE
  })

  const [theme, setThemeState] = React.useState<Theme>(() => {
    // Check if we're in browser environment
    if (typeof window === 'undefined') {
      return DEFAULT_THEME
    }

    // Priority 1: Check URL parameter
    const urlParams = new URLSearchParams(window.location.search)
    const urlTheme = urlParams.get('theme') as Theme
    if (urlTheme && ['light', 'dark', 'system'].includes(urlTheme)) {
      return urlTheme
    }

    // Priority 2: Check localStorage safely
    const storedTheme = SafeLocalStorage.getItem(THEME_STORAGE_KEY)
    if (storedTheme && ['light', 'dark', 'system'].includes(storedTheme)) {
      return storedTheme as Theme
    }

    // Priority 3: Default to system
    return DEFAULT_THEME
  })

  const setLanguage = React.useCallback((newLanguage: Language) => {
    setLanguageState(newLanguage)

    // Persist to localStorage safely
    SafeLocalStorage.setItem(STORAGE_KEY, newLanguage)
  }, [])

  const setTheme = React.useCallback((newTheme: Theme) => {
    setThemeState(newTheme)

    // Persist to localStorage safely
    SafeLocalStorage.setItem(THEME_STORAGE_KEY, newTheme)
  }, [])

  const value = React.useMemo(
    () => ({ language, setLanguage, theme, setTheme }),
    [language, setLanguage, theme, setTheme]
  )

  return (
    <SiteSettingsContext.Provider value={value}>
      {children}
    </SiteSettingsContext.Provider>
  )
}

export function useSiteSettings() {
  const context = React.useContext(SiteSettingsContext)
  if (!context) {
    throw new Error('useSiteSettings must be used within a SiteSettingsProvider')
  }
  return context
}
