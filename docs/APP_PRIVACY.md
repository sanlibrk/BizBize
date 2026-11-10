# App Privacy beyanı hazırlığı

Bu eşleştirme kaynak koduna göre hazırlanmıştır. Son yanıtları App Store Connect'te gerçek dağıtılmış servisler, günlükler ve imzalı native SDK paketiyle doğrulayın. “Data Not Collected” seçmek bu ürün için uygun değildir.

| Apple veri alanı | Uygulamadaki veri | Amaç | Hesapla ilişkili |
|---|---|---|---|
| Contact Info → Email Address | Hesap e-postası | App Functionality | Evet |
| Identifiers → User ID | Kullanıcı UUID ve çift üyeliği | App Functionality | Evet |
| Location → Precise Location | İzinli GPS ve anı koordinatları | App Functionality | Evet |
| Location → Coarse Location | Yaklaşık konum izniyle alınan ölçümler varsa | App Functionality | Evet |
| User Content → Photos or Videos | Yüklenen anı fotoğrafı; yalnızca fotoğraf desteklenir | App Functionality | Evet |
| User Content → Emails or Text Messages | Uygulama içi özel sohbet metni | App Functionality | Evet |
| User Content → Other User Content | Görev, not, yer adı ve tarih | App Functionality | Evet |
| User Content → Customer Support | Bildirim açıklaması ve e-posta destek talepleri | App Functionality | Evet |

## Ek değerlendirmeler

- Kaynakta Analytics, reklam SDK'sı veya reklam amaçlı takip entegrasyonu yok. “Tracking” kavramını partnerle izinli konum paylaşımıyla karıştırmayın; Apple'ın tanımını esas alın.
- API/hosting ve SMTP hizmet günlükleri, IP/diagnostics saklama ve sağlayıcıların fiili kullanımlarını ayrıca inceleyin. Beyanı yalnızca bu tabloya bakarak kesinleştirmeyin.
- Fotoğraflar kendi API/veritabanımızda tutulur ve üretimde yetkili operatör incelemesi bekler. Harici görsel analiz servisi yoktur; seçilecek hosting/SMTP sağlayıcıları ve bölgeleri ayrıca doğrulanmalıdır.
- Yerel önizleme verisi cihazda kalır; uzak örnek fotoğraf/harita istekleri ilgili sağlayıcılara bağlantı bilgisi iletir.
- `app.json` UserDefaults için `CA92.1` gerekçesini ve takip yapılmadığını bildirir. Diğer SDK'ların required-reason API manifestleri nihai native paket üzerinde ayrıca kontrol edilmelidir; App Privacy formu manifestin yerine geçmez.
- Apple'ın şifreleme anketi ile `ITSAppUsesNonExemptEncryption=false` değerinin nihai uygulamadaki standart TLS/şifreleme kullanımıyla uyumunu doğrulayın. Özel şifreleme eklenirse yeniden değerlendirin.

Kaynaklar: [Apple App Privacy](https://developer.apple.com/app-store/app-privacy-details/), [Expo privacy manifest](https://docs.expo.dev/guides/apple-privacy/).
