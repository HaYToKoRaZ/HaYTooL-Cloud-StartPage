/**
 * HaYTooL Cloud StartPage - AI Prompt Auto-Injector
 * Gemini ve Qwen gibi URL parametresi desteklemeyen yapay zekalara metni otomatik yazar.
 */
(() => {
  const urlParams = new URLSearchParams(window.location.search);
  const promptText = urlParams.get('prompt') || urlParams.get('q');
  if (!promptText) return;

  let attempts = 0;
  const maxAttempts = 30; // 15 saniye dene

  const tryInject = () => {
    attempts++;
    
    // Qwen ve Gemini arayüzlerindeki metin giriş alanları
    const editor = document.querySelector(
      'textarea, [contenteditable="true"] p, rich-textarea p, .ql-editor p, [contenteditable="true"], .ant-input'
    );
    
    if (editor) {
      if (editor.tagName.toLowerCase() === 'textarea' || editor.tagName.toLowerCase() === 'input') {
        editor.focus();
        editor.value = promptText;
        editor.dispatchEvent(new Event('input', { bubbles: true }));
        editor.dispatchEvent(new Event('change', { bubbles: true }));
      } else {
        editor.focus();
        editor.textContent = promptText;
        editor.dispatchEvent(new Event('input', { bubbles: true }));
      }

      // URL'deki query parametresini temizle
      const cleanUrl = window.location.origin + window.location.pathname;
      window.history.replaceState({}, document.title, cleanUrl);
      return;
    }

    if (attempts < maxAttempts) {
      setTimeout(tryInject, 500);
    }
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', tryInject);
  } else {
    tryInject();
  }
})();
