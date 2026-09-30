/**
 * HaYTooL Cloud StartPage - High Performance Icon Cache Manager
 * IndexedDB tabanli, offline-first ve 0ms gecikmeli ikon onbellek yoneticisi.
 */
export const IconCache = {
  DB_NAME: 'haytool_icon_cache_db',
  DB_VERSION: 1,
  STORE_NAME: 'icons',
  _dbPromise: null,
  _memCache: new Map(),

  _getDB() {
    if (!this._dbPromise) {
      this._dbPromise = new Promise((resolve) => {
        if (typeof indexedDB === 'undefined') {
          resolve(null);
          return;
        }
        const req = indexedDB.open(this.DB_NAME, this.DB_VERSION);
        req.onupgradeneeded = (e) => {
          const db = e.target.result;
          if (!db.objectStoreNames.contains(this.STORE_NAME)) {
            db.createObjectStore(this.STORE_NAME, { keyPath: 'key' });
          }
        };
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => {
          console.warn('[IconCache] IndexedDB acilamadi:', req.error);
          resolve(null);
        };
      });
    }
    return this._dbPromise;
  },

  /**
   * Domain veya dogrudan URL icin onbellege alinmis ikon verisini doner (DataURL).
   * @param {string} key - Alan adi veya ikon URL'si
   * @returns {Promise<string|null>}
   */
  async get(key) {
    if (!key) return null;
    if (this._memCache.has(key)) {
      return this._memCache.get(key);
    }
    const db = await this._getDB();
    if (!db) return null;

    return new Promise((resolve) => {
      try {
        const tx = db.transaction(this.STORE_NAME, 'readonly');
        const store = tx.objectStore(this.STORE_NAME);
        const req = store.get(key);
        req.onsuccess = () => {
          if (req.result && req.result.data) {
            this._memCache.set(key, req.result.data);
            resolve(req.result.data);
          } else {
            resolve(null);
          }
        };
        req.onerror = () => resolve(null);
      } catch (e) {
        resolve(null);
      }
    });
  },

  /**
   * Ikon verisini IndexedDB ve bellek onbellege kaydeder.
   * @param {string} key
   * @param {string} dataUrl
   */
  async set(key, dataUrl) {
    if (!key || !dataUrl) return;
    this._memCache.set(key, dataUrl);
    const db = await this._getDB();
    if (!db) return;

    try {
      const tx = db.transaction(this.STORE_NAME, 'readwrite');
      const store = tx.objectStore(this.STORE_NAME);
      store.put({ key, data: dataUrl, time: Date.now() });
    } catch (e) {
      console.warn('[IconCache] Kayit hatasi:', e);
    }
  },

  /**
   * Uzak bir URL'den gelen ikonu fetch edip base64 formatinda yerele onbellege alir.
   * @param {string} key
   * @param {string} url
   */
  async fetchAndCache(key, url) {
    if (!key || !url) return null;
    try {
      const res = await fetch(url, { cache: 'force-cache' });
      if (!res.ok) return null;
      const blob = await res.blob();
      if (!blob.type.startsWith('image/')) return null;

      return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => {
          const base64 = reader.result;
          this.set(key, base64);
          resolve(base64);
        };
        reader.onerror = () => resolve(null);
        reader.readAsDataURL(blob);
      });
    } catch (e) {
      return null;
    }
  },

  /**
   * Resim etiketine (img) akilli yukleme uygular:
   * 1. Yerel onbellekte varsa ANINDA (0 ms) data URL'den basar.
   * 2. Yoksa uzak kaynaktan gosterir ve arka planda yerele kaydeder.
   * @param {HTMLImageElement} img
   * @param {string} cacheKey
   * @param {string} fallbackRemoteUrl
   */
  async applyToImg(img, cacheKey, fallbackRemoteUrl) {
    const cached = await this.get(cacheKey);
    if (cached) {
      img.src = cached;
      return;
    }

    img.src = fallbackRemoteUrl;
    img.addEventListener('load', () => {
      this.fetchAndCache(cacheKey, fallbackRemoteUrl);
    }, { once: true });
  }
};
