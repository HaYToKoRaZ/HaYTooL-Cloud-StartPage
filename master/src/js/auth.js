import { auth, db, GithubAuthProvider, signInWithPopup, signInWithCredential, signOut, onAuthStateChanged, doc, getDoc, setDoc, onSnapshot } from './firebase-config.js';
import { Storage } from './storage.js';

export const Auth = {
  currentUser: null,
  
  async init() {
    return new Promise((resolve) => {
      onAuthStateChanged(auth, async (user) => {
        this.currentUser = user;
        
        const hasSeenWelcome = await Storage.get('has_seen_welcome', false);
        
        if (user) {
          // Zaten giriş yapılmış
          await this.updateProfileUI(user);
          resolve(user);
        } else if (!hasSeenWelcome) {
          // İlk defa açılıyor ve giriş yapmamış, modali göster
          this.showWelcomeModal(resolve);
        } else {
          // Geçilmiş (Local Mode)
          this.updateProfileUI(null);
          resolve(null);
        }
      });
    });
  },

  showWelcomeModal(resolve) {
    const modal = document.getElementById('welcomeModal');
    if (!modal) {
      resolve(null);
      return;
    }
    
    modal.classList.add('active');
    
    const btnLogin = document.getElementById('btnGoogleLogin');
    if(btnLogin) {
        // Butonu GitHub login'e uyarla
        btnLogin.innerHTML = '<span style="font-size:1.2rem; margin-right:8px;">🐙</span> GitHub ile Giriş Yap';
        btnLogin.onclick = async () => {
          try {
            const user = await this.loginWithGitHub();
            modal.classList.remove('active');
            await Storage.set('has_seen_welcome', true);
            window.location.reload();
            resolve(user);
          } catch (err) {
            console.error('Login error:', err);
            alert('Giriş başarısız oldu (Welcome): ' + (err.message || JSON.stringify(err)));
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

  async loginWithGitHub() {
    console.log('loginWithGitHub started...');
    const url = 'https://haytokoraz.github.io/HaYTooL-Cloud-StartPage/auth.html';
    window.open(url, 'haytool_auth', 'width=500,height=600');
  },

  async logout() {
    try {
      await signOut(auth);
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
      if (data.settings) await chrome.storage.local.set(data.settings);
      if (data.shortcuts) await Storage.set('shortcuts', data.shortcuts);
      if (data.favorites) await Storage.set('favorites', data.favorites);
      window.dispatchEvent(new Event('render_shortcuts_and_favorites'));
      window.dispatchEvent(new Event('cloud_data_loaded'));
    } else {
      const allLocal = await Storage.getAll();
      const shortcuts = await Storage.get('shortcuts', []);
      const favorites = await Storage.get('favorites', []);
      
      await setDoc(userRef, {
        settings: allLocal,
        shortcuts: shortcuts,
        favorites: favorites,
        createdAt: new Date().toISOString()
      });
    }

    onSnapshot(userRef, async (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data();
        if (data.settings) {
          if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
            await chrome.storage.local.set(data.settings);
          } else {
            for (const [k, v] of Object.entries(data.settings)) {
              localStorage.setItem('haytool_' + k, JSON.stringify(v));
            }
          }
        }
        window.dispatchEvent(new Event('render_shortcuts_and_favorites'));
      }
    });
  },

  async updateProfileUI(user) {
    const profileBox = document.getElementById('userProfileBox');
    const authBtn = document.getElementById('settingsAuthBtn');
    
    const modal = document.getElementById('welcomeModal');
    if (modal && modal.classList.contains('active')) {
      modal.classList.remove('active');
    }
    
    if (profileBox) {
      if (user) {
        profileBox.innerHTML = `
          <img src="${user.photoURL}" alt="Avatar" style="width:24px;height:24px;border-radius:50%;object-fit:cover;">
          <span>${user.email || user.displayName || 'GitHub User'}</span>
        `;
      } else {
        profileBox.innerHTML = `
          <span style="display:flex; align-items:center; justify-content:center; width:24px; height:24px; border-radius:50%; background:var(--bg-layer-2);">
            💻
          </span>
          <span data-i18n="local_mode">Local</span>
        `;
      }
    }
    
    if (authBtn) {
      if (user) {
        authBtn.innerHTML = `<span>🚪</span><span data-i18n="logout">Oturumu Kapat</span>`;
        authBtn.onclick = () => this.logout();
      } else {
        authBtn.innerHTML = `
          <span style="font-size:1.1rem; margin-right:4px;">🐙</span>
          <span data-i18n="login_cloud">Oturum Aç (GitHub)</span>
        `;
        authBtn.onclick = async () => {
          try {
            await this.loginWithGitHub();
            window.location.reload();
          } catch (err) {
            console.error('Settings Login error:', err);
            alert('Giriş başarısız oldu: ' + (err.message || JSON.stringify(err)));
          }
        };
      }
    }
    
    if (window.I18n && typeof window.I18n.updateDOM === 'function') {
      window.I18n.updateDOM();
    }
  }
};


chrome.runtime.onMessage.addListener(async (request, sender, sendResponse) => {
  if (request.action === 'EXTERNAL_AUTH_SUCCESS') {
    try {
      const credential = GithubAuthProvider.credential(request.token);
      const result = await signInWithCredential(auth, credential);
      await Auth.checkAndSyncCloudData(result.user);
      await Auth.updateProfileUI(result.user);
      window.location.reload();
    } catch (e) {
      console.error('Giriş başarısız', e);
      alert('Giriş hatası: ' + e.message);
    }
  }
});
