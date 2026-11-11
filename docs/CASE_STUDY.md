# Biz Bize · Karşılaştırmalı yazılım mühendisliği vaka çalışması

**Proje sahibi ve geliştirici:** Burak Şanlı  
**Çalışma alanı:** Mobil uygulamalar, backend mimarisi, veri tutarlılığı ve mahremiyet  
**Aktif uygulama:** Expo / React Native + Fastify + PostgreSQL  
**Karşılaştırma uygulaması:** Firebase Authentication + Firestore + Functions + Storage

## Özet

Bu çalışma, iki kişinin özel bir ortak alanda mesaj, görev, fotoğraflı anı ve izinli konum paylaştığı Biz Bize ürününü iki farklı backend yaklaşımıyla uygular. İlk yaklaşım yönetilen Firebase servislerinden, devam eden yaklaşım ise bağımsız bir HTTP API’sinden ve PostgreSQL’den yararlanır. Karşılaştırma; kimlik ve yetkilendirme, üyelik yarışları, dosya erişimi, rızanın geri alınması, veri silme, test edilebilirlik ve işletim sorumluluğu üzerinden yapılır.

Değerlendirme kaynak kod, şema/kurallar ve mevcut otomasyon kanıtlarına dayanır. Amaç bir platformun genel olarak daha hızlı, daha ucuz veya daha güvenli olduğunu ispatlamak değil; aynı ürünün iş kurallarının farklı mimari sınırlar altında nasıl karşılandığını açıklamaktır. Firebase uygulaması erişilebilir bir tarihsel kaynak olarak korunur; yeni geliştirme kendi backend uygulamasında sürer.

Rapor, kişisel mühendislik çalışmasını akademik rapor düzeninde sunar; uygulama kararlarını ve değerlendirmelerin kanıt düzeyini birlikte açıklar.

## Problem ve inceleme soruları

Ürün iki kişilik alanı basit gösterse de sahiplik ve yaşam döngüsü kararları içerir: bir davete eşzamanlı katılım iki kişi sınırını bozmamalı; bağlantısını bilen üçüncü kişi özel fotoğrafı okuyamamalı; paylaşımı kapatan kullanıcının eski cihaz ölçümü yeniden görünmemeli; eşleşme kapandığında iki tarafın ortak erişimi sonlanmalıdır.

Çalışma üç soruya odaklanır:

1. Aynı ürünün kimlik ve ortak veri iş kuralları, yönetilen servisler ile bağımsız API/SQL yaklaşımında hangi katmanlarda uygulanır?
2. Eşzamanlılık, geciken konum ölçümü ve servisler arası silme gibi durumlarda hangi tutarlılık mekanizmaları kullanılır?
3. Test, barındırma, moderasyon ve bakım sorumlulukları mimari tercihle nasıl değişir?

## Kapsam ve değişmez ürün gereksinimleri

| Gereksinim | İnceleme ölçütü |
|---|---|
| Doğrulanmış hesap | Ortak alana erişimden önce e-posta doğrulaması |
| En fazla iki üye | Yarışan istekler ve tek kullanıcının birden fazla çifte katılması |
| Çifte ait veri | Üçüncü hesap ve anonim istemci erişiminin reddi |
| Fotoğraflı anı | Dosya sahipliği, yetkili okuma ve içerik incelemesi |
| Mesaj/görev | Tekrarlanan gönderim ve görev-anı ilişkisi |
| İzinli son konum | Rıza, zaman sırası ve paylaşım sürümü |
| Bildirme/engelleme | Özel inceleme kanalı ve yeniden eşleşmenin engellenmesi |
| Veri silme | Erişimin kapatılması ve ilişkili verinin yaşam döngüsü |

Ödeme, herkese açık sosyal akış, rastgele eşleştirme ve uçtan uca şifreli haberleşme bu uygulamaların kapsamına dahil değildir. Kullanıcıya sürekli konum yayını veya sınırsız depolama vaat edilmez.

## Yöntem ve kaynaklar

İki uygulama aynı ürün bağlamında incelenir; bileşen sorumlulukları ve güven sınırları kaynak kod üzerinden eşleştirilir. Kullanılan kanıtlar; istemci/API kodu, Firebase güvenlik kuralları, SQL kısıtları, test senaryoları ve GitHub Actions çalışma kayıtlarıdır. Ayrıntılı kaynak bağlantıları [Firebase raporunda](FIREBASE_EDITION.md) ve [güncel backend raporunda](BACKEND_EDITION.md) bulunur.

