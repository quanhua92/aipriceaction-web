import type { Language } from '@/contexts/SiteSettingsContext'
import enCommon from '../en/common'
import enDialogs from '../en/dialogs'
import enTemplates from '../en/ai-templates'
import enWidgets from '../en/widgets'
import vnCommon from '../vn/common'
import vnDialogs from '../vn/dialogs'
import vnTemplates from '../vn/ai-templates'
import vnWidgets from '../vn/widgets'

const translations = {
  en: {
    common: enCommon,
    dialogs: enDialogs,
    templates: enTemplates,
    widgets: enWidgets,
  },
  vn: {
    common: vnCommon,
    dialogs: vnDialogs,
    templates: vnTemplates,
    widgets: vnWidgets,
  },
}

export type Translations = typeof translations
export type TranslationKeys = typeof translations.en

export function loadTranslations(language: Language): TranslationKeys {
  return translations[language]
}
