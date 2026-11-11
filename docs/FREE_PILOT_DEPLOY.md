# Ücretsiz kişisel pilot · Vercel + Neon

Bu yol, **ücretsiz, reklamsız ve uygulama içi satın alma içermeyen kişisel Biz Bize pilotunu** internetten erişilen backend ve TestFlight üzerinden denemek içindir. Mevcut Fastify/PostgreSQL uygulaması kullanılır. Yeni bir Firebase veya öğrenci kredisi başvurusu gerekmez.

**Durum:** Kaynakta sunucusuz çalışma profili ve kurulum araçları hazırlanmıştır. Vercel/Neon hesabında gerçek dağıtım, dış SMTP teslimi ve iPhone kabulü tamamlanmış sayılmaz. Ücretsiz kotalar sınırsız kapasite veya kalıcı erişilebilirlik garantisi değildir. App Store yayını için ayrıca [yayın kontrol listesi](RELEASE_CHECKLIST.md) tamamlanır.

## 1. İki ücretsiz hesabı aç

- [Vercel](https://vercel.com/signup): kişisel **Hobby** planını seç. Ücretli Pro denemesine veya ücretli eklentiye geçme.
- [Neon](https://console.neon.tech/): **Free** planında, yalnızca Biz Bize için ayrı ve boş bir PostgreSQL projesi/veritabanı oluştur. Mevcut başka uygulamanın veritabanını kullanma.

Vercel yapılandırması Frankfurt bölgesini (`fra1`) seçer; Neon projesinde de yakın bir Avrupa bölgesi seç. Özel alan adı satın almak bu pilot için şart değildir; backend Vercel’in verdiği HTTPS adresini kullanır. Vercel Hobby kişisel ve ticari olmayan kullanımla sınırlıdır. Uygulamanın ücretsiz olması tek başına bütün ticari kullanım koşullarını karşılamak anlamına gelmez; gelir, reklam veya müşteri işi planlanırsa [adil kullanım koşullarını](https://vercel.com/docs/limits/fair-use-guidelines) yeniden değerlendir.

## 2. Veritabanını bilgisayarından bir kez hazırla

Proje kökünde:

```powershell
npm --prefix server ci
```

Neon’un bağlantı ekranında **connection pooling kapalıyken**, veritabanı sahibi için verilen doğrudan PostgreSQL bağlantısını al. VS Code’da yalnızca kendi bilgisayarında `server/.env.bootstrap` dosyası oluştur:

```dotenv
DIRECT_DATABASE_URL=NEON_DOGRUDAN_SAHIP_BAGLANTISI
```

Yukarıdaki örnek değerin yerine gerçek bağlantıyı dosyanın içine koy. Bu bağlantı parola içerir. Dosyayı GitHub’a, sohbete, ekran görüntüsüne veya mobil uygulama ayarlarına ekleme.

```powershell
npm --prefix server run prepare:serverless
```

Komut ayrı şemayı kurar, `bizbize_api` adlı sınırlı uygulama rolünü oluşturur ve rastgele sırları **`server/.env.serverless`** dosyasına yazar. Vercel’de kullanılacak bağlantı bu sınırlı roldür; Neon sahibi bağlantısı backend’e verilmez. Neon bağlantısı için havuzlu sunucu adı üretilir. Gerçek değerler terminale yazdırılmaz.

Komut mevcut özel dosyayı veya rolü sessizce değiştirmez. Tekrar çalıştırmada “dosya/rol zaten var” hatası aldıysan ilk oluşturulan özel dosyayı koru; veritabanını veya rolü rastgele silerek tekrar deneme. Başka tablolar bulunan veritabanına ilk şema kurulumu da reddedilir. Kurulum rol işlemi sırasında geri alınırsa üretilen özel dosya kurtarma için korunur. Yeniden denemeden önce Neon SQL Console’da `bizbize_api` rolünün gerçekten bulunmadığını kontrol et; yalnızca bu durumda başarısız kurulumun özel dosyasını başka bir özel ada taşıyıp tekrar çalıştır. Rol varsa çalışan dağıtımın dosyasına dokunma. Hatayı incelerken sırları çıkart.

## 3. Gerçek e-posta göndericisini hazırla

Yerel Mailpit internet kullanıcısına e-posta göndermez. Küçük pilot için **sahibi olduğun kişisel Gmail hesabı**, hesabında destekleniyorsa, SMTP göndericisi adayıdır:

1. Google hesabında iki adımlı doğrulamayı etkinleştir.
2. [Google uygulama şifresi](https://support.google.com/mail/answer/185833) oluştur. Normal Google şifresini kullanma.
3. Üretilen uygulama şifresini yalnızca özel ortam ayarına gir. Bazı okul/kurum hesapları veya gelişmiş koruma ayarları bu seçeneği sunmaz; böyle bir hesabı zorlamadan farklı desteklenen gönderici değerlendir.

`server/.env.serverless` içindeki gönderici alanlarını kendi hesabına göre tamamla:

| Alan | Değer |
|---|---|
| `SMTP_HOST` | `smtp.gmail.com` |
| `SMTP_PORT` | `465` |
| `SMTP_SECURE` | `true` |
| `SMTP_USER` | Sahibi olduğun gönderici Gmail adresi |
| `SMTP_PASS` | Bu gönderim için oluşturduğun uygulama şifresi |
| `MAIL_FROM` | Aynı gönderici Gmail adresi |

Google kişisel hesaplarda günlük gönderim sınırları ve kötüye kullanım kontrolleri uygular. [Günlük 500 ileti eşiği](https://support.google.com/mail/answer/22839), güvenilir toplu gönderim kapasitesi veya her alıcıya teslim garantisi değildir. Bulut ortamından SMTP oturumu ve gerçek alıcıya teslim ayrıca sınanır. Gönderim çalışmadan yeni hesap akışını yayına hazır kabul etme.

## 4. Vercel projesini bağla ve özel ayarları gir

Vercel’de GitHub deposunu içe aktarırken:

| Ayar | Seçim |
|---|---|
| Repository | `sanlibrk/BizBize` |
| Production Branch | `main` |
| Root Directory | **`server`** |
| Framework | Other / depodaki `framework: null` yapılandırması |
| Node.js | **22.x** |
| Build Command | Depodaki `npm run build` |
| Plan | Hobby |

`server/vercel.json` standart Node girişini, API yönlendirmesini ve günlük bakım çağrısını tanımlar. Docker Compose dosyalarını Vercel’e dağıtmıyoruz.

Proje adını belirleyip Vercel’in vereceği **üretim HTTPS adresini** kontrol et. `server/.env.serverless` dosyasında:

- `PUBLIC_URL` ve `WEB_ORIGINS` alanlarını bu adresle değiştir; sonuna yol veya wildcard ekleme.
- `NODE_ENV=production`, `DEPLOYMENT_MODE=serverless` ve `PHOTO_MODERATION=manual` değerlerini koru.
- `DATABASE_URL`, `APP_SECRET`, `CRON_SECRET` ve SMTP alanlarını özel dosyadan Vercel’in **Production Environment Variables** bölümüne gir. `APP_SECRET` ile `CRON_SECRET` farklı olmalıdır.

Örnek alanları `CHANGE_ME` olarak bırakma. Bu dosyanın tamamını depoya yükleme. `DIRECT_DATABASE_URL` sahibi bağlantısını Vercel’e ekleme. Ayarlar tamamlandıktan sonra dağıt; ayarları sonradan değiştirirsen yeniden dağıtım gerekir.

Native uygulamanın API’ye ulaşabilmesi için üretim dağıtımındaki **Vercel Authentication / Deployment Protection** giriş duvarının genel erişimi engellemediğini kontrol et. Bu, API’nin kendi hesap/üyelik denetimlerini kapatmak değildir. Önizleme bağlantısını kalıcı API adresi olarak kullanma.

## 5. İnternetten sağlık ve teslim kontrolü yap

Üretim adresinin sonuna `/healthz` ekleyerek aç. Başarılı yanıt:

```json
{"status":"ok"}
```

Vercel giriş sayfası, HTML hata sayfası veya `503` görüyorsan henüz devam etme. Özel ortam değerlerini, build logunu, Neon bağlantısını ve sınırlı rolün yetkilerini kontrol et; logları paylaşırken bağlantı/parola/token değerlerini çıkart.

Sunucusuz profilin e-posta işleyicisi kayıt, yeniden gönderme ve gönderim durumu gibi ilgili isteklerle **sınırlı bir gönderim denemesi** yapar. Gerçek Vercel runtime’ında iş, resmî `waitUntil` yaşam döngüsüne kaydedilir; SMTP gecikmesi genel yanıtı bloke etmez. Yerel adaptör testi işi yanıt öncesinde bekler. Başarısız ileti şifreli kuyrukta kalır, süre ve tekrar bekleme kurallarına göre yeniden denenir. Doğrulama ekranı ve şifre yenileme ekranı beklerken bu işleme istekleri devam eder. Sayfa/uygulama kapalıyken sürekli arka plan posta işçisi çalıştığı varsayılmaz; kodun süresi dolarsa yeniden istenir.

## 6. iPhone paketini canlı adrese bağla

Expo projesinin **production** ortamına yalnızca şu herkese açık istemci ayarlarını gir:

```dotenv
EXPO_PUBLIC_API_URL=https://SENIN_URETIM_PROJEN.vercel.app
EXPO_PUBLIC_DEPLOYMENT_MODE=serverless
```

DB parolası, SMTP şifresi, `APP_SECRET` veya `CRON_SECRET` için `EXPO_PUBLIC_` kullanma. Bunlar telefona gönderilmez. EAS üretim ortamı ile yerel `.env` farklı ayarlardır; yalnızca yerel dosyayı değiştirmek bulut derlemesini güncellemez.

Yerel hazırlık kontrolü EAS ortamını uzaktan okumaz. Proje kökünde yeni bir PowerShell terminali açıp aynı gerçek API adresini bu terminale de ver:

```powershell
$env:EXPO_PUBLIC_API_URL="https://SENIN_URETIM_PROJEN.vercel.app"
$env:EXPO_PUBLIC_DEPLOYMENT_MODE="serverless"
npm run ios:check
npx eas-cli@latest build --platform ios --profile testflight
npx eas-cli@latest submit --platform ios --profile production
```

Mevcut Apple Developer üyeliği, Expo hesabı, uygulama kimliği, imzalama yetkileri ve App Store Connect uygulama kaydı gerekir. Expo’nun ücretsiz derleme kotası ve sıra koşulları ayrıca geçerlidir; başarısız imzalama veya derleme kaydı mağaza yayını olarak sunulmaz. Paket App Store Connect’te işlendikten sonra TestFlight üzerinden gerçek telefona yüklenir. [iOS gönderim rehberi](https://docs.expo.dev/submit/ios/).

Bu pilot **native iPhone istemcisini** hedefler. Mevcut web oturumu SameSite çerez kullandığı için bilgisayardaki Expo web sayfasını farklı sitedeki üretim API’sine bağlamak desteklenen web dağıtımı değildir. Yerel web testlerini Docker API ile sürdürebilirsin; bulutta web istemcisi için ayrıca aynı site/uygun origin düzeni hazırlanmalıdır.

## 7. Telefonda kabul ve moderasyon

İki ayrı test hesabıyla şu akışları gerçek backend üzerinde dene:

- Kayıt → gerçek e-posta → kod doğrulama → iki kullanıcıyla eşleşme.
- Mesaj, görev ve fotoğraflı anı oluşturma; üçüncü hesapla özel içeriğe erişimin reddi.
- Fotoğrafın sahibinde inceleme etiketiyle görünmesi, operatör onayından sonra partnerde görünmesi.
- Konum iznini reddetme/kabul etme; paylaşımı durdurma; arka planda gerçek cihaz davranışı.
- İçerik bildirimi, engelleme, şifre yenileme ve mevcut şifreyle hesap silme.

Üretimde fotoğraf incelemesi manuel olduğu için bu kuyruğu takip edecek kişi olmalıdır. Yetkili bilgisayarda özel `server/.env.operator` dosyasına Neon’un **doğrudan** yönetim bağlantısını `DATABASE_URL` olarak koy. Ardından:

```powershell
npm --prefix server run build
node --env-file=server/.env.operator server/dist/admin.js status
node --env-file=server/.env.operator server/dist/admin.js list
node --env-file=server/.env.operator server/dist/admin.js export-photo FOTO_UUID ozel-inceleme.jpg
node --env-file=server/.env.operator server/dist/admin.js approve-photo FOTO_UUID
```

İnceleme kopyasını özel tut ve işlemden sonra kaldır. Diğer operatör işlemleri [moderasyon rehberindedir](MODERATION.md). Doğrudan yönetim bağlantısını kullanıcıya veya Vercel API ortamına verme.

## 8. Bakım, veri süresi ve ücretsiz kapasite

`/internal/maintenance` günlük cron tarafından `CRON_SECRET` ile çağrılır. Yetkisiz çağrının `401` döndüğünü ve Vercel’in Cron Jobs bölümünde yetkili bakım çağrısının başarılı olduğunu doğrula. Bakım kodu yalnızca zaman aşımına uğramış kayıtları ve sahipsiz eski fotoğrafları temizler; canlı içeriği yedekleme yerine geçmez.

Sunucusuz kurulumda fiziksel temizlik dakikada bir değil, bir sonraki günlük çalışmada yapılır. **Mantıksal süre sonundan sonra yaklaşık bir güne varan ek saklama ve iş başarısızlığında gecikme** olabilir. Saklama açıklamalarını gerçek dağıtımla eşleştir; cron başarılarını izle. Kodu/oturumu süre sonundan sonra geçerli kılan bir bekleme süresi değildir.

Neon’un kısa geri dönüş penceresini uzun süreli yedekleme sanma. [Backend rehberindeki](BACKEND_SETUP.md) şifreli yedek ve ayrı test veritabanına geri yükleme adımlarını uygula; fotoğraflar da DB yedeğinin içindedir. Veri kapasitesi dolmadan fotoğraf/yedek hacmini izle.

11 Kasım 2026 tarihinde kontrol edilen başlıca ücretsiz sınırlar:

| Hizmet | Kapsam ve sınır |
|---|---|
| Vercel Hobby | Aylık 1 milyon function çağrısı, 4 saat etkin CPU, 360 GB-saat ayrılmış bellek; platformun diğer trafik ve kullanım kotaları ayrıca geçerli |
| Neon Free | Proje başına 1 GB DB alanı, aylık 100 CU-saat ve 5 GB dışarı veri aktarımı |
| Uygulamanın serverless profili | En fazla 3 MiB ham JPEG; ön planda yaklaşık 15 saniyelik ortak veri yenileme |

Fotoğraflar, mesajlar ve hesaplar **aynı 1 GB veritabanı alanını** paylaşır. Çift başına uygulama sınırı, ücretsiz hizmetin toplam kapasitesini artırmaz. Daha seyrek yenileme anlık push teslimi anlamına gelmez. Kota aşımı hizmetin durmasına veya işlemlerin reddine yol açabilir; ücretli yükseltme otomatik bir sonraki adım değildir.

**Resmî kaynaklar:** [Vercel Hobby](https://vercel.com/docs/plans/hobby), [Vercel function sınırları](https://vercel.com/docs/functions/limitations), [cron sınırları](https://vercel.com/docs/schedules/cron-jobs/usage-and-pricing), [Neon fiyat/kotaları](https://neon.com/pricing), [Neon bağlantı havuzu](https://neon.com/docs/connect/connection-pooling), [Google uygulama şifreleri](https://support.google.com/mail/answer/185833).

[Ana proje](../README.md) · [Güncel backend](BACKEND_EDITION.md) · [Yayın kontrol listesi](RELEASE_CHECKLIST.md)
