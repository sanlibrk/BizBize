# Yan Yana · 0.1.0

Çiftler için Türkçe, iOS odaklı Expo / React Native uygulamasının ilk çalışan sürümü. **Yan Yana bir çalışma adıdır**; mağaza adı veya marka uygunluğu doğrulanmadı.

## Hemen çalıştır

Node 22.18+ ve npm ile bu klasörde:

```powershell
npm ci
npm run web
```

Tarayıcıda Expo'nun gösterdiği yerel adresi aç (varsayılan http://localhost:8081). **Örnek dünyayı keşfet** düğmesiyle hesapsız dene. Anahtar gerekmez. Kurulu bağımlılıklar bu çalışma klasöründe hazırdır; mevcut bilgisayarda `npm ci` tekrar gerekli değil.

Önizleme yalnızca bu cihazın yerel deposuna kaydeder. Örnek kişiler, mesajlar ve sabit konumlar açıkça etiketlidir; simüle konumlara güncel zaman yazılmaz. Konum paylaşma düğmeleri devre dışıdır. Örnek fotoğraflar Unsplash'tan, web haritası OpenStreetMap'ten internet üzerinden yüklenir. Önizleme verisi gerçek hesaba taşınmaz. Ayarlar → **Boş başlangıcı dene** içeriksiz ortak alanı açar. Önizleme yeniden açılınca son yerel içerikler geri gelir.

## Neler var?

- Karşılama, e-posta ile hesap oluşturma/giriş, e-posta doğrulama ve şifre yenileme bağlantısı.
- 24 saatlik, tek kullanımlık 12 karakterli davet koduyla en fazla iki hesaplı eşleşme. Yeni kod eskiyi geçersiz kılar; kod denemeleri hesap başına sunucuda sınırlıdır.
- **Harita:** iki kişinin izinli son konumu ve geçmiş anıları aynı haritada. İlk açılışta mevcut noktalar kadraja alınır. Anılar uzaktan nokta/küme, yakından fotoğraf; dokununca tarih, not, yer ve fotoğraf.
- **Canlı konum:** gerçek GPS ölçümü, ön plan izni ve isteğe bağlı arka plan izni; kişinin kendi paylaşımını durdurması. Son ölçüm zamanı ve yaklaşık doğruluk. İki dakikayı aşan veya geçersiz zamanlı ölçümler eski gösterilir. “Eski” kesin çevrimdışı tespiti değildir.
- **Mesajlar:** çiftin ortak sohbeti; görev kartı gönderme ve tamamlama. Göreve fotoğraf + tarih + yer eklemek tek işlemde ortak anı oluşturur.
- **Albüm:** tarihe göre fotoğraf kartları; anıdan haritadaki noktaya geçiş. Harita ile aynı veri kaydı.
- Anı sahibinin kendi anısını silmesi, eşleşmeyi bitirme ve uygulama içinden hesap silme.
- Krem/pudra arayüz, yerel iOS haritası (MapKit), telefon genişliğinde web önizlemesi.

## Önizleme ile gerçek çalışma arasındaki fark

| Alan | Bu bilgisayarda doğrulanan | Gerçek kullanıma geçmek için |
|---|---|---|
| Arayüz / mesaj / görev / anı / albüm | Çalışan yerel önizleme | Hazır |
| Hesaplar, iki cihazlı ortak veri | Entegrasyon kodu hazır; canlı hizmete bağlanmadı | Supabase projesi, şema, iki genel ortam değeri |
| Veri ayrımı ve izinler | Gerçek PostgreSQL motorunda yerel RLS testleri geçti | Aynı şemayı Supabase'e uygulayıp üç hesapla uçtan uca doğrula |
| Canlı GPS / arka plan konumu | Native kod, izinler, görev kaydı ve iOS yapılandırması hazır | İmzalı geliştirme derlemesi, iki iPhone ve izin testi |
| iOS | Hermes JavaScript paketi üretildi | EAS/Xcode native derlemesi, Apple imzalama, cihaz testi |
| Hesap silme | Edge Function ve tekrar deneme kaydı hazır | İşlevi dağıt; gerçek Auth/Storage ile doğrula |

