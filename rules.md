# Proje Kuralları ve Dal (Branch) Yapısı

## Git Dallarının Amacı

Bu projede kodların karışmaması ve güvenlik kısıtlamalarını (CSP) aşmak için iki farklı dal (branch) kullanılmaktadır:

### 1. "master" Dalı
- **Amacı:** Sadece **Chrome Eklentisi** (Chrome Extension) kodlarını barındırır.
- **İçerik:** "manifest.json", eklenti arayüzü ("index.html"), arka plan kodları ("background.js" vb.) ve eklentiye özgü her şey bu daldadır.
- **Kullanım:** Eklentiyi Chrome'a yüklerken veya güncellerken bu dal kullanılır. Eklenti içindeki tüm sayfalar (yeni sekme vb.) buradan okunur.

### 2. "websites" Dalı
- **Amacı:** Eklentinin tanıtım sitesini ve **Kimlik Doğrulama (Authentication)** işlemini barındırır.
- **İçerik:** Projenin GitHub Pages üzerinden yayınlanan "index.html" (Ana sayfa) ve "auth.html" (Giriş sayfası) dosyalarını içerir.
- **Neden Var?** Chrome Manifest V3 kuralları gereği eklenti içinden dış bağlantılı giriş (Popup ile Firebase Login) yapılamamaktadır. Bu nedenle kullanıcılar, eklenti içinden bu daldaki "auth.html" sayfasına yönlendirilir. Giriş bu sayfada yapılır ve başarılı sonuç arka planda eklentiye (master dalındaki koda) geri gönderilir.
- **Kullanım:** GitHub Pages ayarlarından yayın kaynağı olarak "websites" dalı seçilmelidir.
