import { I18n }      from './i18n.js';
import { Storage }   from './storage.js';
import { Weather }   from './weather.js';
import { Shortcuts } from './shortcuts.js';
import { Favorites } from './favorites.js';
import { Settings }  from './settings.js';
import { Auth }      from './auth.js';

/**
 * HaYTooL Cloud StartPage v2.0.0
 */
class StartPageApp {
  async init() {
    try {
      await I18n.init();
      await Settings.init();
      
      // Auth'u bekleyelim (Giriş/Karşılama ekranı için)
      await Auth.init();

      await Weather.init();
      await Favorites.init();
      await Shortcuts.init();
      this.initClock();
      
      this.initGlobalKeys();
      this.initSearchBar();
      
      window.addEventListener('render_shortcuts_and_favorites', () => {
        Shortcuts.renderFolders();
        Favorites.render();
      });
      
      window.addEventListener('langchange', () => {
        Shortcuts.renderFolders();
        Favorites.render();
      });
      
      console.log('✨ HaYTooL Cloud StartPage v4.1.1 - hazır.');
      
      if (window.location.hash === '#settings') {
        setTimeout(() => Settings.openModal(), 300);
      }
    } catch (err) {
      console.error('[App] Başlatma hatası:', err);
    }
  }

    initQuotes() {
    const box = document.getElementById('quoteBox');
    if (!box) return;
    const quotes = [
      { tr: "Geleceği tahmin etmenin en iyi yolu onu yaratmaktır.", en: "The best way to predict the future is to create it.", author: "Peter Drucker" },
      { tr: "Büyük işler, bir dizi küçük şeyin bir araya getirilmesiyle yapılır.", en: "Great things are done by a series of small things brought together.", author: "Vincent Van Gogh" },
      { tr: "Sadelik en üst düzey gelişmişliktir.", en: "Simplicity is the ultimate sophistication.", author: "Leonardo da Vinci" },
      { tr: "Başarı, her gün tekrarlanan küçük çabaların toplamıdır.", en: "Success is the sum of small efforts, repeated day in and day out.", author: "Robert Collier" },
      { tr: "Hata yapmayan insan, genellikle hiçbir şey yapmayan insandır.", en: "A person who never made a mistake never tried anything new.", author: "Albert Einstein" },
      { tr: "Bugün yapacağınız seçimler yarınınızı belirler.", en: "Your choices today define your tomorrow.", author: "HaYTooL" },
      { tr: "Zaman en kıymetli hazinedir, onu iyi değerlendirin.", en: "Time is what we want most, but what we use worst.", author: "William Penn" }
    ];
    const q = quotes[Math.floor(Math.random() * quotes.length)];
    const lang = (I18n.currentLang || 'tr').toLowerCase();
    const text = lang === 'tr' ? q.tr : q.en;
    box.innerHTML = `<span style="font-style:italic; font-size:0.8rem; opacity:0.85;">"${text}"</span> <small style="opacity:0.6; font-size:0.72rem; margin-left:6px;">— ${q.author}</small>`;
  }

  initClock() {
    const tick = () => {
      const lang = I18n.currentLang === "tr" ? "tr-TR" : "en-US";
      let tz = undefined;
      if (Settings.config && Settings.config.timezone && Settings.config.timezone !== "auto") {
        tz = Settings.config.timezone;
      }
      
      let now;
      try {
        if (tz) {
          const dateStr = new Date().toLocaleString("en-US", { timeZone: tz });
          now = new Date(dateStr);
        } else {
          now = new Date();
        }
      } catch(e) {
        now = new Date();
      }

      const h   = String(now.getHours()).padStart(2,"0");
      const m   = String(now.getMinutes()).padStart(2,"0");
      const s   = String(now.getSeconds()).padStart(2,"0");
      
      const timeEl  = document.getElementById("digitalTime");
      const secEl   = document.getElementById("digitalSeconds");
      const dateEl  = document.getElementById("dateText");
      const greetEl = document.getElementById("greetingText");
      
      if (timeEl) timeEl.textContent = h + ":" + m;
      if (secEl)  secEl.textContent  = s;
      if (dateEl) {
        // İki satır olması için tarih ve ay ayırıyoruz
        const dayName = now.toLocaleDateString(lang, { weekday: "short" });
        const dayNum = now.toLocaleDateString(lang, { day: "numeric" });
        const monthName = now.toLocaleDateString(lang, { month: "short" });
        const year = now.toLocaleDateString(lang, { year: "numeric" });
        dateEl.innerHTML = `<div style="display:flex; align-items:center; gap:0.4rem; justify-content:center;">
          <div style="font-size: 1.8rem; font-weight: 800; background: linear-gradient(135deg, #38bdf8, #818cf8); -webkit-background-clip: text; -webkit-text-fill-color: transparent; text-shadow: 0 0 20px rgba(56, 189, 248, 0.4);">${dayNum}</div>
          <div style="text-align: left; line-height: 1.1;">
            <div style="font-size: 0.85rem; font-weight: 600; color: #f1f5f9;">${monthName}</div>
            <div style="font-size: 0.7rem; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.5px;">${dayName} ${year}</div>
          </div>
        </div>`;
      }
      
      if (greetEl) {
        const hr = now.getHours();
        let key  = "greeting_morning";
        if (hr>=12&&hr<17) key="greeting_afternoon";
        else if (hr>=17&&hr<22) key="greeting_evening";
        else if (hr>=22||hr<6) key="greeting_night";
        greetEl.textContent = I18n.t(key,"Hoş Geldiniz") + " 👋";
      }
    };
    tick(); setInterval(tick, 1000);
  }

  

  initGlobalKeys() {
    document.addEventListener('keydown', e => {
      if (e.key === 'Escape')
        document.querySelectorAll('.modal-overlay.active').forEach(el => el.classList.remove('active'));
    });
  }

  async initSearchBar() {
    const searchContainer = document.getElementById('topSearchBarContainer');
    const searchForm = document.getElementById('topSearchForm');
    const searchInput = document.getElementById('topSearchInput');
    const engineSelect = document.getElementById('topSearchEngineSelect');
    
    // Initial display setting
    

    const savedEngine = await Storage.get('search_engine', 'google');
    if (engineSelect) {
      engineSelect.value = savedEngine;
      engineSelect.addEventListener('change', (e) => {
        Storage.set('search_engine', e.target.value);
      });
    }

    if (searchForm) {
      searchForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const q = searchInput.value.trim();
        if (!q) return;
        const engine = engineSelect.value || 'google';
        let url = '';
        switch (engine) {
          case 'yandex': url = 'https://yandex.com/search/?text=' + encodeURIComponent(q); break;
          case 'bing': url = 'https://www.bing.com/search?q=' + encodeURIComponent(q); break;
          case 'duckduckgo': url = 'https://duckduckgo.com/?q=' + encodeURIComponent(q); break;
          case 'youtube': url = 'https://www.youtube.com/results?search_query=' + encodeURIComponent(q); break;
          case 'chatgpt': url = 'https://chatgpt.com/?q=' + encodeURIComponent(q); break;
          case 'perplexity': url = 'https://www.perplexity.ai/search?q=' + encodeURIComponent(q); break;
          case 'gemini': url = 'https://gemini.google.com/app?q=' + encodeURIComponent(q); break;
          case 'claude': url = 'https://claude.ai/new?q=' + encodeURIComponent(q); break;
          default: url = 'https://www.google.com/search?q=' + encodeURIComponent(q); break;
        }
        window.open(url, '_blank');
        searchInput.value = '';
      });
    }
  }
}

document.addEventListener('DOMContentLoaded', () => new StartPageApp().init());




