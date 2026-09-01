import { Storage } from './storage.js';
import { I18n } from './i18n.js';

/**
 * HaYTooL Cloud StartPage - Ayarlar & Özelleştirme v1.3.0
 */
export const Settings = {
  config: {
    theme: 'dark', bgStyle: 'aurora', customBgUrl: '',
    showClock: true, showSeconds: true, showGreeting: true,
    showWeather: true, showQuote: true
  },

  async init() {
    const saved = await Storage.get('app_settings', {});
    this.config = { ...this.config, ...saved };
    this.applySettings();
    this.setupListeners();
  },

  applySettings() {
    document.documentElement.setAttribute('data-theme', this.config.theme);
    document.body.className = '';
    const bgLayer = document.getElementById('bgLayer');
    if (bgLayer) {
      if (this.config.customBgUrl) {
        bgLayer.style.backgroundImage = 'url("' + this.config.customBgUrl + '")';
        bgLayer.style.opacity = '0.85';
      } else {
        bgLayer.style.backgroundImage = 'none';
        document.body.classList.add('bg-preset-' + this.config.bgStyle);
      }
    }
    this.vis('headerClockWidget', this.config.showClock);
    this.vis('digitalSeconds',    this.config.showSeconds);
    this.vis('greetingText',      this.config.showGreeting);
    this.vis('weatherBadge',      this.config.showWeather);
    this.vis('quoteBox',          this.config.showQuote);
  },

  vis(id, show) { const el = document.getElementById(id); if (el) el.style.display = show ? '' : 'none'; },

  setupListeners() {
    const modal       = document.getElementById('settingsModal');
    const openBtn     = document.getElementById('settingsBtn');
    const closeBtn    = document.getElementById('closeSettingsModal');
    const saveBtn     = document.getElementById('saveSettingsBtn');
    const themeSelect = document.getElementById('themeSelect');
    const bgSelect    = document.getElementById('bgSelect');
    const customBg    = document.getElementById('customBgInput');
    const langSelect  = document.getElementById('langSelect');
    const exportBtn   = document.getElementById('exportDataBtn');
    const importInput = document.getElementById('importDataInput');
    const resetBtn    = document.getElementById('resetSettingsBtn');

    if (openBtn)  openBtn.addEventListener('click', () => { this.populateForm(); modal.classList.add('active'); });
    if (closeBtn) closeBtn.addEventListener('click', () => modal.classList.remove('active'));
    if (modal)    modal.addEventListener('click', e => { if (e.target === modal) modal.classList.remove('active'); });
    if (themeSelect) themeSelect.addEventListener('change', () => document.documentElement.setAttribute('data-theme', themeSelect.value));

    if (saveBtn) {
      saveBtn.addEventListener('click', async () => {
        this.config.theme        = themeSelect.value;
        this.config.bgStyle      = bgSelect.value;
        this.config.customBgUrl  = customBg.value.trim();
        this.config.showClock    = document.getElementById('toggleClock').checked;
        this.config.showSeconds  = document.getElementById('toggleSeconds').checked;
        this.config.showGreeting = document.getElementById('toggleGreeting').checked;
        this.config.showWeather  = document.getElementById('toggleWeather').checked;
        this.config.showQuote    = document.getElementById('toggleQuote').checked;
        if (langSelect && langSelect.value !== I18n.currentLang) await I18n.setLanguage(langSelect.value);
        await Storage.set('app_settings', this.config);
        this.applySettings();
        modal.classList.remove('active');
        this.toast('✅ Ayarlar kaydedildi!');
      });
    }

    if (exportBtn) {
      exportBtn.addEventListener('click', async () => {
        const data = await Storage.getAll();
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url  = URL.createObjectURL(blob);
        const a    = document.createElement('a'); a.href = url;
        a.download = 'haytool_backup_' + Date.now() + '.json'; a.click();
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
        await Storage.remove('app_settings');
        await Storage.remove('shortcuts_v2');
        await Storage.remove('shortcut_categories');
        await Storage.remove('collapsed_folders');
        window.location.reload();
      });
    }
  },

  populateForm() {
    const f = (id, v) => { const el = document.getElementById(id); if (el) el.value = v; };
    const t = (id, v) => { const el = document.getElementById(id); if (el) el.checked = !!v; };
    f('themeSelect',   this.config.theme);
    f('bgSelect',      this.config.bgStyle);
    f('customBgInput', this.config.customBgUrl);
    f('langSelect',    I18n.currentLang);
    t('toggleClock',    this.config.showClock);
    t('toggleSeconds',  this.config.showSeconds);
    t('toggleGreeting', this.config.showGreeting);
    t('toggleWeather',  this.config.showWeather);
    t('toggleQuote',    this.config.showQuote);
  },

  toast(msg) {
    const t = document.getElementById('toast');
    if (!t) return; t.textContent = msg; t.classList.add('show');
    setTimeout(() => t.classList.remove('show'), 3000);
  }
};