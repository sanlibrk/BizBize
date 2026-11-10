# İçerik güvenliği ve operatör akışı

Üretimde yeni fotoğraflar **pending** durumunda kalır. Sunucu bu fotoğrafları ve bağlı anıları ortak albüme veya fotoğraf endpoint'ine açmaz. Yetkili operatör inceleyip onaylar veya reddeder. Otomatik bir harici görsel analiz hizmetine bağımlılık yoktur.

Metinlerde sunucuda temel açık tehdit/yasa dışı içerik örüntü filtresi vardır; bağlamı ve bütün kaçınma yöntemlerini yakalayan bir moderasyon modeli değildir. Kullanıcılar partner, mesaj ve anı bildirebilir; bildirimler kamuya kapalıdır. Engelleme ortak alanı sonlandırır ve iki yönlü yeniden eşleşmeyi engeller.

## Operatör CLI

Yalnızca yetkili sunucuda, `server/.env` içindeki veritabanı bağlantısıyla çalıştırın. Üretim DB kimlik bilgilerini istemciye vermeyin.

```bash
npm --prefix server run admin -- list
npm --prefix server run admin -- export-photo FOTO_UUID ozel-inceleme.jpg
npm --prefix server run admin -- approve-photo FOTO_UUID
npm --prefix server run admin -- reject-photo FOTO_UUID
npm --prefix server run admin -- resolve-report BILDIRIM_UUID
npm --prefix server run admin -- disable-user KULLANICI_UUID
```

`list` yalnızca kimlik/tarih ve bildirim türünü listeler; özel kanıt metinlerini loglamaz. Fotoğrafı güvenli operatör bilgisayarında inceleyin, geçici kopyayı kaldırın. `reject-photo` fotoğraf ve bağlı anıyı siler. `disable-user` kullanıcının oturumlarını iptal eder ve varsa ortak alanını kapatır. Eylemler 90 günlük denetim kaydına yazılır. Bu CLI web üzerinden açık bir yönetim paneli değildir.

Bildirim detaylarını yalnızca sınırlandırılmış DB erişimiyle inceleyin; gerçek mesajları GitHub'a koymayın. Bildirim hesabı kapanmış olsa bile kanıt metni 30 günlük süresi dolana kadar kalabilir. Sunucunun dakikalık temizlik işi eski bildirimleri kaldırır.

## Yayın öncesi

- Destek e-postasını ve inceleme kuyruğunu düzenli izleyecek sorumlu olmalı.
- Uygunsuz içerik, rıza dışı görüntü, taciz ve tehdit durumlarına ilişkin kaldırma/hesap aksiyonu süreci belirlenmeli.
- Onay/red, bildirim ve engelleme gerçek hizmette denenmeli.
- Apple'ın kullanıcı içeriği kuralları gerçek deneyimle karşılaştırılmalı; bu kod tek başına kabul garantisi değildir.

Geliştirme ortamı `PHOTO_MODERATION=development` ile hızlı yerel test yapar. Üretimde bu bypass ile başlatma reddedilir.

[Apple kullanıcı içeriği kuralları](https://developer.apple.com/app-store/review/guidelines/#user-generated-content)
