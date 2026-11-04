# İki iPhone ile gerçek canlı konum testi

## Mevcut durum · 2 Kasım 2026

Yerel kontrolde `.env`/Supabase değerleri, Expo oturumu/EXPO_TOKEN, EAS proje bağlantısı ve Supabase CLI oturumu bulunmadı. Bundle identifier hâlâ `com.example.yanyana`. Windows'a bağlı Apple mobil cihaz görülmedi; uzaktaki iPhone'ların varlığı veya Apple Developer üyeliği bu bilgisayardan doğrulanamaz. Anahtar/oturum değerleri yazdırılmadı.

**Gerçek cihaz testi kullanıcının kararıyla ertelendi.** Henüz imzalı iOS uygulaması üretilmedi ve gerçek konum testi başlamadı. Bilgisayar önizlemesiyle devam ediliyor. iOS Hermes paketi üretildi, native derleme yapılmadı. Aşağıdaki adımlar sonraki cihaz testi içindir; bu turda hesap/telefon kurulumu beklenmiyor.

## Bir defalık hazırlık

1. Kendi Supabase projen oluşturulduktan sonra README'deki SQL şemasını uygula ve `delete-account` işlevini dağıt. Auth redirect adresine `yanyana://auth` ekle.
2. Bu klasörde PowerShell ile yerel değerleri gir. Anahtar sohbete yazılmaz:

```powershell
./scripts/configure-ios.ps1
```

Araç Supabase URL'si, maskelenmiş **publishable** anahtar ve sana ait bundle identifier ister. Secret/service_role kabul etmez; mevcut `.env` üzerine yazmaz. Manuel düzenleme de mümkündür.

3. Expo hesabına **kendin** giriş yap ve projeyi bağla:

```powershell
npx eas-cli@latest login
npx eas-cli@latest init
```

4. EAS Dashboard → Project → Environment Variables bölümüne yerel `.env` içindeki iki `EXPO_PUBLIC_*` değerini `development` ortamına ekle. Bunlar istemciye gömülen genel değerlerdir. Hizmet anahtarı ekleme.
5. Apple Developer hesabının imzalama erişimiyle iki iPhone'u kaydet. Aynı `device:create` akışındaki kayıt bağlantısını her iPhone'da açabilirsin. UDID veya hesap şifresi sohbete gönderilmez.

```powershell
npx eas-cli@latest device:create
npm run ios:check
npx eas-cli@latest build --platform ios --profile development
```

`ios:check` yalnızca hazır/eksik durumunu gösterir. Backend şemasının uygulanmasını, Apple üyeliğini veya gerçek konum akışını doğrulamaz. Başarılı EAS derlemesinin kurulum bağlantısını kayıtlı iki iPhone'da aç. iOS gerekirse Developer Mode'u kullanıcıdan ister. İmzalama, sözleşme ve hesap doğrulamalarını kullanıcı tamamlar.

6. Aynı Wi-Fi üzerinde bilgisayardan başlat:

```powershell
npx expo start --dev-client --lan
```

İki telefonda kurulu **geliştirme uygulamasını** aç; Expo'nun verdiği QR/yerel proje bağlantısını kullan. Web önizlemesi ve Expo Go bu testin yerine geçmez. Yerel ağ erişimi kapalıysa bağlantı kurulamaz; ağ ayarlarını kullanıcı kontrol eder.

## Test oturumu · yaklaşık 20–30 dakika

Telefonları **A** ve **B** diye adlandır. Farklı iki test e-postası kullan. Kişisel fotoğraf yerine test için seçtiğin bir görsel kullanabilirsin. Konum paylaşımı her telefonda ayrı rızayla açılır.

| Sıra | İşlem | Başarı ölçütü |
|---|---|---|
| 1 | A/B'de hesap oluştur, e-postayı onayla. A kod oluştursun, B girsin. | İkisi aynı boş haritayı açar; paylaşım başlangıçta kapalıdır. |
| 2 | A ve B → Ayarlar → Uygulama açıkken paylaş; konum izni ver. İki telefonu birkaç yüz metre ayır. | Her haritada iki ayrı kişi işareti ve gerçek ölçüm zamanları görünür. Yaklaşık doğruluk makuldür. |
| 3 | A yürüsün, B haritayı açık tutsun. | A'nın ölçüm zamanı/koordinatı değişir; B'de güncel ölçüm görünür. Sabit cihazda hareket eşiği nedeniyle yeni ölçüm gelmeyebilir. |
| 4 | A → Arka planda da paylaş, “Her Zaman” izni ver. A ekranını kilitle, birkaç dakika yürüt; B açık kalsın. | Gerçek arka plan ölçümü B'ye ulaşır. Ölçüm zamanı kaydedilir; belirli saniye aralığı garanti kabul edilmez. A/B yer değiştirerek tekrar et. |
| 5 | A paylaşımı durdursun. | A işareti B haritasından kalkar; gecikmiş callback geri getiremez. Eşitleme/polling için yaklaşık 20 sn bekleme payı vardır. |
| 6 | A tekrar paylaşsın; sonra A'nın internetini kes veya uygulamayı zorla kapat. En az 2 dakika bekle. | B son ölçümü soluk ve “eski konum” olarak görür. Yeni zaman üretilmez. Bu durum kesin çevrimdışı tespiti diye sunulmaz. |
| 7 | A internetini açıp uygulamaya dönsün. | Yeni gerçek ölçüm gelince eski etiketi kalkar. İzin iptal edilmişse paylaşım sürüyor iddiası verilmez. |
| 8 | Fotoğraf, not, tarih ve yerle bir anı ekle. Haritayı yakınlaştır/uzaklaştır. | İki telefonda albüm ve harita aynı anıyı gösterir; uzaktan nokta/küme, yakından fotoğraf; canlı kişi işaretleri ayrıdır. |

## Sonucu kaydet

`DEVICE_TEST_RESULTS.md` dosyasındaki boş tabloya cihaz modeli, iOS sürümü, izin durumu, derleme kimliği ve her adımın geçti/kaldı sonucunu yaz. Tam koordinat, e-posta, UDID, parola veya anahtar ekleme. Ekran görüntüsü paylaşılacaksa kişisel verileri önce kullanıcı olarak kaldır.

Test ancak her iki telefonda gerçek ön plan **ve arka plan** ölçümü gözlendiğinde geçmiş sayılır. Bir Hermes paketinin üretilmesi veya örnek konumlu haritanın açılması bu sonucu sağlamaz. Sorun varsa hangi adımın, hangi telefon/iOS sürümünde ve ne kadar bekledikten sonra kaldığını belirtmek yeterlidir.
