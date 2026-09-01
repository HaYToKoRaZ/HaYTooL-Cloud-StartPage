chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: "open_settings",
    title: "Ayarları Aç / Open Settings",
    contexts: ["action"]
  });
});

chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === "open_settings") {
    // Open new tab page with #settings hash to automatically trigger settings modal
    chrome.tabs.create({ url: "chrome://newtab/#settings" });
  }
});
