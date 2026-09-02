import { Storage } from './storage.js';
import { I18n } from './i18n.js';
import { auth, db, doc, setDoc } from './firebase-config.js';

export const Settings = {
  _listenersInitialized: false,
  config: { 
    theme: 'dark', bgStyle: 'aurora', customBgUrl: '', 
    showClock: true, showSeconds: true, showGreeting: true, 
    showWeather: true, showFavBar: true, showQuote: true,
    folderColumns: 6, folderIconSize: 32, showSearchBar: true, showTopLangSelector: true, showThemeBtn: true,
    timezone: 'auto', iconApi: 'iconhorse', showImportBtn: true,
    weatherCityObj: null // { name: "Kadıköy", country: "Türkiye", lat: 40.9, lon: 29.0 }
  },
  
  async init() {
    const saved = await Storage.get('app_settings', null);
    if (!saved) {
      const prefersLight = window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches;
      this.config.theme = prefersLight ? 'light' : 'dark';
    }
    this.config = { ...this.config, ...(saved || {}) };
    // Eski tema isimlerini yeni sisteme migrasyon (oled/cyber → dark)
    const themeMap = { oled: 'dark', cyber: 'dark' };
    if (themeMap[this.config.theme]) this.config.theme = themeMap[this.config.theme];
    this.apply();
    this.setupListeners();
    this.setupCityAutocomplete();
    this.setupBackup();
    this.setupReset();
  },

  apply() {
    document.documentElement.setAttribute('data-theme', this.config.theme);
    document.body.className = '';
    const bg = document.getElementById('bgLayer');
    if (bg) {
      if (this.config.customBgUrl) {
        bg.style.backgroundImage = 'url("' + this.config.customBgUrl + '")';
        bg.style.opacity = '0.85';
      } else {
        bg.style.backgroundImage = 'none';
        bg.style.opacity = '';
        // Tema→Arka plan otomatik eşleştirme
        const THEME_BG = {
          dark:    'aurora',
          light:   'light',
          youtube: 'cyber',
          discord: 'nebula',
          matrix:  'matrix-bg'
        };
        document.body.classList.add('bg-preset-' + (THEME_BG[this.config.theme] || 'aurora'));
      }
    }
    
    // Widget visibility
    this.vis('headerTimeWidget', this.config.showClock);
    this.vis('headerDateWidget', this.config.showClock);
    this.vis('quoteBox', this.config.showQuote !== false);
    this.vis('digitalSeconds',    this.config.showSeconds);
    this.vis('greetingText',      this.config.showGreeting);
    this.vis('weatherBadge',      this.config.showWeather);
    this.vis('topSearchBarContainer', this.config.showSearchBar);
    this.vis('topLangPicker', this.config.showTopLangSelector !== false);
    this.vis('topThemeBtn', this.config.showThemeBtn !== false);
    this.vis('favBarSection',     this.config.showFavBar);
    this.vis('bookmarkImportBtn', this.config.showImportBtn !== false);
    

    // Folder cols CSS Variable ile çözüldü
    document.body.setAttribute('data-cols', this.config.folderColumns || 6);
    document.documentElement.style.setProperty('--folder-icon-size', (this.config.folderIconSize || 32) + 'px'); const grid = document.getElementById('shortcutsGrid'); if (grid) grid.setAttribute('data-cols', this.config.folderColumns || 6);
    window.dispatchEvent(new Event('resize'));
  },

  vis(id, show) { const el = document.getElementById(id); if (el) el.style.display = show ? '' : 'none'; },

  openModal() {
    this.populate();
    const modal = document.getElementById('settingsModal');
    if (modal) modal.classList.add('active');
  },

  setupListeners() {
    if (this._listenersInitialized) return;
    this._listenersInitialized = true;
    const modal       = document.getElementById('settingsModal');
    const openBtn     = document.getElementById('settingsBtn');
    const closeBtn    = document.getElementById('closeSettingsModal');
    const saveBtn     = document.getElementById('saveSettingsBtn');
    const colSelect   = document.getElementById('folderColumnsSelect');

    if (openBtn)  openBtn.addEventListener('click', () => { this.populate(); modal.classList.add('active'); });
    if (closeBtn) closeBtn.addEventListener('click', () => modal.classList.remove('active'));
    if (modal)    modal.addEventListener('click', e => { if (e.target === modal) modal.classList.remove('active'); });

    const topThemeBtn = document.getElementById('topThemeBtn');
    if (topThemeBtn) {
      topThemeBtn.addEventListener('click', async () => {
        const themes = ['dark', 'light', 'youtube', 'discord', 'matrix'];
        let idx = themes.indexOf(this.config.theme);
        idx = (idx + 1) % themes.length;
        this.config.theme = themes[idx];
        const themeSelect = document.getElementById('themeSelect');
        if (themeSelect) themeSelect.value = this.config.theme;
        await Storage.set('app_settings', this.config);
        this.apply();
        import('./weather.js').then(m => m.Weather.fetchAndRender(true));
      });
    }

    // === ANINDA KAYDET (AUTO-SAVE) ===
    if (modal) {
      modal.addEventListener('change', async (e) => {
        if (e.target.tagName !== 'SELECT' && e.target.tagName !== 'INPUT') return;
        
        let changed = false;
        const config = this.config;
        
        const nTheme = document.getElementById('themeSelect').value;
        if (nTheme !== config.theme) { config.theme = nTheme; changed = true; }
        
        const nCustBg = document.getElementById('customBgInput').value.trim();
        if (nCustBg !== config.customBgUrl) { config.customBgUrl = nCustBg; changed = true; }

        const nCols = parseInt(document.getElementById('folderColumnsSelect').value) || 6;
        if (nCols !== config.folderColumns) { config.folderColumns = nCols; changed = true; }
        
        const nIcon = parseInt(document.getElementById('iconSizeSelect')?.value) || 32;
        if (nIcon !== config.folderIconSize) { config.folderIconSize = nIcon; changed = true; }
        
        const nIconApi = document.getElementById('iconApiSelect')?.value || 'iconhorse';
        if (nIconApi !== config.iconApi) { config.iconApi = nIconApi; changed = true; }
        
        const nClk = document.getElementById('toggleClock').checked;
        if (nClk !== config.showClock) { config.showClock = nClk; changed = true; }
        
        const nSec = document.getElementById('toggleSeconds').checked;
        if (nSec !== config.showSeconds) { config.showSeconds = nSec; changed = true; }
        
        const nGreet = document.getElementById('toggleGreeting').checked;
        if (nGreet !== config.showGreeting) { config.showGreeting = nGreet; changed = true; }
        
        const nWea = document.getElementById('toggleWeather').checked;
        if (nWea !== config.showWeather) { config.showWeather = nWea; changed = true; }
        
        const nSearch = document.getElementById('toggleSearchBar').checked;
        const nTopLang = document.getElementById('toggleTopLang').checked;
        const nThemeBtnToggle = document.getElementById('toggleThemeBtn')?.checked;
        
        if (nTopLang !== config.showTopLangSelector) { config.showTopLangSelector = nTopLang; changed = true; }
        if (nSearch !== config.showSearchBar) { config.showSearchBar = nSearch; changed = true; }
        if (nThemeBtnToggle !== undefined && nThemeBtnToggle !== config.showThemeBtn) { config.showThemeBtn = nThemeBtnToggle; changed = true; }
          
        const nFav = document.getElementById('toggleFavBar').checked;
        if (nFav !== config.showFavBar) { config.showFavBar = nFav; changed = true; }

        const nImport = document.getElementById('toggleImportBtn')?.checked;
        if (nImport !== undefined && nImport !== config.showImportBtn) { config.showImportBtn = nImport; changed = true; }

        const tzSel = document.getElementById('timezoneSelect');
        if (tzSel && tzSel.value !== config.timezone) { config.timezone = tzSel.value; changed = true; }

        if (changed) {
          await Storage.set('app_settings', config);
          this.apply();
          // Eğer klasör veya ikon ayarı değiştiyse yeniden renderla
          if (nIcon !== undefined || nIconApi !== undefined || nCols !== undefined) {
             window.dispatchEvent(new Event('render_shortcuts_and_favorites'));
          }
          if (e.target.id === 'toggleWeather' || e.target.id === 'themeSelect') {
             import('./weather.js').then(m => m.Weather.fetchAndRender(true));
          }
        }
      });
      
      modal.addEventListener('input', async (e) => {
         if (e.target.id === 'customBgInput') {
             this.config.customBgUrl = e.target.value.trim();
             await Storage.set('app_settings', this.config);
             this.apply();
         }
      });
    }

    // Sütun sayısı anlık önizleme
    if (colSelect) {
      colSelect.addEventListener('change', () => {
        document.body.setAttribute('data-cols', colSelect.value); const grid = document.getElementById('shortcutsGrid'); if (grid) grid.setAttribute('data-cols', colSelect.value);
      });
    }

    // Dil değiştiğinde uygula (i18n.js zaten picker'ları günceller)
    window.addEventListener('langchange', () => {
      // toggleTopLang'ın görünürlüğünü korumak için apply'ı tetikle
      this.vis('topLangPicker', this.config.showTopLangSelector !== false);
    });

  },

  // === HAVA DURUMU CANLI ARAMA (AUTOCOMPLETE) ===
  setupBackup() {
    const expBtn = document.getElementById('exportDataBtn');
    const impInp = document.getElementById('importDataInput');
    
    if (expBtn) {
      expBtn.addEventListener('click', async () => {
        const allData = await Storage.getAll();
        const blob = new Blob([JSON.stringify(allData, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'haytool_backup_' + new Date().toISOString().slice(0,10) + '.json';
        a.click();
        URL.revokeObjectURL(url);
        this.toast(I18n.t('toast_backup_downloaded', 'Yedek indirildi'));
      });
    }

    const expHtmlBtn = document.getElementById('exportHtmlBtn');
    if (expHtmlBtn) {
      expHtmlBtn.addEventListener('click', async () => {
        const favs = await Storage.get('favorites_bar', []);
        const cats = await Storage.get('shortcut_categories', []);
        const items = await Storage.get('shortcuts_v2', []);
        
        let html = `<!DOCTYPE NETSCAPE-Bookmark-file-1>
<META HTTP-EQUIV="Content-Type" CONTENT="text/html; charset=UTF-8">
<TITLE>Bookmarks</TITLE>
<H1>Bookmarks</H1>
<DL><p>\n`;
        
        if (favs && favs.length > 0) {
          html += `    <DT><H3>HaYTooL Favorites</H3>\n    <DL><p>\n`;
          favs.forEach(f => {
            html += `        <DT><A HREF="${f.url}">${f.title}</A>\n`;
          });
          html += `    </DL><p>\n`;
        }

        if (cats && cats.length > 0) {
          cats.forEach(c => {
            const cItems = items.filter(i => i.categoryId === c.id);
            if (cItems.length > 0) {
              html += `    <DT><H3>${c.name}</H3>\n    <DL><p>\n`;
              cItems.forEach(i => {
                html += `        <DT><A HREF="${i.url}">${i.title}</A>\n`;
              });
              html += `    </DL><p>\n`;
            }
          });
        }

        html += `</DL><p>\n`;

        const blob = new Blob([html], { type: 'text/html' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'haytool_bookmarks_' + new Date().toISOString().slice(0,10) + '.html';
        a.click();
        URL.revokeObjectURL(url);
        this.toast(I18n.t('toast_backup_downloaded', 'HTML yer imleri dışa aktarıldı!'));
      });
    }

    if (impInp) {
      impInp.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = async (ev) => {
          try {
            const data = JSON.parse(ev.target.result);
            if (typeof data !== 'object') throw new Error('Geçersiz dosya');
            for (const key of Object.keys(data)) {
              await Storage.set(key, data[key]);
            }
            this.toast(I18n.t('toast_backup_downloaded'));
            setTimeout(() => window.location.reload(), 1500);
          } catch(err) {
            alert('Yedek yüklenirken hata oluştu: ' + err.message);
          }
          impInp.value = '';
        };
        reader.readAsText(file);
      });
    }
  },

  setupReset() {
    const delLinksBtn = document.getElementById('deleteAllLinksBtn');
    if (delLinksBtn) {
      delLinksBtn.addEventListener('click', async () => {
        const confirmWord = I18n.t('delete_all_links_confirm_word', 'SİL');
        const promptMsg = I18n.t('delete_all_links_prompt', 'Tüm linkleri silmek üzeresiniz. Onaylamak için lütfen kutuya büyük harflerle şunu yazın: ') + confirmWord;
        
        const userInput = prompt(promptMsg);
        
        if (userInput !== null) {
          if (userInput.trim() === confirmWord) {
            await Storage.set('shortcuts_v2', []);
            await Storage.set('shortcut_categories', []);
            await Storage.set('favorites_bar', []);
            this.toast(I18n.t('toast_links_deleted', 'Tüm linkler başarıyla silindi. Yükleniyor...'));
            setTimeout(() => window.location.reload(), 1500);
          } else {
            alert(I18n.t('toast_links_delete_failed', 'Hatalı kelime girdiniz, işlem iptal edildi.'));
          }
        }
      });
    }

    const resetBtn = document.getElementById('resetSettingsBtn');
    if (resetBtn) {
      resetBtn.addEventListener('click', async () => {
        if (confirm(I18n.t('confirm_reset_all', 'ALL your data (folders, links, settings) will be deleted. Are you sure?'))) {
          if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
            await chrome.storage.local.clear();
          }
          localStorage.clear();
          window.location.reload();
        }
      });
    }
  },

  setupCityAutocomplete() {
    const input = document.getElementById('weatherCityInput');
    const dropdown = document.getElementById('weatherCityDropdown');
    const clearBtn = document.getElementById('clearWeatherCityBtn');
    if (!input || !dropdown) return;

    let timer;

    input.addEventListener('input', () => {
      clearTimeout(timer);
      const val = input.value.trim();
      if (val.length < 2) {
        dropdown.style.display = 'none';
        return;
      }
      dropdown.innerHTML = '';
      dropdown.style.display = 'flex';
      dropdown.innerHTML = '<div class="city-dropdown-msg">' + I18n.t('weather_searching', '⏳ Searching...') + '</div>';
      
      timer = setTimeout(async () => {
        try {
          const res = await fetch('https://geocoding-api.open-meteo.com/v1/search?name=' + encodeURIComponent(val) + '&count=5&language=tr&format=json');
          const data = await res.json();
          dropdown.innerHTML = '';
          
          if (!data.results || data.results.length === 0) {
            dropdown.innerHTML = '<div class="city-dropdown-msg">' + I18n.t('weather_no_results', 'No results found') + '</div>';
            return;
          }

          data.results.forEach(city => {
            const item = document.createElement('div');
            item.className = 'city-dropdown-item';
            const locationStr = [city.admin1, city.country].filter(Boolean).join(', ');
            item.innerHTML = '<strong>' + city.name + '</strong>' + (locationStr ? '<small>' + locationStr + '</small>' : '');
            
            item.addEventListener('click', async () => {
              this.config.weatherCityObj = {
                name: city.name,
                country: city.country || '',
                lat: city.latitude,
                lon: city.longitude
              };
              input.value = city.name + (city.country ? ', ' + city.country : '');
              dropdown.style.display = 'none';
              await Storage.set('app_settings', this.config);
              await Storage.remove('weather_cache');
            });
            dropdown.appendChild(item);
          });
        } catch(e) {
          dropdown.innerHTML = '<div class="city-dropdown-msg">' + I18n.t('weather_connection_error', 'Connection error') + '</div>';
        }
      }, 500);
    });

    // Temizle Butonu (GPS Defaulta Dönüş)
    if (clearBtn) {
      clearBtn.addEventListener('click', async () => {
        input.value = '';
        this.config.weatherCityObj = null;
        dropdown.style.display = 'none';
        await Storage.set('app_settings', this.config);
        await Storage.remove('weather_cache');
      });
    }

    // Dışarı tıklayınca listeyi kapat
    document.addEventListener('click', (e) => {
      if (!input.contains(e.target) && !dropdown.contains(e.target)) {
        dropdown.style.display = 'none';
      }
    });
  },

  populate() {
    const f = (id, v) => { const el = document.getElementById(id); if (el) el.value = v; };
    const t = (id, v) => { const el = document.getElementById(id); if (el) el.checked = !!v; };
    f('themeSelect',          this.config.theme);
    f('customBgInput',        this.config.customBgUrl);
    f('folderColumnsSelect',  String(this.config.folderColumns || 6));
    f('iconSizeSelect',       String(this.config.folderIconSize || 32));
    f('iconApiSelect',        this.config.iconApi || 'google-hd');
    f('timezoneSelect',       this.config.timezone || 'auto');
    t('toggleThemeBtn',       this.config.showThemeBtn !== false);
    t('toggleClock',          this.config.showClock);
    t('toggleSeconds',        this.config.showSeconds);
    t('toggleGreeting',       this.config.showGreeting);
    t('toggleWeather',        this.config.showWeather);
    t('toggleFavBar',         this.config.showFavBar);
    t('toggleSearchBar',      this.config.showSearchBar);
    t('toggleTopLang',        this.config.showTopLangSelector !== false);
    t('toggleImportBtn',      this.config.showImportBtn !== false);
    
    const input = document.getElementById('weatherCityInput');
    if (input && this.config.weatherCityObj) {
      input.value = this.config.weatherCityObj.name + (this.config.weatherCityObj.country ? ', ' + this.config.weatherCityObj.country : '');
    } else if (input) {
      input.value = '';
    }
  },

  toast(msg) {
    const t = document.getElementById('toast');
    if (!t) return; t.textContent = msg; t.classList.add('show');
    setTimeout(() => t.classList.remove('show'), 3000);
  }
};





