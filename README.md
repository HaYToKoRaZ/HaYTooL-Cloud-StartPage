# 🚀 HaYTooL Cloud StartPage

<div align="center">

<p align="center">
  <img src="src/assets/icons/icon128.png" width="100" height="100" alt="HaYTooL Cloud StartPage Logo">
</p>

**Modern, ultra-fast, aesthetic, modular, and privacy-focused Browser StartPage & New Tab Extension.**

[![Status](https://img.shields.io/badge/Status-Active%20%26%20Maintained-brightgreen?style=for-the-badge&logo=git)](https://github.com/HaYToKoRaZ/HaYTooL-Cloud-StartPage)
[![Platform](https://img.shields.io/badge/Platform-Chrome%20%7C%20Brave%20%7C%20Edge%20%7C%20Opera-blue?style=for-the-badge&logo=googlechrome)](https://github.com/HaYToKoRaZ/HaYTooL-Cloud-StartPage)
[![Manifest](https://img.shields.io/badge/Manifest-MV3-orange?style=for-the-badge&logo=google-chrome)](https://developer.chrome.com/docs/extensions/mv3/intro/)
[![Language](https://img.shields.io/badge/Language-JavaScript%20ESNext-F7DF1E?style=for-the-badge&logo=javascript&logoColor=black)](https://developer.mozilla.org/en-US/docs/Web/JavaScript)
[![UI](https://img.shields.io/badge/UI-Vanilla%20CSS%20%7C%20Glassmorphism-264de4?style=for-the-badge&logo=css3&logoColor=white)](https://github.com/HaYToKoRaZ/HaYTooL-Cloud-StartPage)
[![Database](https://img.shields.io/badge/Storage-chrome.storage.local-4285F4?style=for-the-badge&logo=google)](https://developer.chrome.com/docs/extensions/reference/storage/)
[![Version](https://img.shields.io/badge/Version-v4.0.0-informational?style=for-the-badge&logo=semver)](https://github.com/HaYToKoRaZ/HaYTooL-Cloud-StartPage/releases)
[![License](https://img.shields.io/badge/License-MIT-success?style=for-the-badge)](LICENSE)

<br/>

[🇬🇧 English](#-english) • [🇹🇷 Türkçe](#-türkçe)

</div>

---

<a name="-english"></a>
## 🇬🇧 English

### 🌟 Overview
**HaYTooL Cloud StartPage** is a lightning-fast, ultra-lightweight, and fully customizable browser start page and new tab extension built with **Manifest V3**. Designed with clean glassmorphism aesthetics, modular widgets, live weather forecasts, smart search integration, and robust bookmarks & speed dial management.

### 📸 Screenshots
<div align="center">
  <h4>English Interface Preview</h4>
  <img src="src/assets/screenshots/eng.png" alt="English UI Preview" width="90%">
  
  <br/><br/>
  
  <h4>Turkish Interface Preview</h4>
  <img src="src/assets/screenshots/tr.png" alt="Turkish UI Preview" width="90%">
</div>

---

### ✨ Key Features

- ⚡ **Zero-Latency Instant Launch:** Built entirely in lightweight Vanilla JavaScript and CSS; starts in **< 50ms**.
- 🎨 **Rich Aesthetics & Dynamic Themes:** Glassmorphism UI with Dark, Light, YouTube, Discord, and Matrix presets, plus custom wallpaper URL support.
- 📂 **Smart Folders & Bookmarks (Speed Dial):**
  - Group links into colorful folders with custom column layouts (1-10 columns) and adjustable icon sizes (32px - 128px).
  - Quick view modes: Icon View, Full List View, and Shortlist (10 Links).
  - One-click Netscape HTML bookmark import/export and full JSON backup/restore.
  - Multi-source Favicon & High-Res Icon fetching (Icon Horse, Google HD, DuckDuckGo).
  - Strict security confirmation for deleting links & categories.
- 🔍 **Universal Smart Search Bar:** Instant switching across popular search engines (Google, DuckDuckGo, Bing, YouTube, GitHub, Yandex, Brave) and AI assistants.
- 🌤️ **Live Weather Widget:** Accurate real-time weather and temperature updates with GPS auto-detection and global city search powered by Open-Meteo.
- 🕒 **Digital Clock, Date & Greetings:** Configurable 12/24h time, seconds display, customized timezone support, and dynamic time-of-day greetings.
- 🔒 **100% Privacy & Offline-First:** Zero analytics, zero tracking, and no external server storage. All configuration is kept secure locally inside `chrome.storage.local`.
- 🌍 **Internationalization (i18n):** Native multilingual interface switching (English & Turkish) on the fly without page reload.

---

### 🚀 Installation & Usage

1. **Download / Clone** the repository:
   ```bash
   git clone https://github.com/HaYToKoRaZ/HaYTooL-Cloud-StartPage.git
   ```
2. Open your Chromium-based browser (Google Chrome, Brave, Microsoft Edge, Opera).
3. Navigate to `chrome://extensions/` (or `edge://extensions/`, `brave://extensions/`).
4. Enable **Developer mode** toggle in the top-right corner.
5. Click **Load unpacked** (*Paketlenmemiş öge yükle*).
6. Select the cloned `HaYTooL Cloud StartPage` directory.
7. Open a new tab and enjoy! 🎉

---

### 🛠️ Tech Stack & Architecture

| Component | Technology | Description |
| :--- | :--- | :--- |
| **Platform** | Manifest V3 (MV3) | Chrome & Chromium Web Extension Standard |
| **Logic** | Vanilla JavaScript (ESNext) | Modular, zero-framework, dependency-free architecture |
| **Styling** | Vanilla CSS3 | Custom properties, glassmorphism, responsive grid layout |
| **Storage** | `chrome.storage.local` | Asynchronous, fast, and local data persistence |
| **Weather API** | Open-Meteo & OpenStreetMap | Free, keyless, and privacy-respecting weather forecast |
| **Icons** | Icon Horse / Google API | Multi-provider high-resolution favicon resolution |

---

<br/>

---

<a name="-türkçe"></a>
## 🇹🇷 Türkçe

### 🌟 Genel Bakış
**HaYTooL Cloud StartPage**, modern **Manifest V3** mimarisiyle geliştirilmiş; ultra hızlı, hafif, tamamen kişiselleştirilebilir ve gizlilik odaklı bir yeni sekme (New Tab / StartPage) tarayıcı eklentisidir. Buzlu cam (glassmorphism) efektleri, canlı hava durumu göstergesi, zengin arama motorları, gelişmiş klasör ve favori yönetimi ile tarayıcınıza şık bir başlangıç sayfası deneyimi sunar.

### 📸 Ekran Görüntüleri
<div align="center">
  <h4>Türkçe Arayüz Önizlemesi</h4>
  <img src="src/assets/screenshots/tr.png" alt="Türkçe Arayüz Önizlemesi" width="90%">

  <br/><br/>

  <h4>İngilizce Arayüz Önizlemesi</h4>
  <img src="src/assets/screenshots/eng.png" alt="İngilizce Arayüz Önizlemesi" width="90%">
</div>

---

### ✨ Öne Çıkan Özellikler

- ⚡ **Ultra Hızlı Açılış:** Ağır kütüphaneler (React/Vue vb.) olmadan, saf Vanilla JS ve CSS ile **< 50ms** açılış hızı.
- 🎨 **Gelişmiş Görsellik & Temalar:** Koyu (Dark), Açık (Light), YouTube, Discord ve Matrix temaları; dilediğiniz özel görsel URL'si ile arka plan ayarlama desteği.
- 📂 **Kategorize Edilebilir Hızlı Erişim (Speed Dial):**
  - Renkli klasörler, 1'den 10'a kadar ayarlanabilir sütun düzeni ve 32px - 128px arası ikon boyutları.
  - İkon Görünümü, Tam Liste Görünümü ve Kısa Liste (10 Link) seçenekleri.
  - Standart Netscape HTML yer imi içe/dışa aktarma ve JSON yedekleme desteği.
  - Otomatik ve yüksek çözünürlüklü favicon motoru (Icon Horse, Google HD vb.).
  - Yanlışlıkla silinmeyi engelleyen güvenli onaylı ("SİL" kelimesi doğrulamalı) temizleme sistemi.
- 🔍 **Gelişmiş Arama Çubuğu:** Google, DuckDuckGo, Bing, YouTube, GitHub, Yandex, Brave ve Yapay Zeka servisleri arasında anında tek tıkla geçiş.
- 🌤️ **Canlı Hava Durumu:** GPS otomatik konum algılama veya global şehir arama destekli, Open-Meteo destekli hava durumu göstergesi.
- 🕒 **Saat, Tarih ve Karşılama:** 12/24 saat formatı, saniye göstergesi, özel zaman dilimi (timezone) seçimi ve günün saatine göre akıllı selamlama.
- 🔒 **%100 Gizlilik & Çevrimdışı Çalışma:** Telemetri yok, takip kodu yok, harici sunucuya veri gönderme yok. Tüm ayarlarınız `chrome.storage.local` üzerinde yerel kalır.
- 🌍 **Anında Dil Değiştirme (i18n):** Sayfayı yenilemeye gerek kalmadan Türkçe ve İngilizce arasında dinamik geçiş.

---

### 🚀 Kurulum ve Geliştirici Modunda Çalıştırma

1. Projeyi bilgisayarınıza indirin veya klonlayın:
   ```bash
   git clone https://github.com/HaYToKoRaZ/HaYTooL-Cloud-StartPage.git
   ```
2. Chromium tabanlı tarayıcınızı açın (Google Chrome, Brave, Microsoft Edge, Opera).
3. Adres çubuğuna `chrome://extensions/` (Edge için `edge://extensions/`, Brave için `brave://extensions/`) yazın.
4. Sağ üst köşedeki **Geliştirici Modu**'nu (Developer mode) aktif hale getirin.
5. Sol üstteki **Paketlenmemiş öge yükle** (Load unpacked) butonuna tıklayın.
6. Klonladığınız `HaYTooL Cloud StartPage` klasörünü seçin.
7. Yeni bir sekme açarak kullanmaya başlayın! 🎉

---

### 🛠️ Teknoloji Yığını ve Mimari

| Bileşen | Teknoloji | Açıklama |
| :--- | :--- | :--- |
| **Platform** | Manifest V3 (MV3) | Modern Chromium Eklenti Standardı |
| **Mantık (Logic)** | Vanilla JavaScript (ESNext) | Bağımsızlıksız, modüler ve yüksek performanslı kod yapısı |
| **Tasarım & Stil** | Vanilla CSS3 | Glassmorphism, CSS değişkenleri, responsive grid yapısı |
| **Depolama** | `chrome.storage.local` | Hızlı, güvenilir ve yerel veri saklama katmanı |
| **Hava Durumu API** | Open-Meteo & OpenStreetMap | Ücretsiz, gizlilik dostu ve anahtarsız API |
| **İkon Motoru** | Icon Horse / Google Favicon API | Yüksek kaliteli favicon çözücü |

---

## 📄 Lisans
Bu proje [MIT](LICENSE) lisansı altında korunmaktadır. Özgürce kullanabilir, çatallayabilir (fork) ve katkıda bulunabilirsiniz.