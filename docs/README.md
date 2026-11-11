# Biz Bize · Dokümantasyon dizini

Bu dizin, aynı mobil ürünün Firebase ve kendi backend uygulamalarını karşılaştırmalı olarak sunar. **Aktif geliştirme hattı `main` üzerindeki Fastify/PostgreSQL uygulamasıdır.** Firebase kaynakları ayrı arşivde korunur.

## Çalışmayı değerlendirmek için

| Belge | İçerik |
|---|---|
| [Mühendislik vaka çalışması](CASE_STUDY.md) | Problem, inceleme soruları, yöntem, mimari karşılaştırma, kanıt ve sınırlılıklar |
| [Sürümler ve kaynak erişimi](VERSIONS.md) | Aktif dal, Firebase arşivi, değişmez kaynak görüntüsü ve ayrı klasörde inceleme |
| [Firebase uygulaması](FIREBASE_EDITION.md) | Yönetilen kimlik, Firestore dinleyicileri, callable Functions, özel Storage ve SafeSearch |
| [Kendi backend uygulaması](BACKEND_EDITION.md) | API, oturum/kod tasarımı, SQL tutarlılığı, fotoğraf işleme, konum rızası ve işletim |

Önerilen sıra: vaka çalışması → iki teknik rapor → ilgili kaynak/test dosyaları. Bu belgeler kişisel yazılım mühendisliği çalışmasının raporlarıdır; değerlendirmeler kaynak kod ve doğrulama kanıtlarına dayanır.

## Güncel uygulamayı çalıştırmak ve geliştirmek için

| Belge | İçerik |
|---|---|
| [Backend kurulumu](BACKEND_SETUP.md) | Docker/Mailpit, yerel kullanım, üretim şablonu ve sorun giderme |
| [Mimari özeti](ARCHITECTURE.md) | Güncel servis sınırları ve veri yaşam döngüsü |
| [API sözleşmesi](API.md) | Hesap ve ortak alan endpoint’leri, hata ve kapasite sınırları |
| [Güvenlik modeli](SECURITY.md) | Yetkilendirme, saklama, veri silme ve operasyonel sorumluluklar |
| [Moderasyon](MODERATION.md) | Bildirim, özel fotoğraf onayı ve operatör süreci |
| [Bağımlılık taraması](DEPENDENCY_AUDIT.md) | Tarihli tarama bulguları ve kalan bildirimler |
| [Test rehberi](../TESTING.md) | Yerel kontroller, PostgreSQL entegrasyonu ve tarayıcı regresyonu |
| [Katkı rehberi](../CONTRIBUTING.md) | Kaynak düzeni, iş kuralı ve değişiklik kontrolü |

## Yayın hazırlığı için

[Yayın kontrol listesi](RELEASE_CHECKLIST.md), [iPhone kabul rehberi](../IPHONE_TEST.md), [App Store metinleri](APP_STORE_METADATA.md), [App Privacy çalışma sayfası](APP_PRIVACY.md) ve [inceleme notları](APP_REVIEW_NOTES.md) kaynak hazırlığını canlı hizmet ve cihaz kabulünden ayırır.

Kullanıcı metinleri: [Gizlilik](PRIVACY.md) · [Kullanım koşulları](TERMS.md) · [Destek](SUPPORT.md).

Firebase’i çalıştırmak için güncel backend rehberini kullanmayın; [Firebase kaynak görüntüsündeki kurulum rehberini](https://github.com/sanlibrk/BizBize/blob/0692aaa4a6a62ad3efbd6d29e54a9e24a2dc73a7/docs/FIREBASE_SETUP.md) izleyin. Eski bağımlılıkların güvenliği veya bulut yapılandırmasının hâlen geçerli olduğu varsayılmamalıdır.

[Ana sayfaya dön](../README.md)