**Gerçek iOS native derlemesi, iki cihazlı canlı GPS, Supabase Realtime ağı ve App Store yayını bu oturumda yapılmadı.**

## Supabase kurulumu

1. Kendi Supabase hesabında yeni bir proje oluştur. Mevcut, başka işlere ait veritabanına bu ilk şemayı uygulama.
2. SQL Editor'da `supabase/migrations/001_initial.sql` dosyasını bir kez çalıştır. Bu işlem tabloları, RLS kurallarını, sunucu işlevlerini, özel `memories` deposunu ve Realtime yayınını oluşturur. Demo verisi eklemez.
3. `.env.example` dosyasını `.env` adıyla kopyala ve proje URL'si ile **publishable** anahtarı yaz. Mobil uygulamaya `service_role` / secret anahtar koyma. `EXPO_PUBLIC_*` değerleri uygulamadan okunabilir; güvenlik RLS ve kullanıcı oturumundan gelir.
4. Supabase Auth → URL Configuration → Redirect URLs listesine `yanyana://auth` ekle. E-posta doğrulamasını açık tut. Şifre için en az 8 karakter ve uygun Auth hız sınırları belirle. Gerçek e-posta teslimi için kendi SMTP yapılandırmanı ekle.
5. Supabase CLI'ı kendi hesabınla kullanarak hesap silme işlevini dağıt:

```powershell
npx supabase login
npx supabase functions deploy delete-account --project-ref PROJE_REFERANSI
```

İşlev platform kapısına güvenmek yerine gelen Bearer token'ını `auth.getUser()` ile doğrular. `config.toml` bu nedenle `verify_jwt = false` içerir. İşlevin hizmet anahtarı yalnızca Supabase sunucu ortamında kalır. Doğrulanmış kullanıcı olmadan silme yapılamaz.

6. Expo'yu yeniden başlat (`npx expo start --clear`). İki ayrı e-posta hesabı oluştur. Birincide kod oluştur, ikincide kod gir. Her gerçek çift fotoğrafsız, mesajsız ve konum paylaşımı kapalı başlar.

Web, arayüz ve hesap akışının geliştirme önizlemesidir. Ürünün hedefi iOS'tur; e-posta onay/şifre yenileme bağlantılarını mobil geliştirme derlemesinde dene. Linkler URL parçasındaki oturum token'larını SDK'ya aktarır; token loglanmaz. Herhangi bir ücretli hesap veya gizli anahtar bu teslimde oluşturulmadı.

## iPhone'da deneme · Windows üzerinden

İki telefonla gerçek testin kısa uygulama rehberi: **`IPHONE_TEST.md`**. Anahtar göstermeyen hazırlık kontrolü: `npm run ios:check`. Yerel değerleri sohbet dışından girmek için `./scripts/configure-ios.ps1` kullanılabilir.

Bu proje SDK 58 kullanır. Arka plan konumu için **Expo Go yeterli değildir**; geliştirme derlemesi gerekir. Windows'ta iOS Simulator/Xcode çalışmaz. EAS Build macOS bulut işçileri üzerinden kullanılabilir. Fiziksel iPhone derlemesinin imzalanması için uygun Apple Developer hesabı gerekir.

1. `app.json` içindeki `com.example.yanyana` değerini sana ait, benzersiz bir bundle identifier ile değiştir. Gerekirse `slug` ve çalışma adını değiştir.
2. Expo hesabınla EAS projesini bağla; EAS ortamına `.env` içindeki iki genel değeri de tanımla. Yerel `.env` dosyası git/dağıtım dışında tutulur.

```powershell
npx eas-cli@latest login
npx eas-cli@latest init
npx eas-cli@latest device:create
npx eas-cli@latest build --platform ios --profile development
```

3. EAS'in yönlendirdiği Apple imzalama ve cihaz kaydını kendi hesabında tamamla. Oluşan geliştirme uygulamasını iPhone'a kur; istenirse iOS Developer Mode'u kullanıcı olarak aç.
4. Bilgisayar ve iPhone aynı ağdayken:

