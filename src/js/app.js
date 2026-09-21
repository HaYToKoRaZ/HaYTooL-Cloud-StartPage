import { I18n }      from './i18n.js';
import { Storage }   from './storage.js';
import { Weather }   from './weather.js';
import { Shortcuts } from './shortcuts.js';
import { Favorites } from './favorites.js';
import { Settings }  from './settings.js';
import { GistSync }  from './gist-sync.js';

/**
 * Cloud StartPage HaYTooL v4.5.2
 */
class StartPageApp {
  async init() {
    try {
      // 1. Yerel ayarlarla sayfayı ve temayı ANINDA başlat (0 ms gecikme, sıfır parlama)
      await Settings.init();
      await I18n.init();
      await Favorites.init();
      await Shortcuts.init();
      await Weather.init();

      this.initClock();
      this.initQuotes();
      this.initFooterGistStatus();
      
      this.initGlobalKeys();
      this.initSearchBar();
      
      window.addEventListener('render_shortcuts_and_favorites', async () => {
        Favorites.items = await Storage.get(Favorites.FAV_KEY, []);
        Favorites.render();
        Shortcuts.categories = await Storage.get(Shortcuts.CAT_KEY, []);
        Shortcuts.items = await Storage.get(Shortcuts.ITEMS_KEY, []);
        Shortcuts.renderFolders();
      });

      window.addEventListener('cloud_data_loaded', async () => {
        await Settings.init();
        await Weather.fetchAndRender(true);
        Favorites.items = await Storage.get(Favorites.FAV_KEY, []);
        Favorites.render();
        Shortcuts.categories = await Storage.get(Shortcuts.CAT_KEY, []);
        Shortcuts.items = await Storage.get(Shortcuts.ITEMS_KEY, []);
        Shortcuts.renderFolders();
      });
      
      window.addEventListener('langchange', () => {
        Shortcuts.renderFolders();
        Favorites.render();
        this.initQuotes();
      });
      
      console.log('✨ Cloud StartPage HaYTooL v4.5.2 - hazır.');
      
      // Günün ilk açılışında arka planda sessizce otomatik Gist yedeği al
      setTimeout(() => {
        GistSync.checkDailyAutoBackup();
      }, 1500);
      
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
    const searchForm = document.getElementById('topSearchForm');
    const searchInput = document.getElementById('topSearchInput');
    const picker = document.getElementById('topSearchEnginePicker');
    const pickerBtn = document.getElementById('topSearchEngineBtn');
    const pickerIcon = document.getElementById('topSearchEngineIcon');
    const pickerLabel = document.getElementById('topSearchEngineLabel');
    const pickerItems = document.querySelectorAll('.top-search-menu-item');
    
    const engineConfig = {
      google:     { name: 'Google',      icon: 'https://www.google.com/favicon.ico' },
      yandex:     { name: 'Yandex',      icon: 'https://yandex.com/favicon.ico' },
      bing:       { name: 'Bing',        icon: 'https://www.bing.com/favicon.ico' },
      duckduckgo: { name: 'DuckDuckGo',  icon: 'https://duckduckgo.com/favicon.ico' },
      youtube:    { name: 'YouTube',     icon: 'https://www.youtube.com/favicon.ico' },
      chatgpt:    { name: 'ChatGPT',     icon: 'https://www.google.com/s2/favicons?domain=chatgpt.com&sz=64' },
      perplexity: { name: 'Perplexity',  icon: 'https://www.google.com/s2/favicons?domain=perplexity.ai&sz=64' },
      gemini:     { name: 'Gemini',      icon: 'https://www.google.com/s2/favicons?domain=gemini.google.com&sz=64' },
      claude:     { name: 'Claude',      icon: 'https://www.google.com/s2/favicons?domain=claude.ai&sz=64' },
      deepseek:   { name: 'DeepSeek',    icon: 'https://www.google.com/s2/favicons?domain=deepseek.com&sz=64' },
      qwen:       { name: 'Qwen',        icon: 'https://www.google.com/s2/favicons?domain=chat.qwen.ai&sz=64' }
    };

    let currentEngine = await Storage.get('search_engine', 'google');
    if (!engineConfig[currentEngine]) currentEngine = 'google';

    const setEngine = (engKey, save = true) => {
      const conf = engineConfig[engKey] || engineConfig.google;
      currentEngine = engKey;
      if (pickerIcon) pickerIcon.src = conf.icon;
      if (pickerLabel) pickerLabel.textContent = conf.name;
      pickerItems.forEach(item => {
        item.classList.toggle('active', item.getAttribute('data-engine') === engKey);
      });
      if (save) Storage.set('search_engine', engKey);
    };

    setEngine(currentEngine, false);

    if (picker && pickerBtn) {
      pickerBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        const isOpen = picker.classList.contains('open');
        // Kapat diğer menüleri
        document.querySelectorAll('.lang-picker.open').forEach(p => p.classList.remove('open'));
        picker.classList.toggle('open', !isOpen);
      });

      pickerItems.forEach(item => {
        item.addEventListener('click', (e) => {
          e.stopPropagation();
          const eng = item.getAttribute('data-engine');
          if (eng) setEngine(eng, true);
          picker.classList.remove('open');
          if (searchInput) searchInput.focus();
        });
      });

      document.addEventListener('click', (e) => {
        if (!picker.contains(e.target)) {
          picker.classList.remove('open');
        }
      });
    }

