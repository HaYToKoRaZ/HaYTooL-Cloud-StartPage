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

// ─── Gizli Sekmede Açma Köprüsü (Incognito) ──────────────────────────────────
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'OPEN_INCOGNITO' && request.url) {
    if (chrome.windows && chrome.windows.create) {
      chrome.windows.create({ url: request.url, incognito: true }, (win) => {
        if (chrome.runtime.lastError || !win) {
          console.warn('[Background] Gizli pencere açılamadı (İzin verilmemiş olabilir):', chrome.runtime.lastError);
          sendResponse({ ok: false, error: chrome.runtime.lastError ? chrome.runtime.lastError.message : 'Gizli mod izni verilmemiş' });
        } else {
          sendResponse({ ok: true });
        }
      });
      return true; // Asenkron yanıt için
    } else {
      sendResponse({ ok: false, error: 'chrome.windows API mevcut değil' });
    }
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

// ─── HaYTooL Pulse Telemetri (Merkezi Canlı Kullanıcı Sayacı) ──────────────────
(function() {
  const TELEMETRY_URL = 'https://hayto-telemetry.korazhayto.workers.dev/api/ping';
  const APP_ID = 'cloud_startpage';
  const sessionId = 'ext_' + Math.random().toString(36).substring(2, 15);
  let isFirst = true;

  async function sendPulse() {
    try {
      await fetch(TELEMETRY_URL, {
        method: 'POST',
        mode: 'cors',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ app: APP_ID, session_id: sessionId, is_new_session: isFirst })
      });
      isFirst = false;
    } catch (e) {}
  }

  sendPulse();
  if (chrome.alarms) {
    chrome.alarms.create('pulse_alarm', { periodInMinutes: 2 });
    chrome.alarms.onAlarm.addListener(a => { if (a.name === 'pulse_alarm') sendPulse(); });
  } else {
    setInterval(sendPulse, 2 * 60 * 1000);
  }
})();
