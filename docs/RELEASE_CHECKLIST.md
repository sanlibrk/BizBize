# TestFlight ve App Store yayın hazırlığı

## Kaynakta tamamlananlar

- [x] Firebase'e uygun, değerleri loglamayan iOS hazırlık kontrolü.
- [x] TestFlight build profili ve production/testflight için eksik config engeli.
- [x] Bundle identifier / EAS proje kimliği için ortam yapılandırması.
- [x] Uygulama içi gizlilik, koşullar ve destek ekranları; herkese açık belge metinleri.
- [x] İçerik bildirme, özel inceleme kuyruğu ve partner engelleme.
- [x] Temel metin filtresi ve bulut fotoğraf güvenlik kontrolü.
- [x] Hesap silme/erişim kapatma işlemlerinin yerel GPS hatasından bağımsızlaştırılması.
- [x] UserDefaults privacy manifest gerekçesi.
- [x] Mağaza açıklaması, App Privacy eşleştirmesi, inceleme notları ve ekran görüntüsü planı.
- [x] Statik kontrol, export ve Firebase entegrasyonu için GitHub Actions yapılandırması.

## Hesap/dağıtım/cihaz erişimi bekleyenler

- [ ] Firebase bulut projesi ve beş genel istemci değeri sağlandı.
- [ ] Cloud Functions, Firestore kuralları/indeksleri ve Storage kuralları dağıtıldı.
- [ ] Cloud Vision API, çalışma kimliği ve faturalandırma doğrulandı; fotoğraf kabul/hata testi geçti.
- [ ] `reports.expires_at` TTL etkin; bildirim kuyruğu ve destek e-postası için sorumlu belirlendi.
- [ ] Apple Developer üyeliği mevcut (kullanıcı bildirdi); oturum, takım ve imzalama erişimi doğrulandı.
- [ ] Kullanıcıya ait bundle identifier ve EAS proje UUID'si bağlandı.
- [ ] İki fiziksel iPhone'da test kaydı dolduruldu; ön plan/arka plan GPS doğrulandı.
- [ ] Gerçek hesap silme, engelleme ve üçüncü hesap erişim reddi bulutta doğrulandı.
- [ ] İmzalı native paketin privacy manifest ve SDK raporu incelendi.
- [ ] App Store Connect kaydı, yaş anketi, App Privacy ve export compliance tamamlandı.
- [ ] Gerçek iPhone ekran görüntüleri ve görsel hakları doğrulandı.
- [ ] İnceleme hesapları ve özel iletişim alanları App Store Connect'e girildi.
- [ ] TestFlight kabulü tamamlandı ve App Review gönderimi yapıldı.

## Komut sırası

```bash
npm ci
npm --prefix firebase/functions ci
npm run typecheck
npm run lint
npm run test:release
npm test
npm run functions:build
npm run test:firebase
npm run export:web
npm run export:ios
npm run ios:check
```

`ios:check` eksik yapılandırmada başarısız olmalıdır; bu beklenen korumadır. Gerçek proje alanlarını `.env` veya EAS production ortamına girin. `BIZBIZE_IOS_BUNDLE_IDENTIFIER` sizin Apple hesabınızda kayıtlı değer, `EAS_PROJECT_ID` gerçek Expo proje UUID'si olmalıdır; örnek değerlerle devam etmeyin.

```bash
npx eas-cli@latest login
npx eas-cli@latest init
npx eas-cli@latest build --platform ios --profile development
# İki cihaz kabulünden sonra:
npx eas-cli@latest build --platform ios --profile testflight
npx eas-cli@latest submit --platform ios --profile production
```

Submit paketi App Store Connect'e iletir; mağazada yayınlama kararı ve App Review akışı ayrıca tamamlanır. Bu depodaki işaretlenmemiş maddeler yapılmış sayılmamalıdır.
