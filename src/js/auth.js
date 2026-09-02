import { auth, db, GithubAuthProvider, signInWithCredential, signOut, onAuthStateChanged, doc, getDoc, setDoc, onSnapshot } from './firebase-config.js';
import { Storage, setApplyingCloudData } from './storage.js';

export const Auth = {
  currentUser: null,
  _authResolve: null,
  _authReject:  null,
  _unsubSnapshot: null,

  async init() {
    // 1) Storage'da bekleyen token varsa işle
    await this._processPendingToken();

    return new Promise((resolve) => {
      onAuthStateChanged(auth, async (user) => {
        this.currentUser = user;
        const hasSeenWelcome = await Storage.get('has_seen_welcome', false);

        if (user) {
          await this.updateProfileUI(user);
          // Kullanıcı zaten giriş yapmışsa buluttaki verileri kontrol et
          await this.checkAndSyncCloudData(user, false);
          resolve(user);
        } else if (!hasSeenWelcome) {
          this.showWelcomeModal(resolve);
        } else {
          this.updateProfileUI(null);
          resolve(null);
        }
      });
    });
  },

  // Storage'da bekleyen token varsa Firebase'e giriş yap
  async _processPendingToken() {
    try {
      const result = await new Promise(r =>
        chrome.storage.local.get(['_pending_auth_token'], r)
      );
      const token = result ? result._pending_auth_token : null;
      if (!token) return;

      await new Promise(r => chrome.storage.local.remove(['_pending_auth_token'], r));

      const credential = GithubAuthProvider.credential(token);
      const fbResult   = await signInWithCredential(auth, credential);
      this.currentUser = fbResult.user;

      // İlk giriş: buluttan çek ve sayfayı YENİLE
      await this.checkAndSyncCloudData(fbResult.user, true);

      if (this._authResolve) {
        this._authResolve(fbResult.user);
        this._authResolve = null;
        this._authReject  = null;
      }
    } catch (e) {
      chrome.storage.local.remove(['_pending_auth_token']);
      console.warn('[Auth] Pending token işlenemedi:', e.message);
    }
  },

  showWelcomeModal(resolve) {
    const modal = document.getElementById('welcomeModal');
    if (!modal) { resolve(null); return; }
    modal.classList.add('active');

    const btnLogin = document.getElementById('btnGoogleLogin');
    if (btnLogin) {
      btnLogin.innerHTML = '<span style="font-size:1.2rem; margin-right:8px;">🐙</span> GitHub ile Giriş Yap';
      btnLogin.onclick = async () => {
        try {
          const user = await this.loginWithGitHub();
          modal.classList.remove('active');
          await Storage.set('has_seen_welcome', true);
          resolve(user);
        } catch (err) {
          console.error('Login error:', err);
          alert('Giriş başarısız oldu: ' + (err.message || JSON.stringify(err)));
        }
      };
    }

    const btnSkip = document.getElementById('btnSkipLogin');
    if (btnSkip) {
      btnSkip.onclick = async () => {
        modal.classList.remove('active');
        await Storage.set('has_seen_welcome', true);
        this.updateProfileUI(null);
        resolve(null);
      };
    }
  },

  loginWithGitHub() {
    return new Promise((resolve, reject) => {
      if (this._authReject) {
        this._authReject(new Error('Yeni giriş isteği başlatıldı.'));
      }
      this._authResolve = resolve;
      this._authReject  = reject;

      const url = 'https://haytokoraz.github.io/HaYTooL-Cloud-StartPage/auth.html?v='
                  + Date.now() + '&extid=' + chrome.runtime.id;
      window.open(url, 'haytool_auth', 'width=500,height=660,left=200,top=100');

      // 5 dakika timeout
      setTimeout(() => {
        if (this._authReject) {
          this._authResolve = null;
          this._authReject  = null;
          reject(new Error('Giriş zaman aşımına uğradı (5 dakika).'));
        }
      }, 5 * 60 * 1000);
    });
  },

  async logout() {
    try {
      if (this._unsubSnapshot) { this._unsubSnapshot(); this._unsubSnapshot = null; }
      await signOut(auth);
      this.currentUser = null;
      this.updateProfileUI(null);
      window.location.reload();
    } catch (err) {
      console.error('Logout error:', err);
    }
  },

  /**
   * Buluttan verileri çeker veya ilk cihazsa yerel veriyi buluta aktarır.
   * @param {Object} user 
   * @param {boolean} forceReload İndirme bittiğinde sayfayı yenilesin mi?
   */
  async checkAndSyncCloudData(user, forceReload = false) {
    if (!user) return;
    try {
      const userRef = doc(db, 'users', user.uid);
      const docSnap = await getDoc(userRef);

      if (docSnap.exists()) {
        const rawData = docSnap.data();
        let cloudData = rawData.syncData || {};

        // Eski yapılardan uyumluluk geçişi (legacy fallback)
        if (rawData.settings && typeof rawData.settings === 'object') {
          cloudData = { ...rawData.settings, ...cloudData };
        }
        if (rawData.shortcuts && Array.isArray(rawData.shortcuts) && rawData.shortcuts.length > 0) {
          if (!cloudData.shortcuts_v2) cloudData.shortcuts_v2 = rawData.shortcuts;
        }
        if (rawData.favorites && Array.isArray(rawData.favorites) && rawData.favorites.length > 0) {
          if (!cloudData.favorites_bar) cloudData.favorites_bar = rawData.favorites;
        }

        const localLastUpdateStr = await Storage.get('_last_local_update', null);
        const cloudUpdatedAtStr  = rawData.updatedAt || null;

        const localTime = localLastUpdateStr ? new Date(localLastUpdateStr).getTime() : 0;
        const cloudTime = cloudUpdatedAtStr  ? new Date(cloudUpdatedAtStr).getTime()  : 0;

        // Bulutta link veya ayar var mı kontrol et
        const hasContent = !!(
          (cloudData.shortcuts_v2 && cloudData.shortcuts_v2.length > 0) ||
          (cloudData.shortcut_categories && cloudData.shortcut_categories.length > 0) ||
          (cloudData.favorites_bar && cloudData.favorites_bar.length > 0) ||
          cloudData.app_settings
        );

        // Eğer rutin sayfa yenilemesi ise ve yereldeki veriler buluttan daha yeniyse (son 1 sn içinde eklenmiş vb.):
        if (!forceReload && localTime > (cloudTime + 1000)) {
          console.log('[Auth] Yerel veriler buluttan daha güncel, buluta aktarılıyor...');
          await Storage.pushAllToCloud();
        } else if (hasContent) {
          console.log('[Auth] Buluttan veriler indiriliyor...', Object.keys(cloudData));
          setApplyingCloudData(true);
          try {
            if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
              await chrome.storage.local.set(cloudData);
            }
            for (const [k, v] of Object.entries(cloudData)) {
              localStorage.setItem('haytool_' + k, JSON.stringify(v));
            }
          } finally {
            setTimeout(() => setApplyingCloudData(false), 1000);
          }

          if (forceReload) {
            console.log('[Auth] Bulut verileri yerleştirildi, sayfa yenileniyor...');
            window.location.reload();
            return;
          }

          // Buluttan inen taze ayarları ve linkleri arayüze uygula
          window.dispatchEvent(new Event('cloud_data_loaded'));
        } else {
          // Bulutta henüz veri yok, bu cihazdaki yerel verileri buluta aktar!
          console.log('[Auth] Bulut boş, yerel veriler buluta aktarılıyor...');
          await Storage.pushAllToCloud();
        }
      } else {
        // Kullanıcı Firestore'da ilk defa oluşturuluyor
        console.log('[Auth] Kullanıcı kaydı oluşturuluyor, yerel veriler yükleniyor...');
        await Storage.pushAllToCloud();
      }

      // Canlı eşitleme dinleyicisi (Diğer sekmelerden/cihazlardan gelen değişiklikler)
      if (this._unsubSnapshot) this._unsubSnapshot();
      this._unsubSnapshot = onSnapshot(userRef, async (snapshot) => {
        if (!snapshot.exists()) return;
        const raw = snapshot.data();
        const incoming = raw.syncData || raw.settings;
        if (!incoming) return;

        setApplyingCloudData(true);
        try {
          if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
            await chrome.storage.local.set(incoming);
          }
          for (const [k, v] of Object.entries(incoming)) {
            localStorage.setItem('haytool_' + k, JSON.stringify(v));
          }
        } finally {
          setTimeout(() => setApplyingCloudData(false), 1000);
        }

        window.dispatchEvent(new Event('render_shortcuts_and_favorites'));
        window.dispatchEvent(new Event('cloud_data_loaded'));
      });

    } catch (err) {
      console.error('[Auth] checkAndSyncCloudData hatası:', err);
    }
  },

  async updateProfileUI(user) {
    const profileBox = document.getElementById('userProfileBox');
    const authBtn    = document.getElementById('settingsAuthBtn');
    const modal      = document.getElementById('welcomeModal');
    if (modal && modal.classList.contains('active')) modal.classList.remove('active');

    if (profileBox) {
      if (user) {
        const displayName = user.displayName || user.email || 'GitHub User';
        const avatarUrl   = user.photoURL || '';
        profileBox.innerHTML = `
          <img src="${avatarUrl}" alt="Avatar"
               style="width:28px;height:28px;border-radius:50%;object-fit:cover;border:2px solid var(--accent,#6366f1);"
               onerror="this.style.display='none'">
          <div style="display:flex;flex-direction:column;line-height:1.2;">
            <span style="font-weight:600;font-size:0.78rem;">${displayName}</span>
            ${user.email && user.email !== displayName
              ? `<span style="font-size:0.68rem;color:var(--text-muted,#94a3b8);">${user.email}</span>`
              : ''}
          </div>`;
      } else {
        profileBox.innerHTML = `
          <span style="display:flex;align-items:center;justify-content:center;
                       width:28px;height:28px;border-radius:50%;
                       background:var(--bg-layer-2,#1e293b);">💻</span>
          <span data-i18n="local_mode" style="font-size:0.8rem;">Yerel Mod</span>`;
      }
    }

    if (authBtn) {
      if (user) {
        authBtn.innerHTML = `<span>🚪</span><span data-i18n="logout">Oturumu Kapat</span>`;
        authBtn.onclick = () => this.logout();
      } else {
        authBtn.innerHTML = `<span style="font-size:1.1rem;margin-right:4px;">🐙</span>
          <span data-i18n="login_cloud">Oturum Aç (GitHub)</span>`;
        authBtn.onclick = async () => {
          try { await this.loginWithGitHub(); }
          catch (err) {
            console.error('Settings Login error:', err);
            alert('Giriş başarısız oldu: ' + (err.message || JSON.stringify(err)));
          }
        };
      }
    }

    // Settings içine "Buluta Şimdi Eşitle" butonu ekle/güncelle
    this.updateCloudSyncButton(user);

    if (window.I18n && typeof window.I18n.updateDOM === 'function') window.I18n.updateDOM();
  },

  updateCloudSyncButton(user) {
    let syncBtn = document.getElementById('manualCloudSyncBtn');
    const container = document.getElementById('settingsAuthBtn')?.parentElement;
    if (!container) return;

    if (user) {
      if (!syncBtn) {
        syncBtn = document.createElement('button');
        syncBtn.id = 'manualCloudSyncBtn';
        syncBtn.className = 'btn-secondary';
        syncBtn.style.cssText = 'width:100%; margin-top:8px; display:flex; align-items:center; justify-content:center; gap:8px; font-size:0.82rem;';
        container.appendChild(syncBtn);
      }
      syncBtn.innerHTML = '☁️ <span>Buluta Şimdi Eşitle</span>';
      syncBtn.onclick = async () => {
        syncBtn.disabled = true;
        syncBtn.innerHTML = '⏳ <span>Eşitleniyor...</span>';
        const ok = await Storage.pushAllToCloud();
        if (ok) {
          syncBtn.innerHTML = '✅ <span>Buluta Başarıyla Eşitlendi!</span>';
          setTimeout(() => {
            syncBtn.disabled = false;
            syncBtn.innerHTML = '☁️ <span>Buluta Şimdi Eşitle</span>';
          }, 2500);
        } else {
          syncBtn.innerHTML = '❌ <span>Hata Oluştu</span>';
          setTimeout(() => {
            syncBtn.disabled = false;
            syncBtn.innerHTML = '☁️ <span>Buluta Şimdi Eşitle</span>';
          }, 2500);
        }
      };
    } else if (syncBtn) {
      syncBtn.remove();
    }
  }
};

// EXTERNAL_AUTH_SUCCESS mesajı gelince
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'EXTERNAL_AUTH_SUCCESS') {
    (async () => {
      try {
        const credential = GithubAuthProvider.credential(request.token);
        const result     = await signInWithCredential(auth, credential);
        Auth.currentUser = result.user;
        await Auth.updateProfileUI(result.user);

        chrome.storage.local.remove(['_pending_auth_token']);

        if (Auth._authResolve) {
          Auth._authResolve(result.user);
          Auth._authResolve = null;
          Auth._authReject  = null;
        }

        // Buluttan veriyi indir ve sayfayı kesin olarak yenile!
        await Auth.checkAndSyncCloudData(result.user, true);

        sendResponse({ ok: true });
      } catch (e) {
        console.error('EXTERNAL_AUTH_SUCCESS hatası:', e);
        sendResponse({ ok: false, error: e.message });
      }
    })();
    return true;
  }
});


