import { Storage } from './storage.js';
/**
 * HaYTooL Cloud StartPage - i18n Dil Motoru
 * Default language: English | Custom flag picker supported
 */

const FLAG_MAP  = { en: 'gb', tr: 'tr' };
const LANG_NAMES = { en: 'EN', tr: 'TR' };
const flagUrl = (lang) =>
  `https://flagcdn.com/20x15/${FLAG_MAP[lang] || lang}.png`;

export const I18n = {
  currentLang: 'en',
  translations: {},

  async init() {
    // İlk kurulumda işletim sistemi / tarayıcı dilini algıla
    const saved = await Storage.get('lang', null);
    if (!saved) {
      const browserLang = (navigator.language || navigator.userLanguage || 'en').toLowerCase();
      this.currentLang = browserLang.startsWith('tr') ? 'tr' : 'en';
      await Storage.set('lang', this.currentLang);
    } else {
      this.currentLang = saved;
    }
    await this.loadLocale(this.currentLang);
    this.translateDOM();
    this._updateHtmlLang();
    this._bindPickers();
    this._updatePickers(this.currentLang);

    // Picker dışına tıklandığında kapat
    document.addEventListener('click', e => {
      document.querySelectorAll('.lang-picker.open').forEach(p => {
        if (!p.contains(e.target)) p.classList.remove('open');
      });
    });
  },

  /** Sayfadaki tüm .lang-picker elementlerine event bağla */
  _bindPickers() {
    document.querySelectorAll('.lang-picker').forEach(picker => {
      const btn = picker.querySelector('.lang-picker-btn');
      if (btn) {
        btn.addEventListener('click', (e) => {
          e.stopPropagation();
          // Diğer açık picker'ları kapat
          document.querySelectorAll('.lang-picker.open').forEach(p => {
            if (p !== picker) p.classList.remove('open');
          });
          picker.classList.toggle('open');
        });
      }
      picker.querySelectorAll('.lang-picker-item').forEach(item => {
        item.addEventListener('click', async (e) => {
          e.stopPropagation();
          const lang = item.dataset.lang;
          picker.classList.remove('open');
          await this.setLanguage(lang);
        });
      });
    });
  },

  /** Tüm picker'ların görünümünü seçili dile göre güncelle */
  _updatePickers(lang) {
    document.querySelectorAll('.lang-picker').forEach(picker => {
      picker.dataset.lang = lang;
      const flagImg = picker.querySelector('.lang-picker-btn .lang-flag');
      const codeEl  = picker.querySelector('.lang-picker-btn .lang-code');
      if (flagImg) {
        flagImg.src = flagUrl(lang);
        flagImg.alt = lang.toUpperCase();
      }
      if (codeEl) codeEl.textContent = LANG_NAMES[lang] || lang.toUpperCase();
      picker.querySelectorAll('.lang-picker-item').forEach(item => {
        item.classList.toggle('active', item.dataset.lang === lang);
        // Item flag'lerini de yükle (ilk render için)
        const img = item.querySelector('.lang-flag');
        if (img && !img.src.includes('flagcdn')) {
          img.src = flagUrl(item.dataset.lang);
        }
      });
    });
  },

  async loadLocale(lang) {
    try {
      const response = await fetch('../locales/' + lang + '.json');
      if (!response.ok) throw new Error('Locale not found: ' + lang);
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
    // İçerik çevirisi
    document.querySelectorAll('[data-i18n]').forEach(el => {
      const key = el.getAttribute('data-i18n');
      if (key && this.translations[key]) el.textContent = this.translations[key];
    });
    // Placeholder çevirisi
    document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
      const key = el.getAttribute('data-i18n-placeholder');
      if (key && this.translations[key]) el.setAttribute('placeholder', this.translations[key]);
    });
    // <optgroup label> çevirisi
    document.querySelectorAll('[data-i18n-label]').forEach(el => {
      const key = el.getAttribute('data-i18n-label');
      if (key && this.translations[key]) el.setAttribute('label', this.translations[key]);
    });
    // Title tooltip çevirisi
    document.querySelectorAll('[data-i18n-title]').forEach(el => {
      const key = el.getAttribute('data-i18n-title');
      if (key && this.translations[key]) el.setAttribute('title', this.translations[key]);
    });
    // Value çevirisi
    document.querySelectorAll('[data-i18n-value]').forEach(el => {
      const key = el.getAttribute('data-i18n-value');
      if (key && this.translations[key]) el.value = this.translations[key];
    });
  },

  _updateHtmlLang() {
    document.documentElement.setAttribute('lang', this.currentLang);
  },

  async setLanguage(lang) {
    await this.loadLocale(lang);
    await Storage.set('lang', lang);
    this._updateHtmlLang();
    this.translateDOM();
    this._updatePickers(lang);
    // Diğer bileşenlere haber ver (app.js dinliyor)
    window.dispatchEvent(new CustomEvent('langchange', { detail: { lang } }));
  }
};