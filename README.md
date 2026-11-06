<div align="center">

<img src="assets/icon.png" alt="Biz Bize uygulama simgesi" width="96" />

# Biz Bize

**İkinizin dünyası. Anılarınız, sohbetiniz ve paylaştığınız yerler bir arada.**

Çiftler için Türkçe, iOS odaklı bir Expo / React Native uygulaması.

[Başlangıç](#hızlı-başlangıç) · [Firebase kurulumu](docs/FIREBASE_SETUP.md) · [Mimari](docs/ARCHITECTURE.md) · [Test rehberi](TESTING.md) · [iPhone testi](IPHONE_TEST.md) · [Yayın hazırlığı](docs/RELEASE_CHECKLIST.md)

![Sürüm](https://img.shields.io/badge/sürüm-0.1.0-AE596C)
![Expo](https://img.shields.io/badge/Expo-SDK_58-000020)
![TypeScript](https://img.shields.io/badge/TypeScript-6-3178C6)
![Firebase](https://img.shields.io/badge/backend-Firebase-DD2C00)
![Lisans](https://img.shields.io/badge/lisans-MIT-527A72)

</div>

## Uygulama hakkında

Biz Bize, iki kişinin ortak anılarını fotoğraf, not, tarih ve konumla saklayabildiği; sohbet edebildiği ve kendi isteğiyle son konumunu paylaşabildiği özel bir alan sunar. Krem ve pudra tonlarındaki arayüz; **Harita**, **Mesajlar** ve **Albüm** etrafında şekillenir.

Ürünün görünen adı **Biz Bize**, paket adı `biz-bize`, bağlantı şeması `bizbize` ve GitHub depo adı `BizBize` olarak kullanılır. Teknik depo adresi: [sanlibrk/BizBize](https://github.com/sanlibrk/BizBize).

## Özellikler

| Alan | Mevcut uygulama davranışı |
|---|---|
| Hesap | E-posta ile kayıt/giriş, e-posta doğrulama ve şifre yenileme |
| Eşleşme | 24 saat geçerli, tek kullanımlık 12 karakterli davet; en fazla iki hesap |
| Harita | Partnerlerin paylaştığı son konumlar ve ortak anılar; anı ayrıntısına geçiş |
| Konum | Ön plan ve isteğe bağlı arka plan paylaşımı; kullanıcı tarafından durdurma |
| Mesajlar | Ortak sohbet, görev gönderme ve görev tamamlama |
| Anılar | Fotoğraf, not, tarih ve yer; görevi fotoğraflı anıya dönüştürme |
| Albüm | Tarih sıralı anılar; aynı kaydı haritada görüntüleme |
| Güvenlik | İçerik bildirme, partner engelleme, gizlilik ve kullanım koşulları |
| Hesap yönetimi | Kendi anısını silme, eşleşmeyi bitirme, hesap silme |
| Yerel önizleme | Hesapsız örnek dünya ve boş başlangıç; canlı olmayan konumlar açıkça etiketlenir |

## Güncel teknik durum

Sürüm `0.1.0` geliştirme aşamasındadır. Güncel backend **Firebase Authentication, Cloud Firestore, Cloud Storage ve callable Cloud Functions** kullanır. Supabase kurulumu bu kaynak ağacına ait değildir.

| Çalışma biçimi | Gereksinim | Kapsam |
|---|---|---|
| Yerel önizleme | Node.js ve npm | Hesapsız arayüz, örnek veriler, yerel içerik |
| Firebase emülatörleri | Node.js 22, Java 21+, Firebase CLI | Yerel Auth, kurallar, Storage ve Functions entegrasyonu |
| Firebase bulutu | Kullanıcıya ait Firebase projesi ve dağıtım | Gerçek hesaplar ve iki cihaz arasında ortak veri |
| iOS geliştirme derlemesi | Expo/EAS, Apple imzalama ve fiziksel iPhone | Native harita, GPS ve arka plan konum kabulü |

Kodun bulunması; bulut dağıtımının, iki iPhone testinin veya mağaza kabulünün tamamlandığı anlamına gelmez. Cihaz sonuçları [test kayıt şablonunda](DEVICE_TEST_RESULTS.md) tutulur.

## Hızlı başlangıç

Node.js **22.18 veya üzerini** kullanın; Functions çalışma zamanı Node.js 22'dir.

```bash
git clone https://github.com/sanlibrk/BizBize.git
cd BizBize
npm ci
npm run web
```

Expo'nun gösterdiği yerel adresi açın ve **Örnek dünyayı keşfet** seçeneğini kullanın. Firebase anahtarı gerekmez. Örnek fotoğraflar ve web haritası için internet gerekir.

Önizleme içeriği yalnızca cihazın yerel deposuna kaydedilir; gerçek hesaba aktarılmaz. Örnek konumlar GPS ölçümü değildir. Ayarlardaki **Boş başlangıcı dene** seçeneği içeriksiz ortak alanı gösterir.

Gerçek hesaplar için [Firebase kurulum rehberini](docs/FIREBASE_SETUP.md), fiziksel cihaz için [iPhone rehberini](IPHONE_TEST.md) izleyin.

## Teknoloji ve proje yapısı

Expo SDK 58 · React 19.3 · React Native 0.88 · TypeScript 6 · Expo Router · Firebase JS SDK 12 · iOS MapKit / react-native-maps · web üzerinde Leaflet · SecureStore.

```text
src/
  app/                 Expo Router rotaları
  screens/             Karşılama, eşleşme, harita/sohbet/albüm ve ayarlar
  components/          Ortak arayüz ve platforma özel harita
  lib/                 Firebase, kimlik doğrulama, veri ve konum istemcileri
  store.tsx            Oturum, önizleme ve ortak uygulama durumu
  domain.ts            Saf iş kuralları
firebase/
  functions/src/       Sunucu doğrulaması ve callable işlemler
  firestore.rules      Belge erişim kuralları
  firestore.indexes.json
  storage.rules        Fotoğraf erişim kuralları
tests/                 İş kuralı ve Firebase emülatör testleri
scripts/               Hazırlık ve bulut bağlantı yardımcıları
docs/                  Kurulum ve mimari belgeleri
```

Veri yolları, fotoğraf erişimi ve sunucu işlemleri için [mimari rehberine](docs/ARCHITECTURE.md) bakın.

## Geliştirme komutları

| Komut | Amaç |
|---|---|
| `npm run start` | Expo geliştirme sunucusu |
| `npm run web` | Web önizlemesi |
| `npm run ios` | Uygun macOS ortamında iOS başlatma |
| `npm run android` | Android başlatma |
| `npm run typecheck` | TypeScript denetimi |
| `npm run lint` | ESLint denetimi |
| `npm run ios:check` | Firebase / EAS / iOS hazırlık denetimi |
| `npm run test:release` | Yayın yapılandırması ve içerik güvenliği testleri |
| `npm run test:firebase` | Emülatör entegrasyonu |
| `npm test` | Testler; Firebase entegrasyonu emülatör yoksa atlanır |
| `npm run export:web` | Web paketi |
| `npm run export:ios` | iOS JavaScript paketi; imzalı native derleme üretmez |

Emülatör testlerinin tam komutu ve kabul ölçütleri [TESTING.md](TESTING.md) içindedir.

## Gizlilik ve mevcut sınırlar

- Ortak verilere erişim, doğrulanmış kullanıcı ve aktif çift üyeliğiyle sınırlandırılır. Paylaşılan veri değişiklikleri sunucu Functions üzerinden doğrulanır.
- Konum paylaşımı başlangıçta kapalıdır. İzin ve paylaşım rızası gerekir; kapatma işlemi son koordinatı sunucuda sıfırlar. İki dakikayı aşan ölçüm eski gösterilir; bu kesin çevrimdışı tespiti değildir.
- Canlı konumun yalnızca son kaydı tutulur. Anı koordinatları ortak içeriğin parçasıdır.
- Fotoğraflar kimlik doğrulamalı Storage SDK istekleriyle alınır; istemci kalıcı indirme bağlantısı dağıtmaz. Daha önce indirilmiş kopyalar geri alınamaz.
- Native oturum kalıcılığı SecureStore kullanır. `EXPO_PUBLIC_*` değerleri herkese açık istemci yapılandırmasıdır; Admin kimlik bilgileri uygulamaya konulmaz.
- Mesajlar uçtan uca şifreli değildir. Push bildirimi, çevrimdışı gönderim kuyruğu ve eski kayıtlar için sayfalama mevcut değildir. Mesaj ve anı sorguları 200 kayıtla sınırlıdır.
- Arka plan GPS sıklığı işletim sistemi, izinler, ağ ve pil koşullarına bağlıdır. Kesintisiz takip garantisi verilmez.
- iOS önceliklidir. Android native haritası ek Google Maps yapılandırması ve cihaz testi gerektirir. Web, native konum kabul testinin yerine geçmez.

## Katkı ve sorun bildirimi

App Store metinleri, App Privacy, inceleme notları ve kalan adımlar [yayın hazırlığında](docs/RELEASE_CHECKLIST.md) listelenir. [Gizlilik politikası](docs/PRIVACY.md), [kullanım koşulları](docs/TERMS.md) ve [destek](docs/SUPPORT.md) herkese açıktır.

Katkı akışı, doğrulama ve hata raporu bilgileri için [CONTRIBUTING.md](CONTRIBUTING.md) dosyasını inceleyin. Gerçek kişilere ait konum, mesaj, fotoğraf veya kimlik bilgilerini issue ve PR içeriklerine eklemeyin.

## Lisans

[MIT](LICENSE) lisansı kapsamında sunulur.

