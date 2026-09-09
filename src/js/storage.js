export const SYNCABLE_KEYS = [
  'app_settings',
  'shortcut_categories',
  'shortcuts_v2',
  'favorites_bar',
  'collapsed_folders',
  'folder_views',
  'fav_bar_view',
  'show_hidden_folders',
  'search_engine',
  'lang',
  'gist_token',
  'gist_id',
  'gist_last_backup',
  'is_first_run_v3',
  'is_fav_first_run_v3'
];

export const Storage = {
  async get(key, defaultValue = null) {
    try {
      if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
        const result = await chrome.storage.local.get([key]);
        return result[key] !== undefined ? result[key] : defaultValue;
      }
      const item = localStorage.getItem('haytool_' + key);
      return item !== null ? JSON.parse(item) : defaultValue;
    } catch (e) {
      console.warn('[Storage] get hatası:', key, e);
      return defaultValue;
    }
  },

  async set(key, value) {
    try {
      const nowIso = new Date().toISOString();
      if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
        await chrome.storage.local.set({ [key]: value, _last_local_update: nowIso });
      } else {
        localStorage.setItem('haytool_' + key, JSON.stringify(value));
        localStorage.setItem('haytool__last_local_update', JSON.stringify(nowIso));
      }
      return true;
    } catch (e) {
      console.error('[Storage] set hatası:', key, e);
      return false;
    }
  },

  async remove(key) {
    try {
      if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
        await chrome.storage.local.remove([key]);
      } else {
        localStorage.removeItem('haytool_' + key);
      }
      return true;
    } catch (e) { return false; }
  },

  async getAll() {
    try {
      if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
        return await chrome.storage.local.get(null);
      }
      const data = {};
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k && k.startsWith('haytool_')) {
          data[k.replace('haytool_', '')] = JSON.parse(localStorage.getItem(k));
        }
      }
      return data;
    } catch (e) { return {}; }
  }
};


