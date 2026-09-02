// popup.js

document.addEventListener('DOMContentLoaded', async () => {
  const titleInput = document.getElementById('titleInput');
  const urlInput = document.getElementById('urlInput');
  const folderSelect = document.getElementById('folderSelect');
  const form = document.getElementById('addForm');
  const successMsg = document.getElementById('successMsg');
  const saveBtn = document.getElementById('saveBtn');

  // 1. Get current tab data
  try {
    const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tabs && tabs.length > 0) {
      const activeTab = tabs[0];
      titleInput.value = activeTab.title || '';
      urlInput.value = activeTab.url || '';
    }
  } catch (err) {
    console.error("Failed to get active tab:", err);
  }

  // 2. Load categories to populate folder select
  try {
    const data = await chrome.storage.local.get('shortcut_categories');
    const categories = data.shortcut_categories || [];
    
    categories.forEach(cat => {
      const option = document.createElement('option');
      option.value = cat.id;
      option.textContent = `📁 ${cat.name}`;
      folderSelect.appendChild(option);
    });
  } catch (err) {
    console.error("Failed to load categories:", err);
  }

  // 3. Handle form submit
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    saveBtn.disabled = true;
    saveBtn.textContent = 'Saving...';

    const targetId = folderSelect.value;
    const newItem = {
      id: Date.now().toString(),
      title: titleInput.value.trim(),
      url: urlInput.value.trim(),
      categoryId: targetId === '_favorites' ? null : targetId,
      icon: ''
    };

    try {
      if (targetId === '_favorites') {
        // Add to Favorites Bar
        const favData = await chrome.storage.local.get('favorites_bar');
        const favorites = favData.favorites_bar || [];
        favorites.push(newItem);
        await chrome.storage.local.set({ favorites_bar: favorites });
      } else {
        // Add to standard shortcuts
        const itemsData = await chrome.storage.local.get('shortcuts_v2');
        const items = itemsData.shortcuts_v2 || [];
        items.push(newItem);
        await chrome.storage.local.set({ shortcuts_v2: items });
      }

      // Show success message
      form.style.display = 'none';
      successMsg.style.display = 'block';

      // Auto-close after 1.5 seconds
      setTimeout(() => {
        window.close();
      }, 1500);

    } catch (err) {
      console.error("Failed to save shortcut:", err);
      saveBtn.disabled = false;
      saveBtn.textContent = 'Save';
    }
  });
});
