import { auth, db, GithubAuthProvider, signInWithCredential, signOut, onAuthStateChanged, doc, getDoc, setDoc, onSnapshot } from './firebase-config.js';
import { Storage } from './storage.js';

export const Auth = {
  currentUser: null,
  _authResolve: null,
  _authReject:  null,
  _unsubSnapshot: null,

  async init() {
    return new Promise((resolve) => {
      onAuthStateChanged(auth, async (user) => {
        this.currentUser = user;
        const hasSeenWelcome = await Storage.get('has_seen_welcome', false);
        if (user) {
          await this.updateProfileUI(user);
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

      const url = 'https://haytokoraz.github.io/HaYTooL-Cloud-StartPage/auth.html?v=' + Date.now() + '&extid=' + chrome.runtime.id;
      const popup = window.open(url, 'haytool_auth', 'width=500,height=660,left=200,top=100');

      // 5 dakika zaman aşımı
      const timeout = setTimeout(() => {
        this._authResolve = null;
        this._authReject  = null;
        reject(new Error('Giriş zaman aşımına uğradı (5 dakika).'));
      }, 5 * 60 * 1000);

      // Popup kapanınca: 2sn bekle (başarı mesajı uçuşta olabilir)
      const interval = setInterval(() => {
        if (popup && popup.closed) {
          clearInterval(interval);
          clearTimeout(timeout);
          setTimeout(() => {
            // Eğer bu sürede _authResolve hâlâ doluysa → kullanıcı manuel kapattı
            if (this._authReject) {
              this._authReject = null;
              this._authResolve = null;
              reject(new Error('Giriş penceresi kapatıldı.'));
            }
            // _authReject null ise → resolve zaten çağrıldı, bir şey yapma
          }, 2000);
        }
      }, 500);
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

  async checkAndSyncCloudData(user) {
    const userRef = doc(db, 'users', user.uid);
    const docSnap = await getDoc(userRef);

    if (docSnap.exists()) {
      const data = docSnap.data();
      if (data.settings)  await chrome.storage.local.set(data.settings);
      if (data.shortcuts) await Storage.set('shortcuts', data.shortcuts);
      if (data.favorites) await Storage.set('favorites', data.favorites);
      window.dispatchEvent(new Event('render_shortcuts_and_favorites'));
      window.dispatchEvent(new Event('cloud_data_loaded'));
    } else {
      const allLocal  = await Storage.getAll();
      const shortcuts = await Storage.get('shortcuts', []);
      const favorites = await Storage.get('favorites', []);
      await setDoc(userRef, { settings: allLocal, shortcuts, favorites, createdAt: new Date().toISOString() });
    }

    if (this._unsubSnapshot) this._unsubSnapshot();
    this._unsubSnapshot = onSnapshot(userRef, async (snapshot) => {
      if (!snapshot.exists()) return;
      const data = snapshot.data();
      if (data.settings) {
        if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
          await chrome.storage.local.set(data.settings);
        } else {
          for (const [k, v] of Object.entries(data.settings))
            localStorage.setItem('haytool_' + k, JSON.stringify(v));
        }
      }
      window.dispatchEvent(new Event('render_shortcuts_and_favorites'));
    });
  },

  async updateProfileUI(user) {
    const profileBox = document.getElementById('userProfileBox');
    const authBtn    = document.getElementById('settingsAuthBtn');
    const modal      = document.getElementById('welcomeModal');
    if (modal && modal.classList.contains('active')) modal.classList.remove('active');

    if (profileBox) {
      profileBox.innerHTML = user
        ? `<img src="${user.photoURL || ''}" alt="Avatar" style="width:24px;height:24px;border-radius:50%;object-fit:cover;">
           <span>${user.email || user.displayName || 'GitHub User'}</span>`
        : `<span style="display:flex;align-items:center;justify-content:center;width:24px;height:24px;border-radius:50%;background:var(--bg-layer-2);">💻</span>
           <span data-i18n="local_mode">Local</span>`;
    }

    if (authBtn) {
      if (user) {
        authBtn.innerHTML = `<span>🚪</span><span data-i18n="logout">Oturumu Kapat</span>`;
        authBtn.onclick = () => this.logout();
      } else {
        authBtn.innerHTML = `<span style="font-size:1.1rem;margin-right:4px;">🐙</span>
          <span data-i18n="login_cloud">Oturum Aç (GitHub)</span>`;
        authBtn.onclick = async () => {
          try {
            await this.loginWithGitHub();
          } catch (err) {
            console.error('Settings Login error:', err);
            alert('Giriş başarısız oldu: ' + (err.message || JSON.stringify(err)));
          }
        };
      }
    }

    if (window.I18n && typeof window.I18n.updateDOM === 'function') window.I18n.updateDOM();
  }
};

// EXTERNAL_AUTH_SUCCESS gelince loginWithGitHub Promise'ını çöz
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'EXTERNAL_AUTH_SUCCESS') {
    (async () => {
      try {
        const credential = GithubAuthProvider.credential(request.token);
        const result     = await signInWithCredential(auth, credential);
        await Auth.checkAndSyncCloudData(result.user);
        await Auth.updateProfileUI(result.user);
        Auth.currentUser = result.user;

        if (Auth._authResolve) {
          Auth._authResolve(result.user);
          Auth._authResolve = null;
          Auth._authReject  = null;
        } else {
          window.location.reload();
        }
        sendResponse({ ok: true });
      } catch (e) {
        console.error('Giriş başarısız', e);
        if (Auth._authReject) {
          Auth._authReject(e);
          Auth._authReject  = null;
          Auth._authResolve = null;
        }
        sendResponse({ ok: false, error: e.message });
      }
    })();
    return true;
  }
});
