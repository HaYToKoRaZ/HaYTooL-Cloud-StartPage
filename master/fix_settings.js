const fs = require('fs');
let content = fs.readFileSync('src/js/settings.js', 'utf8');

content = content.replace("timezone: 'auto', iconApi: 'iconhorse',", "timezone: 'auto', iconApi: 'iconhorse', showImportBtn: true,");

const btnVis = 
    const importBtn = document.getElementById('bookmarkImportBtn');
    if (importBtn) importBtn.style.display = this.config.showImportBtn !== false ? 'inline-flex' : 'none';

    const favBarSec;
content = content.replace("    const favBarSec", btnVis);

const autoSaveToggle = 
        const nFav = document.getElementById('toggleFavBar').checked;
        if (nFav !== config.showFavBar) { config.showFavBar = nFav; changed = true; }

        const nImport = document.getElementById('toggleImportBtn')?.checked;
        if (nImport !== undefined && nImport !== config.showImportBtn) { config.showImportBtn = nImport; changed = true; }
;
content = content.replace(        const nFav = document.getElementById('toggleFavBar').checked;
        if (nFav !== config.showFavBar) { config.showFavBar = nFav; changed = true; }, autoSaveToggle);

const populateToggle = 
    const tFavBar = document.getElementById('toggleFavBar');
    if (tFavBar) tFavBar.checked = this.config.showFavBar !== false;

    const tImportBtn = document.getElementById('toggleImportBtn');
    if (tImportBtn) tImportBtn.checked = this.config.showImportBtn !== false;
;
content = content.replace(    const tFavBar = document.getElementById('toggleFavBar');
    if (tFavBar) tFavBar.checked = this.config.showFavBar !== false;, populateToggle);

const htmlExport = 
    const expBtn = document.getElementById('exportDataBtn');
    if (expBtn) {
      expBtn.addEventListener('click', async () => {
        const allData = await Storage.getAll();
        const blob = new Blob([JSON.stringify(allData, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'haytool_backup_' + new Date().toISOString().slice(0,10) + '.json';
        a.click();
        URL.revokeObjectURL(url);
        this.toast(I18n.t('toast_backup_downloaded', 'Yedek indirildi'));
      });
    }

    const expHtmlBtn = document.getElementById('exportHtmlBtn');
    if (expHtmlBtn) {
      expHtmlBtn.addEventListener('click', async () => {
        const favs = await Storage.get('favorites_bar', []);
        const cats = await Storage.get('shortcut_categories', []);
        const items = await Storage.get('shortcuts_v2', []);
        
        let html = \<!DOCTYPE NETSCAPE-Bookmark-file-1>
<META HTTP-EQUIV="Content-Type" CONTENT="text/html; charset=UTF-8">
<TITLE>Bookmarks</TITLE>
<H1>Bookmarks</H1>
<DL><p>
\;
        
        if (favs && favs.length > 0) {
          html += \    <DT><H3>HaYTooL Favorites</H3>\\n    <DL><p>\\n\;
          favs.forEach(f => {
            html += \        <DT><A HREF="\">\</A>\\n\;
          });
          html += \    </DL><p>\\n\;
        }

        if (cats && cats.length > 0) {
          cats.forEach(c => {
            const cItems = items.filter(i => i.categoryId === c.id);
            if (cItems.length > 0) {
              html += \    <DT><H3>\</H3>\\n    <DL><p>\\n\;
              cItems.forEach(i => {
                html += \        <DT><A HREF="\">\</A>\\n\;
              });
              html += \    </DL><p>\\n\;
            }
          });
        }

        html += \</DL><p>\\n\;

        const blob = new Blob([html], { type: 'text/html' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'haytool_bookmarks_' + new Date().toISOString().slice(0,10) + '.html';
        a.click();
        URL.revokeObjectURL(url);
        this.toast(I18n.t('toast_backup_downloaded', 'HTML yer imleri dışa aktarıldı!'));
      });
    }
;

content = content.replace(/    const expBtn = document\.getElementById\('exportDataBtn'\);\s+if \(expBtn\) \{[\s\S]*?\}\s+if \(impInp\)/m, htmlExport + '\\n    const impInp = document.getElementById(\\'importDataInput\\');\\n    if (impInp)');

fs.writeFileSync('src/js/settings.js', content, 'utf8');
