# İçerik güvenliği ve bildirim işletimi

## Uygulanan kontroller

- Yeni hesap akışında kullanım koşullarını kabul etme kontrolü vardır.
- Mesaj, görev ve anı metinlerinde sunucu tarafında temel açık tehdit/yasa dışı içerik örüntü filtresi uygulanır. Sınırlı bir başlangıç filtresidir; dil, bağlam ve kaçınma yöntemlerinin tamamını yakalayamaz.
- Bulutta fotoğraf yüklemeden önce **Google Cloud Vision SafeSearch** çağrılır. Adult, violence veya racy sonucu LIKELY/VERY_LIKELY ise yükleme reddedilir. Hizmet yanıt vermiyorsa fotoğraf yayınlanmaz. Emülatör dış servisi çağırmaz.
- Partner içeriği veya hesap, `reportContent` ile özel kuyruğa bildirilebilir. Hesap başına günlük 10 bildirim sınırı vardır; destek e-postası alternatif kanaldır.
- `blockPartner`, ortak erişimi kapatır ve iki yönlü yeniden eşleşmeyi sunucuda engeller. Başarısız dosya temizliği erişimi geri açmaz.
- `reports`, `reportLimits` ve `blocks` istemciler tarafından okunamaz/yazılamaz.

## Dağıtım öncesi

1. Doğru Firebase/Google Cloud projesinde Cloud Vision API'yi etkinleştirin; faturalandırma ve Functions çalışma kimliğinin API çağırma yetkisini doğrulayın. Bu adım yerel kod değişikliğiyle etkinleşmez.
2. Gerçek, güvenli bir test fotoğrafının kabul edildiğini ve servis erişimi kesilince fotoğrafın yayınlanmadığını kontrol edin. Otomatik filtrenin hatalı kararları destek üzerinden değerlendirilmelidir.
3. Firestore'da `reports` collection group için `expires_at` alanında TTL etkinleştirin. Alan sunucuda 30 gün sonrasına Timestamp olarak yazılır. TTL anlık silme garantisi vermez.
4. Bildirim kuyruğunu ve destek e-postasını izleyecek sorumluyu belirleyin. İlk inceleme için 24 saatlik iç operasyon hedefi koyun; bunu ölçmeden kullanıcıya SLA olarak vaat etmeyin.
5. Bildirimin ilgili içeriğini yalnızca yetkili operatör Firebase Console'da incelemeli. Tam mesajları, fotoğrafları ve koordinatları GitHub issue veya CI loglarına kopyalamayın.

## Operatör yardımcısı

`firebase/functions` bağımlılıkları kurulu ve güvenli operatör ortamında Application Default Credentials yapılandırılmış olmalı. Kendi proje kimliğinizle `GCLOUD_PROJECT` ayarlayın; kimlik dosyası değerlerini depoya koymayın.

```bash
cd firebase/functions
node moderation.mjs list
node moderation.mjs resolve REPORT_UUID
```

Varsayılan işlem yalnızca açık bildirimlerin kimlik/tür/tarih bilgisini listeler. `resolve` bildirimi kapatır; içerik silmez veya hesabı askıya almaz. Gerekli içerik kaldırma/hesap işlemini yetkili konsolda tamamlayıp özel kaydını tuttuktan sonra kullanın. Hesabı devre dışı bırakırken mevcut oturumların iptalini ve ortak erişimin kapatılmasını ayrıca doğrulayın.

## Yayın için insan tarafından tamamlanacaklar

API etkinleştirme, gerçek bulut testi, TTL ve günlük bildirim inceleme sorumluluğu tamamlanmadan moderasyonun işletildiği söylenemez. Otomatik filtre ve bildirim düğmesi tek başına Apple kabulü garantisi değildir.

Kaynaklar: [Apple 1.2](https://developer.apple.com/app-store/review/guidelines/#user-generated-content), [Vision SafeSearch](https://cloud.google.com/vision/docs/detecting-safe-search), [Firestore TTL](https://firebase.google.com/docs/firestore/ttl).
