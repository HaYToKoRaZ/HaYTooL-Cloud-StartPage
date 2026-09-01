import { Storage } from './storage.js';
import { I18n } from './i18n.js';

/**
 * HaYTooL Cloud StartPage - Settings & Customization Controller
 */
export const Settings = {
  config: {
    theme: 'dark',
    bgStyle: 'aurora',
    customBgUrl: '',
    showClock: true,
    showSeconds: true,
    showGreeting: true,
    showWeather: true,
    showSearch: true,
    showShortcuts: true,
    showNotes: true,
    showQuote: true
  },

  async init() {
    const saved = await Storage.get('app_settings', {});
    this.config = { ...this.config, ...saved };
    this.applySettings();
    this.setupListeners();
  },

  applySettings() {
    // Apply Theme
    document.documentElement.setAttribute('data-theme', this.config.theme);

    // Apply Background
    document.body.className = '';
    const bgLayer = document.getElementById('bgLayer');
    if (bgLayer) {
      if (this.config.customBgUrl) {
        bgLayer.style.backgroundImage = 'url("' + this.config.customBgUrl + '")';
        bgLayer.style.opacity = '0.9';
      } else {
        bgLayer.style.backgroundImage = 'none';
        document.body.classList.add('bg-preset-' + this.config.bgStyle);
      }
    }

    // Toggle widgets visibility
    this.setWidgetVisible('heroClock', this.config.showClock);
    this.setWidgetVisible('digitalSeconds', this.config.showSeconds);
    this.setWidgetVisible('greetingText', this.config.showGreeting);
    this.setWidgetVisible('weatherBadge', this.config.showWeather);
    this.setWidgetVisible('searchWrapper', this.config.showSearch);
    this.setWidgetVisible('shortcutsSection', this.config.showShortcuts);
    this.setWidgetVisible('notesToggleBtn', this.config.showNotes);
    this.setWidgetVisible('quoteBox', this.config.showQuote);
  },

  setWidgetVisible(id, isVisible) {
    const el = document.getElementById(id);
    if (el) el.style.display = isVisible ? '' : 'none';
  },

  setupListeners() {
    const modal = document.getElementById('settingsModal');
    const openBtn = document.getElementById('settingsBtn');
    const closeBtn = document.getElementById('closeSettingsModal');
    const saveBtn = document.getElementById('saveSettingsBtn');
    const themeSelect = document.getElementById('themeSelect');
    const bgSelect = document.getElementById('bgSelect');
    const customBgInput = document.getElementById('customBgInput');
    const langSelect = document.getElementById('langSelect');
    const exportBtn = document.getElementById('exportDataBtn');
    const importInput = document.getElementById('importDataInput');
    const resetBtn = document.getElementById('resetSettingsBtn');

    if (openBtn && modal) {
      openBtn.addEventListener('click', () => {
        this.populateForm();
        modal.classList.add('active');
      });
    }

    if (closeBtn && modal) {
      closeBtn.addEventListener('click', () => modal.classList.remove('active'));
    }

    if (modal) {
      modal.addEventListener('click', (e) => {
        if (e.target === modal) modal.classList.remove('active');
      });
    }

    if (themeSelect) {
      themeSelect.addEventListener('change', () => {
        document.documentElement.setAttribute('data-theme', themeSelect.value);
      });
    }

    if (saveBtn) {
      saveBtn.addEventListener('click', async () => {
        this.config.theme = themeSelect.value;
        this.config.bgStyle = bgSelect.value;
        this.config.customBgUrl = customBgInput.value.trim();

        this.config.showClock = document.getElementById('toggleClock').checked;
        this.config.showSeconds = document.getElementById('toggleSeconds').checked;
        this.config.showGreeting = document.getElementById('toggleGreeting').checked;
        this.config.showWeather = document.getElementById('toggleWeather').checked;
        this.config.showSearch = document.getElementById('toggleSearch').checked;
        this.config.showShortcuts = document.getElementById('toggleShortcuts').checked;
        this.config.showNotes = document.getElementById('toggleNotes').checked;
        this.config.showQuote = document.getElementById('toggleQuote').checked;

        if (langSelect && langSelect.value !== I18n.currentLang) {
          await I18n.setLanguage(langSelect.value);
        }

        await Storage.set('app_settings', this.config);
        this.applySettings();
        modal.classList.remove('active');
        this.showToast(I18n.t('toast_saved', 'Ayarlar kaydedildi!'));
      });
    }

    // Export JSON
    if (exportBtn) {
      exportBtn.addEventListener('click', async () => {
        const allData = await Storage.getAll();
        const blob = new Blob([JSON.stringify(allData, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'haytool_startpage_backup_' + Date.now() + '.json';
        a.click();
        URL.revokeObjectURL(url);
      });
    }

    // Import JSON
    if (importInput) {
      importInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = async (event) => {
          try {
            const data = JSON.parse(event.target.result);
            for (const [k, v] of Object.entries(data)) {
              await Storage.set(k, v);
            }
            this.showToast(I18n.t('toast_imported', 'Veriler yüklendi!'));
            setTimeout(() => window.location.reload(), 1000);
          } catch (err) {
            alert('Hatalı JSON dosyası!');
          }
        };
        reader.readAsText(file);
      });
    }

    // Reset
    if (resetBtn) {
      resetBtn.addEventListener('click', async () => {
        if (confirm(I18n.t('reset_confirm', 'Tüm ayarlar sıfırlanacak. Emin misiniz?'))) {
          await Storage.remove('app_settings');
          await Storage.remove('shortcuts');
          await Storage.remove('quick_notes');
          await Storage.remove('todos_list');
          window.location.reload();
        }
      });
    }
  },

  populateForm() {
    const themeSelect = document.getElementById('themeSelect');
    const bgSelect = document.getElementById('bgSelect');
    const customBgInput = document.getElementById('customBgInput');
    const langSelect = document.getElementById('langSelect');

    if (themeSelect) themeSelect.value = this.config.theme;
    if (bgSelect) bgSelect.value = this.config.bgStyle;
    if (customBgInput) customBgInput.value = this.config.customBgUrl;
    if (langSelect) langSelect.value = I18n.currentLang;

    this.setToggle('toggleClock', this.config.showClock);
    this.setToggle('toggleSeconds', this.config.showSeconds);
    this.setToggle('toggleGreeting', this.config.showGreeting);
    this.setToggle('toggleWeather', this.config.showWeather);
    this.setToggle('toggleSearch', this.config.showSearch);
    this.setToggle('toggleShortcuts', this.config.showShortcuts);
    this.setToggle('toggleNotes', this.config.showNotes);
    this.setToggle('toggleQuote', this.config.showQuote);
  },

  setToggle(id, val) {
    const el = document.getElementById(id);
    if (el) el.checked = !!val;
  },

  showToast(msg) {
    const toast = document.getElementById('toast');
    if (!toast) return;
    toast.textContent = msg;
    toast.classList.add('show');
    setTimeout(() => toast.classList.remove('show'), 3000);
  }
};