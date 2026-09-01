import { Storage } from './storage.js';
import { I18n } from './i18n.js';

export const Settings = {
  config: { theme:'dark', bgStyle:'aurora', customBgUrl:'', showClock:true, showSeconds:true, showGreeting:true, showWeather:true, showFavBar:true, showQuote:true },
  async init() {
    const saved = await Storage.get('app_settings', {});
    this.config = { ...this.config, ...saved };
    this.apply();
    this.setupListeners();
  },
  apply() {
    document.documentElement.setAttribute('data-theme', this.config.theme);
    document.body.className = '';
    const bg = document.getElementById('bgLayer');
    if (bg) {
      if (this.config.customBgUrl) { bg.style.backgroundImage='url("'+this.config.customBgUrl+'")'; bg.style.opacity='0.85'; }
      else { bg.style.backgroundImage='none'; document.body.classList.add('bg-preset-'+this.config.bgStyle); }
    }
    this.vis('headerClockWidget', this.config.showClock);
    this.vis('digitalSeconds',    this.config.showSeconds);
    this.vis('greetingText',      this.config.showGreeting);
    this.vis('weatherBadge',      this.config.showWeather);
    this.vis('favBarSection',     this.config.showFavBar);
    this.vis('quoteBox',          this.config.showQuote);
  },
  vis(id,show) { const el=document.getElementById(id); if(el) el.style.display=show?'':'none'; },
  setupListeners() {
    const modal=document.getElementById('settingsModal');
    const openBtn=document.getElementById('settingsBtn');
    const closeBtn=document.getElementById('closeSettingsModal');
    const saveBtn=document.getElementById('saveSettingsBtn');
    const exportBtn=document.getElementById('exportDataBtn');
    const importInput=document.getElementById('importDataInput');
    const resetBtn=document.getElementById('resetSettingsBtn');
    if(openBtn) openBtn.addEventListener('click',()=>{this.populate();modal.classList.add('active');});
    if(closeBtn) closeBtn.addEventListener('click',()=>modal.classList.remove('active'));
    if(modal) modal.addEventListener('click',e=>{if(e.target===modal)modal.classList.remove('active');});
    if(document.getElementById('themeSelect'))
      document.getElementById('themeSelect').addEventListener('change',()=>document.documentElement.setAttribute('data-theme',document.getElementById('themeSelect').value));
    if(saveBtn) {
      saveBtn.addEventListener('click',async()=>{
        this.config.theme        = document.getElementById('themeSelect').value;
        this.config.bgStyle      = document.getElementById('bgSelect').value;
        this.config.customBgUrl  = document.getElementById('customBgInput').value.trim();
        this.config.showClock    = document.getElementById('toggleClock').checked;
        this.config.showSeconds  = document.getElementById('toggleSeconds').checked;
        this.config.showGreeting = document.getElementById('toggleGreeting').checked;
        this.config.showWeather  = document.getElementById('toggleWeather').checked;
        this.config.showFavBar   = document.getElementById('toggleFavBar').checked;
        this.config.showQuote    = document.getElementById('toggleQuote').checked;
        const ls=document.getElementById('langSelect');
        if(ls&&ls.value!==I18n.currentLang) await I18n.setLanguage(ls.value);
        await Storage.set('app_settings',this.config);
        this.apply();
        modal.classList.remove('active');
        this.toast('✅ Ayarlar kaydedildi!');
      });
    }
    if(exportBtn) exportBtn.addEventListener('click',async()=>{
      const data=await Storage.getAll();
      const blob=new Blob([JSON.stringify(data,null,2)],{type:'application/json'});
      const url=URL.createObjectURL(blob);
      const a=document.createElement('a');a.href=url;a.download='haytool_backup_'+Date.now()+'.json';a.click();URL.revokeObjectURL(url);
    });
    if(importInput) importInput.addEventListener('change',e=>{
      const f=e.target.files[0];if(!f)return;
      const r=new FileReader();
      r.onload=async ev=>{try{const d=JSON.parse(ev.target.result);for(const[k,v]of Object.entries(d))await Storage.set(k,v);this.toast('✅ Veriler yüklendi!');setTimeout(()=>window.location.reload(),1200);}catch{alert('Hatalı JSON!');}};
      r.readAsText(f);
    });
    if(resetBtn) resetBtn.addEventListener('click',async()=>{
      if(!confirm('Tüm veriler silinecek. Emin misiniz?'))return;
      for(const k of['app_settings','shortcuts_v2','shortcut_categories','collapsed_folders','folder_views','favorites_bar']) await Storage.remove(k);
      window.location.reload();
    });
  },
  populate() {
    const f=(id,v)=>{const el=document.getElementById(id);if(el)el.value=v;};
    const t=(id,v)=>{const el=document.getElementById(id);if(el)el.checked=!!v;};
    f('themeSelect',this.config.theme);f('bgSelect',this.config.bgStyle);f('customBgInput',this.config.customBgUrl);f('langSelect',I18n.currentLang);
    t('toggleClock',this.config.showClock);t('toggleSeconds',this.config.showSeconds);t('toggleGreeting',this.config.showGreeting);
    t('toggleWeather',this.config.showWeather);t('toggleFavBar',this.config.showFavBar);t('toggleQuote',this.config.showQuote);
  },
  toast(msg){const t=document.getElementById('toast');if(!t)return;t.textContent=msg;t.classList.add('show');setTimeout(()=>t.classList.remove('show'),3000);}
};