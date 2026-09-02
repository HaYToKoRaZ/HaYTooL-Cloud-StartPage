import { Storage } from './storage.js';
import { Settings } from './settings.js';
import { Shortcuts } from './shortcuts.js';
import { I18n } from './i18n.js';

export const Favorites = {
  FAV_KEY: 'favorites_bar',
  VIEW_KEY: 'fav_bar_view', // 'icon', 'list', 'shortlist'
  items: [],
  view: 'icon',

  async init() {
    const isFirstRun = await Storage.get('is_fav_first_run_v3', true);
    if (isFirstRun) {
      const genId = () => Date.now().toString() + Math.random().toString(36).substr(2, 5);
      const defaultFavs = [
        { id: genId(), title: 'Google', url: 'https://www.google.com' },
        { id: genId(), title: 'WhatsApp', url: 'https://web.whatsapp.com' },
        { id: genId(), title: 'Wikipedia', url: 'https://www.wikipedia.org' },
        { id: genId(), title: 'Reddit', url: 'https://www.reddit.com' },
        { id: genId(), title: 'Outlook', url: 'https://outlook.live.com' },
        { id: genId(), title: 'Gmail', url: 'https://mail.google.com' }
      ];
      await Storage.set(this.FAV_KEY, defaultFavs);
      await Storage.set('is_fav_first_run_v3', false);
    }

    this.items = await Storage.get(this.FAV_KEY, []);
    this.view  = await Storage.get(this.VIEW_KEY, 'icon');
    this.render();
    this.setupAddModal();
  },

  render() {
    const bar = document.getElementById('favBar');
    if (!bar) return;
    bar.innerHTML = '';
    
    // Uygula CSS sınıfı
    bar.className = 'fav-bar fav-bar-container view-' + this.view;

    const limit = 10;
    const isShortlist = (this.view === 'shortlist');

    

    this.items.forEach((fav, idx) => {
      const item = this._makeFavItem(fav, idx);
      if (isShortlist && idx >= limit) {
        item.style.display = 'none';
        item.classList.add('shortlist-hidden');
      }
      bar.appendChild(item);
    });

    if (isShortlist && this.items.length > limit) {
      const moreBtn = document.createElement('button');
      moreBtn.className = 'fav-show-more-btn';
      moreBtn.textContent = 'Daha fazla (' + (this.items.length - limit) + ') ▾';
      moreBtn.addEventListener('click', () => {
        bar.querySelectorAll('.shortlist-hidden').forEach(el => el.style.display = 'flex');
        moreBtn.style.display = 'none';
      });
      bar.appendChild(moreBtn);
    }

    // "+" ekle butonu
    const addBtn = document.createElement('button');
    addBtn.className = 'fav-add-btn';
    addBtn.title = 'Favori Ekle';
    addBtn.innerHTML = this.view === 'icon' ? '<span class="fav-add-icon" style="font-size:1.4rem;">+</span>' : '<span class="fav-add-icon">+</span><span class="fav-item-label">Ekle</span>';
    addBtn.addEventListener('click', () => { 
      const m = document.getElementById('favAddModal'); 
      m.removeAttribute('data-edit-idx'); 
      document.getElementById('favAddForm').reset();
      document.getElementById('favModalTitle').textContent = 'Favori Ekle';
      m.classList.add('active'); 
    });
    bar.appendChild(addBtn);

    // Ayarlar butonu (En Sağa)
    const optBtn = document.createElement('button');
    optBtn.className = 'fav-global-opt-btn';
    optBtn.innerHTML = '⚙️';
    optBtn.title = 'Favoriler Barı Görünümü';
    optBtn.addEventListener('click', e => {
      e.stopPropagation();
      this._showGlobalMenu(e);
    });
    optBtn.addEventListener('auxclick', e => {
      if (e.button === 1) {
        e.preventDefault();
        Shortcuts.toggleHiddenFolders();
      }
    });
    bar.appendChild(optBtn);


  },

  _makeFavItem(fav, idx) {
    const wrap = document.createElement('div');
    wrap.className = 'fav-item';
    wrap.setAttribute('data-fav-idx', idx);

    const link = document.createElement('a');
    link.href   = fav.url;
    link.target = '_blank';
    link.rel    = 'noopener noreferrer';
    link.className = 'fav-item-link';

    const iconBox = document.createElement('div');
    iconBox.className = 'fav-icon-box';

    if (fav.icon && (fav.icon.startsWith('http') || fav.icon.startsWith('data:'))) {
      const img = document.createElement('img');
      img.src = fav.icon;
      img.alt = '';
      img.addEventListener('error', () => { iconBox.textContent = '🌐'; });
      iconBox.appendChild(img);
    } else if (fav.icon && fav.icon.trim()) {
      iconBox.textContent = fav.icon;
    } else {
      try {
        let domain = new URL(fav.url).hostname;
        if (domain.startsWith('www.')) domain = domain.substring(4);
        const api = Settings.config.iconApi || 'google';
        let src = '';
        if (api === 'google') src = 'https://www.google.com/s2/favicons?domain=' + domain + '&sz=64';
        else if (api === 'google-hd') src = 'https://www.google.com/s2/favicons?domain=' + domain + '&sz=128';
        else if (api === 'iconhorse') src = 'https://icon.horse/icon/' + domain;
        else if (api === 'duckduckgo') src = 'https://icons.duckduckgo.com/ip3/' + domain + '.ico';
        else src = 'https://www.google.com/s2/favicons?domain=' + domain + '&sz=64';
        
        const img = document.createElement('img');
        img.src = src;
        img.alt = '';
        img.addEventListener('error', () => { iconBox.textContent = '🌐'; });
        iconBox.appendChild(img);
      } catch(e) { iconBox.textContent = '🌐'; }
    }

    const label = document.createElement('div');
    label.className = 'fav-item-label';
    label.textContent = fav.title;

    link.appendChild(iconBox);
    link.appendChild(label);

    const optBtn = document.createElement('button');
    optBtn.className = 'fav-options-btn';
    optBtn.innerHTML = '⋯';
    optBtn.title = 'Seçenekler';
    optBtn.addEventListener('click', e => {
      e.stopPropagation();
      e.preventDefault();
      this._showFavContextMenu(e, fav, idx);
    });

    wrap.addEventListener('contextmenu', e => {
      e.preventDefault();
      e.stopPropagation();
      this._showFavContextMenu(e, fav, idx);
    });

    wrap.appendChild(link);
    wrap.appendChild(optBtn);
    return wrap;
  },

  _showGlobalMenu(e) {
    const menu = document.getElementById('contextMenu');
    if (!menu) return;
    menu.innerHTML = '';
    menu.style.display = 'block';

    const check = v => this.view === v ? '✓ ' : '　';
    const items = [
      { label: check('icon') + '⊞ ' + I18n.t('ctx_view_icon', 'İkon Görünümü'), action: () => this._setView('icon') },
      { label: check('list') + '📋 ' + I18n.t('ctx_view_list', 'Liste Görünümü'), action: () => this._setView('list') }
    ];

    items.forEach(it => {
      const btn = document.createElement('button');
      btn.className = 'ctx-item';
      btn.textContent = it.label;
      btn.addEventListener('click', () => { it.action(); this._closeMenu(); });
      menu.appendChild(btn);
    });

    const x = Math.min(e.clientX, window.innerWidth - 180);
    const y = e.clientY + 8;
    menu.style.left = x + 'px';
    menu.style.top  = y + 'px';
    setTimeout(() => document.addEventListener('click', this._closeMenu.bind(this), { once: true }), 50);
  },

  _showFavContextMenu(e, fav, idx) {
    const menu = document.getElementById('contextMenu');
    if (!menu) return;
    menu.innerHTML = '';
    menu.style.display = 'block';

    const items = [
      { label: '✏️ ' + I18n.t('ctx_edit', 'Düzenle'), action: () => this._openEditModal(fav, idx) },
      { label: '⬅ ' + I18n.t('ctx_move_left', 'Sola Taşı'), action: () => this._moveItem(idx, -1) },
      { label: '➡ ' + I18n.t('ctx_move_right', 'Sağa Taşı'), action: () => this._moveItem(idx, +1) },
      { label: '🗑 ' + I18n.t('ctx_remove_fav', 'Favoriden Çıkar'), action: () => this._remove(idx), danger: true },
    ];

    items.forEach(it => {
      const btn = document.createElement('button');
      btn.className = 'ctx-item' + (it.danger ? ' ctx-danger' : '');
      btn.textContent = it.label;
      btn.addEventListener('click', () => { it.action(); this._closeMenu(); });
      menu.appendChild(btn);
    });

    const x = Math.min(e.clientX, window.innerWidth - 180);
    const y = e.clientY + 8;
    menu.style.left = x + 'px';
    menu.style.top  = y + 'px';

    setTimeout(() => document.addEventListener('click', this._closeMenu.bind(this), { once: true }), 50);
  },

  _openEditModal(fav, idx) {
    const m = document.getElementById('favAddModal');
    m.setAttribute('data-edit-idx', idx);
    document.getElementById('favModalTitle').textContent = I18n.t('fav_edit_title', 'Favoriyi Düzenle');
    document.getElementById('favTitleInput').value = fav.title;
    document.getElementById('favUrlInput').value = fav.url;
    document.getElementById('favIconInput').value = fav.icon || '';
    m.classList.add('active');
    setTimeout(() => document.getElementById('favTitleInput')?.focus(), 100);
  },

  async _setView(v) {
    this.view = v;
    await Storage.set(this.VIEW_KEY, v);
    this.render();
  },

  _closeMenu() {
    const menu = document.getElementById('contextMenu');
    if (menu) menu.style.display = 'none';
  },

  async _remove(idx) {
    this.items.splice(idx, 1);
    await Storage.set(this.FAV_KEY, this.items);
    this.render();
  },

  async _moveItem(idx, dir) {
    const newIdx = idx + dir;
    if (newIdx < 0 || newIdx >= this.items.length) return;
    [this.items[idx], this.items[newIdx]] = [this.items[newIdx], this.items[idx]];
    await Storage.set(this.FAV_KEY, this.items);
    this.render();
  },

    async add(item) {
    this.items = await Storage.get(this.FAV_KEY, this.items || []);
    let url = (item.url || '').trim();
    if (!url.startsWith('http')) url = 'https://' + url;
    const newItem = {
      id: Date.now().toString(),
      title: (item.title || 'Untitled').trim(),
      url: url,
      icon: item.icon || ''
    };
    this.items.push(newItem);
    await Storage.set(this.FAV_KEY, this.items);
    this.render();
    return newItem;
  },

  setupAddModal() {
    const modal     = document.getElementById('favAddModal');
    const closeBtn  = document.getElementById('closeFavModal');
    const cancelBtn = document.getElementById('cancelFavModal');
    const form      = document.getElementById('favAddForm');

    if (closeBtn)  closeBtn.addEventListener('click',  () => modal.classList.remove('active'));
    if (cancelBtn) cancelBtn.addEventListener('click', () => modal.classList.remove('active'));
    if (modal)     modal.addEventListener('click', e => { if (e.target === modal) modal.classList.remove('active'); });

    if (form) {
      form.addEventListener('submit', async e => {
        e.preventDefault();
        const title = document.getElementById('favTitleInput').value.trim();
        let url     = document.getElementById('favUrlInput').value.trim();
        const icon  = document.getElementById('favIconInput').value.trim();
        if (!url.startsWith('http')) url = 'https://' + url;
        const editIdx = modal.getAttribute('data-edit-idx');
        if (editIdx !== null) {
          this.items[editIdx] = { ...this.items[editIdx], title, url, icon };
        } else {
          this.items.push({ id: Date.now().toString(), title, url, icon });
        }
        await Storage.set(this.FAV_KEY, this.items);
        this.render();
        modal.classList.remove('active');
        form.reset();
        modal.removeAttribute('data-edit-idx');
      });
    }
  }
};
