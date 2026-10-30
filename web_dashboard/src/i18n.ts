import { createI18n } from 'vue-i18n'
import en from './locales/en.json'
import ar from './locales/ar.json'
import fr from './locales/fr.json'

export type AppLocale = 'en' | 'ar' | 'fr'

export const LOCALE_OPTIONS: { value: AppLocale; label: string }[] = [
  { value: 'en', label: 'English' },
  { value: 'ar', label: 'العربية' },
  { value: 'fr', label: 'Français' },
]

const savedLocale = (localStorage.getItem('locale') as AppLocale) || 'en'

const i18n = createI18n({
  locale: savedLocale,
  fallbackLocale: 'en',
  legacy: false,
  messages: { en, ar, fr },
})

document.documentElement.dir = savedLocale === 'ar' ? 'rtl' : 'ltr'

export default i18n
