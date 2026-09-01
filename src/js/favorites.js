import { Storage } from './storage.js';

/**
 * HaYTooL Cloud StartPage - Favoriler Barı
 * Üst satır: ikon + isim, sağ tık / "..." ile ekle/çıkar
 */
export const Favorites = {
  FAV_KEY: 'favorites_bar',
  items: [],

  async init() {
    this.items = await Storage.get(this.FAV_KEY, []);
    this.render();
    this.setupAddModal();
  },

  render() {
    const bar = document.getElementById('favBar');
    if (!bar) return;
    bar.innerHTML = '';

    this.items.forEach((fav, idx) => {
      const item = this._makeFavItem(fav, idx);
      bar.appendChild(item);
    });

    // "+" ekle butonu
    const addBtn = document.createElement('button');
    addBtn.className = 'fav-add-btn';
    addBtn.title = 'Favori Ekle';
    addBtn.innerHTML = '<span class="fav-add-icon">＋</span><span class="fav-item-label">Ekle</span>';
    addBtn.addEventListener('click', () => document.getElementById('favAddModal').classList.add('active'));
    bar.appendChild(addBtn);
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
      iconBox.innerHTML = '<img src="' + fav.icon + '" alt="" onerror="this.parentElement.textContent=\'🌐\'">';
    } else if (fav.icon && fav.icon.trim()) {
      iconBox.textContent = fav.icon;
    } else {
      try {
        const domain = new URL(fav.url).hostname;
        iconBox.innerHTML = '<img src="https://www.google.com/s2/favicons?domain=' + domain + '&sz=64" alt="" onerror="this.parentElement.textContent=\'🌐\'">';
      } catch(e) { iconBox.textContent = '🌐'; }
    }

    const label = document.createElement('div');
    label.className = 'fav-item-label';
    label.textContent = fav.title;

    link.appendChild(iconBox);
    link.appendChild(label);

    // "..." seçenekler butonu
    const optBtn = document.createElement('button');
    optBtn.className = 'fav-options-btn';
    optBtn.innerHTML = '⋯';
    optBtn.title = 'Seçenekler';
    optBtn.addEventListener('click', e => {
      e.stopPropagation();
      this._showFavContextMenu(e, fav, idx);
    });

    wrap.appendChild(link);
    wrap.appendChild(optBtn);
    return wrap;
  },

  _showFavContextMenu(e, fav, idx) {
    const menu = document.getElementById('contextMenu');
    if (!menu) return;
    menu.innerHTML = '';
    menu.style.display = 'block';

    const items = [
      { label: '↑ Sola Taşı',   icon: '←', action: () => this._moveItem(idx, -1) },
      { label: '→ Sağa Taşı',   icon: '→', action: () => this._moveItem(idx, +1) },
      { label: '🗑 Favoriden Çıkar', icon: '', action: () => this._remove(idx), danger: true },
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
        this.items.push({ id: Date.now().toString(), title, url, icon });
        await Storage.set(this.FAV_KEY, this.items);
        this.render();
        modal.classList.remove('active');
        form.reset();
      });
    }
  }
};