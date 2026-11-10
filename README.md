<div align="center">
<img src="assets/icon.png" alt="Biz Bize" width="96" />

# Biz Bize

**İkinizin dünyası. Anılarınız, sohbetiniz ve paylaştığınız yerler bir arada.**

Çiftler için Türkçe, iOS odaklı Expo / React Native uygulaması ve kendi PostgreSQL backend’i.

[Hızlı başlangıç](#hızlı-başlangıç) · [Backend kurulumu](docs/BACKEND_SETUP.md) · [Mimari](docs/ARCHITECTURE.md) · [Güvenlik](docs/SECURITY.md) · [Testler](TESTING.md) · [Yayın hazırlığı](docs/RELEASE_CHECKLIST.md)
</div>

## Ürün

İki kullanıcı tek kullanımlık davet koduyla eşleşir; sohbet eder, küçük görevler paylaşır ve fotoğraf/not/tarih/konumla ortak anılar oluşturur. Anılar harita ve albümde aynı kaydı gösterir. Son konum paylaşımı her kullanıcı için isteğe bağlıdır ve başlangıçta kapalıdır.

**0.2.0 ile Firebase zorunluluğu kaldırıldı.** Güncel hesap ve veri akışları kendi API sunucusunu kullanır. Firebase/Blaze kurulumu veya Google Cloud Vision hesabı gerekmez. Önceki Firebase hesapları ve içerikleri otomatik taşınmaz; mevcut Firebase projesine dokunulmaz.

## Hızlı başlangıç

Node.js **22.18+**, npm ve çalışan **Docker Desktop** gerekir. Proje kökünde:

```powershell
npm ci
npm run backend:up
npm run web
```

- Uygulama: Expo'nun gösterdiği adres, genellikle **http://localhost:8081**.
- Sunucu kontrolü: **http://localhost:3001/healthz**.
- Yerel e-posta kutusu: **http://localhost:8025**.

`backend:up` PostgreSQL, API ve Mailpit’i başlatır; yerel sırları üretir ve mevcut `.env` dosyasına API adresi yoksa ekler. Var olan farklı bir API adresinin üzerine yazmaz. Docker'ın ilk indirme/derlemesi internet gerektirir. Yerel posta kutusu **Gmail'e e-posta göndermez**: hesap açınca doğrulama kodunu bu kutudan alıp uygulamaya girin.

İki tarayıcı profiliyle iki ayrı hesap oluşturup doğrulayın. İlk hesap davet oluştursun, diğeri katılsın. Yerel veriler Docker volume içinde kalır; `npm run backend:down` volume silmez.

Sadece arayüz için backend olmadan **Örnek dünyayı keşfet** seçeneği de kullanılabilir. Örnek kişiler ve konumlar canlı değildir.

## Özellikler

| Alan | Mevcut davranış |
|---|---|
| Hesap | E-posta/şifre, tek kullanımlık altı haneli doğrulama kodu, şifre yenileme |
| Eşleşme | 24 saat geçerli 12 karakterli kod; veritabanında en fazla iki üyelik |
| Mesaj/görev | Ortak sohbet, görev tamamlama, görevi anıya bağlama |
| Fotoğraf/anı | JPEG doğrulama ve yeniden kodlama, EXIF temizleme, not/tarih/yer |
| Harita/albüm | Aynı anının iki görünümü; native harita ve web Leaflet |
| Konum | Rıza, paylaşım sürümü, eski ölçüm uyarısı, paylaşımı durdurma |
| Güvenlik | İçerik bildirme, partner engelleme, üretimde fotoğraf inceleme kuyruğu |
| Silme | Eşleşmeyi bitirme ve şifre onaylı hesap silme; ilişkili verinin atomik kaldırılması |

## Mimari

Expo SDK 58 / React Native 0.88 / React 19.3 / TypeScript → Fastify 5 API → PostgreSQL 17.

```text
src/app/               Expo Router rotaları
src/screens/           Mobil ekranlar
src/lib/backend.ts     HTTP, HttpOnly/SecureStore oturumu
src/lib/api.ts         Ortak veri ve fotoğraf istemcisi
src/lib/location.ts    İzinli GPS ve arka plan görevi
server/src/            Hesaplar, yetkilendirme, işlemler, posta ve yönetim CLI
server/migrations/     Veritabanı şeması
server/tests/          Gerçek PostgreSQL entegrasyon ve güvenlik testleri
server/compose.dev.yml Yerel API + PostgreSQL + Mailpit
server/compose.prod.yml HTTPS reverse proxy ile üretim şablonu
```

Ortak veriler ön planda yaklaşık üç saniyede bir sorgulanır; bağlantı hatası son veriler olarak gösterilir. Mesaj ve anı listeleri en fazla 200 kayıt getirir; eski kayıtlar için sayfalama arayüzü yoktur. Her çift en fazla 500 fotoğraf tutabilir. Fotoğraflar özel PostgreSQL bytea alanında saklanır; bu tercih küçük MVP içindir. Büyük ölçek için ayrı nesne deposu/CDN ve yeni kabul testleri gerekir.

## Üretim

Yerel çalıştırma mağaza yayını değildir. Gerçek kullanıcılar için **sunucu, alan adı, HTTPS, SMTP sağlayıcısı, yedekleme ve insan moderasyonu** gerekir; bunların hosting maliyetleri vardır. Sunucu erişimi ve hesap bilgileri olmadan canlı dağıtım yapılmış sayılmaz.

Üretimde fotoğraflar insan incelemesi bekler. [Moderasyon rehberi](docs/MODERATION.md) ve [yayın kontrol listesi](docs/RELEASE_CHECKLIST.md) tamamlanmalıdır. Güvenlik açığı bulunmadığı veya Apple kabulü garantisi verilmez. Mesajlar uçtan uca şifreli değildir. Gerçek iki iPhone testi ve imzalı native paket kontrolü gerekir.

## Komutlar

| Komut | İşlev |
|---|---|
| `npm run backend:up` | Yerel servisleri başlat |
| `npm run backend:logs` | API loglarını göster |
| `npm run backend:down` | Verileri koruyarak servisleri durdur |
| `npm run web` | Web önizlemesini aç |
| `npm run typecheck` / `npm run lint` | İstemci statik kontrolleri |
| `npm test` / `npm run test:release` | İş kuralı ve yayın ayarı testleri |
| `npm --prefix server ci` / `npm --prefix server run build` | Backend bağımlılıkları / derleme |
| `npm run test:backend` | Ayrı test PostgreSQL veritabanında entegrasyon |
| `npm run export:web` / `npm run export:ios` | JS/varlık paketleri; imzalı uygulama değildir |
| `npm run ios:check` | API/EAS/iOS yapılandırma hazırlığı |

[Gizlilik](docs/PRIVACY.md) · [Kullanım koşulları](docs/TERMS.md) · [Destek](docs/SUPPORT.md) · [Katkı](CONTRIBUTING.md) · [MIT lisansı](LICENSE)
