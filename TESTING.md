# Test rehberi · 0.2.0

## İstemci

```bash
npm ci
npm run typecheck
npm run lint
npm test
npm run test:release
node scripts/check-native-config.mjs
npm run export:web
npm run export:ios
```

iOS export imzalı native derleme değildir. Expo CLI'nin kendi ortam dizinine erişimi olmalıdır; kısıtlı ortamlarda derleme ve browser testleri uygun izin veya CI ortamı gerektirebilir.

## Backend

Node.js 22.18+ ve **ayrı PostgreSQL 17 test veritabanı** gerekir. `TEST_DATABASE_URL` yalnızca adı `bizbize_test` ile başlayan test DB'sini göstermelidir. Test başlangıcı bu DB tablolarını temizler; üretim DB'si kullanmayın.

```bash
npm --prefix server ci
npm --prefix server run build
# Güvenli test ortamında TEST_DATABASE_URL ayarladıktan sonra:
npm --prefix server test
```

GitHub Actions ayrı PostgreSQL service container oluşturur; gerçek SQL transaction ve kısıtlar üzerinde çalışır. Ağ olmadan statik mock testleriyle entegrasyon geçmiş sayılmaz.

Kapsam: parola/oturum/kod saklama, anonim/doğrulanmamış erişim reddi, cookie/CSRF, kalıcı kod deneme sayımı, SMTP tekrar denemesi, eşzamanlı davet katılımı, mesaj idempotency, fotoğraf decode ve özel erişim, görev-anı ilişkisi, bekleyen moderasyon, konum sürümü/zaman sırası, özel bildirimler, iki yönlü engelleme, reset sonrası oturum iptali, şifre onaylı silme ve süre sonu.

## Manuel kabul

İki tarayıcı profili ve iki ayrı test hesabıyla kayıt, Mailpit kodu, eşleşme, mesaj, görev ve anı akışını deneyin. Üretim SMTP, kuyruk kesintisi, HTTPS/cookie, manuel fotoğraf onayı, destek süreci ve yedekten geri dönüşü ayrıca doğrulayın.

Native GPS kabulü için [iPhone rehberi](IPHONE_TEST.md), sonuç kaydı için [cihaz şablonu](DEVICE_TEST_RESULTS.md) kullanılır. Gerçek fotoğraf ve konumları kamuya açık test loglarına koymayın.
