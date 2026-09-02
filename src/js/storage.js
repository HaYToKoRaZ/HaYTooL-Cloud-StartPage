/**
 * HaYTooL Cloud StartPage - Evrensel Storage Katmanı
 * chrome.storage.local öncelikli, localStorage fallback ile
 * #5: Firestore sync artık sadece değişen anahtarı yazıyor (merge: true)
 */
import { auth, db, doc, setDoc } from './firebase-config.js';

let syncTimeout = null;

// #5: Tüm veriyi değil, yalnızca değişen key'i cloud'a yaz
function scheduleCloudSync(changedKey, changedValue) {
  if (!auth || !auth.currentUser) return;
  if (syncTimeout) clearTimeout(syncTimeout);

  syncTimeout = setTimeout(async () => {
    try {
      const userRef = doc(db, 'users', auth.currentUser.uid);
      const payload = { updatedAt: new Date().toISOString() };

      // Özel anahtarlar doğrudan ayrı alanlar olarak tutulur
      if (changedKey === 'shortcuts' || changedKey === 'favorites') {
        payload[changedKey] = changedValue;
      } else {
        // Diğer tüm ayarlar settings objesinin içine merge edilir
        payload['settings.' + changedKey] = changedValue;
      }

      await setDoc(userRef, payload, { merge: true });
    } catch (e) {
      console.error('Cloud sync error:', e);
    }
  }, 1500); // 1.5s debounce
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
      scheduleCloudSync(key, value); // #5: sadece bu key'i gönder
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
