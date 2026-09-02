chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: "open_settings",
    title: "Ayarları Aç / Open Settings",
    contexts: ["action"]
  });
});

chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === "open_settings") {
    chrome.tabs.create({ url: chrome.runtime.getURL("src/pages/newtab.html#settings") });
  }
});

// ─── GitHub OAuth Köprüsü (Güvenlik Korumalı & Anında Tetikleyici) ─────────────
chrome.runtime.onMessageExternal.addListener((request, sender, sendResponse) => {
  // GÜVENLİK KONTROLÜ: Yalnızca kendi GitHub Pages auth sitemizden gelen çağrıları kabul et
  const senderUrl = sender.url || '';
  if (!senderUrl.startsWith('https://haytokoraz.github.io/')) {
    console.warn('[BG Security] Yetkisiz dış kaynaktan gelen oturum açma isteği engellendi:', senderUrl);
    sendResponse({ ok: false, error: 'Yetkisiz kaynak.' });
    return;
  }

  if (request.action === 'AUTH_SUCCESS' && request.token) {
    const token = request.token;

    // 1) Token'ı storage'a yaz -> chrome.storage.onChanged anında tüm sekmelerde 0ms gecikmeyle tetiklenir!
    chrome.storage.local.set({ _pending_auth_token: token }, () => {
      // 2) Eklenti geneline (açık newtab sayfalarına) anında mesaj fırlat
      chrome.runtime.sendMessage({
        action: 'EXTERNAL_AUTH_SUCCESS',
        token: token
      }).catch(() => {});

      // 3) Açık olan tüm sekmelere URL iznine takılmadan doğrudan tab.id ile yayın yap
      chrome.tabs.query({}, (allTabs) => {
        allTabs.forEach(tab => {
          if (!tab || !tab.id) return;
          chrome.tabs.sendMessage(tab.id, {
            action: 'EXTERNAL_AUTH_SUCCESS',
            token: token
          }).catch(() => {});
        });
      });
    });

    sendResponse({ ok: true });
  }
  return true;
});
