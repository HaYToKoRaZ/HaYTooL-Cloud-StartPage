/**
 * Cloud StartPage HaYTooL - Ayarlar Sayfası Mantığı
 */
import { Storage } from './storage.js';
import { I18n } from './i18n.js';
import { GistSync } from './gist-sync.js';

class SettingsPageController {
  constructor() {
    this.config = {
      theme: 'dark',
      customBgUrl: '',
      showClock: true,
      showSeconds: true,
      showGreeting: true,
      showWeather: true,
      showFavBar: true,
      showQuote: true,
      folderColumns: 6,
      folderIconSize: 32,
      showSearchBar: true,
      showTopLangSelector: true,
      showThemeBtn: true,
      timezone: 'auto',
      iconApi: 'iconhorse',
      showImportBtn: true,
      weatherCityObj: null
    };
  }

  async init() {
    await I18n.init();
    const saved = await Storage.get('app_settings', null);
    if (saved) this.config = { ...this.config, ...saved };

    this.applyTheme();
    this.setupTabs();
    this.populateForm();
    this.setupAutoSave();
    this.setupGist();
    this.setupWeatherAutocomplete();
    this.setupFileBackup();
    this.setupResetButtons();

    // Dil değişimi dinleyicisi
    window.addEventListener('langchange', () => {
      this.populateForm();
    });
  }

  applyTheme() {
    document.documentElement.setAttribute('data-theme', this.config.theme || 'dark');
    const THEME_BG = {
      dark: 'aurora',
      light: 'light',
      youtube: 'cyber',
      discord: 'nebula',
      matrix: 'matrix-bg'
    };
    document.body.className = 'settings-page-body bg-preset-' + (THEME_BG[this.config.theme] || 'aurora');
    const bg = document.getElementById('bgLayer');
    if (bg) {
      if (this.config.customBgUrl) {
        bg.style.backgroundImage = 'url("' + this.config.customBgUrl + '")';
        bg.style.opacity = '0.85';
      } else {
        bg.style.backgroundImage = 'none';
        bg.style.opacity = '';
      }
    }
  }

