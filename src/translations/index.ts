export { loadTranslations } from './utils/load-translations'
export type { Translations, TranslationKeys } from './utils/load-translations'

// Type helper for nested keys with dot notation
export type NestedKeyOf<ObjectType extends object> = {
  [Key in keyof ObjectType & (string | number)]: ObjectType[Key] extends object
    ? `${Key}` | `${Key}.${NestedKeyOf<ObjectType[Key]>}`
    : `${Key}`
}[keyof ObjectType & (string | number)]

// Export all translation keys as a type
import type { TranslationKeys } from './utils/load-translations'
export type AllTranslationKeys = NestedKeyOf<TranslationKeys>
