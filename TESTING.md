# Biz Bize · Test rehberi

Bu belge testleri çalıştırma ve sonucu değerlendirme rehberidir; geçmiş bir oturumun başarı raporu değildir.

## Statik kontroller ve iş kuralları

```bash
npm ci
npm run typecheck
npm run lint
npm test
npm --prefix firebase/functions ci
npm --prefix firebase/functions run build
```

`tests/domain.test.ts` saf iş kurallarını sınar. `tests/firebase.test.ts`, Firestore emülatör adresi tanımlı değilse **atlanır**. Bu nedenle tek başına `npm test` sonucunu Firebase entegrasyonu geçti diye yorumlamayın.

## Firebase entegrasyon testi

Node.js 22, Java 21+ ve kurulmuş Functions bağımlılıkları gerekir. Functions kodunu yukarıdaki komutla derledikten sonra:

```bash
npx firebase emulators:exec --project demo-yanyana --only auth,firestore,storage,functions "npm test"
```

CLI, test sürecine emülatör adreslerini aktarır. Test `FIRESTORE_EMULATOR_HOST=127.0.0.1:8085` bekler ve Auth için `127.0.0.1:9099` adresini doğrular. Yalnızca ortam değişkeni yazmak emülatörleri başlatmaz.

Mevcut entegrasyon kapsamı:

- Anonim/doğrulanmamış kullanıcının davet oluşturamaması.
- Davet yenileme, tek kullanım ve eşzamanlı katılımda iki kişi sınırı.
- Üyelik belgelerinin istemciden değiştirilememesi; üçüncü hesabın ortak içeriği okuyamaması.
- Gerçek Firestore dinleyicisine mesaj ulaşması ve aynı kimlikle tekrar gönderimin çoğalmaması.
- Fotoğrafın üçüncü kişiye/anonim kullanıcıya kapalı olması ve sahte yüklemelerin reddi.
- Görev ile anının bağlanması, indirme tokenı dağıtılmaması, başkasının anısını silememesi.
- Konum rızası, zaman sırası, paylaşım sürümü ve kapatma sonrası geç callback reddi.
- Başarısız kod denemelerinin hız sınırına sayılması.
- Eşleşme kapatma, fotoğraf/veri temizliği ve hesap silme.

Emülatörler bulut IAM, faturalandırma, gerçek e-posta teslimi veya iOS GPS davranışını doğrulamaz.

## Paketleme

```bash
npm run export:web
npm run export:ios
```

iOS export yalnızca JavaScript/varlık paketidir; imzalı native derleme veya TestFlight kabulü değildir.

## Manuel kabul

| Senaryo | Başarı ölçütü |
|---|---|
| Yerel önizleme | Hesapsız açılır; kişiler/konumlar örnek olarak işaretlidir |
| Boş başlangıç | Harita, sohbet ve albüm boş durumlarını düzgün gösterir |
| Kayıt/doğrulama | Doğrulanmamış hesap ortak işlemleri yapamaz |
| Eşleşme | A ve B aynı boş alanı açar; üçüncü hesap erişemez |
| Mesaj/görev | Diğer oturumda görünür; görev tamamlanır ve anıya bağlanır |
| Anı | Fotoğraf/not/tarih/yer hem albümde hem haritada aynıdır |
| Hata akışları | Ağ kesintisi, izin reddi, geçersiz tarih ve yükleme hatası açıklanır |
| Konum | Ön plan, arka plan, eski ölçüm ve paylaşımı durdurma iki iPhone'da denenir |
| Eşleşme bitirme | Her iki kullanıcı ortak erişimi kaybeder |
| Hesap silme | Auth, özel kayıt ve ortak içerik temizliği test projesinde doğrulanır |
| Erişilebilirlik | Büyük yazı, ekran okuyucu etiketleri ve klavye akışı kontrol edilir |

Cihaz adımları: [IPHONE_TEST.md](IPHONE_TEST.md). Sonuç şablonu: [DEVICE_TEST_RESULTS.md](DEVICE_TEST_RESULTS.md). Başarılı/başarısız/atlanmış sonuçlarını ayrı kaydedin; anahtar ve kişisel veri eklemeyin.

[README'ye dön](README.md)