Firebase temel görüntüsü [değişmez tarihsel commit](https://github.com/sanlibrk/BizBize/tree/0692aaa4a6a62ad3efbd6d29e54a9e24a2dc73a7) üzerinden referanslanır. Güncel uygulama `main` üzerinde gelişir; bir test sonucunu değerlendirirken ilgili commit ve ortam birlikte okunmalıdır. Arşiv erişimi ve yeniden üretme yolları [sürüm rehberinde](VERSIONS.md) açıklanır.

Kontrollü yük testi, eşit donanımda performans deneyi, maliyet saha ölçümü veya bağımsız güvenlik denetimi yapılmış gibi sonuç sunulmaz. Kullanıcının yerel tarayıcı denemesi fiziksel iPhone testinin yerine geçirilmez.

## Mimari karşılaştırma

| Boyut | Firebase uygulaması | Kendi backend uygulaması |
|---|---|---|
| Kimlik | Firebase Authentication; ID token denetimi | scrypt parola özeti, opak oturum anahtarı, API yetkilendirmesi |
| E-posta doğrulama | Firebase işlem bağlantısı | 15 dakikalık altı haneli kod ve şifreli SMTP kuyruğu |
| Web oturumu | Firebase `browserLocalPersistence` | HttpOnly/SameSite çerez; üretimde Secure |
| Veri modeli | Firestore belgeleri ve alt koleksiyonları | PostgreSQL ilişkileri, foreign key ve benzersizlik kısıtları |
| İş kuralları | Callable Functions; istemciden doğrudan yazma kapalı | Fastify işlem endpoint’leri; istemcinin DB’ye doğrudan erişimi yok |
| Üyelik tutarlılığı | Firestore transaction’ı ve uygulama denetimleri | SQL transaction’ı, iki slot kısıtı ve advisory lock |
| Eşitleme | Firestore belge/sorgu dinleyicileri | Ön planda yaklaşık üç saniyelik HTTP sorgulama |
| Fotoğraf saklama | Kimlik doğrulamalı Cloud Storage okuması | Üyelik denetimli API ve özel PostgreSQL `bytea` alanı |
| Fotoğraf doğrulama | JPEG başlangıç baytları; bulutta SafeSearch | Sharp decoder, boyut/piksel sınırı, yeniden kodlama ve metadata temizliği |
| İçerik incelemesi | Bulutta otomatik SafeSearch ve özel bildirimler | Üretimde insan onayı bekleyen fotoğraflar ve operatör CLI |
| Paylaşımı durdurma | Konum belgesini paylaşım dışı duruma getirme ve sürüm değiştirme | Konum satırını kaldırma ve sürüm değiştirme |
| Ortak alanı silme | Erişimi kapatma, ardından servisler arası temizlik işi | İlişkili SQL verilerini transaction/FK cascade ile kaldırma |
| Yerel çalışma | Firebase Emulator Suite | Docker Compose: API, PostgreSQL, Mailpit |
| İşletim | Sağlayıcı servis ayarları, kurallar, yetkiler, kotalar ve bulut maliyeti | Sunucu/DB bakımı, SMTP, HTTPS, yedekleme, izleme ve moderasyon |

Bu tablo özellik puanlaması veya eşit güvenlik garantisi değildir. Örneğin SafeSearch ve insan incelemesi farklı operasyon modelleridir; biri diğerinin doğrudan eşdeğeri olarak ölçülmemiştir.

## Tasarım kararlarının değerlendirilmesi

### Kimlik ve servis sınırı

Firebase sürümü yönetilen kullanıcı hizmetini ve SDK oturumunu kullanır. Kendi backend sürümü oturumların oluşturulması, saklanması, süre sonu ve iptalini açıkça uygular. Bu değişim; kontrol ve test edilebilirlik sağlarken parola, kod, çerez ve e-posta kuyruğunun bakım sorumluluğunu uygulamaya taşır.

İki uygulamada da istemciden gelen kullanıcı/çift kimliği kendi başına yetki kanıtı değildir. Firebase Admin SDK güvenlik kurallarını aşabildiğinden Functions kontrolleri; kendi backend’de ise işlem ve SQL kısıtları güven sınırının parçasıdır.

### Tutarlılık ve silme

Firebase yaklaşımında Firestore ve Storage arasında tek atomik transaction bulunmaz. Aktif erişimin önce kapatılması, ardından temizlik kaydıyla dosya/belge silmenin izlenmesi gerekir. Tarihsel kaynakta otomatik zamanlanmış temizlik işçisi bulunmaması operasyonel bir sınırlılıktır.

Güncel sürümde ortak veri ve fotoğraf aynı veritabanında tutulur; ilişkili silme SQL işlemi içinde tamamlanabilir. Bunun karşılığında fotoğraflar veritabanı ve yedek boyutunu büyütür. Global advisory lock küçük MVP’de yarışların çözümünü sadeleştirir; daha yüksek eşzamanlılıkta darboğaz riski taşır.

### Eşitleme ve konum

Dinleyici yaklaşımı ile dönemsel HTTP sorgulama aynı teslim davranışını vermez. Güncel sürümün üç saniyelik yenileme aralığı, ağ istek sayısı ile görünür gecikme arasında bir tercihtir. WebSocket/SSE desteği tamamlanmış özellik olarak sunulmaz.

Her iki uygulama son konum, ölçüm zamanı ve paylaşım sürümü kullanır. Sürüm denetimi, rıza kapatıldıktan sonra geciken callback’lerin eski paylaşımı sürdürmesini engellemeye yöneliktir. Gerçek arka plan çalışma davranışı cihaz ve işletim sistemiyle ayrıca sınanmalıdır.

### Bağımlılık ve maliyet

Kendi backend’e geçiş, belirli Firebase servislerine çalışma zamanı bağımlılığını kaldırır; bulut maliyetini kaldırmaz. Firebase’de işlemler, veri trafiği, Functions ve fotoğraf inceleme çağrıları; bağımsız backend’de sunucu, disk, e-posta, yedekleme ve insan operasyonu değerlendirilmelidir.

Mimari kararı “Firebase kesin başlangıç ücreti istiyor” veya “kendi backend her zaman ücretsiz” varsayımına dayanmaz. Ücretsiz kotalar ve öğrenci kredileri dönemsel fırsatlardır; sürdürülebilir maliyet yük ve hizmet koşullarıyla birlikte hesaplanmalıdır. Bu çalışmada platformlar arası ölçülmüş maliyet üstünlüğü sonucu bulunmaz.

## Değerlendirme ve kanıt düzeyleri

| Kanıt | Yapılabilecek çıkarım | Sınırı |
|---|---|---|
| Kaynak/şema/kurallar | Mekanizmanın nerede uygulandığı incelenebilir | Tüm davranışların gerçek ortamda kabulü değildir |
| Tarihsel Firebase emülatör testleri | Yetki, transaction, konum ve temizlik senaryoları tanımlıdır | Bu rapor güncellenirken yeniden çalıştırılmadı; canlı bulut/gerçek Vision testi değildir |
| Güncel PostgreSQL testleri | Gerçek SQL kısıtları ve yarış senaryoları otomasyonla sınanır | Üretim yükü veya penetrasyon testi değildir |
| Docker ve SMTP başlangıç testi | Yerel API, DB, Mailpit ve kod doğrulama birlikte çalıştırılır | Gmail’e teslim kabulü değildir |
| İki oturumlu tarayıcı testi | Kayıt, eşleşme, mesaj, rapor ve engelleme akışları sınanır | Fiziksel cihaz, arka plan GPS veya Apple incelemesi değildir |
| TypeScript/lint ve export | Statik kontroller ile JS/varlık paketleme doğrulanır | İmzalı native paket kabulü değildir |
| Geliştiricinin yerel kabul bildirimi | Yerel tarayıcı akışlarının çalıştığı bildirilmiştir | Bağımsız kullanıcı araştırması veya saha deneyi değildir |

Güncel otomasyon [Actions iş akışından](../.github/workflows/validate.yml) ve [çalışma geçmişinden](https://github.com/sanlibrk/BizBize/actions/workflows/validate.yml) izlenebilir. Örnek başarılı kaynak doğrulaması: [güncel backend ve arayüz kontrolleri](https://github.com/sanlibrk/BizBize/actions/runs/42870486542). Rapor düzenlemesi bu kaydın tarihini veya kapsamını genişletmez.

## Sonuç ve devam yönü

İki uygulama, aynı mobil ürünün yönetilen belge servisleriyle ve bağımsız ilişkisel API ile modellenebildiğini gösterir. Fark yalnızca veritabanı seçimi değildir: oturum, eşitleme, fotoğraf denetimi, silme ve işletim sorumlulukları da yeniden tasarlanmıştır.

**Aktif geliştirme kendi backend uygulamasında devam eder.** Firebase sürümü, tasarım alternatifini görünür tutan bir mühendislik çıktısı olarak korunur. Sonraki çalışmalar; sayfalama, fotoğraf saklama ölçeği, çift bazında kilitleme, ölçülmüş yük testi, gerçek e-posta teslimi, yedekten geri dönüş, fiziksel iPhone kabulü ve mağaza yayınıdır. Bunlar tamamlanmış sonuçlar olarak işaretlenmez.

## Kaynaklara erişim

[Ana proje](../README.md) · [Sürüm rehberi](VERSIONS.md) · [Firebase raporu](FIREBASE_EDITION.md) · [Kendi backend raporu](BACKEND_EDITION.md) · [Güvenlik modeli](SECURITY.md) · [Yayın kontrol listesi](RELEASE_CHECKLIST.md)
