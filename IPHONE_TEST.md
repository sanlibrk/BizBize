# İki iPhone ile kabul testi

Önce kendi API’nizi HTTPS ile dağıtın. `.env` ve EAS development ortamında `EXPO_PUBLIC_API_URL` gerçek API adresini göstermeli. Fiziksel iPhone'da localhost bilgisayarınızı göstermez. Bundle identifier size ait olmalı; EAS proje UUID'si gerçek proje olmalı.

```bash
npx eas-cli@latest login
npx eas-cli@latest init
npx eas-cli@latest device:create
npm run ios:check
npx eas-cli@latest build --platform ios --profile development
npx expo start --dev-client --lan
```

Kayıtlı iki iPhone'a geliştirme derlemesini kurun. Arka plan konumu Expo Go/web ile doğrulanmaz.

1. İki test hesabı açın; SMTP ile gelen altı haneli kodları uygulamada girin.
2. Tek kullanımlık davetle eşleşin; yeni çift boş, konum paylaşımı kapalı başlamalı.
3. İki cihazda mesaj/görev/anı oluşturun. Üretimde fotoğraf onayı öncesinde görünmediğini, operatör onayı sonrası iki cihazda göründüğünü doğrulayın.
4. Her iki cihazda ön plan konumunu açıp hareket edin; gerçek ölçüm zamanlarını kontrol edin.
5. Arka plan paylaşımını ayrıca seçip Her Zaman izni verin. Ekran kilitliyken hareket edin, cihazların rollerini değiştirin.
6. Ön plan paylaşımına geçince arka plan görevinin durduğunu; tüm paylaşımı durdurunca koordinatın kaldırıldığını doğrulayın.
7. Ağ kesintisi/zorla kapatma sonrası iki dakikayı aşan ölçümün eski gösterildiğini kontrol edin. Güncelleme sıklığı garanti değildir.
8. Fotoğraf/konum iznini reddedip diğer özelliklerin çalıştığını, bağlantı hatalarının açıklandığını sınayın.
9. Bildirim ve engelleme akışlarını test hesaplarında deneyin; yeniden eşleşme engeli iki yönlü olmalı.
10. Şifre yenilemenin önceki oturumları ve paylaşımı kapattığını; hesap silmenin mevcut şifre istediğini ve ortak içerikleri kaldırdığını doğrulayın.

Cihaz modeli, iOS sürümü, build ve sonuçları [kayıt şablonuna](DEVICE_TEST_RESULTS.md) yazın. Bu rehber testlerin yapıldığı iddiası değildir.
