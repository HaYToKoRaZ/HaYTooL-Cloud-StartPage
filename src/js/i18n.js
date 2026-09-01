import { Storage } from './storage.js';
/**
 * HaYTooL Cloud StartPage - i18n Dil Motoru
 */
export const I18n = {
  currentLang: 'tr',
  translations: {},
  async init() {
    this.currentLang = await Storage.get('lang', 'tr');
    await this.loadLocale(this.currentLang);
    this.translateDOM();
    
    // Bind top language selector
    const topLang = document.getElementById('topLangSelect');
    if (topLang) {
      topLang.value = this.currentLang;
      topLang.addEventListener('change', async (e) => {
        await this.setLanguage(e.target.value);
        // Also update the settings modal langSelect to match
        const setLang = document.getElementById('langSelect');
        if (setLang) setLang.value = e.target.value;
      });
    }
  },
  async loadLocale(lang) {
    try {
      const response = await fetch('../locales/' + lang + '.json');
      if (!response.ok) throw new Error('Locale yüklenemedi: ' + lang);
      this.translations = await response.json();
      this.currentLang = lang;
    } catch (e) {
      console.warn('[I18n] Dil dosyası yüklenemedi, varsayılan kullanılıyor.', e);
      this.translations = {};
    }
  },
  t(key, fallback) {
    return this.translations[key] || fallback || key;
  },
  translateDOM() {
    document.querySelectorAll('[data-i18n]').forEach(el => {
      const key = el.getAttribute('data-i18n');
      if (key && this.translations[key]) el.textContent = this.translations[key];
    });
    document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
      const key = el.getAttribute('data-i18n-placeholder');
      if (key && this.translations[key]) el.setAttribute('placeholder', this.translations[key]);
    });
    document.querySelectorAll('[data-i18n-label]').forEach(el => {
      const key = el.getAttribute('data-i18n-label');
      if (key && this.translations[key]) el.setAttribute('label', this.translations[key]);
    });
    document.querySelectorAll('[data-i18n-title]').forEach(el => {
      const key = el.getAttribute('data-i18n-title');
      if (key && this.translations[key]) el.setAttribute('title', this.translations[key]);
    });
  },
  async setLanguage(lang) {
    await this.loadLocale(lang);
    await Storage.set('lang', lang);
    this.translateDOM();
  }
};