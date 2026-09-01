import { Storage } from './storage.js';
import { I18n } from './i18n.js';

export const Settings = {
  config: { 
    theme: 'dark', bgStyle: 'aurora', customBgUrl: '', 
    showClock: true, showSeconds: true, showGreeting: true, 
    showWeather: true, showFavBar: true, showQuote: true,
    folderColumns: 3, 
    weatherCityObj: null // { name: "Kadıköy", country: "Türkiye", lat: 40.9, lon: 29.0 }
  },
  
  async init() {
    const saved = await Storage.get('app_settings', {});
    this.config = { ...this.config, ...saved };
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
      if (this.config.customBgUrl) { bg.style.backgroundImage = 'url("' + this.config.customBgUrl + '")'; bg.style.opacity = '0.85'; }
      else { bg.style.backgroundImage = 'none'; document.body.classList.add('bg-preset-' + this.config.bgStyle); }
    }
    
    // Widget visibility
    this.vis('headerClockWidget', this.config.showClock);
    this.vis('digitalSeconds',    this.config.showSeconds);
    this.vis('greetingText',      this.config.showGreeting);
    this.vis('weatherBadge',      this.config.showWeather);
    this.vis('favBarSection',     this.config.showFavBar);
    

    // Folder cols CSS Variable ile çözüldü
    document.body.setAttribute('data-cols', this.config.folderColumns || 3);
    document.documentElement.style.setProperty('--folder-icon-size', (this.config.folderIconSize || 64) + 'px'); const grid = document.getElementById('shortcutsGrid'); if (grid) grid.setAttribute('data-cols', this.config.folderColumns || 3);
    window.dispatchEvent(new Event('resize'));
  },

  vis(id, show) { const el = document.getElementById(id); if (el) el.style.display = show ? '' : 'none'; },

  setupListeners() {
    const modal       = document.getElementById('settingsModal');
    const openBtn     = document.getElementById('settingsBtn');
    const closeBtn    = document.getElementById('closeSettingsModal');
    const saveBtn     = document.getElementById('saveSettingsBtn');
    const colSelect   = document.getElementById('folderColumnsSelect');

    if (openBtn)  openBtn.addEventListener('click', () => { this.populate(); modal.classList.add('active'); });
    if (closeBtn) closeBtn.addEventListener('click', () => modal.classList.remove('active'));
    if (modal)    modal.addEventListener('click', e => { if (e.target === modal) modal.classList.remove('active'); });

    // === ANINDA KAYDET (AUTO-SAVE) ===
    if (modal) {
      modal.addEventListener('change', async (e) => {
        if (e.target.tagName !== 'SELECT' && e.target.tagName !== 'INPUT') return;
        
        let changed = false;
        const config = this.config;
        
        const nTheme = document.getElementById('themeSelect').value;
        if (nTheme !== config.theme) { config.theme = nTheme; changed = true; }
        
        const nBg = document.getElementById('bgSelect').value;
        if (nBg !== config.bgStyle) { config.bgStyle = nBg; changed = true; }
        
        const nCustBg = document.getElementById('customBgInput').value.trim();
        if (nCustBg !== config.customBgUrl) { config.customBgUrl = nCustBg; changed = true; }
        
        const nCols = parseInt(document.getElementById('folderColumnsSelect').value) || 3;
        if (nCols !== config.folderColumns) { config.folderColumns = nCols; changed = true; }
        
        const nIcon = parseInt(document.getElementById('iconSizeSelect')?.value) || 64;
        if (nIcon !== config.folderIconSize) { config.folderIconSize = nIcon; changed = true; }
        
        const nClk = document.getElementById('toggleClock').checked;
        if (nClk !== config.showClock) { config.showClock = nClk; changed = true; }
        
        const nSec = document.getElementById('toggleSeconds').checked;
        if (nSec !== config.showSeconds) { config.showSeconds = nSec; changed = true; }
        
        const nGreet = document.getElementById('toggleGreeting').checked;
        if (nGreet !== config.showGreeting) { config.showGreeting = nGreet; changed = true; }
        
        const nWea = document.getElementById('toggleWeather').checked;
        if (nWea !== config.showWeather) { config.showWeather = nWea; changed = true; }
        
        const nFav = document.getElementById('toggleFavBar').checked;
        if (nFav !== config.showFavBar) { config.showFavBar = nFav; changed = true; }
        
        
        
        const nLang = document.getElementById('langSelect').value;
        if (nLang !== I18n.currentLang) {
          await I18n.setLanguage(nLang);
          changed = true;
        }

        const tzSel = document.getElementById('timezoneSelect');
        if (tzSel && tzSel.value !== config.timezone) { config.timezone = tzSel.value; changed = true; }

        if (changed) {
          await Storage.set('app_settings', config);
          this.apply();
          
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
        this.toast('Yedek başarıyla indirildi!');
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
            this.toast('Yedek başarıyla yüklendi! Sayfa yenileniyor...');
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
    const resetBtn = document.getElementById('resetSettingsBtn');
    if (resetBtn) {
      resetBtn.addEventListener('click', async () => {
        if (confirm('TÜM verileriniz (klasörler, linkler, ayarlar) silinecek. Emin misiniz?')) {
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
      dropdown.style.display = 'flex';
      dropdown.innerHTML = '<div class="city-dropdown-msg">⏳ Aranıyor...</div>';
      
      timer = setTimeout(async () => {
        try {
          const res = await fetch('https://geocoding-api.open-meteo.com/v1/search?name=' + encodeURIComponent(val) + '&count=5&language=tr&format=json');
          const data = await res.json();
          dropdown.innerHTML = '';
          
          if (!data.results || data.results.length === 0) {
            dropdown.innerHTML = '<div class="city-dropdown-msg">Sonuç bulunamadı</div>';
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
          dropdown.innerHTML = '<div class="city-dropdown-msg">Bağlantı hatası</div>';
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
    f('bgSelect',             this.config.bgStyle);
    f('customBgInput',        this.config.customBgUrl);
    f('langSelect',           I18n.currentLang);
    f('folderColumnsSelect',  String(this.config.folderColumns || 3));
    f('iconSizeSelect',       String(this.config.folderIconSize || 64));
    
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