    if (searchForm) {
      searchForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const q = (searchInput?.value || '').trim();
        if (!q) return;
        let url = '';
        switch (currentEngine) {
          case 'yandex': url = 'https://yandex.com/search/?text=' + encodeURIComponent(q); break;
          case 'bing': url = 'https://www.bing.com/search?q=' + encodeURIComponent(q); break;
          case 'duckduckgo': url = 'https://duckduckgo.com/?q=' + encodeURIComponent(q); break;
          case 'youtube': url = 'https://www.youtube.com/results?search_query=' + encodeURIComponent(q); break;
          case 'chatgpt': url = 'https://chatgpt.com/?q=' + encodeURIComponent(q); break;
          case 'perplexity': url = 'https://www.perplexity.ai/search?q=' + encodeURIComponent(q); break;
          case 'gemini':
          case 'qwen': {
            const targetName = currentEngine === 'gemini' ? 'Gemini' : 'Qwen';
            url = currentEngine === 'gemini' ? 'https://gemini.google.com/app' : 'https://chat.qwen.ai/';
            try {
              await navigator.clipboard.writeText(q);
              const t = document.getElementById('toast');
              if (t) {
                t.textContent = `📋 ${I18n.t('ai_prompt_copied', 'Metin kopyalandı! {target} sayfasına Ctrl+V ile yapıştırabilirsiniz.').replace('{target}', targetName)}`;
                t.classList.add('show');
                setTimeout(() => t.classList.remove('show'), 4000);
              }
            } catch(err) {
              console.warn('Clipboard write failed:', err);
            }
            break;
          }
          case 'claude': url = 'https://claude.ai/new?q=' + encodeURIComponent(q); break;
          case 'deepseek': url = 'https://chat.deepseek.com/?q=' + encodeURIComponent(q); break;
          default: url = 'https://www.google.com/search?q=' + encodeURIComponent(q); break;
        }
        window.open(url, '_blank');
        if (searchInput) searchInput.value = '';
      });
    }
  }
  async initFooterGistStatus() {
    const box = document.getElementById('footerGistStatus');
    if (!box) return;
    const userProfile = await Storage.get('gist_user_profile', null);
    if (userProfile && userProfile.login) {
      box.innerHTML = `
        <a href="settings.html#gist" id="gistStatusLink" style="color:inherit; text-decoration:none; display:flex; align-items:center; gap:8px;">
          <img src="${userProfile.avatarUrl || 'https://github.githubassets.com/images/modules/logos_page/GitHub-Mark.png'}" 
               alt="${userProfile.login}" 
               style="width:22px; height:22px; border-radius:50%; object-fit:cover; border:1.5px solid var(--accent-primary);">
          <span>${userProfile.name || userProfile.login}</span>
        </a>
      `;
    }
  }
}

document.addEventListener('DOMContentLoaded', () => new StartPageApp().init());

