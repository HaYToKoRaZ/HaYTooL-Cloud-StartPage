import { Storage } from './storage.js';
import { I18n } from './i18n.js';

/**
 * HaYTooL Cloud StartPage - Hızlı Erişim & Favoriler Yöneticisi
 * Kategori bazlı gruplama + Tarayıcı favorileri (HTML) içe aktarma
 */
export const Shortcuts = {
  CATEGORIES_KEY: 'shortcut_categories',
  ITEMS_KEY: 'shortcuts_v2',

  // Varsayılan boş - kullanıcı kendi ekler/içe aktarır
  defaultCategories: [],
  defaultItems: [],

  categories: [],
  items: [],
  activeCategory: 'all',

  async init() {
    this.categories = await Storage.get(this.CATEGORIES_KEY, this.defaultCategories);
    this.items      = await Storage.get(this.ITEMS_KEY, this.defaultItems);
    this.activeCategory = 'all';
    this.renderCategoryTabs();
    this.renderGrid();
    this.setupModalListeners();
    this.setupBookmarkImport();
  },

  /* ---- Category Tab bar ---- */
  renderCategoryTabs() {
    const bar = document.getElementById('categoryTabBar');
    if (!bar) return;
    bar.innerHTML = '';

    // Kategori yoksa tab bar'ı gizle
    if (this.categories.length === 0) {
      bar.style.display = 'none';
      return;
    }
    bar.style.display = 'flex';

    // "Tümü" butonu
    const allBtn = this._makeTabBtn('all', '🌟', I18n.t('shortcuts_all', 'Tümü'));
    if (this.activeCategory === 'all') allBtn.classList.add('active');
    allBtn.addEventListener('click', () => this._switchCategory('all'));
    bar.appendChild(allBtn);

    this.categories.forEach(cat => {
      const btn = this._makeTabBtn(cat.id, cat.icon, cat.name);
      if (this.activeCategory === cat.id) btn.classList.add('active');
      btn.addEventListener('click', () => this._switchCategory(cat.id));
      bar.appendChild(btn);
    });
  },

  _makeTabBtn(id, icon, name) {
    const btn = document.createElement('button');
    btn.className = 'cat-tab-btn';
    btn.setAttribute('data-cat', id);
    btn.innerHTML = '<span class="cat-icon">' + icon + '</span><span class="cat-label">' + name + '</span>';
    return btn;
  },

  _switchCategory(catId) {
    this.activeCategory = catId;
    document.querySelectorAll('.cat-tab-btn').forEach(b => b.classList.remove('active'));
    const active = document.querySelector('[data-cat="' + catId + '"]');
    if (active) active.classList.add('active');
    this.renderGrid();
  },

  /* ---- Speed Dial Grid ---- */
  renderGrid() {
    const grid = document.getElementById('shortcutsGrid');
    if (!grid) return;
    grid.innerHTML = '';

    const hasItems = this.items.length > 0;

    if (!hasItems) {
      // Boş durum - içe aktarma yönlendirmesi
      const emptyEl = document.createElement('div');
      emptyEl.className = 'empty-state-main';
      emptyEl.innerHTML =
        '<div class="empty-icon">⭐</div>' +
        '<div class="empty-title">Henüz kısayol yok</div>' +
        '<div class="empty-desc">Tarayıcı favorilerinizi içe aktarın veya tek tek ekleyin.</div>' +
        '<div class="empty-actions">' +
          '<button class="btn-primary" id="emptyImportBtn">⭐ Favori İçe Aktar</button>' +
          '<button class="btn-secondary" id="emptyAddBtn">+ Manuel Ekle</button>' +
        '</div>';
      grid.appendChild(emptyEl);

      const importBtn = document.getElementById('emptyImportBtn');
      const addBtn    = document.getElementById('emptyAddBtn');
      if (importBtn) importBtn.addEventListener('click', () => document.getElementById('bookmarkFileInput')?.click());
      if (addBtn)    addBtn.addEventListener('click',    () => this.openAddModal());
      return;
    }

    if (this.activeCategory === 'all') {
      // Grup: kategori var mı?
      if (this.categories.length > 0) {
        const grouped = {};
        this.categories.forEach(cat => { grouped[cat.id] = []; });
        grouped['__other__'] = [];

        this.items.forEach(item => {
          if (grouped[item.categoryId] !== undefined) grouped[item.categoryId].push(item);
          else grouped['__other__'].push(item);
        });

        this.categories.forEach(cat => {
          if (grouped[cat.id].length === 0) return;
          grid.appendChild(this._makeCategorySection(cat, grouped[cat.id]));
        });
        if (grouped['__other__'].length > 0) {
          const other = { id: '__other__', name: 'Diğer', icon: '📁', color: '#64748b' };
          grid.appendChild(this._makeCategorySection(other, grouped['__other__']));
        }
      } else {
        // Kategori yok - düz liste
        const flat = { id: '_flat', name: 'Kısayollar', icon: '🔗', color: '#6366f1' };
        grid.appendChild(this._makeCategorySection(flat, this.items));
      }
    } else {
      const cat = this.categories.find(c => c.id === this.activeCategory);
      const filtered = this.items.filter(item => item.categoryId === this.activeCategory);
      if (cat && filtered.length > 0) {
        grid.appendChild(this._makeCategorySection(cat, filtered));
      } else {
        const emptyEl = document.createElement('div');
        emptyEl.className = 'empty-state';
        emptyEl.textContent = 'Bu kategoride henüz kısayol yok.';
        grid.appendChild(emptyEl);
      }
    }

    // "+ Ekle" butonu
    const addRow = document.createElement('div');
    addRow.className = 'shortcuts-add-row';
    const addBtn = document.createElement('button');
    addBtn.className = 'add-shortcut-btn';
    addBtn.innerHTML = '<span>+</span> <span>' + I18n.t('add_shortcut', 'Kısayol Ekle') + '</span>';
    addBtn.addEventListener('click', () => this.openAddModal());
    addRow.appendChild(addBtn);
    grid.appendChild(addRow);
  },

  _makeCategorySection(cat, items) {
    const section = document.createElement('div');
    section.className = 'shortcut-category-section';

    if (cat.id !== '_flat') {
      const header = document.createElement('div');
      header.className = 'shortcut-cat-header';
      header.innerHTML =
        '<span class="shortcut-cat-icon" style="color:' + (cat.color || '#6366f1') + '">' + (cat.icon || '📁') + '</span>' +
        '<span class="shortcut-cat-name">' + cat.name + '</span>' +
        '<span class="shortcut-cat-count">' + items.length + '</span>';
      section.appendChild(header);
    }

    const row = document.createElement('div');
    row.className = 'shortcuts-row';
    items.forEach(item => row.appendChild(this._makeShortcutCard(item)));
    section.appendChild(row);
    return section;
  },

  _makeShortcutCard(item) {
    const card = document.createElement('div');
    card.className = 'shortcut-card';

    const link = document.createElement('a');
    link.href = item.url;
    link.className = 'shortcut-link';
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    link.title = item.title;

    const iconBox = document.createElement('div');
    iconBox.className = 'shortcut-icon-box';

    if (item.icon && (item.icon.startsWith('http') || item.icon.startsWith('data:'))) {
      iconBox.innerHTML = '<img src="' + item.icon + '" alt="' + item.title + '" onerror="this.parentElement.textContent=\'🌐\'" />';
    } else if (item.icon && item.icon.trim() !== '') {
      iconBox.textContent = item.icon;
    } else {
      try {
        const domain = new URL(item.url).hostname;
        iconBox.innerHTML = '<img src="https://www.google.com/s2/favicons?domain=' + domain + '&sz=64" alt="' + item.title + '" onerror="this.parentElement.textContent=\'🌐\'" />';
      } catch(e) { iconBox.textContent = '🌐'; }
    }

    const label = document.createElement('div');
    label.className = 'shortcut-label';
    label.textContent = item.title;

    const delBtn = document.createElement('button');
    delBtn.className = 'shortcut-delete-btn';
    delBtn.innerHTML = '✕';
    delBtn.title = I18n.t('delete', 'Sil');
    delBtn.addEventListener('click', e => {
      e.preventDefault(); e.stopPropagation();
      this.removeItem(item.id);
    });

    link.appendChild(iconBox);
    link.appendChild(label);
    card.appendChild(link);
    card.appendChild(delBtn);
    return card;
  },

  /* ---- Add Modal ---- */
  setupModalListeners() {
    const modal    = document.getElementById('shortcutModal');
    const closeBtn = document.getElementById('closeShortcutModal');
    const form     = document.getElementById('shortcutForm');
    const catSel   = document.getElementById('shortcutCategorySelect');

    this._refreshCategorySelect(catSel);

    if (closeBtn) closeBtn.addEventListener('click', () => modal.classList.remove('active'));
    if (modal)    modal.addEventListener('click', e => { if (e.target === modal) modal.classList.remove('active'); });

    if (form) {
      form.addEventListener('submit', async e => {
        e.preventDefault();
        const title = document.getElementById('shortcutTitleInput').value.trim();
        let url     = document.getElementById('shortcutUrlInput').value.trim();
        const icon  = document.getElementById('shortcutIconInput').value.trim();
        const catId = catSel && catSel.value ? catSel.value : '';

        if (!url.startsWith('http://') && !url.startsWith('https://')) url = 'https://' + url;
        if (!title || !url) return;

        // Kategori yoksa seçim yok, categoryId boş bırak
        this.items.push({ id: Date.now().toString(), title, url, icon: icon || '', categoryId: catId });
        await Storage.set(this.ITEMS_KEY, this.items);
        this.renderCategoryTabs();
        this.renderGrid();
        modal.classList.remove('active');
        form.reset();
      });
    }
  },

  _refreshCategorySelect(catSel) {
    if (!catSel) return;
    catSel.innerHTML = '';
    if (this.categories.length === 0) {
      catSel.closest('.form-group').style.display = 'none';
      return;
    }
    catSel.closest('.form-group').style.display = '';
    this.categories.forEach(cat => {
      const opt = document.createElement('option');
      opt.value = cat.id;
      opt.textContent = cat.icon + ' ' + cat.name;
      catSel.appendChild(opt);
    });
    if (this.activeCategory !== 'all') catSel.value = this.activeCategory;
  },

  openAddModal() {
    const modal  = document.getElementById('shortcutModal');
    const catSel = document.getElementById('shortcutCategorySelect');
    this._refreshCategorySelect(catSel);
    if (modal) modal.classList.add('active');
    setTimeout(() => document.getElementById('shortcutTitleInput')?.focus(), 100);
  },

  async removeItem(id) {
    this.items = this.items.filter(item => item.id !== id);
    await Storage.set(this.ITEMS_KEY, this.items);
    this.renderGrid();
  },

  /* ============================================================
     BROWSER BOOKMARKS HTML IMPORTER
     Chrome / Firefox / Edge / Opera .html export desteği
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
        try {
          const parsed = this.parseBookmarkHtml(ev.target.result);
          await this.showImportPreview(parsed);
        } catch(err) {
          alert('Favori dosyası okunamadı:\n' + err.message);
        }
        importInput.value = '';
      };
      reader.readAsText(file, 'UTF-8');
    });
  },

  parseBookmarkHtml(html) {
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');
    const folders = [];

    const rootDl = doc.querySelector('DL, dl');
    if (!rootDl) throw new Error('Geçerli bir tarayıcı favorileri dosyası değil.');

    const processFolder = (dl, folderName) => {
      const fd = { name: folderName || 'Genel', items: [] };
      for (const dt of dl.children) {
        const tag = dt.tagName ? dt.tagName.toUpperCase() : '';
        if (tag !== 'DT' && tag !== 'P') continue;
        const h3    = dt.querySelector(':scope > H3, :scope > h3');
        const subDl = dt.querySelector(':scope > DL, :scope > dl');
        if (h3 && subDl) {
          const sub = processFolder(subDl, h3.textContent.trim());
          if (sub.items.length > 0) folders.push(sub);
        } else {
          const a = dt.querySelector(':scope > A, :scope > a');
          if (a && a.href && a.href.startsWith('http')) {
            fd.items.push({
              title: (a.textContent || a.href).trim().slice(0, 80),
              url: a.href,
              icon: a.getAttribute('ICON') || a.getAttribute('icon') || ''
            });
          }
        }
      }
      return fd;
    };

    const root = processFolder(rootDl, 'İçe Aktarılanlar');
    if (root.items.length > 0) folders.unshift(root);
    if (folders.length === 0) throw new Error('Hiç yer imi linki bulunamadı. Dosyanın tarayıcıdan dışa aktarılmış HTML olduğundan emin olun.');
    return folders;
  },

  async showImportPreview(folders) {
    const modal      = document.getElementById('importPreviewModal');
    const list       = document.getElementById('importFolderList');
    const summary    = document.getElementById('importSummaryText');
    const confirmBtn = document.getElementById('confirmImportBtn');
    const cancelBtn  = document.getElementById('cancelImportBtn');
    if (!modal || !list) return;

    const totalLinks = folders.reduce((acc, f) => acc + f.items.length, 0);
    if (summary) summary.textContent = folders.length + ' klasör • ' + totalLinks + ' link bulundu. İçe aktarılacakları seçin:';

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
      lbl.innerHTML =
        '<span class="import-folder-icon">📁</span>' +
        '<span class="import-folder-name">' + this._esc(folder.name) + '</span>' +
        '<span class="import-folder-count">' + folder.items.length + ' link</span>';
      row.appendChild(cb); row.appendChild(lbl);
      list.appendChild(row);
    });

    modal.classList.add('active');

    const handleConfirm = async () => {
      cleanup();
      modal.classList.remove('active');
      let addedCount = 0;

      for (const idx of selected) {
        const folder = folders[idx];
        let cat = this.categories.find(c => c.name.toLowerCase() === folder.name.toLowerCase());
        if (!cat) {
          cat = { id: 'import_' + Date.now() + '_' + idx, name: folder.name, icon: '📁', color: this._randomColor(), order: this.categories.length };
          this.categories.push(cat);
        }
        folder.items.forEach(item => {
          if (!this.items.find(i => i.url === item.url)) {
            this.items.push({ id: 'bm_' + Date.now() + '_' + Math.random().toString(36).slice(2), title: item.title, url: item.url, icon: item.icon || '', categoryId: cat.id });
            addedCount++;
          }
        });
      }

      await Storage.set(this.CATEGORIES_KEY, this.categories);
      await Storage.set(this.ITEMS_KEY, this.items);
      this.renderCategoryTabs();
      this.renderGrid();
      this._showToast('✅ ' + addedCount + ' favori başarıyla içe aktarıldı!');
    };

    const handleCancel = () => { cleanup(); modal.classList.remove('active'); };
    const cleanup = () => {
      confirmBtn.removeEventListener('click', handleConfirm);
      cancelBtn.removeEventListener('click', handleCancel);
    };

    confirmBtn.addEventListener('click', handleConfirm);
    cancelBtn.addEventListener('click', handleCancel);
    modal.addEventListener('click', e => { if (e.target === modal) handleCancel(); }, { once: true });
  },

  _esc(str) { return str.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); },
  _randomColor() {
    const c = ['#6366f1','#ec4899','#10b981','#f59e0b','#06b6d4','#8b5cf6','#f43f5e','#14b8a6','#3b82f6','#a78bfa'];
    return c[Math.floor(Math.random() * c.length)];
  },
  _showToast(msg) {
    const t = document.getElementById('toast');
    if (!t) return;
    t.textContent = msg;
    t.classList.add('show');
    setTimeout(() => t.classList.remove('show'), 3500);
  }
};