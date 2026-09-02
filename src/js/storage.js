/**
 * HaYTooL Cloud StartPage - Evrensel Storage & Cloud Sync Katmanı
 */
import { auth, db, doc, setDoc } from './firebase-config.js';

export const SYNCABLE_KEYS = [
  'app_settings',
  'shortcut_categories',
  'shortcuts_v2',
  'favorites_bar',
  'collapsed_folders',
  'folder_views',
  'show_hidden_folders',
  'search_engine',
  'lang',
  'is_first_run_v3',
  'is_fav_first_run_v3',
  'has_seen_welcome'
];

let syncTimeout = null;
let isApplyingCloudData = false;

export function setApplyingCloudData(val) {
  isApplyingCloudData = val;
}

function scheduleCloudSync(changedKey, changedValue) {
  if (isApplyingCloudData) return;
  if (!auth || !auth.currentUser) return;
  if (!SYNCABLE_KEYS.includes(changedKey)) return;

  if (syncTimeout) clearTimeout(syncTimeout);

  syncTimeout = setTimeout(async () => {
    try {
      if (!auth.currentUser) return;
      const userRef = doc(db, 'users', auth.currentUser.uid);
      await setDoc(userRef, {
        syncData: {
          [changedKey]: changedValue
        },
        updatedAt: new Date().toISOString()
      }, { merge: true });
      console.log(`[CloudSync] '${changedKey}' buluta eşitlendi.`);
    } catch (e) {
      console.error('[CloudSync] Senkronizasyon hatası:', e);
    }
  }, 1000);
}

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
      if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
        await chrome.storage.local.set({ [key]: value });
      } else {
        localStorage.setItem('haytool_' + key, JSON.stringify(value));
      }
      scheduleCloudSync(key, value);
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
  },

  /**
   * Tüm yerel ayar ve linkleri tek seferde buluta aktarır (Ana Yedek)
   */
  async pushAllToCloud() {
    if (!auth || !auth.currentUser) return false;
    try {
      const all = await this.getAll();
      const cleanSyncData = {};
      for (const key of SYNCABLE_KEYS) {
        if (all[key] !== undefined) {
          cleanSyncData[key] = all[key];
        }
      }
      cleanSyncData.is_first_run_v3 = false;
      cleanSyncData.is_fav_first_run_v3 = false;
      cleanSyncData.has_seen_welcome = true;

      const userRef = doc(db, 'users', auth.currentUser.uid);
      await setDoc(userRef, {
        syncData: cleanSyncData,
        updatedAt: new Date().toISOString()
      }, { merge: true });
      console.log('[CloudSync] Tüm yerel veriler başarıyla buluta yüklendi.');
      return true;
    } catch (e) {
      console.error('[CloudSync] pushAllToCloud hatası:', e);
      return false;
    }
  }
};
