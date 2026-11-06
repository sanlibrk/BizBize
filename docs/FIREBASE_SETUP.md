# Firebase kurulum rehberi

## 1. Gereksinimler

Uygulama için Node.js 22.18+, npm ve kullanıcıya ait bir Firebase projesi gerekir. Functions çalışma zamanı `nodejs22`, bölgesi `europe-west1` olarak tanımlıdır. Bulut Functions ve Storage kullanımı için projenin güncel faturalandırma koşullarını Firebase konsolunda kontrol edin.

```bash
npm ci
npm --prefix firebase/functions ci
npm --prefix firebase/functions run build
```

## 2. Firebase hizmetlerini hazırlayın

1. Firebase Console'da uygulamaya ait projeyi seçin veya oluşturun.
2. Authentication → Sign-in method bölümünde **Email/Password** sağlayıcısını açın.
3. Firestore veritabanını ve Cloud Storage kovasını oluşturun. Bölge tercihini veri yerleşimi gereksiniminize göre yapın.
4. Project settings içinden bir **Web app** kaydedin. Expo istemcisi Firebase JS SDK kullandığından bu uygulamanın genel yapılandırmasını kullanır.
5. Authentication e-posta şablonlarını ve web testi için Authorized domains listesini yapılandırın. Doğrulama/şifre yenileme bağlantılarını Firebase'in e-posta işlem sayfasında tamamlayıp uygulamaya geri dönün.

## 3. İstemci ortamı

`.env.example` dosyasını `.env` olarak kopyalayın ve Firebase Web app değerlerini girin:

| Değişken | Firebase yapılandırması |
|---|---|
| `EXPO_PUBLIC_FIREBASE_API_KEY` | `apiKey` |
| `EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN` | `authDomain` |
| `EXPO_PUBLIC_FIREBASE_PROJECT_ID` | `projectId` |
| `EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET` | `storageBucket` |
| `EXPO_PUBLIC_FIREBASE_APP_ID` | `appId` |
| `EXPO_PUBLIC_FIREBASE_USE_EMULATORS` | Bulut için `0`; yerel emülatör için `1` |

Beş genel Firebase alanı eksikse uygulama bulut bağlantısını yapılandırılmış saymaz. Değerleri değiştirdikten sonra Expo'yu yeniden başlatın:

```bash
npx expo start --clear
```

Bu alanlar gizli sunucu anahtarı değildir ve istemci paketinden okunabilir. Service-account JSON, `private_key` veya Admin kimlik bilgilerini `EXPO_PUBLIC_*` alanlarına koymayın. Erişim denetimi Auth, güvenlik kuralları ve sunucu doğrulamasıyla sağlanır.

## 4. Kurallar, indeksler ve Functions dağıtımı

`.firebaserc` varsayılanı `demo-yanyana` adlı yerel test projesidir. Bulut komutlarında gerçek proje kimliğini açıkça verin:

```bash
npx firebase login
npx firebase deploy --project FIREBASE_PROJECT_ID --only firestore:rules,firestore:indexes,storage,functions
```

Dağıtım öncesi Functions derlemesi `firebase.json` içindeki predeploy adımında çalışır. Functions codebase adı mevcut yapılandırmada `yanyana` olarak kalır; bu teknik dağıtım kimliğini değiştirmek mevcut bulut kaynaklarıyla ayrıca planlanmalıdır.

Firestore/Storage kurallarını test modunda açık bırakmayın. Firestore sorgularının bileşik indeksleri `firebase/firestore.indexes.json` ile dağıtılır. Kullanıcı işlemleri için callable Functions kullanılır; istemcinin Firestore'a doğrudan ortak veri yazmasına izin verilmez.

## 5. İlk ortak alan

İki ayrı test hesabı oluşturun ve e-postaları doğrulayın. İlk hesap davet kodu oluştursun; ikinci hesap kodu girsin. Yeni çift boş başlar ve konum paylaşımı kapalıdır. Mesaj, görev ve fotoğraflı anı akışlarını iki oturumda doğrulayın.

## Yerel emülatörler

Node.js 22 ve Java 21+ ile:

```bash
npx firebase emulators:start --project demo-yanyana --only auth,firestore,storage,functions
```

Ayrı terminalde `.env` içindeki `EXPO_PUBLIC_FIREBASE_USE_EMULATORS=1` ile `npm run web` çalıştırın. Auth e-posta işlem bağlantıları emülatör terminalinde görünür.

| Hizmet | Yerel adres |
|---|---|
| Authentication | `127.0.0.1:9099` |
| Firestore | `127.0.0.1:8085` |
| Storage | `127.0.0.1:9199` |
| Functions | `127.0.0.1:5001` |

Emülatör host alanı yalnızca `127.0.0.1`, `localhost` veya `10.0.2.2` kabul eder. Fiziksel iPhone'a bilgisayarın LAN IP adresini yazarak bağlanma mevcut istemcide desteklenmez; iki iPhone kabulü için bulut test projesini kullanın. `demo-yanyana` adı istemci ve testlerle eşleşen teknik kimliktir.

## Sorun giderme

- **Hesap bağlantısı kurulmadı:** Beş Firebase alanının dolu olduğunu, `YOUR_` yer tutucusu kalmadığını ve Expo'nun yeniden başladığını kontrol edin.
- **permission-denied:** E-posta doğrulamasını, aktif eşleşmeyi ve kuralların doğru projeye dağıtıldığını kontrol edin.
- **Functions bulunamıyor:** Proje kimliği, `europe-west1` bölgesi ve dağıtım sonucunu kontrol edin.
- **Anılar yüklenmiyor:** Storage kovasını, kurallarını ve Firestore indekslerinin oluşturulma durumunu kontrol edin.
- **Eski hazırlık kontrolü:** `npm run ios:check` betiği hâlâ Supabase alanlarını denetler. Firebase bağlantısının kanıtı olarak kullanmayın; bu rehberdeki adımları ve cihaz testini esas alın.

[README'ye dön](../README.md)