  setupTabs() {
    const navBtns = document.querySelectorAll('.settings-nav-btn');
    const panes = document.querySelectorAll('.settings-section-pane');

    navBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        const targetId = btn.getAttribute('data-target');
        navBtns.forEach(b => b.classList.remove('active'));
        panes.forEach(p => p.classList.remove('active'));

        btn.classList.add('active');
        document.getElementById(targetId)?.classList.add('active');
      });
    });

    // URL hash desteği (örn: settings.html#gist)
    if (window.location.hash) {
      const hash = window.location.hash.replace('#', '').toLowerCase();
      const targetBtn = Array.from(navBtns).find(b => b.getAttribute('data-target').toLowerCase().includes(hash));
      if (targetBtn) targetBtn.click();
    }
  }

  populateForm() {
    const f = (id, v) => { const el = document.getElementById(id); if (el) el.value = v; };
    const t = (id, v) => { const el = document.getElementById(id); if (el) el.checked = !!v; };

    f('themeSelect', this.config.theme);
    f('customBgInput', this.config.customBgUrl || '');
    f('timezoneSelect', this.config.timezone || 'auto');
    f('folderColumnsSelect', String(this.config.folderColumns || 6));
    f('iconSizeSelect', String(this.config.folderIconSize || 32));
    f('iconApiSelect', this.config.iconApi || 'iconhorse');
    f('linkTargetSelect', this.config.linkOpenTarget || 'same');

    t('toggleSearchBar', this.config.showSearchBar !== false);
    t('toggleTopLang', this.config.showTopLangSelector !== false);
    t('toggleThemeBtn', this.config.showThemeBtn !== false);
    t('toggleClock', this.config.showClock !== false);
    t('toggleSeconds', this.config.showSeconds !== false);
    t('toggleGreeting', this.config.showGreeting !== false);
    t('toggleWeather', this.config.showWeather !== false);
    t('toggleFavBar', this.config.showFavBar !== false);
    t('toggleImportBtn', this.config.showImportBtn !== false);

    const cityInput = document.getElementById('weatherCityInput');
    if (cityInput && this.config.weatherCityObj) {
      cityInput.value = this.config.weatherCityObj.name + (this.config.weatherCityObj.country ? ', ' + this.config.weatherCityObj.country : '');
    } else if (cityInput) {
      cityInput.value = '';
    }
  }

  setupAutoSave() {
    const saveHandler = async (e) => {
      if (e.target.tagName !== 'SELECT' && e.target.tagName !== 'INPUT') return;
      if (e.target.id === 'gistTokenInput' || e.target.id === 'gistIdInput' || e.target.id === 'weatherCityInput') return;

      this.config.theme = document.getElementById('themeSelect').value;
      this.config.customBgUrl = document.getElementById('customBgInput').value.trim();
      this.config.timezone = document.getElementById('timezoneSelect').value;
      this.config.folderColumns = parseInt(document.getElementById('folderColumnsSelect').value) || 6;
      this.config.folderIconSize = parseInt(document.getElementById('iconSizeSelect').value) || 32;
      this.config.iconApi = document.getElementById('iconApiSelect').value;
      this.config.linkOpenTarget = document.getElementById('linkTargetSelect')?.value || 'same';

      this.config.showSearchBar = document.getElementById('toggleSearchBar').checked;
      this.config.showTopLangSelector = document.getElementById('toggleTopLang').checked;
      this.config.showThemeBtn = document.getElementById('toggleThemeBtn').checked;
      this.config.showClock = document.getElementById('toggleClock').checked;
      this.config.showSeconds = document.getElementById('toggleSeconds').checked;
      this.config.showGreeting = document.getElementById('toggleGreeting').checked;
      this.config.showWeather = document.getElementById('toggleWeather').checked;
      this.config.showFavBar = document.getElementById('toggleFavBar').checked;
      this.config.showImportBtn = document.getElementById('toggleImportBtn').checked;

      await Storage.set('app_settings', this.config);
      this.applyTheme();
      this.toast(I18n.t('toast_saved', 'Ayarlar kaydedildi'));
    };

    document.querySelector('.settings-content-area')?.addEventListener('change', saveHandler);
    document.getElementById('customBgInput')?.addEventListener('blur', saveHandler);
  }

  async setupGist() {
    const connectedCard = document.getElementById('gistConnectedCard');
    const setupCard = document.getElementById('gistSetupCard');
    const avatarImg = document.getElementById('gistAccountAvatar');
    const nameEl = document.getElementById('gistAccountName');
    const loginEl = document.getElementById('gistAccountLogin');
    const emailEl = document.getElementById('gistAccountEmail');
    const disconnectBtn = document.getElementById('btnDisconnectGist');

    const tokenInp = document.getElementById('gistTokenInput');
    const gistIdInp = document.getElementById('gistIdInput');
    const saveBtn = document.getElementById('btnSaveGistConfig');
    const backupBtn = document.getElementById('btnBackupToGist');
    const restoreBtn = document.getElementById('btnRestoreFromGist');
    const lastBackupText = document.getElementById('gistLastBackupText');
    const autoBackupToggle = document.getElementById('toggleGistAutoBackup');

    const config = await GistSync.getConfig();

    if (autoBackupToggle) {
      autoBackupToggle.checked = config.autoBackup !== false;
      autoBackupToggle.addEventListener('change', async (e) => {
        await Storage.set(GistSync.AUTO_BACKUP_KEY, e.target.checked);
        this.toast(e.target.checked ? '✅ ' + I18n.t('gist_auto_backup_enabled', 'Günlük otomatik Gist yedeklemesi açıldı.') : 'ℹ️ ' + I18n.t('gist_auto_backup_disabled', 'Günlük otomatik Gist yedeklemesi kapatıldı.'));
      });
    }

    const updateProfileUI = (profile) => {
      if (profile && config.token) {
        if (connectedCard) connectedCard.style.display = 'block';
        if (setupCard) setupCard.style.display = 'none';
        if (avatarImg) avatarImg.src = profile.avatarUrl || 'https://github.githubassets.com/images/modules/logos_page/GitHub-Mark.png';
        if (nameEl) nameEl.textContent = profile.name || profile.login;
        if (loginEl) loginEl.textContent = '@' + profile.login;
        if (emailEl) emailEl.textContent = profile.email || '';
      } else {
        if (connectedCard) connectedCard.style.display = 'none';
        if (setupCard) setupCard.style.display = 'block';
      }
    };

    if (tokenInp) tokenInp.value = config.token || '';
    if (gistIdInp) gistIdInp.value = config.gistId || '';
    if (lastBackupText && config.lastBackup) {
      lastBackupText.textContent = new Date(config.lastBackup).toLocaleString();
    }

    // Başlangıçta profil durumunu kontrol et
    if (config.token) {
      if (config.userProfile) {
        updateProfileUI(config.userProfile);
      } else {
        GistSync.fetchUserProfile(config.token)
          .then(p => { config.userProfile = p; updateProfileUI(p); })
          .catch(() => updateProfileUI(null));
      }
    } else {
      updateProfileUI(null);
    }

    if (saveBtn) {
      saveBtn.addEventListener('click', async () => {
        const token = tokenInp.value.trim();
        const gistId = gistIdInp.value.trim();

        if (!token) {
          alert(I18n.t('gist_error_missing_token', 'Lütfen önce geçerli bir GitHub Token girin.'));
          return;
        }

        saveBtn.disabled = true;
        saveBtn.textContent = I18n.t('gist_btn_verifying', 'Doğrulanıyor...');

        try {
          const profile = await GistSync.fetchUserProfile(token);
          await GistSync.saveConfig(token, gistId);
          config.token = token;
          config.gistId = gistId;
          config.userProfile = profile;
          updateProfileUI(profile);
          this.toast('✅ ' + I18n.t('gist_auth_success', 'GitHub hesabı başarıyla doğrulandı ve bağlandı!'));
        } catch (err) {
          alert('Hata: ' + (err.message === 'INVALID_TOKEN' ? I18n.t('gist_error_invalid_token') : err.message));
        } finally {
          saveBtn.disabled = false;
          saveBtn.textContent = I18n.t('gist_btn_save_token', 'Bilgileri Doğrula & Kaydet');
        }
      });
    }

    if (disconnectBtn) {
      disconnectBtn.addEventListener('click', async () => {
        if (!confirm(I18n.t('gist_confirm_disconnect', 'GitHub bağlantısını kesmek istediğinize emin misiniz?'))) {
          return;
        }
        await GistSync.deleteConfig();
        config.token = '';
        config.gistId = '';
        config.userProfile = null;
        if (tokenInp) tokenInp.value = '';
        if (gistIdInp) gistIdInp.value = '';
        updateProfileUI(null);
        this.toast(I18n.t('gist_disconnected', 'GitHub bağlantısı kesildi.'));
      });
    }

    if (backupBtn) {
      backupBtn.addEventListener('click', async () => {
        const { token } = await GistSync.getConfig();
        if (!token) {
          alert(I18n.t('gist_error_missing_token', 'Lütfen önce geçerli bir GitHub Token girin.'));
          return;
        }

        backupBtn.disabled = true;
        backupBtn.innerHTML = '<span>⏳</span> <span>' + I18n.t('gist_btn_backing_up', 'Yedekleniyor...') + '</span>';

        try {
          const res = await GistSync.backupToGist();
          if (gistIdInp) gistIdInp.value = res.gistId;
          if (lastBackupText) lastBackupText.textContent = new Date(res.lastBackup).toLocaleString();
          this.toast('✅ ' + I18n.t('gist_backup_success', 'Tüm verileriniz GitHub Gist\'e başarıyla yüklendi!'));
        } catch (err) {
          alert('Yedekleme hatası: ' + (err.message === 'INVALID_TOKEN' ? I18n.t('gist_error_invalid_token') : err.message));
        } finally {
          backupBtn.disabled = false;
          backupBtn.innerHTML = '<span>📤</span> <span>' + I18n.t('gist_btn_backup', 'GitHub Gist\'e Yedekle') + '</span>';
        }
      });
    }

    // "Token Oluştur" butonuna dinamik tarih, saat, dakika, saniye ekle (çakışmaları engellemek için)
    const linkCreateToken = document.getElementById('linkCreateToken');
    if (linkCreateToken) {
      const now = new Date();
      const pad = (n) => String(n).padStart(2, '0');
      const timeStr = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}_${pad(now.getHours())}-${pad(now.getMinutes())}-${pad(now.getSeconds())}`;
      const tokenDesc = encodeURIComponent(`Cloud-StartPage-HaYTooL-${timeStr}`);
      linkCreateToken.href = `https://github.com/settings/tokens/new?scopes=gist&description=${tokenDesc}`;
    }

    if (restoreBtn) {
      restoreBtn.addEventListener('click', async () => {
        const { token } = await GistSync.getConfig();

        if (!token) {
          alert(I18n.t('gist_error_missing_token', 'Lütfen önce geçerli bir GitHub Token girin.'));
          return;
        }

        if (!confirm(I18n.t('gist_confirm_restore', 'Mevcut yerel verilerinizin üzerine Gist\'teki yedek yazılacak. Devam etmek istiyor musunuz?'))) {
          return;
        }

        restoreBtn.disabled = true;
        restoreBtn.innerHTML = '<span>⏳</span> <span>' + I18n.t('gist_btn_restoring', 'Geri yükleniyor...') + '</span>';

        try {
          const res = await GistSync.restoreFromGist();
          if (gistIdInp && res.gistId) gistIdInp.value = res.gistId;
          this.toast('✅ ' + I18n.t('gist_restore_success', 'Veriler geri yüklendi!'));
          setTimeout(() => window.location.reload(), 1200);
        } catch (err) {
          const msg = err.message === 'MISSING_GIST_ID' 
            ? I18n.t('gist_error_no_backup_found', 'Hesabınızda Cloud StartPage yedeği bulunamadı. Lütfen önce bir yedek alın veya Gist ID girin.')
            : (err.message === 'INVALID_TOKEN' ? I18n.t('gist_error_invalid_token') : err.message);
          alert('Geri yükleme hatası: ' + msg);
          restoreBtn.disabled = false;
          restoreBtn.innerHTML = '<span>📥</span> <span>' + I18n.t('gist_btn_restore', 'Son Yedeği Yükle') + '</span>';
        }
      });
    }

    // --- Gist Zaman Tüneli / Geçmiş Sürümler Paneli ---
    const historyBtn = document.getElementById('btnShowGistHistory');
    const historyContainer = document.getElementById('gistHistoryContainer');
    const historyList = document.getElementById('gistHistoryList');
    const closeHistoryBtn = document.getElementById('btnCloseGistHistory');

    if (closeHistoryBtn && historyContainer) {
      closeHistoryBtn.addEventListener('click', () => {
        historyContainer.style.display = 'none';
      });
    }

    if (historyBtn && historyContainer && historyList) {
      historyBtn.addEventListener('click', async () => {
        const { token } = await GistSync.getConfig();
        if (!token) {
          alert(I18n.t('gist_error_missing_token', 'Lütfen önce geçerli bir GitHub Token girin.'));
          return;
        }

        if (historyContainer.style.display === 'block') {
          historyContainer.style.display = 'none';
          return;
        }

        historyContainer.style.display = 'block';
        historyList.innerHTML = `<div style="padding:1rem; text-align:center; color:var(--text-dim); font-size:0.85rem;">⏳ ${I18n.t('gist_loading_history', 'Yedek geçmişi yükleniyor...')}</div>`;

        try {
          const commits = await GistSync.fetchHistory();
          if (!commits || commits.length === 0) {
            historyList.innerHTML = `<div style="padding:1rem; text-align:center; color:var(--text-dim); font-size:0.85rem;">${I18n.t('gist_no_history', 'Geçmiş yedek kaydı bulunamadı.')}</div>`;
            return;
          }

          historyList.innerHTML = '';
          commits.forEach((c, idx) => {
            const dateObj = new Date(c.committedAt);
            const dateStr = dateObj.toLocaleDateString() + ' ' + dateObj.toLocaleTimeString();
            const isLatest = idx === 0;

            const item = document.createElement('div');
            item.className = 'gist-history-item';
            item.innerHTML = `
              <div class="gist-history-info">
                <div class="gist-history-date">
                  ${isLatest ? '⭐ ' : '🕒 '} ${dateStr} ${isLatest ? '<span style="color:#38bdf8; font-size:0.75rem; font-weight:normal;">(' + I18n.t('gist_badge_latest', 'En Son') + ')</span>' : ''}
                </div>
                <div class="gist-history-meta">Commit: ${c.version.substring(0, 7)}</div>
              </div>
              <button type="button" class="btn-restore-version" data-sha="${c.version}">
                ${I18n.t('gist_btn_restore_this', 'Bu Sürüme Dön')}
              </button>
            `;

            const restoreVerBtn = item.querySelector('.btn-restore-version');
            restoreVerBtn.addEventListener('click', async () => {
              const confirmMsg = I18n.t('gist_confirm_restore_version', 'Seçtiğiniz tarihteki ({date}) yedeğe geri dönmek istiyor musunuz? Mevcut yerel verilerinizin üzerine yazılacaktır.').replace('{date}', dateStr);
              if (!confirm(confirmMsg)) return;

              restoreVerBtn.disabled = true;
              restoreVerBtn.textContent = '⏳ ...';

              try {
                await GistSync.restoreFromGist(c.version);
                this.toast('✅ ' + I18n.t('gist_restore_success', 'Veriler geri yüklendi!'));
                setTimeout(() => window.location.reload(), 1200);
              } catch (err) {
                alert('Geri yükleme hatası: ' + err.message);
                restoreVerBtn.disabled = false;
                restoreVerBtn.textContent = I18n.t('gist_btn_restore_this', 'Bu Sürüme Dön');
              }
            });

            historyList.appendChild(item);
          });
        } catch (err) {
          historyList.innerHTML = `<div style="padding:1rem; text-align:center; color:var(--accent-rose); font-size:0.85rem;">Hata: ${err.message}</div>`;
        }
      });
    }
  }

  setupWeatherAutocomplete() {
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
      dropdown.innerHTML = '<div class="city-dropdown-msg">' + I18n.t('weather_searching', '⏳ Aranıyor...') + '</div>';
      dropdown.style.display = 'flex';

      timer = setTimeout(async () => {
        try {
          const res = await fetch('https://geocoding-api.open-meteo.com/v1/search?name=' + encodeURIComponent(val) + '&count=5&language=tr&format=json');
          const data = await res.json();
          dropdown.innerHTML = '';

          if (!data.results || data.results.length === 0) {
            dropdown.innerHTML = '<div class="city-dropdown-msg">' + I18n.t('weather_no_results', 'Sonuç bulunamadı') + '</div>';
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
              this.toast(I18n.t('toast_saved', 'Şehir kaydedildi'));
            });
            dropdown.appendChild(item);
          });
        } catch (e) {
          dropdown.innerHTML = '<div class="city-dropdown-msg">' + I18n.t('weather_connection_error', 'Bağlantı hatası') + '</div>';
        }
      }, 400);
    });

    if (clearBtn) {
      clearBtn.addEventListener('click', async () => {
        input.value = '';
        this.config.weatherCityObj = null;
        dropdown.style.display = 'none';
        await Storage.set('app_settings', this.config);
        await Storage.remove('weather_cache');
        this.toast(I18n.t('toast_saved', 'Varsayılan GPS moduna dönüldü'));
      });
    }

    document.addEventListener('click', (e) => {
      if (!input.contains(e.target) && !dropdown.contains(e.target)) {
        dropdown.style.display = 'none';
      }
    });
  }

  setupFileBackup() {
    const expBtn = document.getElementById('exportDataBtn');
    const impInp = document.getElementById('importDataInput');
    const expHtmlBtn = document.getElementById('exportHtmlBtn');

    if (expBtn) {
      expBtn.addEventListener('click', async () => {
        const allData = await Storage.getAll();
        const sensitiveKeys = ['gist_token', 'gist_id', 'gist_user_profile', 'gist_last_backup', '_last_local_update'];
        const exportData = {};
        for (const [k, v] of Object.entries(allData)) {
          if (!sensitiveKeys.includes(k)) {
            exportData[k] = v;
          }
        }
        const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'cloud_startpage_backup_' + new Date().toISOString().slice(0, 10) + '.json';
        a.click();
        URL.revokeObjectURL(url);
        this.toast(I18n.t('toast_backup_downloaded', 'Yedek indirildi'));
      });
    }

    if (impInp) {
      impInp.addEventListener('change', async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = async (ev) => {
          try {
            const data = JSON.parse(ev.target.result);
            if (!data || typeof data !== 'object') throw new Error('Geçersiz JSON');
            const protectedKeys = ['gist_token', 'gist_id', 'gist_user_profile', 'gist_last_backup', '_last_local_update'];
            for (const [key, val] of Object.entries(data)) {
              if (protectedKeys.includes(key)) continue;
              await Storage.set(key, val);
            }
            this.toast(I18n.t('toast_backup_uploaded', 'Yedek yüklendi! Sayfa yenileniyor...'));
            setTimeout(() => window.location.reload(), 1200);
          } catch (err) {
            alert('Hata: ' + err.message);
          }
          impInp.value = '';
        };
        reader.readAsText(file);
      });
    }

    if (expHtmlBtn) {
      expHtmlBtn.addEventListener('click', async () => {
        const favs = await Storage.get('favorites_bar', []);
        const cats = await Storage.get('shortcut_categories', []);
        const items = await Storage.get('shortcuts_v2', []);

        let html = '<!DOCTYPE NETSCAPE-Bookmark-file-1>\n' +
                   '<!-- This is an automatically generated file. It will be read and overwritten. Do Not Edit! -->\n' +
                   '<META HTTP-EQUIV="Content-Type" CONTENT="text/html; charset=UTF-8">\n' +
                   '<TITLE>Bookmarks</TITLE>\n<H1>Bookmarks</H1>\n<DL><p>\n';

        if (favs && favs.length > 0) {
          html += '    <DT><H3 ADD_DATE="' + Math.floor(Date.now() / 1000) + '">Favorites Bar</H3>\n    <DL><p>\n';
          favs.forEach(f => {
            const title = (f.title || f.url || '').replace(/</g, '&lt;').replace(/>/g, '&gt;');
            html += '        <DT><A HREF="' + f.url + '" ADD_DATE="' + Math.floor(Date.now() / 1000) + '">' + title + '</A>\n';
          });
          html += '    </DL><p>\n';
        }

        const categorizedItemIds = new Set();
        if (cats && cats.length > 0) {
          cats.forEach(c => {
            const cItems = items.filter(i => i.categoryId === c.id);
            if (cItems.length > 0) {
              const catName = (c.name || 'Folder').replace(/</g, '&lt;').replace(/>/g, '&gt;');
              html += '    <DT><H3 ADD_DATE="' + Math.floor(Date.now() / 1000) + '">' + catName + '</H3>\n    <DL><p>\n';
              cItems.forEach(i => {
                categorizedItemIds.add(i.id);
                const title = (i.title || i.url || '').replace(/</g, '&lt;').replace(/>/g, '&gt;');
                html += '        <DT><A HREF="' + i.url + '" ADD_DATE="' + Math.floor(Date.now() / 1000) + '">' + title + '</A>\n';
              });
              html += '    </DL><p>\n';
            }
          });
        }

        // Kategorisi olmayan veya kategorisi silinmiş diğer linkler
        const otherItems = items.filter(i => !categorizedItemIds.has(i.id));
        if (otherItems.length > 0) {
          html += '    <DT><H3 ADD_DATE="' + Math.floor(Date.now() / 1000) + '">Other Bookmarks</H3>\n    <DL><p>\n';
          otherItems.forEach(i => {
            const title = (i.title || i.url || '').replace(/</g, '&lt;').replace(/>/g, '&gt;');
            html += '        <DT><A HREF="' + i.url + '" ADD_DATE="' + Math.floor(Date.now() / 1000) + '">' + title + '</A>\n';
          });
          html += '    </DL><p>\n';
        }

        html += '</DL><p>\n';

        const blob = new Blob([html], { type: 'text/html' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'bookmarks_' + new Date().toISOString().slice(0, 10) + '.html';
        a.click();
        URL.revokeObjectURL(url);
        this.toast(I18n.t('toast_backup_downloaded', 'Yer imleri HTML olarak indirildi'));
      });
    }
  }

  setupResetButtons() {
    const delLinksBtn = document.getElementById('deleteAllLinksBtn');
    if (delLinksBtn) {
      delLinksBtn.addEventListener('click', async () => {
        const confirmWord = I18n.t('delete_all_links_confirm_word', 'SİL');
        const promptMsg = I18n.t('delete_all_links_prompt', 'Tüm linkleri silmek üzeresiniz. Onaylamak için lütfen şunu yazın: ') + confirmWord;
        const userInput = prompt(promptMsg);
        if (userInput && userInput.trim() === confirmWord) {
          await Storage.set('shortcuts_v2', []);
          await Storage.set('shortcut_categories', []);
          await Storage.set('favorites_bar', []);
          this.toast(I18n.t('toast_links_deleted', 'Tüm linkler silindi.'));
          setTimeout(() => window.location.reload(), 1200);
        }
      });
    }

    const resetBtn = document.getElementById('resetSettingsBtn');
    if (resetBtn) {
      resetBtn.addEventListener('click', async () => {
        if (confirm(I18n.t('confirm_reset_all', 'TÜM verileriniz silinecek. Fabrika ayarlarına dönmek istediğinize emin misiniz?'))) {
          if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
            await chrome.storage.local.clear();
          }
          localStorage.clear();
          window.location.reload();
        }
      });
    }
  }

  toast(msg) {
    const t = document.getElementById('toast');
    if (!t) return;
    t.textContent = msg;
    t.classList.add('show');
    setTimeout(() => t.classList.remove('show'), 3000);
  }
}

document.addEventListener('DOMContentLoaded', () => {
  const page = new SettingsPageController();
  page.init();
});
