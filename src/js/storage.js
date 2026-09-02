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
  'fav_bar_view',
  'show_hidden_folders',
  'search_engine',
  'lang',
  'is_first_run_v3',
  'is_fav_first_run_v3',
  'has_seen_welcome'
];

let syncTimeout = null;
let pendingSyncPayload = {};
let isApplyingCloudData = false;

export function setApplyingCloudData(val) {
  isApplyingCloudData = val;
}

/**
 * Firestore'un 'undefined' değerlerde çökmesini engelleyen derin temizleyici
 */
export function sanitizeForFirestore(val) {
  if (val === undefined) return null;
  try {
    return JSON.parse(JSON.stringify(val, (key, value) => {
      if (value === undefined) return null;
      return value;
    }));
  } catch (e) {
    console.warn('[CloudSync] Sanitize hatası:', e);
    return val;
  }
}

export async function flushCloudSync() {
  if (Object.keys(pendingSyncPayload).length === 0) return;
  if (!auth || !auth.currentUser) return;

  const toSend = { ...pendingSyncPayload };
  pendingSyncPayload = {};
  if (syncTimeout) {
    clearTimeout(syncTimeout);
    syncTimeout = null;
  }

  try {
    const userRef = doc(db, 'users', auth.currentUser.uid);
    const nowIso = new Date().toISOString();
    const cleanData = sanitizeForFirestore(toSend);

    await setDoc(userRef, {
      syncData: cleanData,
      updatedAt: nowIso
    }, { merge: true });

    console.log('[CloudSync] Senkronizasyon tamamlandı:', Object.keys(toSend));
  } catch (e) {
    console.error('[CloudSync] Senkronizasyon hatası:', e);
  }
}

if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', () => {
    flushCloudSync();
  });
  // Sekme arka plana geçtiğinde veya gizlendiğinde bekleyen verileri anında buluta gönder
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') {
      flushCloudSync();
    }
  });
}

function scheduleCloudSync(changedKey, changedValue) {
  if (isApplyingCloudData) return;
  if (!auth || !auth.currentUser) return;
  if (!SYNCABLE_KEYS.includes(changedKey)) return;

  pendingSyncPayload[changedKey] = changedValue;

  if (syncTimeout) clearTimeout(syncTimeout);
  syncTimeout = setTimeout(() => {
    flushCloudSync();
  }, 10000); // 10 saniye tasarruflu debounce (arka arkaya yapılan tüm değişiklikleri tek pakette toplar)
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
      const nowIso = new Date().toISOString();
      if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
        await chrome.storage.local.set({ [key]: value, _last_local_update: nowIso });
      } else {
        localStorage.setItem('haytool_' + key, JSON.stringify(value));
        localStorage.setItem('haytool__last_local_update', JSON.stringify(nowIso));
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

      const nowIso = new Date().toISOString();
      const userRef = doc(db, 'users', auth.currentUser.uid);
      const safeData = sanitizeForFirestore(cleanSyncData);

      await setDoc(userRef, {
        syncData: safeData,
        updatedAt: nowIso
      }, { merge: true });

      if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
        await chrome.storage.local.set({ _last_local_update: nowIso });
      } else {
        localStorage.setItem('haytool__last_local_update', JSON.stringify(nowIso));
      }

      console.log('[CloudSync] Tüm yerel veriler başarıyla buluta yüklendi.');
      return true;
    } catch (e) {
      console.error('[CloudSync] pushAllToCloud hatası:', e);
      return false;
    }
  }
};


