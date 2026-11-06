# Biz Bize · İki iPhone ile kabul testi

Bu rehber Firebase kullanan güncel kaynak ağacı içindir. Bir test sonucu veya tamamlanmış native derleme beyanı değildir.

## Hazırlık

1. [Firebase kurulumunu](docs/FIREBASE_SETUP.md) bir test projesinde tamamlayın; kuralları, indeksleri ve Functions'ı dağıtın.
2. `.env.example` alanlarını `.env` içinde doldurun; `EXPO_PUBLIC_FIREBASE_USE_EMULATORS=0` kullanın. Mevcut emülatör istemcisi fiziksel iPhone'un LAN host bağlantısını kabul etmez.
3. `app.json` içindeki `com.example.bizbize` bundle identifier değerini size ait benzersiz kimlikle değiştirin. Görünen uygulama adı **Biz Bize**, scheme `bizbize`'dir.
4. Expo hesabınızla EAS projesini bağlayın. EAS `development` ortamına beş genel Firebase alanını ve emülatör anahtarı için `0` değerini ekleyin.
5. Apple imzalama erişimi ve iki fiziksel iPhone kaydıyla geliştirme derlemesi hazırlayın:

```bash
npx eas-cli@latest login
npx eas-cli@latest init
npx eas-cli@latest device:create
npx eas-cli@latest build --platform ios --profile development
```

İki telefona geliştirme uygulamasını kurun. Gerekirse iOS Developer Mode'u açın. Aynı ağdaki bilgisayarda:

```bash
npx expo start --dev-client --lan
```

Arka plan konumu için geliştirme derlemesi gerekir; Expo Go ve web önizlemesi bu kabulün yerine geçmez. Windows'ta yerel iOS Simulator/Xcode çalışmaz; EAS bulut derlemesi kullanılabilir.

**Hazırlık kontrolü:** `npm run ios:check` Firebase, EAS ve iOS alanlarını değerleri yazdırmadan denetler. `.env` içinde `BIZBIZE_IOS_BUNDLE_IDENTIFIER` ve `EAS_PROJECT_ID` alanlarını gerçek kimliklerle doldurun. Kontrolün geçmesi gerçek cihaz testinin yerine geçmez. Fotoğraf testinden önce [moderasyon kurulumunu](docs/MODERATION.md) tamamlayın.

## Test oturumu

İki ayrı test e-postası kullanın; hesapları doğrulayın. Konum paylaşımı her cihazda ayrı açılır.

| Sıra | İşlem | Beklenen sonuç |
|---|---|---|
| 1 | A davet oluştursun, B katılsın | Aynı boş ortak alan; paylaşım kapalı |
| 2 | İki cihazda ön plan paylaşımı açılsın | İzin sonrası iki gerçek konum ve ölçüm zamanları |
| 3 | A yürüsün, B haritayı izlesin | Hareket sonrası yeni ölçüm B'ye ulaşır |
| 4 | A arka plan paylaşımını açsın; ekran kilitliyken yürüsün | B gerçek arka plan ölçümü alır; A/B değiştirerek tekrarlanır |
| 5 | A paylaşımı durdursun | A işareti B'den kalkar; geç callback geri getirmez |
| 6 | A yeniden paylaşsın; interneti kesilsin veya uygulama zorla kapatılsın | İki dakika sonra son ölçüm eski görünür; yeni zaman uydurulmaz |
| 7 | Ağ geri gelsin, uygulama açılsın | Yeni GPS ölçümüyle eski etiketi kalkar |
| 8 | Mesaj/görev ve fotoğraflı anı eklensin | İki cihazda aynı içerik; anı harita ve albümde açılır |
| 9 | Konum/fotoğraf izni reddedilsin | Açıklayıcı hata; ilgisiz özellikler kullanılabilir |
| 10 | Eşleşme bitirilsin ve ayrı test hesaplarıyla hesap silme denensin | Ortak erişim kapanır; sunucu temizliği ve Auth silme doğrulanır |

iOS, arka plan iznini ilk istekte vermeyebilir. Ayarlar → **Biz Bize** → Konum bölümünü kontrol edin. GPS ve arka plan sıklığı işletim sistemi, pil ve ağ kararlarına bağlıdır; sabit saniye aralığı başarı ölçütü değildir.

## Sonucu kaydetme

[DEVICE_TEST_RESULTS.md](DEVICE_TEST_RESULTS.md) tablosuna cihaz, iOS sürümü, derleme/commit ve sonuçları yazın. Tam koordinat, e-posta, UDID, parola veya anahtar kaydetmeyin. İki cihazda ön plan ve arka plan ölçümleri gözlenmeden canlı konum kabulünü geçti olarak işaretlemeyin.

[README'ye dön](README.md)

