import { Storage } from './storage.js';
import { I18n } from './i18n.js';

/**
 * HaYTooL Cloud StartPage - Tam Sayfa Accordion Klasör + Favoriler İçe Aktarma
 */
export const Shortcuts = {
  CATEGORIES_KEY: 'shortcut_categories',
  ITEMS_KEY: 'shortcuts_v2',
  COLLAPSED_KEY: 'collapsed_folders',

  categories: [],
  items: [],
  collapsedFolders: new Set(),

  FOLDER_COLORS: ['#6366f1','#ec4899','#10b981','#f59e0b','#06b6d4','#8b5cf6','#f43f5e','#14b8a6','#3b82f6','#a78bfa','#fb923c','#34d399'],
  colorIndex: 0,

  async init() {
    this.categories      = await Storage.get(this.CATEGORIES_KEY, []);
    this.items           = await Storage.get(this.ITEMS_KEY, []);
    const saved          = await Storage.get(this.COLLAPSED_KEY, []);
    this.collapsedFolders = new Set(saved);
    this.colorIndex      = this.categories.length % this.FOLDER_COLORS.length;

    this.renderFolders();
    this.setupModalListeners();
    this.setupBookmarkImport();
  },

  /* ============================================================
     RENDER: Tam sayfa accordion klasörler
     ============================================================ */
  renderFolders() {
    const grid = document.getElementById('shortcutsGrid');
    if (!grid) return;
    grid.innerHTML = '';

    if (this.items.length === 0 && this.categories.length === 0) {
      grid.appendChild(this._emptyState());
      return;
    }

    // Kategorisiz öğeler için geçici grup
    const grouped = {};
    this.categories.forEach(c => { grouped[c.id] = []; });
    grouped['__other__'] = [];

    this.items.forEach(item => {
      if (grouped[item.categoryId] !== undefined) grouped[item.categoryId].push(item);
      else grouped['__other__'].push(item);
    });

    // Her kategori için accordion kart
    this.categories.forEach(cat => {
      const folderItems = grouped[cat.id] || [];
      grid.appendChild(this._makeFolderCard(cat, folderItems));
    });

    // Kategorisiz öğeler
    if (grouped['__other__'].length > 0) {
      const other = { id: '__other__', name: 'Diğer', icon: '📁', color: '#64748b' };
      grid.appendChild(this._makeFolderCard(other, grouped['__other__']));
    }

    // Genel "+ Klasör / Kısayol ekle" satırı
    const addRow = document.createElement('div');
    addRow.style.cssText = 'display:flex;justify-content:center;padding:0.75rem 0 0.25rem;';
    const addBtn = document.createElement('button');
    addBtn.className = 'add-shortcut-btn';
    addBtn.innerHTML = '<span>+</span> <span>Manuel Kısayol Ekle</span>';
    addBtn.addEventListener('click', () => this.openAddModal());
    addRow.appendChild(addBtn);
    grid.appendChild(addRow);
  },

  _makeFolderCard(cat, items) {
    const isCollapsed = this.collapsedFolders.has(cat.id);
    const card = document.createElement('div');
    card.className = 'folder-card' + (isCollapsed ? ' collapsed' : '');
    card.setAttribute('data-folder-id', cat.id);
    card.style.setProperty('--folder-accent', cat.color || '#6366f1');

    // --- Header ---
    const header = document.createElement('div');
    header.className = 'folder-header';

    const collapseIcon = document.createElement('span');
    collapseIcon.className = 'folder-collapse-icon';
    collapseIcon.textContent = '▶';

    const emoji = document.createElement('span');
    emoji.className = 'folder-emoji';
    emoji.textContent = cat.icon || '📁';

    const name = document.createElement('span');
    name.className = 'folder-name';
    name.textContent = cat.name;

    const count = document.createElement('span');
    count.className = 'folder-count';
    count.textContent = items.length + ' link';

    // Folder action buttons
    const actions = document.createElement('div');
    actions.className = 'folder-actions';

    const deleteFolderBtn = document.createElement('button');
    deleteFolderBtn.className = 'folder-action-btn';
    deleteFolderBtn.title = 'Klasörü sil';
    deleteFolderBtn.textContent = '🗑';
    deleteFolderBtn.addEventListener('click', async e => {
      e.stopPropagation();
      if (!confirm('"' + cat.name + '" klasörü ve içindeki tüm linkler silinecek. Emin misiniz?')) return;
      this.categories = this.categories.filter(c => c.id !== cat.id);
      this.items = this.items.filter(i => i.categoryId !== cat.id);
      await Storage.set(this.CATEGORIES_KEY, this.categories);
      await Storage.set(this.ITEMS_KEY, this.items);
      this.renderFolders();
    });
    actions.appendChild(deleteFolderBtn);

    header.appendChild(collapseIcon);
    header.appendChild(emoji);
    header.appendChild(name);
    header.appendChild(count);
    header.appendChild(actions);

    // Toggle collapse on header click
    header.addEventListener('click', async e => {
      if (e.target.closest('.folder-actions')) return;
      card.classList.toggle('collapsed');
      if (card.classList.contains('collapsed')) {
        this.collapsedFolders.add(cat.id);
      } else {
        this.collapsedFolders.delete(cat.id);
      }
      await Storage.set(this.COLLAPSED_KEY, [...this.collapsedFolders]);
    });

    // --- Body ---
    const body = document.createElement('div');
    body.className = 'folder-body';

    items.forEach(item => body.appendChild(this._makeLinkChip(item)));

    // "+ Link ekle" chip
    const addChip = document.createElement('button');
    addChip.className = 'add-link-chip';
    addChip.innerHTML = '<span>+</span>';
    addChip.title = 'Bu klasöre link ekle';
    addChip.addEventListener('click', () => {
      const catSel = document.getElementById('shortcutCategorySelect');
      if (catSel) catSel.value = cat.id;
      this.openAddModal(cat.id);
    });
    body.appendChild(addChip);

    card.appendChild(header);
    card.appendChild(body);
    return card;
  },

  _makeLinkChip(item) {
    const wrapper = document.createElement('div');
    wrapper.style.position = 'relative';
    wrapper.style.display = 'inline-flex';

    const a = document.createElement('a');
    a.className = 'link-chip';
    a.href = item.url;
    a.target = '_blank';
    a.rel = 'noopener noreferrer';
    a.title = item.url;

    const iconEl = document.createElement('span');
    iconEl.className = 'link-chip-icon';
    if (item.icon && (item.icon.startsWith('http') || item.icon.startsWith('data:'))) {
      iconEl.innerHTML = '<img src="' + item.icon + '" alt="" onerror="this.parentElement.textContent=\'🌐\'" />';
    } else if (item.icon && item.icon.trim()) {
      iconEl.textContent = item.icon;
    } else {
      try {
        const domain = new URL(item.url).hostname;
        iconEl.innerHTML = '<img src="https://www.google.com/s2/favicons?domain=' + domain + '&sz=32" alt="" onerror="this.parentElement.textContent=\'🌐\'" />';
      } catch(e) { iconEl.textContent = '🌐'; }
    }

    const label = document.createElement('span');
    label.className = 'link-chip-label';
    label.textContent = item.title;

    const delBtn = document.createElement('button');
    delBtn.className = 'link-chip-del';
    delBtn.innerHTML = '✕';
    delBtn.title = 'Sil';
    delBtn.addEventListener('click', async e => {
      e.preventDefault(); e.stopPropagation();
      this.items = this.items.filter(i => i.id !== item.id);
      await Storage.set(this.ITEMS_KEY, this.items);
      this.renderFolders();
    });

    a.appendChild(iconEl);
    a.appendChild(label);
    a.appendChild(delBtn);
    wrapper.appendChild(a);
    return wrapper;
  },

  _emptyState() {
    const el = document.createElement('div');
    el.className = 'empty-state-main';
    el.innerHTML =
      '<div class="empty-icon">⭐</div>' +
      '<div class="empty-title">Henüz klasör veya kısayol yok</div>' +
      '<div class="empty-desc">Tarayıcı favorilerinizi (.html) içe aktarın — klasörler otomatik oluşur. Ya da tek tek link ekleyebilirsiniz.</div>' +
      '<div class="empty-actions">' +
        '<button class="btn-primary" id="emptyImportBtn">⭐ Favori İçe Aktar</button>' +
        '<button class="btn-secondary" id="emptyAddBtn">+ Manuel Ekle</button>' +
      '</div>';
    setTimeout(() => {
      document.getElementById('emptyImportBtn')?.addEventListener('click', () => document.getElementById('bookmarkFileInput')?.click());
      document.getElementById('emptyAddBtn')?.addEventListener('click', () => this.openAddModal());
    }, 0);
    return el;
  },

  /* ---- Add Modal ---- */
  setupModalListeners() {
    const modal    = document.getElementById('shortcutModal');
    const closeBtn = document.getElementById('closeShortcutModal');
    const closeFooter = document.getElementById('closeShortcutModalFooter');
    const form     = document.getElementById('shortcutForm');
    const catSel   = document.getElementById('shortcutCategorySelect');

    if (closeBtn)    closeBtn.addEventListener('click',    () => modal.classList.remove('active'));
    if (closeFooter) closeFooter.addEventListener('click', () => modal.classList.remove('active'));
    if (modal)       modal.addEventListener('click', e => { if (e.target === modal) modal.classList.remove('active'); });

    if (form) {
      form.addEventListener('submit', async e => {
        e.preventDefault();
        const title = document.getElementById('shortcutTitleInput').value.trim();
        let url     = document.getElementById('shortcutUrlInput').value.trim();
        const icon  = document.getElementById('shortcutIconInput').value.trim();
        const catId = catSel && catSel.value ? catSel.value : (this.categories[0]?.id || '');

        if (!url.startsWith('http://') && !url.startsWith('https://')) url = 'https://' + url;
        if (!title || !url) return;

        this.items.push({ id: Date.now().toString(), title, url, icon: icon || '', categoryId: catId });
        await Storage.set(this.ITEMS_KEY, this.items);
        this.renderFolders();
        modal.classList.remove('active');
        form.reset();
      });
    }
  },

  openAddModal(preferCatId) {
    const modal  = document.getElementById('shortcutModal');
    const catSel = document.getElementById('shortcutCategorySelect');
    const catGroup = document.getElementById('catSelectGroup');

    if (catSel) {
      catSel.innerHTML = '';
      if (this.categories.length > 0) {
        if (catGroup) catGroup.style.display = '';
        this.categories.forEach(cat => {
          const opt = document.createElement('option');
          opt.value = cat.id;
          opt.textContent = cat.icon + ' ' + cat.name;
          catSel.appendChild(opt);
        });
        if (preferCatId) catSel.value = preferCatId;
      } else {
        if (catGroup) catGroup.style.display = 'none';
      }
    }

    if (modal) modal.classList.add('active');
    setTimeout(() => document.getElementById('shortcutTitleInput')?.focus(), 100);
  },

  /* ============================================================
     BOOKMARK IMPORTER
     ============================================================ */
  setupBookmarkImport() {
    const importBtn   = document.getElementById('bookmarkImportBtn');
    const importInput = document.getElementById('bookmarkFileInput');
    if (!importBtn || !importInput) return;

    importBtn.addEventListener('click', () => importInput.click());
    importInput.addEventListener('change', e => {
      const file = e.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = async ev => {
        try { await this.showImportPreview(this.parseBookmarkHtml(ev.target.result)); }
        catch(err) { alert('Favori dosyası okunamadı:\n' + err.message); }
        importInput.value = '';
      };
      reader.readAsText(file, 'UTF-8');
    });
  },

  parseBookmarkHtml(html) {
    const doc = new DOMParser().parseFromString(html, 'text/html');
    const folders = [];
    const rootDl = doc.querySelector('DL, dl');
    if (!rootDl) throw new Error('Geçerli bir tarayıcı favorileri dosyası değil.');

    const processFolder = (dl, folderName) => {
      const fd = { name: folderName || 'Genel', items: [] };
      for (const dt of dl.children) {
        const tag = (dt.tagName || '').toUpperCase();
        if (tag !== 'DT' && tag !== 'P') continue;
        const h3    = dt.querySelector(':scope > H3, :scope > h3');
        const subDl = dt.querySelector(':scope > DL, :scope > dl');
        if (h3 && subDl) {
          const sub = processFolder(subDl, h3.textContent.trim());
          if (sub.items.length > 0) folders.push(sub);
        } else {
          const a = dt.querySelector(':scope > A, :scope > a');
          if (a && a.href && a.href.startsWith('http')) {
            fd.items.push({ title: (a.textContent || a.href).trim().slice(0, 80), url: a.href, icon: a.getAttribute('ICON') || a.getAttribute('icon') || '' });
          }
        }
      }
      return fd;
    };

    const root = processFolder(rootDl, 'İçe Aktarılanlar');
    if (root.items.length > 0) folders.unshift(root);
    if (folders.length === 0) throw new Error('Hiç yer imi linki bulunamadı.');
    return folders;
  },

  async showImportPreview(folders) {
    const modal      = document.getElementById('importPreviewModal');
    const list       = document.getElementById('importFolderList');
    const summary    = document.getElementById('importSummaryText');
    const confirmBtn = document.getElementById('confirmImportBtn');
    const cancelBtn  = document.getElementById('cancelImportBtn');
    const cancelHdr  = document.getElementById('cancelImportBtnHeader');
    if (!modal || !list) return;

    const total = folders.reduce((a, f) => a + f.items.length, 0);
    if (summary) summary.textContent = folders.length + ' klasör • ' + total + ' link bulundu. İçe aktarılacakları seçin:';

    list.innerHTML = '';
    const selected = new Set(folders.map((_, i) => i));

    folders.forEach((folder, idx) => {
      const row = document.createElement('div');
      row.className = 'import-folder-row';
      const cb = document.createElement('input');
      cb.type = 'checkbox'; cb.id = 'ifolder_' + idx; cb.checked = true;
      cb.addEventListener('change', () => { if (cb.checked) selected.add(idx); else selected.delete(idx); });
      const lbl = document.createElement('label');
      lbl.htmlFor = 'ifolder_' + idx;
      lbl.innerHTML = '<span class="import-folder-icon">📁</span><span class="import-folder-name">' + this._esc(folder.name) + '</span><span class="import-folder-count">' + folder.items.length + ' link</span>';
      row.appendChild(cb); row.appendChild(lbl);
      list.appendChild(row);
    });

    modal.classList.add('active');

    const cleanup = () => {
      confirmBtn.removeEventListener('click', doImport);
      cancelBtn.removeEventListener('click', doCancel);
      if (cancelHdr) cancelHdr.removeEventListener('click', doCancel);
    };

    const doCancel = () => { cleanup(); modal.classList.remove('active'); };
    const doImport = async () => {
      cleanup();
      modal.classList.remove('active');
      let added = 0;

      for (const idx of selected) {
        const folder = folders[idx];
        let cat = this.categories.find(c => c.name.toLowerCase() === folder.name.toLowerCase());
        if (!cat) {
          const color = this.FOLDER_COLORS[this.colorIndex % this.FOLDER_COLORS.length];
          this.colorIndex++;
          cat = { id: 'import_' + Date.now() + '_' + idx, name: folder.name, icon: '📁', color, order: this.categories.length };
          this.categories.push(cat);
        }
        folder.items.forEach(item => {
          if (!this.items.find(i => i.url === item.url)) {
            this.items.push({ id: 'bm_' + Date.now() + '_' + Math.random().toString(36).slice(2), title: item.title, url: item.url, icon: item.icon || '', categoryId: cat.id });
            added++;
          }
        });
      }

      await Storage.set(this.CATEGORIES_KEY, this.categories);
      await Storage.set(this.ITEMS_KEY, this.items);
      this.renderFolders();
      this._toast('✅ ' + added + ' favori aktarıldı!');
    };

    confirmBtn.addEventListener('click', doImport);
    cancelBtn.addEventListener('click', doCancel);
    if (cancelHdr) cancelHdr.addEventListener('click', doCancel);
    modal.addEventListener('click', e => { if (e.target === modal) doCancel(); }, { once: true });
  },

  _esc(str) { return str.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); },
  _toast(msg) {
    const t = document.getElementById('toast');
    if (!t) return;
    t.textContent = msg; t.classList.add('show');
    setTimeout(() => t.classList.remove('show'), 3500);
  }
};