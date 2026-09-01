# 📜 HaYTooL Cloud StartPage - Proje Anayasası & Geliştirici Kuralları (Constitution & Rules)

Bu belge, **HaYTooL Cloud StartPage** tarayıcı eklentisi (Browser Extension) projesinin geliştirilme prensiplerini, katı güvenlik protokollerini, mimari kararlarını, tasarım standartlarını ve ajan davranış kurallarını tek bir kaynakta belirler.

---

## 1. Mimari, Güvenlik ve Katı Çalışma Alanı Sınırlandırması

> ### 🛑 MUTLAK SİSTEM GÜVENLİK PROTOKOLÜ (ANTI-DESTRUCTION)
> 1. **Katı Çalışma Alanı (Sandbox):** Sadece ana proje dizini D:\Users\Documents\HaYTooL Cloud StartPage ile ajanın kendi yapılandırma dizinlerinde çalışabilirsin. Bu özel yol dışındaki hiçbir diske veya sistem klasörüne ASLA izinsiz müdahale edemez ve silemezsin.
> 2. **Harici İşlem Onayı:** Proje dışı global veya sistem ayarı gerekirse KENDİN YAPMA. Kullanıcıya neyi/neden/nasıl yapacağını Türkçe açıkla ve onayı bekle.
> 3. **0nogithub Yasak Bölgesi:**  nogithub/ klasörü KESİNLİKLE yerel kalacak, Git'e indekslenmeyecek ve asla pushlanmayacaktır.
> 4. **Zorunlu Yedekleme Yönetimi (PS1):** Kodda köklü bir değişiklik yapmadan önce D:\Users\Documents\HaYTooL Cloud StartPage\.agents\rules\backup.ps1 scripti çalıştırılmalıdır. Ajan bu scriptin içeriğiyle ilgilenmez, sadece tetikler ve bitmesini bekler.
> 5. **Özel Not Dosyaları:** yapilacaklar.txt gibi kullanıcının kişisel not dosyaları varsa OKUMA, görev listesi olarak KULLANMA, maps.md'ye ekleme; yokmuş gibi davran.

---

## 2. Temel Vizyon, Mimari ve Teknik Standartlar

- **Vizyon:** Kullanıcıya modern, son derece estetik, ultra hızlı, modüler ve gizlilik odaklı bir yeni sekme / başlangıç sayfası (StartPage / New Tab) deneyimi sunmak.
- **Manifest V3 (MV3):** Eklenti, güncel Chrome Web Store ve modern tarayıcı (Chrome, Brave, Edge, Opera, Firefox) standartlarına tam uyumlu Manifest V3 mimarisiyle geliştirilecektir.
- **Vanilla Kod & Yüksek Performans:** Ağır harici framework (React, Vue vb.) bağımlılıklarından kaçınılacak; ultra hafif Vanilla JavaScript (ESNext modülleri) ve Vanilla CSS kullanılacaktır. Yeni sekme açılış süresi **< 50ms** hedefinde tutulacaktır.
- **Offline-First & Cloud-Ready:** İnternet bağlantısı olmasa bile arayüz, yerel kayıtlı ayarlar ve temel araçlar anında çalışmalı, istendiğinde yerel/bulut yedekleme yapılabilmelidir.

---

## 3. Tasarım, UI/UX ve Temalandırma İlkeleri

1. **Görsel Mükemmellik (Rich Aesthetics):**
   - Sıradan ve düz tasarımlar kesinlikle reddedilir.
   - Glassmorphism (buzlu cam efektleri), derinlik hissi veren gölgeler, yumuşak gradyanlar ve modern renk paletleri.
   - Modern tipografi (Outfit, Inter, Plus Jakarta Sans).

2. **Çift Tema Uyumluluğu (Dark & Light Theme):**
   - Arayüze eklenen tüm yeni bileşen ve özellikler hem koyu (dark) hem de açık (light) tema renk düzenine tam uyumlu olmalıdır. Sadece koyu temaya göre renklendirme yapılmaz; açık temadaki kontrast ve okunabilirlik eşzamanlı sağlanır.

3. **Dinamik & Mikro Animasyonlar:**
   - Hover efektleri, pürüzsüz geçişler (smooth transitions) ve kart animasyonları ile arayüzün canlı hissettirmesi sağlanır.

4. **Modüler Widget Mimarisi:**
   - Her bileşen (Saat/Tarih, Arama Çubuğu, Hızlı Erişim Kartları, Not Defteri, Todo Listesi, Hava Durumu, Sistem Kısayolları vb.) bağımsız birer modül olarak tasarlanır.

---

## 4. Kodlama, Çoklu Dil (i18n) ve Dokümantasyon Standartları

1. **İsimlendirme & Temiz Kod:** Tüm değişken ve fonksiyonlarda camelCase standardı kullanılır. Fonksiyonlar tek bir sorumluluğa (Single Responsibility) sahip olmalıdır.
2. **Türkçe Yorum Satırları & JSDoc:** Fonksiyonların üstüne kısa ve öz Türkçe açıklama satırları ile JSDoc tipleri eklenir.
3. **i18n Kuralı:** Kod içinde asla statik (hardcoded) metin kullanılmaz; tüm metinler için dinamik anahtarlar oluşturulup dil dosyalarına (	r,  n vb.) eksiksiz eklenir.
4. **Hata Yönetimi (Error Handling):** Ağ istekleri ve storage okuma/yazma işlemleri 	ry-catch bloklarıyla korunur, sessiz çökme engellenir.
5. **Ölü Kod Yasağı:** Üretim kodunda kullanılmayan değişken, gereksiz console.log veya test kodu bırakılmaz.
6. **Proje Haritası Güncellemesi:** Yeni bir dosya oluşturulduğunda veya işlevi değiştiğinde .agents/rules/maps.md dosyası güncellenir.

---

## 5. Güvenlik, Gizlilik ve İzinler

1. **Gizlilik Odaklılık & Sıfır Takip:**
   - Hiçbir kullanıcı verisi, arama geçmişi veya kişisel not üçüncü taraf sunuculara aktarılamaz.
   - Arka planda telemetri, izleyici (tracking) veya analitik toplayan kod/servis ASLA eklenemez.
   - Tüm ayarlar ve veriler chrome.storage.local / chrome.storage.sync üzerinde tutulur.

2. **Minimum Yetki İlkesi (Least Privilege):**
   - manifest.json dosyasında yalnızca kesinlikle ihtiyaç duyulan izinler talep edilir (storage, avicon vb.).
   - Güvensiz  val() veya harici JS enjeksiyonuna izin verilmez (Content Security Policy).

---

## 6. Sürüm Yönetimi ve GitHub Dağıtım Protokolü

> ### 🛑 MUTLAK PUSH & YAYINLAMA YASAĞI (STRICT NO-AUTO-PUSH)
> 1. **%100 Yerel Prensibi:** Geliştirme sadece yerel ortamda yürütülür. Kendi kendine GitHub senkronizasyonu veya Release yayını YAPILMAZ.
> 2. **Kullanıcı Komutlu Dağıtım:** Kullanıcı açıkça *"GitHub'a yükle"*, *"push et"* veya *"yayınla"* demediği sürece Git push işlemleri KESİNLİKLE askıda kalacaktır. Dağıtım için .agents/rules/push.ps1 scripti kullanılır.