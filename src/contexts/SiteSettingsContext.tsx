import * as React from 'react'

export type Language = 'en' | 'vn'

interface SiteSettingsContextType {
  language: Language
  setLanguage: (language: Language) => void
}

const SiteSettingsContext = React.createContext<SiteSettingsContextType | undefined>(undefined)

const STORAGE_KEY = 'site-settings-language'
const DEFAULT_LANGUAGE: Language = 'vn'

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

    // Priority 2: Check localStorage
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (stored === 'en' || stored === 'vn') {
        return stored
      }
    } catch (error) {
      console.warn('Failed to read language from localStorage:', error)
    }

    // Priority 3: Default to Vietnamese
    return DEFAULT_LANGUAGE
  })

  const setLanguage = React.useCallback((newLanguage: Language) => {
    setLanguageState(newLanguage)

    // Persist to localStorage
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(STORAGE_KEY, newLanguage)
      } catch (error) {
        console.warn('Failed to save language to localStorage:', error)
      }
    }
  }, [])

  const value = React.useMemo(
    () => ({ language, setLanguage }),
    [language, setLanguage]
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
