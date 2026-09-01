# HaYTooL StartPage - Proje Anayasası (Constitution & Architecture Principles)

Bu belge, **HaYTooL StartPage** tarayıcı eklentisi (Browser Extension) projesinin geliştirilme prensiplerini, mimari kararlarını, tasarım standartlarını ve güvenlik kurallarını belirler. Projeye yapılacak tüm ekleme ve güncellemeler bu anayasaya bağlı kalmak zorundadır.

---

## 1. Temel Vizyon & Misyon
- **Vizyon:** Kullanıcıya modern, son derece estetik, ultra hızlı, modüler ve gizlilik odaklı bir yeni sekme / başlangıç sayfası (StartPage / New Tab) deneyimi sunmak.
- **Misyon:** Tarayıcıyı açtığı anda kullanıcıyı büyüleyen dinamik bir UI, verimlilik araçları (hızlı bağlantılar, arama motoru seçicisi, notlar, hava durumu, saat/tarih, sistem/kaynak kısayolları) ve sıfır gecikme (zero-latency) ile çalışan bir ekosistem inşa etmek.

---

## 2. Mimari ve Teknik Standartlar

### 2.1. Manifest Versiyonu ve Platform Uyumluluğu
- **Manifest V3 (MV3):** Eklenti, güncel Chrome Web Store ve modern tarayıcı (Chrome, Brave, Edge, Opera, Firefox) standartlarına tam uyumlu Manifest V3 mimarisiyle geliştirilecektir.
- **Cross-Browser Desteği:** `chrome.*` ve `browser.*` API uyumluluğu gözetilecektir.

### 2.2. Teknoloji Yığını (Tech Stack)
- **Çekirdek:** Modern Vanilla JavaScript (ESNext, Modüler yapı) ve Semantik HTML5.
- **Stil & Tasarım:** Vanilla CSS (Modern CSS Değişkenleri, CSS Grid, Flexbox, Glassmorphism, CSS Transitions/Animations).
- **Hafiflik & Performans:** Gereksiz ağır framework bağımlılıklarından kaçınılacak; yeni sekme açılış süresi **< 50ms** hedefinde tutulacaktır.
- **Offline-First:** İnternet bağlantısı olmasa bile arayüz, yerel kayıtlı ayarlar ve temel araçlar anında çalışmalıdır.

---

## 3. Tasarım & UI/UX İlkeleri (Visual Excellence)

1. **Görsel Mükemmellik (Rich Aesthetics):**
   - Sıradan ve düz tasarımlar kesinlikle reddedilir.
   - Glassmorphism (buzlu cam efektleri), derinlik hissi veren gölgeler, yumuşak gradyanlar ve modern renk paletleri (Koyu/Açık tema + dinamik tema motoru).
   - Modern tipografi (Inter / Outfit / Plus Jakarta Sans vb.).

2. **Dinamik ve Akıcı Deneyim:**
   - Mikro animasyonlar, hover efektleri, pürüzsüz geçişler (smooth transitions).
   - Kullanıcı etkileşimini canlandıran widget yerleşimleri.

3. **Modüler Widget Mimarisi:**
   - Her bileşen (Saat/Tarih, Arama Çubuğu, Hızlı Erişim İkonları, Not Defteri, Todo Listesi, Hava Durumu vb.) bağımsız birer modül/bileşen olarak tasarlanır.
   - Kullanıcı dilediği widget'ı açıp kapatabilmeli, yerini ve boyutunu özelleştirebilmelidir.

---

## 4. Güvenlik, Gizlilik ve Veri Yönetimi

1. **Gizlilik Odaklılık (Privacy First):**
   - Hiçbir kullanıcı verisi, arama geçmişi veya kişisel not üçüncü taraf sunuculara izinsiz aktarılamaz.
   - Tüm ayarlar, özelleştirmeler ve yerel veriler `chrome.storage.local` / `chrome.storage.sync` veya `IndexedDB`/`localStorage` üzerinde tutulur.

2. **Minimum Yetki İlkesi (Least Privilege):**
   - `manifest.json` dosyasında yalnızca kesinlikle ihtiyaç duyulan izinler talep edilir (`storage`, `bookmarks` vb. isteğe bağlı izinler opsiyonel olarak tanımlanır).
   - Güvensiz `eval()` veya harici JS enjeksiyonuna izin verilmez (Content Security Policy kurallarına tam uyum).

---

## 5. Dizin Yapısı Standardı

```text
haytool-startpage/
├── .gitignore
├── ANAYASA.md              # Proje anayasası ve mimari standartlar
├── README.md               # Proje tanıtımı ve geliştirici kılavuzu
├── manifest.json           # Manifest V3 eklenti yapılandırması
├── src/
│   ├── assets/             # İkonlar, sesler, statik görseller
│   │   └── icons/
│   ├── css/                # Tasarım sistemi, tema değişkenleri, bileşen stilleri
│   │   ├── main.css
│   │   ├── theme.css
│   │   └── components/
│   ├── js/                 # Çekirdek mantık, modüller, widget controller'ları
│   │   ├── app.js
│   │   ├── storage.js
│   │   ├── modules/
│   │   └── utils/
│   ├── pages/              # StartPage HTML ve opsiyonel ayarlar sayfası
│   │   ├── newtab.html
│   │   └── options.html
└── docs/                   # Ek dökümanlar ve yol haritası
```

---

## 6. Kodlama ve Katkı Kuralları

1. **Temiz Kod (Clean Code):** Fonksiyonlar tek bir sorumluluğa (Single Responsibility) sahip olmalı, değişken ve fonksiyon isimlendirmeleri anlaşılır ve tutarlı olmalıdır.
2. **Hata Yönetimi (Error Handling):** Ağ istekleri (örneğin hava durumu verisi çekerken) veya storage okuma/yazma işlemleri `try-catch` bloklarıyla korunmalı, kullanıcıya sessiz çökme yaşatılmamalıdır.
3. **Sürüm Kontrolü (Git Conventions):** Anlamlı commit mesajları kullanılmalıdır (`feat:`, `fix:`, `style:`, `refactor:`, `docs:`).
