import { auth, db, GoogleAuthProvider, signInWithCredential, signOut, onAuthStateChanged, doc, getDoc, setDoc, onSnapshot } from './firebase-config.js';
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
    
    document.getElementById('btnGoogleLogin').onclick = async () => {
      try {
        const user = await this.loginWithGoogle();
        modal.classList.remove('active');
        await Storage.set('has_seen_welcome', true);
        // Oturum açıldıktan sonra sayfanın tamamen taze bir şekilde (bulut verileriyle) yüklenmesi için yenile
        window.location.reload();
        resolve(user);
      } catch (err) {
        console.error('Login error:', err);
        alert('Giriş başarısız oldu (Welcome): ' + (err.message || JSON.stringify(err)));
      }
    };
    
    document.getElementById('btnSkipLogin').onclick = async () => {
      modal.classList.remove('active');
      await Storage.set('has_seen_welcome', true);
      this.updateProfileUI(null);
      resolve(null);
    };
  },

  async loginWithGoogle() {
    console.log('loginWithGoogle started (Cross-browser)...');
    return new Promise((resolve, reject) => {
      if (!chrome || !chrome.identity) {
        return reject(new Error("chrome.identity API bulunamadı. Lütfen eklenti izinlerini kontrol edin."));
      }
      
      const clientId = "2909602953-jdif208m2hdcp9bqknn01eudo6jrmea7.apps.googleusercontent.com"; 
      const redirectUri = chrome.identity.getRedirectURL(); // Otomatik olarak https://<id>.chromiumapp.org/ üretir
      const scopes = "email profile";
      const authUrl = `https://accounts.google.com/o/oauth2/auth?client_id=${clientId}&response_type=token&redirect_uri=${encodeURIComponent(redirectUri)}&scope=${encodeURIComponent(scopes)}`;

      console.log('Calling launchWebAuthFlow with URL:', authUrl);
      
      chrome.identity.launchWebAuthFlow({ url: authUrl, interactive: true }, async (redirectUrl) => {
        console.log('launchWebAuthFlow returned:', redirectUrl ? 'YES' : 'NO', 'Error:', chrome.runtime.lastError);
        
        if (chrome.runtime.lastError || !redirectUrl) {
          reject(chrome.runtime.lastError || new Error('Oturum açma iptal edildi veya başarısız oldu.'));
          return;
        }
        
        try {
          const url = new URL(redirectUrl);
          // Redirect URL'in hash (#) kısmından token'ı çıkarıyoruz
          const params = new URLSearchParams(url.hash.substring(1));
          const accessToken = params.get("access_token");

          if (!accessToken) {
            throw new Error("Google'dan Access token alınamadı.");
          }

          const credential = GoogleAuthProvider.credential(null, accessToken);
          const result = await signInWithCredential(auth, credential);
          const user = result.user;
          
          await this.checkAndSyncCloudData(user);
          await this.updateProfileUI(user);
          
          resolve(user);
        } catch (error) {
          reject(error);
        }
      });
    });
  },

  async logout() {
    try {
      await signOut(auth);
      // Sadece token'ı Chrome'dan temizlemek için:
      chrome.identity.getAuthToken({ interactive: false }, (token) => {
        if (token) {
          chrome.identity.removeCachedAuthToken({ token }, () => {});
        }
      });
      this.updateProfileUI(null);
      // Opsiyonel: Çıkış yapınca sayfayı yenilemek en temizi
      window.location.reload();
    } catch (err) {
      console.error('Logout error:', err);
    }
  },

  async checkAndSyncCloudData(user) {
    // Kullanıcı belgesini kontrol et
    const userRef = doc(db, 'users', user.uid);
    const docSnap = await getDoc(userRef);
    
    if (docSnap.exists()) {
      // Eski kullanıcı, verileri buluttan yerele çek
      const data = docSnap.data();
      if (data.settings) await chrome.storage.local.set(data.settings);
      if (data.shortcuts) await Storage.set('shortcuts', data.shortcuts);
      if (data.favorites) await Storage.set('favorites', data.favorites);
      // Yeniden render
      window.dispatchEvent(new Event('render_shortcuts_and_favorites'));
      window.dispatchEvent(new Event('cloud_data_loaded')); // Eğer app.js dinlerse
    } else {
      // Yeni kullanıcı, mevcut yerel verileri buluta yükle
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

    // Gerçek zamanlı güncellemeleri dinle
    onSnapshot(userRef, async (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data();
        if (data.settings) {
          // Storage.set kullanmıyoruz ki sonsuz döngü (Local->Cloud->Local) olmasın
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
    
    // Eğer kullanıcı giriş yapmışsa (veya yerel moda geçmişse) karşılama ekranını zorla kapat
    const modal = document.getElementById('welcomeModal');
    if (modal && modal.classList.contains('active')) {
      modal.classList.remove('active');
    }
    
    if (profileBox) {
      if (user) {
        profileBox.innerHTML = `
          <img src="${user.photoURL}" alt="Avatar" style="width:24px;height:24px;border-radius:50%;object-fit:cover;">
          <span>${user.email}</span>
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
          <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="G" style="width:18px;height:18px;"/>
          <span data-i18n="login_cloud">Oturum Aç (Bulut)</span>
        `;
        authBtn.onclick = async () => {
          try {
            await this.loginWithGoogle();
            window.location.reload();
          } catch (err) {
            console.error('Settings Login error:', err);
            alert('Giriş başarısız oldu: ' + (err.message || JSON.stringify(err)));
          }
        };
      }
    }
    
    // Dil değişimi için data-i18n tetiklemesi (Eğer sayfa yüklendikten sonra gelirse)
    if (window.I18n && typeof window.I18n.updateDOM === 'function') {
      window.I18n.updateDOM();
    }
  }
};
