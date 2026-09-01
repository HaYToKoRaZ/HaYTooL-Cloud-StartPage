import { I18n }      from './i18n.js';
import { Storage }   from './storage.js';
import { Weather }   from './weather.js';
import { Shortcuts } from './shortcuts.js';
import { Notes }     from './notes.js';
import { Settings }  from './settings.js';

/**
 * HaYTooL Cloud StartPage - Ana Uygulama v1.1.0
 */
class StartPageApp {
  constructor() {
    this.searchEngines = {
      google:     { name: 'Google',     icon: '🔍', url: 'https://www.google.com/search?q=' },
      duckduckgo: { name: 'DuckDuckGo', icon: '🦆', url: 'https://duckduckgo.com/?q=' },
      bing:       { name: 'Bing',       icon: '🅱️', url: 'https://www.bing.com/search?q=' },
      youtube:    { name: 'YouTube',    icon: '📺', url: 'https://www.youtube.com/results?search_query=' },
      github:     { name: 'GitHub',     icon: '🐙', url: 'https://github.com/search?q=' },
      yandex:     { name: 'Yandex',     icon: '🟡', url: 'https://yandex.com/search/?text=' },
      brave:      { name: 'Brave',      icon: '🦁', url: 'https://search.brave.com/search?q=' }
    };
    this.currentEngine = 'google';
  }

  async init() {
    try {
      await I18n.init();
      await Settings.init();
      await Weather.init();
      await Shortcuts.init();
      await Notes.init();

      this.initClock();
      this.initSearch();
      this.initQuotes();
      this.initGlobalKeys();
      this.wireExtraButtons();

      console.log('🚀 HaYTooL Cloud StartPage v1.1.0 – hazır.');
    } catch (err) {
      console.error('[App] Başlatma hatası:', err);
    }
  }

  /* ---- Saat (Sol Üst) ---- */
  initClock() {
    const tick = () => {
      const now = new Date();
      const h   = String(now.getHours()).padStart(2, '0');
      const m   = String(now.getMinutes()).padStart(2, '0');
      const s   = String(now.getSeconds()).padStart(2, '0');

      const timeEl  = document.getElementById('digitalTime');
      const secEl   = document.getElementById('digitalSeconds');
      const dateEl  = document.getElementById('dateText');
      const greetEl = document.getElementById('greetingText');

      if (timeEl) timeEl.textContent = h + ':' + m;
      if (secEl)  secEl.textContent  = s;

      if (dateEl) {
        const locale = I18n.currentLang === 'tr' ? 'tr-TR' : 'en-US';
        const opts   = { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' };
        dateEl.textContent = now.toLocaleDateString(locale, opts);
      }

      if (greetEl) {
        const hr  = now.getHours();
        let key   = 'greeting_morning';
        if (hr >= 12 && hr < 17) key = 'greeting_afternoon';
        else if (hr >= 17 && hr < 22) key = 'greeting_evening';
        else if (hr >= 22 || hr < 6)  key = 'greeting_night';
        greetEl.textContent = I18n.t(key, 'Hoş Geldiniz') + ' 👋';
      }
    };
    tick();
    setInterval(tick, 1000);
  }

  /* ---- Arama Çubuğu ---- */
  async initSearch() {
    const input     = document.getElementById('searchInput');
    const form      = document.getElementById('searchForm');
    const engineBtn = document.getElementById('engineSelectBtn');
    const dropdown  = document.getElementById('engineDropdown');

    this.currentEngine = await Storage.get('search_engine', 'google');
    this.updateEngineUI(this.currentEngine);

    if (engineBtn && dropdown) {
      engineBtn.addEventListener('click', e => {
        e.stopPropagation();
        dropdown.classList.toggle('active');
      });
      document.addEventListener('click', () => dropdown.classList.remove('active'));
      dropdown.querySelectorAll('.engine-option').forEach(opt => {
        opt.addEventListener('click', async () => {
          const eng = opt.getAttribute('data-engine');
          if (eng && this.searchEngines[eng]) {
            this.currentEngine = eng;
            await Storage.set('search_engine', eng);
            this.updateEngineUI(eng);
            dropdown.classList.remove('active');
            if (input) input.focus();
          }
        });
      });
    }

    if (form && input) {
      form.addEventListener('submit', e => {
        e.preventDefault();
        const query = input.value.trim();
        if (!query) return;
        const isUrl = /^(https?:\/\/|[a-z0-9]+([-\.][a-z0-9]+)*\.[a-z]{2,6})(:[0-9]{1,5})?(\/.*)?$/i.test(query);
        if (isUrl) { window.location.href = query.startsWith('http') ? query : 'https://' + query; return; }
        const eng = this.searchEngines[this.currentEngine] || this.searchEngines.google;
        window.location.href = eng.url + encodeURIComponent(query);
      });
    }
  }

  updateEngineUI(key) {
    const btn = document.getElementById('engineSelectBtn');
    const obj = this.searchEngines[key] || this.searchEngines.google;
    if (btn) { btn.innerHTML = '<span>' + obj.icon + '</span><span>▾</span>'; btn.title = obj.name; }
  }

  initQuotes() {
    const quotes = [
      "Gelecek, bugünden hazırlananlara aittir.",
      "The secret of getting ahead is getting started. – Mark Twain",
      "Basitlik, verimliliğin ruhudur.",
      "Her yeni gün, yeni bir başlangıçtır.",
      "Stay hungry, stay foolish. – Steve Jobs",
      "Hayal kurmaya cesaret et, büyük düşün.",
      "Code is poetry."
    ];
    const el = document.getElementById('quoteBox');
    if (el) el.textContent = '"' + quotes[Math.floor(Math.random() * quotes.length)] + '"';
  }

  initGlobalKeys() {
    document.addEventListener('keydown', e => {
      const tag = document.activeElement.tagName;
      if (e.key === '/' && tag !== 'INPUT' && tag !== 'TEXTAREA') {
        e.preventDefault();
        document.getElementById('searchInput')?.focus();
      }
      if (e.key === 'Escape') {
        document.querySelectorAll('.modal-overlay.active, .drawer-panel.active, .engine-dropdown.active')
          .forEach(el => el.classList.remove('active'));
      }
    });
  }

  wireExtraButtons() {
    const closeShortcutFooter = document.getElementById('closeShortcutModalFooter');
    const shortcutModal = document.getElementById('shortcutModal');
    if (closeShortcutFooter && shortcutModal)
      closeShortcutFooter.addEventListener('click', () => shortcutModal.classList.remove('active'));

    const cancelImportHeader = document.getElementById('cancelImportBtnHeader');
    const importModal = document.getElementById('importPreviewModal');
    if (cancelImportHeader && importModal)
      cancelImportHeader.addEventListener('click', () => importModal.classList.remove('active'));
  }
}

document.addEventListener('DOMContentLoaded', () => new StartPageApp().init());