import type { Language } from '@/contexts/SiteSettingsContext'
import enCommon from '../en/common'
import enDialogs from '../en/dialogs'
import vnCommon from '../vn/common'
import vnDialogs from '../vn/dialogs'

const translations = {
  en: {
    common: enCommon,
    dialogs: enDialogs,
  },
  vn: {
    common: vnCommon,
    dialogs: vnDialogs,
  },
}

export type Translations = typeof translations
export type TranslationKeys = typeof translations.en

export function loadTranslations(language: Language): TranslationKeys {
  return translations[language]
}
