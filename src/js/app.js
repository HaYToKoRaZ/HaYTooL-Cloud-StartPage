import { I18n } from './i18n.js';
import { Storage } from './storage.js';
import { Weather } from './weather.js';
import { Shortcuts } from './shortcuts.js';
import { Notes } from './notes.js';
import { Settings } from './settings.js';

/**
 * HaYTooL Cloud StartPage - Main Application Bootstrap
 */
class StartPageApp {
  constructor() {
    this.searchEngines = {
      google: { name: 'Google', icon: '🔍', url: 'https://www.google.com/search?q=' },
      duckduckgo: { name: 'DuckDuckGo', icon: '🦆', url: 'https://duckduckgo.com/?q=' },
      bing: { name: 'Bing', icon: '🅱️', url: 'https://www.bing.com/search?q=' },
      youtube: { name: 'YouTube', icon: '📺', url: 'https://www.youtube.com/results?search_query=' },
      github: { name: 'GitHub', icon: '🐙', url: 'https://github.com/search?q=' },
      yandex: { name: 'Yandex', icon: '🟡', url: 'https://yandex.com/search/?text=' },
      brave: { name: 'Brave', icon: '🦁', url: 'https://search.brave.com/search?q=' }
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

      console.log('🚀 HaYTooL Cloud StartPage initialized successfully.');
    } catch (err) {
      console.error('Error during StartPage initialization:', err);
    }
  }

  initClock() {
    const update = () => {
      const now = new Date();
      const h = String(now.getHours()).padStart(2, '0');
      const m = String(now.getMinutes()).padStart(2, '0');
      const s = String(now.getSeconds()).padStart(2, '0');

      const timeEl = document.getElementById('digitalTime');
      const secEl = document.getElementById('digitalSeconds');
      const dateEl = document.getElementById('dateText');
      const greetingEl = document.getElementById('greetingText');

      if (timeEl) timeEl.textContent = `${h}:${m}`;
      if (secEl) secEl.textContent = s;

      if (dateEl) {
        const locale = I18n.currentLang === 'tr' ? 'tr-TR' : 'en-US';
        const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
        dateEl.textContent = now.toLocaleDateString(locale, options);
      }

      if (greetingEl) {
        const hour = now.getHours();
        let greetingKey = 'greeting_morning';
        if (hour >= 12 && hour < 17) greetingKey = 'greeting_afternoon';
        else if (hour >= 17 && hour < 22) greetingKey = 'greeting_evening';
        else if (hour >= 22 || hour < 6) greetingKey = 'greeting_night';

        greetingEl.textContent = I18n.t(greetingKey, 'Hoş Geldiniz');
      }
    };

    update();
    setInterval(update, 1000);
  }

  async initSearch() {
    const input = document.getElementById('searchInput');
    const form = document.getElementById('searchForm');
    const engineBtn = document.getElementById('engineSelectBtn');
    const dropdown = document.getElementById('engineDropdown');

    this.currentEngine = await Storage.get('search_engine', 'google');
    this.updateEngineUI(this.currentEngine);

    if (engineBtn && dropdown) {
      engineBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        dropdown.classList.toggle('active');
      });

      document.addEventListener('click', () => dropdown.classList.remove('active'));

      dropdown.querySelectorAll('.engine-option').forEach(opt => {
        opt.addEventListener('click', async () => {
          const engine = opt.getAttribute('data-engine');
          if (engine && this.searchEngines[engine]) {
            this.currentEngine = engine;
            await Storage.set('search_engine', engine);
            this.updateEngineUI(engine);
            dropdown.classList.remove('active');
            if (input) input.focus();
          }
        });
      });
    }

    if (form && input) {
      form.addEventListener('submit', (e) => {
        e.preventDefault();
        const query = input.value.trim();
        if (!query) return;

        if (query.match(/^(https?:\/\/|[a-z0-9]+([\-\.]{1}[a-z0-9]+)*\.[a-z]{2,5})(:[0-9]{1,5})?(\/.*)?$/i)) {
          const targetUrl = query.startsWith('http') ? query : 'https://' + query;
          window.location.href = targetUrl;
          return;
        }

        const engineObj = this.searchEngines[this.currentEngine] || this.searchEngines.google;
        window.location.href = engineObj.url + encodeURIComponent(query);
      });
    }
  }

  updateEngineUI(engineKey) {
    const btn = document.getElementById('engineSelectBtn');
    const obj = this.searchEngines[engineKey] || this.searchEngines.google;
    if (btn) {
      btn.innerHTML = `<span>${obj.icon}</span> <span>▾</span>`;
      btn.title = obj.name;
    }
  }

  initQuotes() {
    const quotes = [
      "Gelecek, bugünden hazırlananlara aittir.",
      "The secret of getting ahead is getting started.",
      "En büyük başarı, hiç düşmemek değil, her düşüşte ayağa kalkmaktır.",
      "Simplicity is the soul of efficiency.",
      "Her yeni gün, yeni bir başlangıçtır.",
      "Stay hungry, stay foolish."
    ];
    const qEl = document.getElementById('quoteBox');
    if (qEl) {
      const idx = Math.floor(Math.random() * quotes.length);
      qEl.textContent = `“${quotes[idx]}”`;
    }
  }

  initGlobalKeys() {
    document.addEventListener('keydown', (e) => {
      if (e.key === '/' && document.activeElement.tagName !== 'INPUT' && document.activeElement.tagName !== 'TEXTAREA') {
        e.preventDefault();
        const searchInput = document.getElementById('searchInput');
        if (searchInput) searchInput.focus();
      }

      if (e.key === 'Escape') {
        document.querySelectorAll('.modal-overlay.active, .drawer-panel.active, .engine-dropdown.active').forEach(el => {
          el.classList.remove('active');
        });
      }
    });
  }
}

document.addEventListener('DOMContentLoaded', () => {
  const app = new StartPageApp();
  app.init();
});