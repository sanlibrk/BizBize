# Güvenlik modeli ve sınırları

## Uygulanan korumalar

- Sunucuda doğrulanan kimlik, doğrulanmış e-posta ve aktif çift üyeliği.
- Parametreli SQL ve Zod girdi doğrulaması; istemci doğrudan veritabanına bağlanmaz.
- Salt'lı scrypt parola hash'i; rastgele opak oturumlar ve yalnızca özetlerinin DB'de tutulması.
- HttpOnly/Secure/SameSite web çerezi, native SecureStore; web localStorage'da token yok.
- Yazma işlemlerinde origin allowlist ve JSON/custom header; çapraz kaynak cookie yazımı reddi.
- Kullanıcı, IP ve işlem bazında PostgreSQL destekli hız sınırları.
- Tek kullanımlık, süreli ve deneme sınırına bağlı e-posta kodları; şifreli geçici posta kuyruğu.
- Şifre yenilemede bütün oturumları iptal etme ve konum paylaşımını kapatma.
- Hesap silmede mevcut şifre doğrulaması; bütün ilişkili ortak içeriğin atomik kaldırılması.
- Fotoğraf boyut/piksel/gerçek JPEG decode kontrolleri, EXIF temizleme, özel erişim ve üretim moderasyonu.
- Sunucu loglarında parola, çerez, doğrulama kodu, istek gövdesi, koordinat ve fotoğraf yazılmaması.
- HTTPS ve ayrı gerçek sırlar olmadan üretim başlangıcının reddi; Docker'da root olmayan API işlemi.

## Güven sınırları

Sunucu/DB işletmecisi ve yetkili moderatör içeriklere erişebilir; uçtan uca şifreleme yoktur. Yedekler özel veri içerir. SMTP sağlayıcısının teslim, günlük ve saklama davranışı ayrıca değerlendirilmelidir. Admin CLI veritabanı yetkisine güvenir; yetkisiz erişimden host/IAM/SSH katmanında korunmalıdır.

API yalnızca güvenilir reverse proxy arkasında bir hop'a güvenecek şekilde ayarlanabilir. API portu internete açılmamalı; aksi durumda forwarding başlıklarını güvenilir saymayın. Anti-abuse kontrolleri dağıtık saldırı, DDoS, çalınmış cihaz veya ele geçirilmiş işletmeci hesabını tamamen çözmez. Üretimde host yamaları, erişim kayıtları, alarm, güvenli yedekleme, sır rotasyonu ve bağımsız güvenlik incelemesi gerekir.

## Test ve yayın

Entegrasyon testleri kimliksiz/üçüncü hesap erişimini, veri izolasyonunu, yarış halinde eşleşmeyi, kod deneme sınırlarını, fotoğraf erişimini, moderasyonu, konum rızasını, engellemeyi ve silmeyi sınar. Testlerin geçmesi sıfır güvenlik açığı kanıtı değildir. Apple incelemesi, yasal veri yükümlülükleri ve gerçek cihaz davranışı ayrı doğrulanır.

Güvenlik sorunu bildirmek için [destek adresini](SUPPORT.md) kullanın; herkese açık issue'ya token, özel fotoğraf veya koordinat koymayın.

## Bilinen bağımlılık bulguları

Backend üretim taraması sıfır bildirimle sonuçlandı. Expo geliştirme/paketleme zincirindeki beş orta önem dereceli bildirim, uyumlu upstream düzeltme bekleyen artık risktir. Ayrıntı ve uygulanan sürüm düzeltmeleri [bağımlılık taraması kaydında](DEPENDENCY_AUDIT.md). Bu bulgular saklanmaz ve sıfır açık iddiasında bulunulmaz.
