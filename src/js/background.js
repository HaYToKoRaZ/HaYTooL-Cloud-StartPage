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

// ─── GitHub OAuth Köprüsü ───────────────────────────────────────────────────
chrome.runtime.onMessageExternal.addListener((request, sender, sendResponse) => {
  if (request.action === 'AUTH_SUCCESS' && request.token) {
    const token = request.token;

    // 1) Token'ı storage'a kaydet (mesaj başarısız olsa bile sonraki açılışta kullanılır)
    chrome.storage.local.set({ _pending_auth_token: token }, () => {
      // 2) Açık newtab sekmelerine mesaj gönder
      chrome.tabs.query({}, (allTabs) => {
        allTabs.forEach(tab => {
          if (!tab.id) return;
          const url = tab.url || '';
          if (
            url.startsWith(chrome.runtime.getURL('src/pages/')) ||
            url === 'chrome://newtab/' ||
            url.includes('newtab')
          ) {
            chrome.tabs.sendMessage(tab.id, {
              action: 'EXTERNAL_AUTH_SUCCESS',
              token: token
            }, () => {
              if (chrome.runtime.lastError) {
                console.warn('[BG] Tab msg error:', chrome.runtime.lastError.message);
              }
            });
          }
        });
      });
    });

    sendResponse({ ok: true });
  }
  return true;
});
