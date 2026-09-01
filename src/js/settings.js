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
    this.vis('quoteBox',          this.config.showQuote);

    // Folder cols CSS Variable ile çözüldü
    document.body.setAttribute('data-cols', this.config.folderColumns || 3); const grid = document.getElementById('shortcutsGrid'); if (grid) grid.setAttribute('data-cols', this.config.folderColumns || 3);
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

    // Sütun sayısı anlık önizleme
    if (colSelect) {
      colSelect.addEventListener('change', () => {
        document.body.setAttribute('data-cols', colSelect.value); const grid = document.getElementById('shortcutsGrid'); if (grid) grid.setAttribute('data-cols', colSelect.value);
      });
    }

    if (saveBtn) {
      saveBtn.addEventListener('click', async () => {
        this.config.theme         = document.getElementById('themeSelect').value;
        this.config.bgStyle       = document.getElementById('bgSelect').value;
        this.config.customBgUrl   = document.getElementById('customBgInput').value.trim();
        this.config.folderColumns = parseInt(document.getElementById('folderColumnsSelect').value) || 3;
        this.config.showClock     = document.getElementById('toggleClock').checked;
        this.config.showSeconds   = document.getElementById('toggleSeconds').checked;
        this.config.showGreeting  = document.getElementById('toggleGreeting').checked;
        this.config.showWeather   = document.getElementById('toggleWeather').checked;
        this.config.showFavBar    = document.getElementById('toggleFavBar').checked;
        this.config.showQuote     = document.getElementById('toggleQuote').checked;

        const ls = document.getElementById('langSelect');
        if (ls && ls.value !== I18n.currentLang) await I18n.setLanguage(ls.value);

        await Storage.set('app_settings', this.config);
        this.apply();
        modal.classList.remove('active');
        this.toast('✅ Ayarlar kaydedildi!');
        
        // Hava durumu modülünü yeni ayarlarla yenile
        const { Weather } = await import('./weather.js');
        Weather.fetchAndRender(true);
      });
    }
  },

  // === HAVA DURUMU CANLI ARAMA (AUTOCOMPLETE) ===
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
    t('toggleClock',          this.config.showClock);
    t('toggleSeconds',        this.config.showSeconds);
    t('toggleGreeting',       this.config.showGreeting);
    t('toggleWeather',        this.config.showWeather);
    t('toggleFavBar',         this.config.showFavBar);
    t('toggleQuote',          this.config.showQuote);
    
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