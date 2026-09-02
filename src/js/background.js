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
// auth.html (websites) girişten sonra buraya AUTH_SUCCESS mesajı atar.
// background.js bunu yakalar ve tüm chrome:// sekmeleri dahil newtab'a iletir.
chrome.runtime.onMessageExternal.addListener((request, sender, sendResponse) => {
  if (request.action === 'AUTH_SUCCESS' && request.token) {
    const token = request.token;

    // chrome.tabs.query ile override edilen newtab sayfasını bul
    // Hem chrome://newtab/ hem de eklenti URL'si ile eşleşir
    chrome.tabs.query({}, (allTabs) => {
      let sent = false;
      allTabs.forEach(tab => {
        const url = tab.url || '';
        if (
          url.startsWith(chrome.runtime.getURL('src/pages/newtab.html')) ||
          url === 'chrome://newtab/' ||
          url.includes('newtab')
        ) {
          chrome.tabs.sendMessage(tab.id, {
            action: 'EXTERNAL_AUTH_SUCCESS',
            token: token
          }, () => {
            if (chrome.runtime.lastError) {
              console.warn('[BG] Tab mesaj hatası:', chrome.runtime.lastError.message);
            }
          });
          sent = true;
        }
      });

      if (!sent) {
        console.warn('[BG] Aktif newtab sekmesi bulunamadı, yeni sekme açılıyor...');
      }
    });

    sendResponse({ ok: true });
  }
  return true;
});
