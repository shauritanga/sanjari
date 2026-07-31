import i18next from 'i18next';
import { initReactI18next } from 'react-i18next';

export const i18n = i18next.use(initReactI18next).init({
  compatibilityJSON: 'v4',
  lng: 'en',
  fallbackLng: 'en',
  resources: {
    en: {
      translation: {
        welcome: 'Meet someone who matches your path.',
        start: 'Start',
        login: 'Log in'
      }
    },
    sw: {
      translation: {
        welcome: 'Kutana na anayelingana nawe.',
        start: 'Anza',
        login: 'Ingia'
      }
    }
  }
});
