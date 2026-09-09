// Pre-render script to prevent FOUC & layout jitter (runs immediately before body render)
try {
  const raw = localStorage.getItem('haytool_app_settings');
  if (raw) {
    const cfg = JSON.parse(raw);
    if (cfg.theme) document.documentElement.setAttribute('data-theme', cfg.theme);
    if (cfg.folderColumns) {
      document.documentElement.setAttribute('data-cols', cfg.folderColumns);
    }
  }
} catch (e) {}
