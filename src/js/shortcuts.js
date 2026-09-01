import { I18n } from './i18n.js';
import { Storage } from './storage.js';
import { Favorites } from './favorites.js';
import { Settings } from './settings.js';

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

    const numCols = parseInt(document.body.getAttribute('data-cols')) || 3;
    this.categories.forEach((cat, idx) => {
      if (typeof cat.col !== 'number') cat.col = (idx % numCols) + 1;
      if (typeof cat.order !== 'number') cat.order = idx;
    });
    this.categories.sort((a, b) => {
      if (a.col !== b.col) return a.col - b.col;
      return a.order - b.order;
    });

    this.renderFolders();
    this.setupShortcutModal();
    this.setupBookmarkImport();
      this.setupCollapseExpandAll();
    this.setupRenameModal();
    
    const grid = document.getElementById('shortcutsGrid');
    if (grid) {
      grid.addEventListener('dragover', e => {
        if (!e.target.closest('.folder-card')) e.preventDefault();
      });
      grid.addEventListener('drop', async e => {
        if (e.target.closest('.folder-card')) return; // Zaten card iinde hllediliyor
        e.preventDefault();
        const draggedId = e.dataTransfer.getData('text/plain');
        if (!draggedId) return;
        
        const rect = grid.getBoundingClientRect();
        const numCols = parseInt(document.body.getAttribute('data-cols')) || 3;
        const colWidth = rect.width / numCols;
        const targetCol = Math.min(numCols, Math.max(1, Math.ceil((e.clientX - rect.left) / colWidth)));
        
        const cat = this.categories.find(c => c.id === draggedId);
        if (cat) {
          cat.col = targetCol;
          cat.order = Date.now(); // En sona at
          this.categories.sort((a, b) => {
            if (a.col !== b.col) return a.col - b.col;
            return a.order - b.order;
          });
          this.categories.forEach((c, i) => c.order = i);
          await Storage.set(this.CAT_KEY, this.categories);
          this.renderFolders();
        }
      });
    }
    window.addEventListener('resize', () => {
      clearTimeout(this._resizeTimer);
      this._resizeTimer = setTimeout(() => this.applyMasonry(), 100);
    });
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
      const other = { id: '__other__', name: I18n.t('folder_other', 'Other'), icon: '📁', color: '#64748b' };
      grid.appendChild(this._makeFolderCard(other, grouped['__other__']));
    }

    const addCard = document.createElement('div');
    addCard.className = 'folder-card folder-add-card';
    addCard.innerHTML = '<button class="folder-add-btn" id="globalAddLinkBtn"><span style="font-size:1.5rem">+</span><span>' + I18n.t('add_shortcut', 'Add Link') + '</span></button>';
    grid.appendChild(addCard);
    document.getElementById('globalAddLinkBtn')?.addEventListener('click', () => this.openAddLinkModal());
    this.applyMasonry();
  },

  _makeFolderCard(cat, items) {
    const isCollapsed = this.collapsedFolders.has(cat.id);
    const view        = this.folderViews[cat.id] || 'icon';

    const card = document.createElement('div');
    card.className = 'folder-card' + (isCollapsed ? ' collapsed' : '');
    card.setAttribute('data-folder-id', cat.id);
    card.style.setProperty('--fc', cat.color || '#6366f1');
    if (cat.id !== '__other__') {
      const numCols = parseInt(document.body.getAttribute('data-cols')) || 3;
      card.style.gridColumn = Math.min(cat.col || 1, numCols);
    }

    // --- Srkle brak mant (Drag & Drop) ---
    if (cat.id !== '__other__') {
      card.setAttribute('draggable', 'true');
      card.style.cursor = 'grab';

      card.addEventListener('dragstart', e => {
        if (e.target.closest('.folder-body')) {
          e.preventDefault(); return; // Folder iini srklemeyi engelle
        }
        e.dataTransfer.setData('text/plain', cat.id);
        setTimeout(() => card.style.opacity = '0.5', 0);
      });

      card.addEventListener('dragend', () => {
        card.style.opacity = '1';
        document.querySelectorAll('.folder-card').forEach(c => {
          c.style.borderTop = '';
          c.style.borderBottom = '';
        });
      });

      card.addEventListener('dragover', e => {
        e.preventDefault();
        const bounding = card.getBoundingClientRect();
        const offset = bounding.y + (bounding.height / 2);
        if (e.clientY - offset > 0) {
          card.style.borderBottom = '2px solid var(--accent)';
          card.style.borderTop = '';
        } else {
          card.style.borderTop = '2px solid var(--accent)';
          card.style.borderBottom = '';
        }
      });

      card.addEventListener('dragleave', e => {
        card.style.borderTop = '';
        card.style.borderBottom = '';
      });

      card.addEventListener('drop', async e => {
        e.preventDefault();
        card.style.borderTop = '';
        card.style.borderBottom = '';
        
        const draggedId = e.dataTransfer.getData('text/plain');
        if (!draggedId || draggedId === cat.id) return;

        const draggedIdx = this.categories.findIndex(c => c.id === draggedId);
        const dropIdx = this.categories.findIndex(c => c.id === cat.id);
        
        if (draggedIdx === -1 || dropIdx === -1) return;

        const bounding = card.getBoundingClientRect();
        const offset = bounding.y + (bounding.height / 2);
        const insertAfter = (e.clientY - offset > 0);

        const draggedCat = this.categories[draggedIdx];
        const dropCat = this.categories[dropIdx];

        draggedCat.col = dropCat.col;
        draggedCat.order = dropCat.order + (insertAfter ? 0.5 : -0.5);

        this.categories.sort((a, b) => {
          if (a.col !== b.col) return a.col - b.col;
          return a.order - b.order;
        });
        
        this.categories.forEach((c, i) => c.order = i);

        await Storage.set(this.CAT_KEY, this.categories);
        this.renderFolders();
      });
    }

    /* --- Header --- */
    const header = document.createElement('div');
    header.className = 'folder-header';
    if (cat.id !== '__other__') header.style.cursor = 'grab';

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
    optBtn.title = I18n.t('folder_options_title', 'Folder Options');
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
      this.applyMasonry();
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
      moreBtn.textContent = I18n.t('show_more', 'Show more') + ' (' + (items.length - limit) + ') ▾';
      moreBtn.addEventListener('click', () => {
        body.querySelectorAll('.shortlist-hidden').forEach(el => el.style.display = 'flex');
        moreBtn.style.display = 'none';
      });
      body.appendChild(moreBtn);
    }

    const addLinkBtn = document.createElement('button');
    addLinkBtn.className = 'add-to-folder-btn';
    addLinkBtn.innerHTML = view === 'icon' ? '<span>+</span>' : '<span>+</span><span>' + I18n.t('add_shortcut', 'Add Link') + '</span>';
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
      // Wrapper: flex column, icon + action bar ayrı ayrı
      wrap.className = 'link-item link-item-icon';

      const a = document.createElement('a');
      a.href = item.url; a.target = '_blank'; a.rel = 'noopener noreferrer';
      a.className = 'link-icon-card';
      a.title = item.title;
      a.appendChild(icon);

      a.addEventListener('contextmenu', e => {
        e.preventDefault();
        e.stopPropagation();
        this._showItemMenu(e, item);
      });


      wrap.appendChild(a);

    } else {
      const a = document.createElement('a');
      a.href = item.url; a.target = '_blank'; a.rel = 'noopener noreferrer';
      a.className = 'link-list-row';
      a.title = item.url;

      a.addEventListener('contextmenu', e => {
        e.preventDefault();
        e.stopPropagation();
        this._showItemMenu(e, item);
      });


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
      
      const favBtn = document.createElement('button');
      favBtn.className = 'link-fav-add-btn link-edit-list fav-list-btn'; favBtn.innerHTML = '⭐'; favBtn.title = I18n.t('add_to_favbar', 'Add to Favorites Bar');
      favBtn.addEventListener('click', async e => {
        e.preventDefault(); e.stopPropagation();
        Favorites.items.push({ id: Date.now().toString(), title: item.title, url: item.url, icon: item.icon });
        await Storage.set(Favorites.FAV_KEY, Favorites.items);
        Favorites.render();
        this._toast('✅ ' + I18n.t('add_to_favbar', 'Added to Favorites!'));
      });
      
      const editBtn = document.createElement('button');
      editBtn.className = 'link-edit-btn link-edit-list'; editBtn.innerHTML = '✏️'; editBtn.title = I18n.t('edit_shortcut');
      editBtn.addEventListener('click', e => { e.preventDefault(); e.stopPropagation(); this.openEditLinkModal(item); });
      
      wrap.appendChild(a);
      wrap.appendChild(favBtn);
      wrap.appendChild(editBtn);
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
        const api = Settings.config.iconApi || 'google';
        let src = '';
        if (api === 'google') src = 'https://www.google.com/s2/favicons?domain=' + d + '&sz=64';
        else if (api === 'google-hd') src = 'https://www.google.com/s2/favicons?domain=' + d + '&sz=128';
        else if (api === 'iconhorse') src = 'https://icon.horse/icon/' + d;
        else if (api === 'clearbit') src = 'https://logo.clearbit.com/' + d;
        else if (api === 'duckduckgo') src = 'https://icons.duckduckgo.com/ip3/' + d + '.ico';
        else src = 'https://www.google.com/s2/favicons?domain=' + d + '&sz=64';
        
        box.innerHTML = '<img src="' + src + '" alt="" onerror="this.parentElement.textContent=\'🌐\'">';
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
      { label: check('icon') + '⊞ ' + I18n.t('view_icon', 'Icon View'), action: () => this._setView(cat.id, 'icon') },
      { label: check('list') + '📋 ' + I18n.t('view_list', 'Full List View'), action: () => this._setView(cat.id, 'list') },
      { label: check('shortlist') + '📃 ' + I18n.t('menu_shortlist', 'Short List (10 Links)'), action: () => this._setView(cat.id, 'shortlist') },
      { separator: true },
      { label: '➕ ' + I18n.t('add_shortcut', 'Add Link'), action: () => this.openAddLinkModal(cat.id) },
      { label: '✏️ ' + I18n.t('menu_rename', 'Rename'), action: () => this._openRenameModal(cat) },
      { label: '🔤 ' + I18n.t('menu_sort', 'Sort Links A–Z'), action: () => this._sortFolderItems(cat.id) },
      { label: '🔄 ' + I18n.t('menu_update_icons', 'Bulk Update Icons'), action: () => this._bulkUpdateFavicons(cat.id) },
      { separator: true },
      { label: '🗑 ' + I18n.t('menu_delete_folder', 'Delete Folder'), danger: true, action: async () => {
          if (!confirm('"' + cat.name + '" ' + I18n.t('confirm_delete_folder', 'folder and its links will be deleted. Are you sure?'))) return;
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

  _showItemMenu(e, item) {
    const menu = document.getElementById('contextMenu');
    if (!menu) return;
    menu.innerHTML = '';
    menu.style.display = 'block';

    const opts = [
      { label: '✏️ ' + I18n.t('edit_shortcut', 'Edit'), action: () => this.openEditLinkModal(item) },
      { label: '⭐ ' + I18n.t('add_to_favbar', 'Add to Favorites Bar'), action: async () => {
          Favorites.items.push({ id: Date.now().toString(), title: item.title, url: item.url, icon: item.icon });
          await Storage.set(Favorites.FAV_KEY, Favorites.items);
          Favorites.render();
          this._toast('✅ ' + I18n.t('add_to_favbar', 'Added to Favorites!'));
        }
      },
      { separator: true },
      { label: '✕ ' + I18n.t('delete_shortcut', 'Delete'), danger: true, action: async () => {
          this.items = this.items.filter(i => i.id !== item.id);
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

    const x = Math.min(e.clientX, window.innerWidth - 185);
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

  async _bulkUpdateFavicons(catId) {
    if (!confirm(I18n.t('confirm_bulk_icons', 'All icons in this folder will be replaced with the latest site icons. Are you sure?'))) return;
    
    let updated = 0;
    this.items = this.items.map(item => {
      if (item.categoryId === catId) {
        try {
          const domain = new URL(item.url).hostname;
          item.icon = 'https://www.google.com/s2/favicons?domain=' + domain + '&sz=64';
          updated++;
        } catch(e) {}
      }
      return item;
    });
    
    await Storage.set(this.ITEMS_KEY, this.items);
    this.renderFolders();
    this._toast('✅ ' + updated + ' ' + I18n.t('toast_icons_updated', 'icons updated!'));
  },

  async _sortFolderItems(catId) {
    const catItems = this.items.filter(i => i.categoryId === catId);
    const otherItems = this.items.filter(i => i.categoryId !== catId);
    const locale = I18n.currentLang === 'tr' ? 'tr' : 'en';
    catItems.sort((a, b) => a.title.localeCompare(b.title, locale));
    this.items = [...otherItems, ...catItems];
    await Storage.set(this.ITEMS_KEY, this.items);
    this.renderFolders();
    this._toast('✅ ' + I18n.t('menu_sort', 'Sort Links A–Z'));
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
        const editId = modal.getAttribute('data-edit-id');
        if (editId) {
          const item = this.items.find(i => i.id === editId);
          if (item) { item.title = title; item.url = url; item.icon = icon; item.categoryId = catId; }
        } else {
          this.items.push({ id: Date.now().toString(), title, url, icon, categoryId: catId });
        }
        await Storage.set(this.ITEMS_KEY, this.items);
        this.renderFolders();
        modal.classList.remove('active');
        form.reset();
        modal.removeAttribute('data-edit-id');
      });
    }
  },

  openAddLinkModal(catId) {
    const modal   = document.getElementById('shortcutModal');
    const title   = document.getElementById('shortcutModalTitle');
    const catInput= document.getElementById('shortcutTargetCatId');
    const cat     = catId ? this.categories.find(c => c.id === catId) : null;
    if (title)    title.textContent = cat ? '"' + cat.name + '" — ' + I18n.t('add_shortcut', 'Add Link') : I18n.t('modal_add_link_title', 'Add Link');
    if (catInput) catInput.value = catId || (this.categories[0]?.id || '');
    modal.removeAttribute('data-edit-id');
    document.getElementById('shortcutForm').reset();
    modal.classList.add('active');
    setTimeout(() => document.getElementById('shortcutTitleInput')?.focus(), 100);
  },

  openEditLinkModal(item) {
    const modal = document.getElementById('shortcutModal');
    document.getElementById('shortcutModalTitle').textContent = I18n.t('modal_edit_link_title', 'Edit Link');
    document.getElementById('shortcutTitleInput').value = item.title;
    document.getElementById('shortcutUrlInput').value = item.url;
    document.getElementById('shortcutIconInput').value = item.icon || '';
    document.getElementById('shortcutTargetCatId').value = item.categoryId;
    modal.setAttribute('data-edit-id', item.id);
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
    modal.removeAttribute('data-edit-id');
    document.getElementById('shortcutForm').reset();
    modal.classList.add('active');
    setTimeout(() => document.getElementById('renameInput')?.focus(), 100);
  },

  setupCollapseExpandAll() {
      const expandAllBtn = document.getElementById('expandAllBtn');
      const collapseAllBtn = document.getElementById('collapseAllBtn');
      
      if (expandAllBtn) {
        expandAllBtn.addEventListener('click', async () => {
          this.collapsedFolders.clear();
          await Storage.set(this.COLLAPSED_KEY, [...this.collapsedFolders]);
          this.renderFolders();
          this._toast(I18n.t('toast_folders_expanded'));
        });
      }
      if (collapseAllBtn) {
        collapseAllBtn.addEventListener('click', async () => {
          this.categories.forEach(cat => this.collapsedFolders.add(cat.id));
          await Storage.set(this.COLLAPSED_KEY, [...this.collapsedFolders]);
          this.renderFolders();
          this._toast(I18n.t('toast_folders_collapsed'));
        });
      }
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
        catch(err) { alert(I18n.t('import_backup_error', 'Error loading file: ') + err.message); }
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
    if (sumEl) sumEl.textContent = folders.length + ' ' + I18n.t('add_category', 'Folders') + ' • ' + total + ' ' + I18n.t('add_shortcut', 'Links') + '. ' + I18n.t('import_select_folders', 'Select folders to import') + ':';

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

    modal.removeAttribute('data-edit-id');
    document.getElementById('shortcutForm').reset();
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
      this._toast('✅ ' + added + ' ' + I18n.t('import_bookmarks', 'Bookmarks') + ' ' + I18n.t('toast_imported', 'imported successfully!'));
    };

    cfBtn.addEventListener('click', doImport);
    caBtn.addEventListener('click', doCancel);
    if (caHdr) caHdr.addEventListener('click', doCancel);
    modal.addEventListener('click', e => { if (e.target === modal) doCancel(); }, { once: true });
  },

  applyMasonry() {
    const grid = document.getElementById('shortcutsGrid');
    if (!grid) return;
    const cards = grid.querySelectorAll('.folder-card');
    cards.forEach(card => card.style.gridRowEnd = 'auto');
    
    // Give browser a moment to paint the natural heights
    setTimeout(() => {
      cards.forEach(card => {
        const height = card.getBoundingClientRect().height;
        const rowSpan = Math.ceil((height + 15) / 5); // 15px is the gap we want
        card.style.gridRowEnd = 'span ' + rowSpan;
      });
    }, 10);
  },

  _emptyState() {
    const el = document.createElement('div');
    el.className = 'empty-state-main';
    el.style.gridColumn = '1 / -1';
    el.innerHTML = '<div class="empty-icon">⭐</div>' +
      '<div class="empty-title">' + I18n.t('shortcuts_title', 'Speed Dial') + '</div>' +
      '<div class="empty-desc">' + I18n.t('import_bookmarks_desc', 'Import your browser bookmarks — folders will be created automatically.') + '</div>' +
      '<div class="empty-actions">' +
        '<button class="btn-primary" id="emptyImportBtn">⭐ ' + I18n.t('import_bookmarks', 'Import Bookmarks') + '</button>' +
        '<button class="btn-secondary" id="emptyAddBtn">+ ' + I18n.t('add_shortcut', 'Add Link') + '</button>' +
      '</div>';
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