```powershell
npx expo start --dev-client --lan
```

5. Uygulamada Ayarlar → **Uygulama açıkken paylaş**. Sonra istersen **Arka planda da paylaş** ve iOS'un “Her Zaman” izni. iOS ilk istekte bu izni vermeyebilir; Ayarlar → Yan Yana → Konum bölümünü kontrol et.

Konum ölçümleri hareket, GPS, ağ, pil ve iOS kararlarına bağlıdır. Zorla kapatma veya izin iptali güncellemeyi durdurabilir. Uygulama açıkça eski zaman damgasını gösterir; kesintisiz veya saniye saniye takip vaadi vermez. Ön planda yaklaşık 15 m, arka planda yaklaşık 20 m hareket eşiği kullanılır; 15/30 sn değerleri işletim sistemine verilen istektir, garanti değildir. iOS arka plan göstergesi açıktır.

Android bu teslimin hedefi değildir. Native Google haritası için ayrıca Google Maps yapılandırması/API anahtarı gerekir; Android cihaz testi yapılmadı.

## Veri ve erişim modeli

- `couple_members.user_id` tekildir; `(couple_id, slot)` en fazla iki kişiyi sınırlar. Doğrudan üyelik yazımı kapalıdır; eşleşme sunucuda kilitli işlemlerle yapılır.
- Mesaj, anı ve son konum okumaları çift üyeliğiyle sınırlandırılır. İstemci tabloya doğrudan konum/görev güncellemesi yapamaz. Sunucu işlevleri sabit `search_path` kullanır.
- Davet kodunun düz metni sunucuda saklanmaz; hash + süre + kullanım durumu tutulur. Beş kod denemesi / 15 dakika sınırı vardır. Genel hizmet abuse koruması ayrıca üretim operasyonuna aittir.
- Konum izni ile sunucudaki paylaşım rızası birlikte gerekir. Durdurmak, cihaz izleyicisini kapatır; sunucu son koordinatı sıfırlar ve paylaşımı kapatır. Geç kalan callback paylaşımı yeniden açamaz. Ağ yoksa sunucu onayı alınamadığı açıkça belirtilir.
- Fotoğraflar özel depoda `coupleId/userId/memoryId.jpg` yolundadır. Bağlantılar 5 dakika geçerli imzalı URL'dir. Eşleşme bitince yeni erişim kapanır; önceden açılmış URL en fazla bu süre boyunca kullanılabilir. İndirilmiş kopyalar geri alınamaz.
- Native oturum token'ları SecureStore/Keychain'de; gerçek ortak içerik yerel önizleme deposuna yazılmaz. iOS, arka plan görevine erişim için ilk cihaz kilidi açıldıktan sonra Keychain okumasına izin verir.
- Realtime değişikliklerine ek olarak 20 sn aralık ve ön plana dönüşte yenileme vardır. Ağ yokken son veriler işaretlenir; gönderme başarısızsa metin taslakta kalır. Çevrimdışı gönderim kuyruğu bu sürümde yoktur. Son 200 sohbet kaydı yüklenir; eski mesajlar için sayfalama henüz yoktur.
- Mesajlar uçtan uca şifreli değildir. Supabase altyapısında işlenir. Canlı konum geçmişi tutulmaz; kullanıcının eklediği anı koordinatları kalıcı ortak içeriktir.

Eşleşmeyi bitirme ortak veritabanı içeriğini siler. Artık erişilemeyen depo dosyaları için operatör temizliği vardır:

```powershell
# SUPABASE_URL ve SUPABASE_SERVICE_ROLE_KEY yalnızca operatör sürecinin ortamında olmalı.
node scripts/cleanup-storage.mjs          # Sadece kaç dosya olduğunu gösterir
node scripts/cleanup-storage.mjs --apply  # Silinmiş çiftlerin sahipsiz dosyalarını temizler
```

