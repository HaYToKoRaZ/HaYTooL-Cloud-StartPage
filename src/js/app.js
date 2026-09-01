import { I18n }      from './i18n.js';
import { Storage }   from './storage.js';
import { Weather }   from './weather.js';
import { Shortcuts } from './shortcuts.js';
import { Favorites } from './favorites.js';
import { Settings }  from './settings.js';

/**
 * HaYTooL Cloud StartPage v2.0.0
 */
class StartPageApp {
  async init() {
    try {
      await I18n.init();
      await Settings.init();
      await Weather.init();
      await Favorites.init();
      await Shortcuts.init();
      this.initClock();
      
      this.initGlobalKeys();
      console.log('🚀 HaYTooL Cloud StartPage v2.0.0 – hazır.');
    } catch (err) {
      console.error('[App] Başlatma hatası:', err);
    }
  }

  initClock() {
    const tick = () => {
      const lang = I18n.currentLang === "tr" ? "tr-TR" : "en-US";
      let tz = undefined;
      if (Settings.config && Settings.config.timezone && Settings.config.timezone !== "auto") {
        tz = Settings.config.timezone;
      }
      
      let now;
      try {
        if (tz) {
          const dateStr = new Date().toLocaleString("en-US", { timeZone: tz });
          now = new Date(dateStr);
        } else {
          now = new Date();
        }
      } catch(e) {
        now = new Date();
      }

      const h   = String(now.getHours()).padStart(2,"0");
      const m   = String(now.getMinutes()).padStart(2,"0");
      const s   = String(now.getSeconds()).padStart(2,"0");
      
      const timeEl  = document.getElementById("digitalTime");
      const secEl   = document.getElementById("digitalSeconds");
      const dateEl  = document.getElementById("dateText");
      const greetEl = document.getElementById("greetingText");
      
      if (timeEl) timeEl.textContent = h + ":" + m;
      if (secEl)  secEl.textContent  = s;
      if (dateEl) {
        // İki satır olması için tarih ve ay ayırıyoruz
        const dayName = now.toLocaleDateString(lang, { weekday: "short" });
        const dayNum = now.toLocaleDateString(lang, { day: "numeric" });
        const monthName = now.toLocaleDateString(lang, { month: "short" });
        const year = now.toLocaleDateString(lang, { year: "numeric" });
        dateEl.innerHTML = `<div style="display:flex; align-items:center; gap:0.4rem; justify-content:center;">
          <div style="font-size: 1.8rem; font-weight: 800; background: linear-gradient(135deg, #38bdf8, #818cf8); -webkit-background-clip: text; -webkit-text-fill-color: transparent; text-shadow: 0 0 20px rgba(56, 189, 248, 0.4);">${dayNum}</div>
          <div style="text-align: left; line-height: 1.1;">
            <div style="font-size: 0.85rem; font-weight: 600; color: #f1f5f9;">${monthName}</div>
            <div style="font-size: 0.7rem; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.5px;">${dayName} ${year}</div>
          </div>
        </div>`;
      }
      
      if (greetEl) {
        const hr = now.getHours();
        let key  = "greeting_morning";
        if (hr>=12&&hr<17) key="greeting_afternoon";
        else if (hr>=17&&hr<22) key="greeting_evening";
        else if (hr>=22||hr<6) key="greeting_night";
        greetEl.textContent = I18n.t(key,"Hoş Geldiniz") + " 👋";
      }
    };
    tick(); setInterval(tick, 1000);
  }

  

  initGlobalKeys() {
    document.addEventListener('keydown', e => {
      if (e.key === 'Escape')
        document.querySelectorAll('.modal-overlay.active').forEach(el => el.classList.remove('active'));
    });
  }
}

document.addEventListener('DOMContentLoaded', () => new StartPageApp().init());