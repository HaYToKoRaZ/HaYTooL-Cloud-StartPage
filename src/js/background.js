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

// ─── GitHub OAuth Köprüsü ────────────────────────────────────────────────────
// auth.html (websites dalı) girişten sonra buraya AUTH_SUCCESS mesajı atar.
// background.js bunu yakalar ve newtab.html'deki auth.js'e iletir.
chrome.runtime.onMessageExternal.addListener((request, sender, sendResponse) => {
  if (request.action === 'AUTH_SUCCESS' && request.token) {
    // Açık olan newtab sekmelerine EXTERNAL_AUTH_SUCCESS bildir
    chrome.tabs.query({ url: chrome.runtime.getURL('src/pages/newtab.html') }, (tabs) => {
      tabs.forEach(tab => {
        chrome.tabs.sendMessage(tab.id, {
          action: 'EXTERNAL_AUTH_SUCCESS',
          token: request.token
        });
      });
    });
    sendResponse({ ok: true });
  }
  return true; // async response için gerekli
});
