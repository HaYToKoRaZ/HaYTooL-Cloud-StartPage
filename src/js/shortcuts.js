import { Storage } from './storage.js';
import { I18n } from './i18n.js';

/**
 * HaYTooL Cloud StartPage - Hızlı Erişim & Favoriler Yöneticisi
 * Kategori bazlı gruplama + Tarayıcı favorileri (HTML) içe aktarma desteği
 */
export const Shortcuts = {
  CATEGORIES_KEY: 'shortcut_categories',
  ITEMS_KEY: 'shortcuts_v2',

  defaultCategories: [
    { id: 'general', name: 'Genel', color: '#6366f1', icon: '🌐', order: 0 },
    { id: 'social',  name: 'Sosyal', color: '#ec4899', icon: '💬', order: 1 },
    { id: 'dev',     name: 'Geliştirme', color: '#10b981', icon: '💻', order: 2 },
    { id: 'media',   name: 'Medya', color: '#f59e0b', icon: '🎬', order: 3 },
  ],

  defaultItems: [
    { id: 's1', title: 'Google',     url: 'https://google.com',     icon: '🔍', categoryId: 'general' },
    { id: 's2', title: 'YouTube',    url: 'https://youtube.com',    icon: '📺', categoryId: 'media'   },
    { id: 's3', title: 'GitHub',     url: 'https://github.com',     icon: '🐙', categoryId: 'dev'     },
    { id: 's4', title: 'ChatGPT',    url: 'https://chatgpt.com',    icon: '🤖', categoryId: 'dev'     },
    { id: 's5', title: 'Twitter/X',  url: 'https://x.com',         icon: '🐦', categoryId: 'social'  },
    { id: 's6', title: 'Reddit',     url: 'https://reddit.com',     icon: '👽', categoryId: 'social'  },
    { id: 's7', title: 'WhatsApp',   url: 'https://web.whatsapp.com',icon:'💬', categoryId: 'social'  },
    { id: 's8', title: 'Wikipedia',  url: 'https://wikipedia.org',  icon: '📚', categoryId: 'general' },
  ],

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

    // "Tümü" butonu
    const allBtn = this._makeTabBtn('all', '🌟', I18n.t('shortcuts_all', 'Tümü'));
    if (this.activeCategory === 'all') allBtn.classList.add('active');
    allBtn.addEventListener('click', () => this._switchCategory('all'));
    bar.appendChild(allBtn);

    // Kategori butonları
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

    const filtered = this.activeCategory === 'all'
      ? this.items
      : this.items.filter(item => item.categoryId === this.activeCategory);

    if (this.activeCategory === 'all') {
      // Group by category
      const grouped = {};
      this.categories.forEach(cat => { grouped[cat.id] = []; });
      grouped['__uncategorized__'] = [];

      this.items.forEach(item => {
        if (grouped[item.categoryId] !== undefined) grouped[item.categoryId].push(item);
        else grouped['__uncategorized__'].push(item);
      });

      this.categories.forEach(cat => {
        if (grouped[cat.id].length === 0) return;
        const section = this._makeCategorySection(cat, grouped[cat.id]);
        grid.appendChild(section);
      });
      if (grouped['__uncategorized__'].length > 0) {
        const uncat = { id: '__uncategorized__', name: 'Diğer', icon: '📁', color: '#64748b' };
        grid.appendChild(this._makeCategorySection(uncat, grouped['__uncategorized__']));
      }
    } else {
      // Flat grid for selected category
      const cat = this.categories.find(c => c.id === this.activeCategory);
      if (cat && filtered.length > 0) {
        grid.appendChild(this._makeCategorySection(cat, filtered));
      } else {
        grid.innerHTML = '<div class="empty-state">Bu kategoride henüz kısayol yok.<br>+ butonuna tıklayarak ekleyin.</div>';
      }
    }

    // "+ Ekle" butonu
    const addWrap = document.createElement('div');
    addWrap.className = 'shortcuts-add-row';
    const addBtn = document.createElement('button');
    addBtn.className = 'add-shortcut-btn';
    addBtn.innerHTML = '<span>+</span> <span>' + I18n.t('add_shortcut', 'Kısayol Ekle') + '</span>';
    addBtn.addEventListener('click', () => this.openAddModal());
    addWrap.appendChild(addBtn);
    grid.appendChild(addWrap);
  },

  _makeCategorySection(cat, items) {
    const section = document.createElement('div');
    section.className = 'shortcut-category-section';

    const header = document.createElement('div');
    header.className = 'shortcut-cat-header';
    header.innerHTML = '<span class="shortcut-cat-icon" style="color:' + (cat.color || '#6366f1') + '">' + (cat.icon || '📁') + '</span>' +
                       '<span class="shortcut-cat-name">' + cat.name + '</span>' +
                       '<span class="shortcut-cat-count">' + items.length + '</span>';
    section.appendChild(header);

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

    // Icon: emoji, image URL, or favicon fallback
    if (item.icon && (item.icon.startsWith('http') || item.icon.startsWith('data:'))) {
      iconBox.innerHTML = '<img src="' + item.icon + '" alt="' + item.title + '" onerror="this.parentElement.textContent=\'🌐\'" />';
    } else if (item.icon && item.icon.trim() !== '') {
      iconBox.textContent = item.icon;
    } else {
      // Google Favicon servis
      try {
        const domain = new URL(item.url).hostname;
        iconBox.innerHTML = '<img src="https://www.google.com/s2/favicons?domain=' + domain + '&sz=64" alt="' + item.title + '" onerror="this.parentElement.textContent=\'🌐\'" />';
      } catch(e) {
        iconBox.textContent = '🌐';
      }
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

  /* ---- Add / Edit Modal ---- */
  setupModalListeners() {
    const modal    = document.getElementById('shortcutModal');
    const closeBtn = document.getElementById('closeShortcutModal');
    const form     = document.getElementById('shortcutForm');
    const catSel   = document.getElementById('shortcutCategorySelect');

    // Populate category select
    if (catSel) {
      catSel.innerHTML = '';
      this.categories.forEach(cat => {
        const opt = document.createElement('option');
        opt.value = cat.id; opt.textContent = cat.icon + ' ' + cat.name;
        catSel.appendChild(opt);
      });
    }

    if (closeBtn) closeBtn.addEventListener('click', () => modal.classList.remove('active'));
    if (modal) modal.addEventListener('click', e => { if (e.target === modal) modal.classList.remove('active'); });

    if (form) {
      form.addEventListener('submit', async e => {
        e.preventDefault();
        const title = document.getElementById('shortcutTitleInput').value.trim();
        let url     = document.getElementById('shortcutUrlInput').value.trim();
        const icon  = document.getElementById('shortcutIconInput').value.trim();
        const catId = catSel ? catSel.value : (this.categories[0]?.id || 'general');

        if (!url.startsWith('http://') && !url.startsWith('https://')) url = 'https://' + url;
        if (!title || !url) return;

        this.items.push({ id: Date.now().toString(), title, url, icon: icon || '', categoryId: catId });
        await Storage.set(this.ITEMS_KEY, this.items);
        this.renderCategoryTabs();
        this.renderGrid();
        modal.classList.remove('active');
        form.reset();
      });
    }
  },

  openAddModal() {
    const modal  = document.getElementById('shortcutModal');
    const catSel = document.getElementById('shortcutCategorySelect');
    if (catSel && this.activeCategory !== 'all') catSel.value = this.activeCategory;
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
          const html = ev.target.result;
          const parsed = this.parseBookmarkHtml(html);
          await this.showImportPreview(parsed);
        } catch(err) {
          alert('Favori dosyası okunamadı: ' + err.message);
        }
        importInput.value = '';
      };
      reader.readAsText(file, 'UTF-8');
    });
  },

  /**
   * Tarayıcı HTML favori dosyasını ayrıştırır
   * @param {string} html - Ham HTML içeriği
   * @returns {Array<{name:string, items:Array}>}
   */
  parseBookmarkHtml(html) {
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');
    const folders = [];

    // Netscape Bookmark Format: DL > DT > H3 (folder) + DL > DT > A (link)
    const rootDl = doc.querySelector('DL, dl');
    if (!rootDl) throw new Error('Geçerli bir tarayıcı favorileri dosyası değil (DL etiketi bulunamadı).');

    const processFolder = (dl, folderName) => {
      const folderData = { name: folderName || 'Genel', items: [] };
      const children = dl.children;

      for (const dt of children) {
        const tagName = dt.tagName ? dt.tagName.toUpperCase() : '';
        if (tagName !== 'DT' && tagName !== 'P') continue;

        const h3 = dt.querySelector(':scope > H3, :scope > h3');
        const subDl = dt.querySelector(':scope > DL, :scope > dl');

        if (h3 && subDl) {
          // Sub-folder → create as separate folder
          const sub = processFolder(subDl, h3.textContent.trim());
          if (sub.items.length > 0) folders.push(sub);
        } else {
          const a = dt.querySelector(':scope > A, :scope > a');
          if (a && a.href && a.href.startsWith('http')) {
            folderData.items.push({
              title: (a.textContent || a.href).trim().slice(0, 60),
              url: a.href,
              icon: a.getAttribute('ICON') || a.getAttribute('icon') || ''
            });
          }
        }
      }
      return folderData;
    };

    const rootFolder = processFolder(rootDl, 'İçe Aktarılanlar');
    if (rootFolder.items.length > 0) folders.unshift(rootFolder);

    if (folders.length === 0) throw new Error('Hiç yer imi linki bulunamadı. Dosyanın tarayıcıdan dışa aktarılmış HTML olduğundan emin olun.');
    return folders;
  },

  /**
   * İçe aktarma önizleme modalını gösterir
   * @param {Array} folders
   */
  async showImportPreview(folders) {
    const modal   = document.getElementById('importPreviewModal');
    const list    = document.getElementById('importFolderList');
    const summary = document.getElementById('importSummaryText');
    const confirmBtn = document.getElementById('confirmImportBtn');
    const cancelBtn  = document.getElementById('cancelImportBtn');
    if (!modal || !list) return;

    const totalLinks = folders.reduce((acc, f) => acc + f.items.length, 0);
    if (summary) {
      summary.textContent = folders.length + ' klasör • ' + totalLinks + ' link bulundu. İçe aktarılacakları seçin:';
    }

    list.innerHTML = '';
    const selectedFolders = new Set(folders.map((_, i) => i));

    folders.forEach((folder, idx) => {
      const row = document.createElement('div');
      row.className = 'import-folder-row';

      const cb = document.createElement('input');
      cb.type = 'checkbox'; cb.id = 'ifolder_' + idx; cb.checked = true;
      cb.addEventListener('change', () => {
        if (cb.checked) selectedFolders.add(idx); else selectedFolders.delete(idx);
      });

      const label = document.createElement('label');
      label.htmlFor = 'ifolder_' + idx;
      label.innerHTML = '<span class="import-folder-icon">📁</span>' +
        '<span class="import-folder-name">' + this._esc(folder.name) + '</span>' +
        '<span class="import-folder-count">' + folder.items.length + ' link</span>';

      row.appendChild(cb);
      row.appendChild(label);
      list.appendChild(row);
    });

    modal.classList.add('active');

    // Confirm Import
    const handleConfirm = async () => {
      confirmBtn.removeEventListener('click', handleConfirm);
      cancelBtn.removeEventListener('click', handleCancel);
      modal.classList.remove('active');

      let addedCount = 0;
      for (const idx of selectedFolders) {
        const folder = folders[idx];
        // Find or create category for this folder
        let cat = this.categories.find(c => c.name.toLowerCase() === folder.name.toLowerCase());
        if (!cat) {
          cat = {
            id: 'import_' + Date.now() + '_' + idx,
            name: folder.name,
            icon: '📁',
            color: this._randomColor(),
            order: this.categories.length
          };
          this.categories.push(cat);
        }

        folder.items.forEach(item => {
          // Skip duplicates
          const exists = this.items.find(i => i.url === item.url);
          if (!exists) {
            this.items.push({
              id: 'bm_' + Date.now() + '_' + Math.random().toString(36).slice(2),
              title: item.title,
              url: item.url,
              icon: item.icon || '',
              categoryId: cat.id
            });
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

    const handleCancel = () => {
      confirmBtn.removeEventListener('click', handleConfirm);
      cancelBtn.removeEventListener('click', handleCancel);
      modal.classList.remove('active');
    };

    if (confirmBtn) confirmBtn.addEventListener('click', handleConfirm);
    if (cancelBtn)  cancelBtn.addEventListener('click', handleCancel);
    if (modal) modal.addEventListener('click', e => { if (e.target === modal) handleCancel(); });
  },

  _esc(str) {
    return str.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  },

  _randomColor() {
    const colors = ['#6366f1','#ec4899','#10b981','#f59e0b','#06b6d4','#8b5cf6','#f43f5e','#14b8a6'];
    return colors[Math.floor(Math.random() * colors.length)];
  },

  _showToast(msg) {
    const toast = document.getElementById('toast');
    if (!toast) return;
    toast.textContent = msg;
    toast.classList.add('show');
    setTimeout(() => toast.classList.remove('show'), 3500);
  }
};