Bunu sunucu tarafında düzenli çalıştır; anahtarı mobil `.env` dosyasına ekleme. Temizlik bu oturumda herhangi bir bulut projesine karşı çalıştırılmadı. Hesap silme işlevi ise çiftin erişimini kaldırır, fotoğrafları siler ve Auth hesabını kaldırır. Başarısız dosya silmeleri için tekrar deneme yollarını `account_deletion_jobs` tablosunda saklar.

## Doğrulama

```powershell
npm run typecheck
npm run lint
npm test
npm run export:web
npm run export:ios
```

`tests/security.test.ts`, Supabase Auth ve Storage şemalarının asgari sözleşmesini kurarak **PGlite PostgreSQL motorunda gerçek RLS/SQL yürütür**. Supabase'in ağ, e-posta, Storage HTTP ve WebSocket hizmetlerinin yerine geçmez. Testlerin ayrıntısı ve cihaz kabul adımları `TESTING.md` dosyasında.

2 Kasım 2026 npm denetimi: Expo araç zincirindeki `glob` / `minimatch` kaynaklı **11 orta seviye bildirim**, yüksek/kritik bildirim yok. Otomatik öneri SDK'yı geriye taşıdığı için `audit fix --force` uygulanmadı. Üretim derlemesinden önce Expo'nun uyumlu düzeltmesini ve denetimi tekrar değerlendir. Kilit dosyası teslimde bulunur.

## App Store'a geçiş

Bu sürüm App Store'a yüklenmedi ve mağaza incelemesine hazır olduğu iddia edilmiyor. Gerçek backend ve cihaz kabul testinden sonra kendi geliştirici hesabında:

- Uygun bundle identifier, Apple imzalama, App Store Connect kaydı ve EAS üretim ortamı.
- Gerçek destek iletişimi, yayımlanmış gizlilik politikası/kullanım koşulları ve App Privacy beyanları. Konum, fotoğraf, mesaj ve hesap verisi kullanımını fiili yapılandırmana göre belirt.
- Uygulama içi hesap silmenin dağıtılmış işlevle uçtan uca testi; yedek saklama sürelerinin politika ile uyumu.
- Özel sohbet için istenmeyen içerik bildirme/destek ve kötüye kullanım süreçleri. Eşleşmeyi bitirme mevcut; rapor işleme/moderasyon operasyonu henüz kurulmadı.
- Konum izni reddedilince diğer özelliklerin çalışması; arka plan kullanımının inceleme notlarında açıklanması; iki inceleme hesabı/eşleşme talimatı.
- Fotoğrafları, konum izinlerini, düşük pil/ağ kesintisini, büyük yazıyı ve gerçek cihaz ekranlarını kontrol et. Push bildirimleri bu sürümde eklenmedi; kapalı uygulamaya mesaj bildirimi yok.

Sonrasında `npx eas-cli@latest build --platform ios --profile production`, TestFlight kabulü ve kullanıcı tarafından yönetilen mağaza gönderimi. EAS/Apple hesaplarının koşul ve maliyetleri kullanıcıya aittir; bu adımlar burada yürütülmedi.

## Birincil belgeler

- [Expo proje kurulumu](https://docs.expo.dev/get-started/create-a-project/)
- [Expo Location ve arka plan sınırları](https://docs.expo.dev/versions/latest/sdk/location/)
- [Expo TaskManager](https://docs.expo.dev/versions/latest/sdk/task-manager/)
- [EAS Build kurulumu](https://docs.expo.dev/build/setup/)
- [Supabase React Native Auth](https://supabase.com/docs/guides/auth/quickstarts/react-native)
- [Supabase Row Level Security](https://supabase.com/docs/guides/database/postgres/row-level-security)
- [Supabase Realtime Postgres Changes](https://supabase.com/docs/guides/realtime/postgres-changes)
- [Supabase Storage erişimi](https://supabase.com/docs/guides/storage/security/access-control)
- [Edge Function yetkilendirmesi](https://supabase.com/docs/guides/functions/auth-headers)
- [Apple inceleme kuralları](https://developer.apple.com/app-store/review/guidelines/)
- [Apple uygulama içi hesap silme](https://developer.apple.com/support/offering-account-deletion-in-your-app/)
