import { useSiteSettings } from '@/contexts/SiteSettingsContext'
import { loadTranslations } from '@/translations'
import type { AllTranslationKeys } from '@/translations'

type TranslationParams = Record<string, string | number>

export function useTranslation() {
  const { language } = useSiteSettings()
  const translations = loadTranslations(language)

  const t = (key: AllTranslationKeys | string, params?: TranslationParams): string => {
    try {
      // Split the key by dots to access nested properties
      const keys = key.split('.')
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let value: any = translations

      for (const k of keys) {
        if (value && typeof value === 'object' && k in value) {
          value = value[k]
        } else {
          // Key not found, return the key itself as fallback
          if (process.env.NODE_ENV === 'development') {
            console.warn(`Translation key not found: ${key}`)
          }
          return key
        }
      }

      // If value is not a string, return the key
      if (typeof value !== 'string') {
        if (process.env.NODE_ENV === 'development') {
          console.warn(`Translation value is not a string: ${key}`)
        }
        return key
      }

      // Apply string interpolation if params are provided
      if (params) {
        return value.replace(/\{(\w+)\}/g, (match, paramKey) => {
          return paramKey in params ? String(params[paramKey]) : match
        })
      }

      return value
    } catch (error) {
      if (process.env.NODE_ENV === 'development') {
        console.error(`Error translating key "${key}":`, error)
      }
      return key
    }
  }

  return { t, language }
}
