/**
 * GitHub Gist Yedekleme ve Geri Yükleme Modülü
 * HaYTooL - Cloud StartPage
 * 
 * Sunucusuz, sıfır maliyetli ve güvenli manuel yedekleme.
 * Kullanıcının GitHub Kişisel Erişim Jetonu (Personal Access Token - PAT) ile
 * gizli (secret) bir Gist oluşturur veya mevcut olanı günceller.
 */
import { Storage } from './storage.js';

export const GistSync = {
  TOKEN_KEY: 'gist_token',
  GIST_ID_KEY: 'gist_id',
  LAST_BACKUP_KEY: 'gist_last_backup',
  USER_KEY: 'gist_user_profile',
  AUTO_BACKUP_KEY: 'gist_auto_backup',
  AUTO_BACKUP_LAST_DATE_KEY: 'gist_auto_backup_last_date',
  FILE_NAME: 'cloud_startpage_backup.json',

  async getConfig() {
    const token = await Storage.get(this.TOKEN_KEY, '');
    const gistId = await Storage.get(this.GIST_ID_KEY, '');
    const lastBackup = await Storage.get(this.LAST_BACKUP_KEY, null);
    const userProfile = await Storage.get(this.USER_KEY, null);
    const autoBackup = await Storage.get(this.AUTO_BACKUP_KEY, true);
    return { token, gistId, lastBackup, userProfile, autoBackup };
  },

  async saveConfig(token, gistId) {
    await Storage.set(this.TOKEN_KEY, (token || '').trim());
    await Storage.set(this.GIST_ID_KEY, (gistId || '').trim());
  },

  async deleteConfig() {
    await Storage.remove(this.TOKEN_KEY);
    await Storage.remove(this.GIST_ID_KEY);
    await Storage.remove(this.LAST_BACKUP_KEY);
    await Storage.remove(this.USER_KEY);
    await Storage.remove(this.AUTO_BACKUP_LAST_DATE_KEY);
  },

  /**
   * GitHub PAT kullanarak kullanıcının profil bilgilerini (login, email, avatar, name) çeker.
   */
  async fetchUserProfile(token) {
    if (!token) return null;
    const res = await fetch('https://api.github.com/user', {
      method: 'GET',
      headers: {
        'Accept': 'application/vnd.github+json',
        'Authorization': `Bearer ${token}`,
        'X-GitHub-Api-Version': '2022-11-28'
      }
    });

    if (!res.ok) {
      if (res.status === 401) throw new Error('INVALID_TOKEN');
      throw new Error('USER_FETCH_FAILED');
    }

    const userData = await res.json();
    let email = userData.email || '';

    // E-posta gizli ise GitHub emails endpoint'inden birincil e-postayı almayı dene
    if (!email) {
      try {
        const emailsRes = await fetch('https://api.github.com/user/emails', {
          method: 'GET',
          headers: {
            'Accept': 'application/vnd.github+json',
            'Authorization': `Bearer ${token}`,
            'X-GitHub-Api-Version': '2022-11-28'
          }
        });
        if (emailsRes.ok) {
          const emails = await emailsRes.json();
          if (Array.isArray(emails)) {
            const primary = emails.find(e => e.primary) || emails[0];
            if (primary && primary.email) email = primary.email;
          }
        }
      } catch (_) {}
    }

    const profile = {
      login: userData.login,
      name: userData.name || userData.login,
      avatarUrl: userData.avatar_url || '',
      email: email || (userData.login ? `${userData.login}@github` : ''),
      htmlUrl: userData.html_url || `https://github.com/${userData.login}`
    };

    await Storage.set(this.USER_KEY, profile);
    return profile;
  },

  /**
   * Tüm yerel verileri JSON olarak paketleyip GitHub Gist'e yükler.
   */
  async backupToGist() {
    const { token, gistId } = await this.getConfig();
    if (!token) {
      throw new Error('MISSING_TOKEN');
    }

    const allData = await Storage.getAll();
    
    // Güvenlik: Kullanıcının özel token ve hesap verilerini yedeğe dahil etme
    const sanitizedData = {};
    const sensitiveKeys = [this.TOKEN_KEY, this.GIST_ID_KEY, this.USER_KEY, this.LAST_BACKUP_KEY, '_last_local_update'];
    for (const [key, value] of Object.entries(allData)) {
      if (!sensitiveKeys.includes(key)) {
        sanitizedData[key] = value;
      }
    }

    const backupPayload = {
      version: '4.4.0',
      exportedAt: new Date().toISOString(),
      data: sanitizedData
    };

    const files = {
      [this.FILE_NAME]: {
        content: JSON.stringify(backupPayload, null, 2)
      }
    };

    let url = 'https://api.github.com/gists';
    let method = 'POST';
    const bodyData = {
      description: 'Cloud StartPage HaYTooL - Otomatik Yedek',
      files
    };

    if (gistId) {
      url = `https://api.github.com/gists/${gistId}`;
      method = 'PATCH';
    } else {
      bodyData.public = false;
    }

    let res = await fetch(url, {
      method,
      headers: {
        'Accept': 'application/vnd.github+json',
        'Authorization': `Bearer ${token}`,
        'X-GitHub-Api-Version': '2022-11-28',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(bodyData)
    });

    // Eğer PATCH yapılan Gist bulunamazsa (404) veya güncellenemezse yeni bir Gist oluşturmayı dene
    if (!res.ok && gistId && (res.status === 404 || res.status === 422)) {
      console.warn(`[GistSync] Mevcut Gist (${gistId}) güncellenemedi (${res.status}), yeni Gist oluşturuluyor...`);
      bodyData.public = false;
      res = await fetch('https://api.github.com/gists', {
        method: 'POST',
        headers: {
          'Accept': 'application/vnd.github+json',
          'Authorization': `Bearer ${token}`,
          'X-GitHub-Api-Version': '2022-11-28',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(bodyData)
      });
    }

    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      const msg = errData.message || res.statusText || 'Bilinmeyen hata';
      if (res.status === 401) throw new Error('INVALID_TOKEN');
      if (res.status === 404 && gistId) throw new Error('GIST_NOT_FOUND');
      throw new Error(`${msg} (HTTP ${res.status})`);
    }

    const data = await res.json();
    const newGistId = data.id;
    const nowIso = new Date().toISOString();

    await Storage.set(this.GIST_ID_KEY, newGistId);
    await Storage.set(this.LAST_BACKUP_KEY, nowIso);

    return { gistId: newGistId, lastBackup: nowIso };
  },

  /**
   * Kullanıcının GitHub hesabındaki Gist'leri tarayarak Cloud StartPage yedeğini otomatik bulur.
   */
  async findBackupGist(token) {
    if (!token) return null;
    try {
      const res = await fetch('https://api.github.com/gists?per_page=100', {
        method: 'GET',
        headers: {
          'Accept': 'application/vnd.github+json',
          'Authorization': `Bearer ${token}`,
          'X-GitHub-Api-Version': '2022-11-28'
        }
      });
      if (!res.ok) return null;
      const gists = await res.json();
      if (!Array.isArray(gists)) return null;

      // Dosya adımız 'cloud_startpage_backup.json' olan veya açıklaması 'Cloud StartPage HaYTooL' içeren Gist'i bul
      const found = gists.find(g => 
        (g.files && g.files[this.FILE_NAME]) || 
        (g.description && g.description.includes('Cloud StartPage HaYTooL'))
      );

      if (found) {
        await Storage.set(this.GIST_ID_KEY, found.id);
        if (found.updated_at) {
          await Storage.set(this.LAST_BACKUP_KEY, found.updated_at);
        }
        return found;
      }
    } catch (e) {
      console.warn('[GistSync] Gist otomatik arama hatası:', e);
    }
    return null;
  },

  /**
   * Gist'in tüm geçmiş yedekleme sürümlerini (commit geçmişini) çeker.
   */
  async fetchHistory() {
    let { token, gistId } = await this.getConfig();
    if (!token) throw new Error('MISSING_TOKEN');

    if (!gistId) {
      const autoFound = await this.findBackupGist(token);
      if (autoFound) {
        gistId = autoFound.id;
      } else {
        throw new Error('MISSING_GIST_ID');
      }
    }

    const res = await fetch(`https://api.github.com/gists/${gistId}/commits?per_page=50`, {
      method: 'GET',
      headers: {
        'Accept': 'application/vnd.github+json',
        'Authorization': `Bearer ${token}`,
        'X-GitHub-Api-Version': '2022-11-28'
      }
    });

    if (!res.ok) {
      if (res.status === 401) throw new Error('INVALID_TOKEN');
      if (res.status === 404) throw new Error('GIST_NOT_FOUND');
      throw new Error(res.statusText || 'Yedek geçmişi alınamadı');
    }

    const commits = await res.json();
    return commits.map(c => ({
      version: c.version, // SHA hash
      committedAt: c.committed_at,
      changeStatus: c.change_status || {}
    }));
  },

  /**
   * GitHub Gist'ten en son veya belirli bir commit sürümündeki yedeği indirip yerel depolamaya yazar.
   * commitSha parametresi verilirse doğrudan geçmişteki o sürüme geri döner.
   */
  async restoreFromGist(commitSha = null) {
    let { token, gistId } = await this.getConfig();
    if (!token) {
      throw new Error('MISSING_TOKEN');
    }

    // Gist ID yoksa (format atılmış veya yeni cihaz), kullanıcının Gist'lerini tarayarak otomatik bul
    if (!gistId) {
      const autoFound = await this.findBackupGist(token);
      if (autoFound) {
        gistId = autoFound.id;
      } else {
        throw new Error('MISSING_GIST_ID');
      }
    }

    const url = commitSha 
      ? `https://api.github.com/gists/${gistId}/${commitSha}`
      : `https://api.github.com/gists/${gistId}`;

    const res = await fetch(url, {
      method: 'GET',
      headers: {
        'Accept': 'application/vnd.github+json',
        'Authorization': `Bearer ${token}`,
        'X-GitHub-Api-Version': '2022-11-28'
      }
    });

    if (!res.ok) {
      if (res.status === 401) throw new Error('INVALID_TOKEN');
      if (res.status === 404) throw new Error('GIST_NOT_FOUND');
      throw new Error(res.statusText || 'Gist indirilemedi');
    }

    const data = await res.json();
    const backupFile = data.files && (data.files[this.FILE_NAME] || Object.values(data.files)[0]);
    if (!backupFile || !backupFile.content) {
      throw new Error('NO_BACKUP_FILE');
    }

    let parsed;
    try {
      parsed = JSON.parse(backupFile.content);
    } catch (e) {
      throw new Error('INVALID_JSON');
    }

    const payload = parsed.data || parsed;
    if (!payload || typeof payload !== 'object') {
      throw new Error('INVALID_DATA');
    }

    // Yerel depolamaya tek tek yaz (token ve hesap bilgilerini asla ezme)
    const protectedKeys = [this.TOKEN_KEY, this.GIST_ID_KEY, this.USER_KEY, this.LAST_BACKUP_KEY, this.AUTO_BACKUP_LAST_DATE_KEY, '_last_local_update'];
    for (const [key, value] of Object.entries(payload)) {
      if (protectedKeys.includes(key)) continue;
      await Storage.set(key, value);
    }

    return { gistId, updatedAt: data.updated_at || data.created_at };
  },

  /**
   * Günde ilk açılışta (veya gün değiştiğinde) otomatik Gist yedeği alır.
   * Sessiz çalışır, hatada kullanıcıyı rahatsız etmez, başarılı olunca küçük bir toast gösterir.
   */
  async checkDailyAutoBackup() {
    try {
      const config = await this.getConfig();
      if (!config.token || config.autoBackup === false) return;

      const today = new Date().toISOString().split('T')[0]; // "YYYY-MM-DD"
      const lastBackupDate = await Storage.get(this.AUTO_BACKUP_LAST_DATE_KEY, '');

      // Bugün zaten otomatik yedek alınmışsa çık
      if (lastBackupDate === today) return;

      console.log('[GistSync] Günün ilk açılışı: Otomatik Gist yedeği başlatılıyor...');
      const res = await this.backupToGist();
      await Storage.set(this.AUTO_BACKUP_LAST_DATE_KEY, today);
      console.log('[GistSync] Günlük otomatik yedek başarıyla tamamlandı:', res);

      const toast = document.getElementById('toast');
      if (toast) {
        toast.textContent = '☁️ Günlük ilk açılış yedeğiniz GitHub Gist\'e otomatik gönderildi.';
        toast.classList.add('show');
        setTimeout(() => toast.classList.remove('show'), 3500);
      }
    } catch (e) {
      console.warn('[GistSync] Günlük otomatik yedekleme atlandı veya başarısız:', e);
    }
  }
};
