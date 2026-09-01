import { Storage } from './storage.js';

export const Shortcuts = {
  CAT_KEY:       'shortcut_categories',
  ITEMS_KEY:     'shortcuts_v2',
  COLLAPSED_KEY: 'collapsed_folders',
  VIEW_KEY:      'folder_views',      // { [catId]: 'icon' | 'list' | 'shortlist' }

  categories:      [],
  items:           [],
  collapsedFolders:new Set(),
  folderViews:     {},

  COLORS: ['#6366f1','#ec4899','#10b981','#f59e0b','#06b6d4','#8b5cf6','#f43f5e','#14b8a6','#3b82f6','#a78bfa','#fb923c','#34d399','#e11d48','#0891b2'],
  colorIdx: 0,

  async init() {
    this.categories       = await Storage.get(this.CAT_KEY, []);
    this.items            = await Storage.get(this.ITEMS_KEY, []);
    const coll            = await Storage.get(this.COLLAPSED_KEY, []);
    this.collapsedFolders = new Set(coll);
    this.folderViews      = await Storage.get(this.VIEW_KEY, {});
    this.colorIdx         = this.categories.length % this.COLORS.length;

    this.renderFolders();
    this.setupShortcutModal();
    this.setupBookmarkImport();
    this.setupRenameModal();
  },

  renderFolders() {
    const grid = document.getElementById('shortcutsGrid');
    if (!grid) return;
    grid.innerHTML = '';

    if (this.categories.length === 0 && this.items.length === 0) {
      grid.appendChild(this._emptyState());
      return;
    }

    const grouped = {};
    this.categories.forEach(c => { grouped[c.id] = []; });
    grouped['__other__'] = [];
    this.items.forEach(item => {
      if (grouped[item.categoryId] !== undefined) grouped[item.categoryId].push(item);
      else grouped['__other__'].push(item);
    });

    this.categories.forEach(cat => {
      grid.appendChild(this._makeFolderCard(cat, grouped[cat.id] || []));
    });
    if (grouped['__other__'].length > 0) {
      const other = { id: '__other__', name: 'Diğer', icon: '📁', color: '#64748b' };
      grid.appendChild(this._makeFolderCard(other, grouped['__other__']));
    }

    const addCard = document.createElement('div');
    addCard.className = 'folder-card folder-add-card';
    addCard.innerHTML = '<button class="folder-add-btn" id="globalAddLinkBtn"><span style="font-size:1.5rem">+</span><span>Link Ekle</span></button>';
    grid.appendChild(addCard);
    document.getElementById('globalAddLinkBtn')?.addEventListener('click', () => this.openAddLinkModal());
  },

  _makeFolderCard(cat, items) {
    const isCollapsed = this.collapsedFolders.has(cat.id);
    const view        = this.folderViews[cat.id] || 'icon';

    const card = document.createElement('div');
    card.className = 'folder-card' + (isCollapsed ? ' collapsed' : '');
    card.setAttribute('data-folder-id', cat.id);
    card.style.setProperty('--fc', cat.color || '#6366f1');

    /* --- Header --- */
    const header = document.createElement('div');
    header.className = 'folder-header';

    const arrow = document.createElement('span');
    arrow.className = 'folder-arrow';
    arrow.textContent = '▶';

    const ico = document.createElement('span');
    ico.className = 'folder-emoji';
    ico.textContent = cat.icon || '📁';

    const namEl = document.createElement('span');
    namEl.className = 'folder-name';
    namEl.textContent = cat.name;

    const cnt = document.createElement('span');
    cnt.className = 'folder-count';
    cnt.textContent = items.length;

    const optBtn = document.createElement('button');
    optBtn.className = 'folder-opt-btn';
    optBtn.innerHTML = '⋯';
    optBtn.title = 'Klasör Seçenekleri';
    optBtn.addEventListener('click', e => {
      e.stopPropagation();
      this._showFolderMenu(e, cat, items.length, card);
    });

    header.appendChild(arrow);
    header.appendChild(ico);
    header.appendChild(namEl);
    header.appendChild(cnt);
    header.appendChild(optBtn);

    header.addEventListener('click', async e => {
      if (e.target.closest('.folder-opt-btn')) return;
      card.classList.toggle('collapsed');
      if (card.classList.contains('collapsed')) this.collapsedFolders.add(cat.id);
      else this.collapsedFolders.delete(cat.id);
      await Storage.set(this.COLLAPSED_KEY, [...this.collapsedFolders]);
    });

    /* --- Body --- */
    const body = document.createElement('div');
    // Kısa Liste = liste görünümü + 10 limitli özel davranış
    body.className = 'folder-body ' + (view === 'icon' ? 'view-icon' : 'view-list');
    body.setAttribute('data-view', view);

    const limit = 10;
    const isShortlist = (view === 'shortlist');
    
    items.forEach((item, idx) => {
      const el = this._makeLinkItem(item, view);
      if (isShortlist && idx >= limit) {
        el.style.display = 'none';
        el.classList.add('shortlist-hidden');
      }
      body.appendChild(el);
    });

    if (isShortlist && items.length > limit) {
      const moreBtn = document.createElement('button');
      moreBtn.className = 'show-more-btn';
      moreBtn.textContent = 'Daha fazla göster (' + (items.length - limit) + ') ▾';
      moreBtn.addEventListener('click', () => {
        body.querySelectorAll('.shortlist-hidden').forEach(el => el.style.display = 'flex');
        moreBtn.style.display = 'none';
      });
      body.appendChild(moreBtn);
    }

    const addLinkBtn = document.createElement('button');
    addLinkBtn.className = 'add-to-folder-btn';
    addLinkBtn.innerHTML = view === 'icon' ? '<span>+</span>' : '<span>+</span><span>Link Ekle</span>';
    addLinkBtn.addEventListener('click', () => this.openAddLinkModal(cat.id));
    body.appendChild(addLinkBtn);

    card.appendChild(header);
    card.appendChild(body);
    return card;
  },

  _makeLinkItem(item, view) {
    const wrap = document.createElement('div');
    wrap.className = 'link-item';

    const icon = this._iconEl(item);

    if (view === 'icon') {
      const a = document.createElement('a');
      a.href = item.url; a.target = '_blank'; a.rel = 'noopener noreferrer';
      a.className = 'link-icon-card';
      a.title = item.title;

      const del = document.createElement('button');
      del.className = 'link-del-btn';
      del.innerHTML = '✕';
      del.addEventListener('click', async e => {
        e.preventDefault(); e.stopPropagation();
        this.items = this.items.filter(i => i.id !== item.id);
        await Storage.set(this.ITEMS_KEY, this.items);
        this.renderFolders();
      });

      const lbl = document.createElement('div');
      lbl.className = 'link-icon-label';
      lbl.textContent = item.title;

      a.appendChild(icon);
      a.appendChild(lbl);
      wrap.appendChild(a);
      wrap.appendChild(del);

    } else {
      const a = document.createElement('a');
      a.href = item.url; a.target = '_blank'; a.rel = 'noopener noreferrer';
      a.className = 'link-list-row';
      a.title = item.url;

      const urlSpan = document.createElement('span');
      urlSpan.className = 'link-list-url';
      try { urlSpan.textContent = new URL(item.url).hostname; } catch(e) { urlSpan.textContent = item.url; }

      const titleSpan = document.createElement('span');
      titleSpan.className = 'link-list-title';
      titleSpan.textContent = item.title;

      const del = document.createElement('button');
      del.className = 'link-del-btn link-del-list';
      del.innerHTML = '✕';
      del.addEventListener('click', async e => {
        e.preventDefault(); e.stopPropagation();
        this.items = this.items.filter(i => i.id !== item.id);
        await Storage.set(this.ITEMS_KEY, this.items);
        this.renderFolders();
      });

      a.appendChild(icon);
      a.appendChild(titleSpan);
      a.appendChild(urlSpan);
      wrap.appendChild(a);
      wrap.appendChild(del);
    }
    return wrap;
  },

  _iconEl(item) {
    const box = document.createElement('div');
    box.className = 'link-fav-icon';
    if (item.icon && (item.icon.startsWith('http') || item.icon.startsWith('data:'))) {
      box.innerHTML = '<img src="' + item.icon + '" alt="" onerror="this.parentElement.textContent=\'🌐\'">';
    } else if (item.icon && item.icon.trim()) {
      box.textContent = item.icon;
    } else {
      try {
        const d = new URL(item.url).hostname;
        box.innerHTML = '<img src="https://www.google.com/s2/favicons?domain=' + d + '&sz=64" alt="" onerror="this.parentElement.textContent=\'🌐\'">';
      } catch(e) { box.textContent = '🌐'; }
    }
    return box;
  },

  _showFolderMenu(e, cat, count, card) {
    const menu = document.getElementById('contextMenu');
    if (!menu) return;
    menu.innerHTML = '';
    menu.style.display = 'block';

    const view = this.folderViews[cat.id] || 'icon';
    const check = v => view === v ? '✓ ' : '　';

    const opts = [
      { label: check('icon') + '⊞ İkon Görünümü', action: () => this._setView(cat.id, 'icon') },
      { label: check('list') + '📋 Tam Liste Görünümü', action: () => this._setView(cat.id, 'list') },
      { label: check('shortlist') + '📃 Kısa Liste (10 Link)', action: () => this._setView(cat.id, 'shortlist') },
      { separator: true },
      { label: '+ Link Ekle', action: () => this.openAddLinkModal(cat.id) },
      { label: '✏️ Yeniden Adlandır', action: () => this._openRenameModal(cat) },
      { separator: true },
      { label: '🗑 Klasörü Sil', danger: true, action: async () => {
          if (!confirm('"' + cat.name + '" klasörü ve ' + count + ' linki silinecek. Emin misiniz?')) return;
          this.categories = this.categories.filter(c => c.id !== cat.id);
          this.items      = this.items.filter(i => i.categoryId !== cat.id);
          await Storage.set(this.CAT_KEY, this.categories);
          await Storage.set(this.ITEMS_KEY, this.items);
          this.renderFolders();
        }
      }
    ];

    opts.forEach(opt => {
      if (opt.separator) {
        const sep = document.createElement('div');
        sep.className = 'ctx-sep'; menu.appendChild(sep); return;
      }
      const btn = document.createElement('button');
      btn.className = 'ctx-item' + (opt.danger ? ' ctx-danger' : '');
      btn.textContent = opt.label;
      btn.addEventListener('click', () => { this._closeMenu(); opt.action(); });
      menu.appendChild(btn);
    });

    const x = Math.min(e.clientX, window.innerWidth - 200);
    const y = Math.min(e.clientY + 8, window.innerHeight - menu.offsetHeight - 20);
    menu.style.left = x + 'px'; menu.style.top = y + 'px';

    setTimeout(() => document.addEventListener('click', () => this._closeMenu(), { once: true }), 50);
  },

  async _setView(catId, viewType) {
    this.folderViews[catId] = viewType;
    await Storage.set(this.VIEW_KEY, this.folderViews);
    this.renderFolders();
  },

  _closeMenu() {
    const m = document.getElementById('contextMenu');
    if (m) m.style.display = 'none';
  },

  setupShortcutModal() {
    const modal   = document.getElementById('shortcutModal');
    const form    = document.getElementById('shortcutForm');
    const closeB  = document.getElementById('closeShortcutModal');
    const closeF  = document.getElementById('closeShortcutModalFooter');
    if (closeB)  closeB.addEventListener('click',  () => modal.classList.remove('active'));
    if (closeF)  closeF.addEventListener('click',  () => modal.classList.remove('active'));
    if (modal)   modal.addEventListener('click', e => { if (e.target === modal) modal.classList.remove('active'); });
    if (form) {
      form.addEventListener('submit', async e => {
        e.preventDefault();
        const title  = document.getElementById('shortcutTitleInput').value.trim();
        let url      = document.getElementById('shortcutUrlInput').value.trim();
        const icon   = document.getElementById('shortcutIconInput').value.trim();
        const catId  = document.getElementById('shortcutTargetCatId').value || (this.categories[0]?.id || '');
        if (!url.startsWith('http')) url = 'https://' + url;
        if (!title || !url) return;
        this.items.push({ id: Date.now().toString(), title, url, icon, categoryId: catId });
        await Storage.set(this.ITEMS_KEY, this.items);
        this.renderFolders();
        modal.classList.remove('active');
        form.reset();
      });
    }
  },

  openAddLinkModal(catId) {
    const modal   = document.getElementById('shortcutModal');
    const title   = document.getElementById('shortcutModalTitle');
    const catInput= document.getElementById('shortcutTargetCatId');
    const cat     = catId ? this.categories.find(c => c.id === catId) : null;
    if (title)    title.textContent = cat ? '"' + cat.name + '" klasörüne Link Ekle' : 'Link Ekle';
    if (catInput) catInput.value = catId || (this.categories[0]?.id || '');
    modal.classList.add('active');
    setTimeout(() => document.getElementById('shortcutTitleInput')?.focus(), 100);
  },

  setupRenameModal() {
    const modal   = document.getElementById('renameModal');
    const closeB  = document.getElementById('closeRenameModal');
    const cancelB = document.getElementById('cancelRenameModal');
    const confirmB= document.getElementById('confirmRenameModal');
    if (closeB)  closeB.addEventListener('click',  () => modal.classList.remove('active'));
    if (cancelB) cancelB.addEventListener('click', () => modal.classList.remove('active'));
    if (modal)   modal.addEventListener('click', e => { if (e.target === modal) modal.classList.remove('active'); });
    if (confirmB) {
      confirmB.addEventListener('click', async () => {
        const catId = modal.getAttribute('data-cat-id');
        const cat   = this.categories.find(c => c.id === catId);
        if (!cat) return;
        const newName = document.getElementById('renameInput').value.trim();
        const newIcon = document.getElementById('renameIconInput').value.trim();
        if (newName) cat.name = newName;
        if (newIcon) cat.icon = newIcon;
        await Storage.set(this.CAT_KEY, this.categories);
        this.renderFolders();
        modal.classList.remove('active');
      });
    }
  },

  _openRenameModal(cat) {
    const modal = document.getElementById('renameModal');
    modal.setAttribute('data-cat-id', cat.id);
    document.getElementById('renameInput').value    = cat.name;
    document.getElementById('renameIconInput').value = cat.icon || '';
    modal.classList.add('active');
    setTimeout(() => document.getElementById('renameInput')?.focus(), 100);
  },

  setupBookmarkImport() {
    const btn   = document.getElementById('bookmarkImportBtn');
    const input = document.getElementById('bookmarkFileInput');
    if (!btn || !input) return;
    btn.addEventListener('click', () => input.click());
    input.addEventListener('change', e => {
      const file = e.target.files[0]; if (!file) return;
      const r = new FileReader();
      r.onload = async ev => {
        try { await this.showImportPreview(this.parseBookmarkHtml(ev.target.result)); }
        catch(err) { alert('Dosya okunamadı:\n' + err.message); }
        input.value = '';
      };
      r.readAsText(file, 'UTF-8');
    });
  },

  parseBookmarkHtml(html) {
    const doc = new DOMParser().parseFromString(html, 'text/html');
    const folders = [];
    const rootDl = doc.querySelector('DL, dl');
    if (!rootDl) throw new Error('Geçerli bir tarayıcı favorileri dosyası değil.');

    const processFolder = (dl, name) => {
      const fd = { name: name || 'Genel', items: [] };
      for (const dt of dl.children) {
        const tag = (dt.tagName || '').toUpperCase();
        if (tag !== 'DT' && tag !== 'P') continue;
        const h3    = dt.querySelector(':scope > H3, :scope > h3');
        const subDl = dt.querySelector(':scope > DL, :scope > dl');
        if (h3 && subDl) {
          const sub = processFolder(subDl, h3.textContent.trim());
          if (sub.items.length) folders.push(sub);
        } else {
          const a = dt.querySelector(':scope > A, :scope > a');
          if (a && a.href && a.href.startsWith('http'))
            fd.items.push({ title: (a.textContent || a.href).trim().slice(0,80), url: a.href, icon: a.getAttribute('ICON') || a.getAttribute('icon') || '' });
        }
      }
      return fd;
    };

    const root = processFolder(rootDl, 'İçe Aktarılanlar');
    if (root.items.length) folders.unshift(root);
    if (!folders.length) throw new Error('Hiç yer imi bulunamadı.');
    return folders;
  },

  async showImportPreview(folders) {
    const modal = document.getElementById('importPreviewModal');
    const list  = document.getElementById('importFolderList');
    const sumEl = document.getElementById('importSummaryText');
    const cfBtn = document.getElementById('confirmImportBtn');
    const caBtn = document.getElementById('cancelImportBtn');
    const caHdr = document.getElementById('cancelImportBtnHeader');
    if (!modal || !list) return;

    const total = folders.reduce((a, f) => a + f.items.length, 0);
    if (sumEl) sumEl.textContent = folders.length + ' klasör • ' + total + ' link. İçe aktarılacakları seçin:';

    list.innerHTML = '';
    const sel = new Set(folders.map((_, i) => i));

    folders.forEach((folder, idx) => {
      const row = document.createElement('div');
      row.className = 'import-folder-row';
      const cb = document.createElement('input');
      cb.type = 'checkbox'; cb.id = 'if_' + idx; cb.checked = true;
      cb.addEventListener('change', () => { if (cb.checked) sel.add(idx); else sel.delete(idx); });
      const lbl = document.createElement('label');
      lbl.htmlFor = 'if_' + idx;
      lbl.innerHTML = '<span class="import-folder-icon">📁</span><span class="import-folder-name">' + this._esc(folder.name) + '</span><span class="import-folder-count">' + folder.items.length + ' link</span>';
      row.appendChild(cb); row.appendChild(lbl);
      list.appendChild(row);
    });

    modal.classList.add('active');
    const cleanup = () => { cfBtn.removeEventListener('click', doImport); caBtn.removeEventListener('click', doCancel); if (caHdr) caHdr.removeEventListener('click', doCancel); };
    const doCancel = () => { cleanup(); modal.classList.remove('active'); };
    const doImport = async () => {
      cleanup(); modal.classList.remove('active');
      let added = 0;
      for (const idx of sel) {
        const folder = folders[idx];
        let cat = this.categories.find(c => c.name.toLowerCase() === folder.name.toLowerCase());
        if (!cat) {
          const color = this.COLORS[this.colorIdx % this.COLORS.length]; this.colorIdx++;
          cat = { id: 'imp_' + Date.now() + '_' + idx, name: folder.name, icon: '📁', color, order: this.categories.length };
          this.categories.push(cat);
        }
        folder.items.forEach(item => {
          if (!this.items.find(i => i.url === item.url)) {
            this.items.push({ id: 'bm_' + Date.now() + '_' + Math.random().toString(36).slice(2), title: item.title, url: item.url, icon: item.icon || '', categoryId: cat.id });
            added++;
          }
        });
      }
      await Storage.set(this.CAT_KEY, this.categories);
      await Storage.set(this.ITEMS_KEY, this.items);
      this.renderFolders();
      this._toast('✅ ' + added + ' favori aktarıldı!');
    };

    cfBtn.addEventListener('click', doImport);
    caBtn.addEventListener('click', doCancel);
    if (caHdr) caHdr.addEventListener('click', doCancel);
    modal.addEventListener('click', e => { if (e.target === modal) doCancel(); }, { once: true });
  },

  _emptyState() {
    const el = document.createElement('div');
    el.className = 'empty-state-main';
    el.style.gridColumn = '1 / -1';
    el.innerHTML = '<div class="empty-icon">⭐</div><div class="empty-title">Henüz klasör yok</div><div class="empty-desc">Tarayıcı favorilerinizi içe aktarın — klasörler otomatik oluşur.</div><div class="empty-actions"><button class="btn-primary" id="emptyImportBtn">⭐ Favori İçe Aktar</button><button class="btn-secondary" id="emptyAddBtn">+ Link Ekle</button></div>';
    setTimeout(() => {
      document.getElementById('emptyImportBtn')?.addEventListener('click', () => document.getElementById('bookmarkFileInput')?.click());
      document.getElementById('emptyAddBtn')?.addEventListener('click', () => this.openAddLinkModal());
    }, 0);
    return el;
  },

  _esc(s) { return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); },
  _toast(msg) {
    const t = document.getElementById('toast'); if (!t) return;
    t.textContent = msg; t.classList.add('show'); setTimeout(() => t.classList.remove('show'), 3500);
  }
};