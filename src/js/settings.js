import { Storage } from './storage.js';
import { I18n } from './i18n.js';

export const Settings = {
  config: {
    theme: 'dark', bgStyle: 'aurora', customBgUrl: '',
    showClock: true, showSeconds: true, showGreeting: true,
    showWeather: true, showFavBar: true, showQuote: true,
    folderColumns: 3,     // 1 | 2 | 3 | 4
    weatherCity: ''       // '' = GPS otomatik
  },

  async init() {
    const saved = await Storage.get('app_settings', {});
    this.config = { ...this.config, ...saved };
    this.apply();
    this.setupListeners();
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
        document.body.classList.add('bg-preset-' + this.config.bgStyle);
      }
    }

    // Widget görünürlükleri
    this.vis('headerClockWidget', this.config.showClock);
    this.vis('digitalSeconds',    this.config.showSeconds);
    this.vis('greetingText',      this.config.showGreeting);
    this.vis('weatherBadge',      this.config.showWeather);
    this.vis('favBarSection',     this.config.showFavBar);
    this.vis('quoteBox',          this.config.showQuote);

    // Klasör sütun sayısı
    const grid = document.getElementById('shortcutsGrid');
    if (grid) {
      const cols = this.config.folderColumns || 3;
      grid.style.gridTemplateColumns = 'repeat(' + cols + ', 1fr)';
    }
  },

  vis(id, show) {
    const el = document.getElementById(id);
    if (el) el.style.display = show ? '' : 'none';
  },

  setupListeners() {
    const modal       = document.getElementById('settingsModal');
    const openBtn     = document.getElementById('settingsBtn');
    const closeBtn    = document.getElementById('closeSettingsModal');
    const saveBtn     = document.getElementById('saveSettingsBtn');
    const exportBtn   = document.getElementById('exportDataBtn');
    const importInput = document.getElementById('importDataInput');
    const resetBtn    = document.getElementById('resetSettingsBtn');
    const testWeatherBtn = document.getElementById('testWeatherCityBtn');

    if (openBtn)  openBtn.addEventListener('click', () => { this.populate(); modal.classList.add('active'); });
    if (closeBtn) closeBtn.addEventListener('click', () => modal.classList.remove('active'));
    if (modal)    modal.addEventListener('click', e => { if (e.target === modal) modal.classList.remove('active'); });

    const themeSelect = document.getElementById('themeSelect');
    if (themeSelect) themeSelect.addEventListener('change', () =>
      document.documentElement.setAttribute('data-theme', themeSelect.value));

    // Sütun sayısı önizleme - anlık
    const colSelect = document.getElementById('folderColumnsSelect');
    if (colSelect) {
      colSelect.addEventListener('change', () => {
        const grid = document.getElementById('shortcutsGrid');
        if (grid) grid.style.gridTemplateColumns = 'repeat(' + colSelect.value + ', 1fr)';
      });
    }

    // Hava durumu şehri test
    if (testWeatherBtn) {
      testWeatherBtn.addEventListener('click', async () => {
        const cityInput = document.getElementById('weatherCityInput');
        const city = cityInput ? cityInput.value.trim() : '';
        testWeatherBtn.textContent = '⏳';
        testWeatherBtn.disabled = true;
        if (city) {
          await Storage.set('weather_city', city);
          await Storage.remove('weather_cache');
        } else {
          await Storage.set('weather_city', '');
          await Storage.remove('weather_cache');
        }
        // Weather modülünü yenile
        const { Weather } = await import('./weather.js');
        await Weather.fetchAndRender(true);
        testWeatherBtn.textContent = '✓';
        setTimeout(() => { testWeatherBtn.textContent = '🔍'; testWeatherBtn.disabled = false; }, 2000);
      });
    }

    if (saveBtn) {
      saveBtn.addEventListener('click', async () => {
        const ls = document.getElementById('langSelect');
        const cityInput = document.getElementById('weatherCityInput');

        this.config.theme         = document.getElementById('themeSelect').value;
        this.config.bgStyle       = document.getElementById('bgSelect').value;
        this.config.customBgUrl   = document.getElementById('customBgInput').value.trim();
        this.config.folderColumns = parseInt(document.getElementById('folderColumnsSelect').value) || 3;
        this.config.weatherCity   = cityInput ? cityInput.value.trim() : '';
        this.config.showClock     = document.getElementById('toggleClock').checked;
        this.config.showSeconds   = document.getElementById('toggleSeconds').checked;
        this.config.showGreeting  = document.getElementById('toggleGreeting').checked;
        this.config.showWeather   = document.getElementById('toggleWeather').checked;
        this.config.showFavBar    = document.getElementById('toggleFavBar').checked;
        this.config.showQuote     = document.getElementById('toggleQuote').checked;

        if (ls && ls.value !== I18n.currentLang) await I18n.setLanguage(ls.value);

        // Şehir değiştiyse cache sıfırla
        const prevCity = await Storage.get('weather_city', '');
        if (prevCity !== this.config.weatherCity) await Storage.remove('weather_cache');

        await Storage.set('weather_city', this.config.weatherCity);
        await Storage.set('app_settings', this.config);
        this.apply();
        modal.classList.remove('active');
        this.toast('✅ Ayarlar kaydedildi!');
      });
    }

    if (exportBtn) {
      exportBtn.addEventListener('click', async () => {
        const data = await Storage.getAll();
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url  = URL.createObjectURL(blob);
        const a    = document.createElement('a');
        a.href = url; a.download = 'haytool_backup_' + Date.now() + '.json'; a.click();
        URL.revokeObjectURL(url);
      });
    }

    if (importInput) {
      importInput.addEventListener('change', e => {
        const file = e.target.files[0]; if (!file) return;
        const r = new FileReader();
        r.onload = async ev => {
          try {
            const d = JSON.parse(ev.target.result);
            for (const [k, v] of Object.entries(d)) await Storage.set(k, v);
            this.toast('✅ Veriler yüklendi!');
            setTimeout(() => window.location.reload(), 1200);
          } catch { alert('Hatalı JSON dosyası!'); }
        };
        r.readAsText(file);
      });
    }

    if (resetBtn) {
      resetBtn.addEventListener('click', async () => {
        if (!confirm('Tüm veriler silinecek. Emin misiniz?')) return;
        const keys = ['app_settings','shortcuts_v2','shortcut_categories','collapsed_folders',
                      'folder_views','favorites_bar','weather_city','weather_cache'];
        for (const k of keys) await Storage.remove(k);
        window.location.reload();
      });
    }
  },

  populate() {
    const f = (id, v) => { const el = document.getElementById(id); if (el) el.value = v; };
    const t = (id, v) => { const el = document.getElementById(id); if (el) el.checked = !!v; };
    f('themeSelect',          this.config.theme);
    f('bgSelect',             this.config.bgStyle);
    f('customBgInput',        this.config.customBgUrl);
    f('langSelect',           I18n.currentLang);
    f('folderColumnsSelect',  String(this.config.folderColumns || 3));
    f('weatherCityInput',     this.config.weatherCity || '');
    t('toggleClock',          this.config.showClock);
    t('toggleSeconds',        this.config.showSeconds);
    t('toggleGreeting',       this.config.showGreeting);
    t('toggleWeather',        this.config.showWeather);
    t('toggleFavBar',         this.config.showFavBar);
    t('toggleQuote',          this.config.showQuote);
  },

  toast(msg) {
    const t = document.getElementById('toast');
    if (!t) return; t.textContent = msg; t.classList.add('show');
    setTimeout(() => t.classList.remove('show'), 3000);
  }
};