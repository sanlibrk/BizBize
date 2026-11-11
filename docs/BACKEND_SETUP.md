# Kendi backend’imizi çalıştırma

Kişisel, reklamsız ve ücretsiz ilk sürüm için [sunucusuz pilot rehberi](FREE_PILOT_DEPLOY.md) ayrı bir kurulum yoludur. Aşağıdaki Docker/VPS akışı geçerliliğini korur; iki ortamın sırları ve çalışma modeli farklıdır.

## Windows üzerinde yerel kullanım

Node.js 22.18+, npm ve Linux container modu açık Docker Desktop gerekir. Docker Desktop çalışırken proje kökünde:

```powershell
npm ci
npm run backend:up
npm run web
```

Kontrol: http://localhost:3001/healthz → `status: ok`.
E-postalar: http://localhost:8025. Yerel geliştirmede Gmail'e gönderilmez. Doğrulama ve şifre yenileme kodları 15 dakika geçerlidir; beş hatalı denemeden sonra yeni kod gerekir.

İki farklı tarayıcı profili veya normal/gizli pencereyle hesap açın. Şifre en az 10, en fazla 128 karakterdir. Kodları Mailpit'ten alın, hesapları doğrulayın; birinde davet oluşturup diğerinde katılın.

`server/.env.local` yerel ayrı PostgreSQL yönetici/uygulama parolalarını ve e-posta kuyruğu şifreleme sırrını içerir; otomatik üretilir ve Git'e eklenmez. Mevcut farklı API adresi korunur; yerel servis kullanılacaksa kök `.env` içinde `EXPO_PUBLIC_API_URL=http://localhost:3001` olmalı. Expo'yu ayar değişiminden sonra yeniden başlatın.

```powershell
npm run backend:logs
npm run backend:down
```

`down` verileri korur. Volume silme komutları kalıcı veri kaybı yaratır; normal kullanım için gerekmez.

## Docker olmadan

Kendi PostgreSQL 17 ve SMTP hizmetiniz varsa:

```bash
npm --prefix server ci
npm --prefix server run build
```

`server/.env.example` içeriğini `server/.env` olarak yapılandırın, ardından `npm --prefix server start` çalıştırın. Geliştirme için `NODE_ENV=development`, yerel PostgreSQL bağlantısı, Mailpit SMTP adresi ve gerçek rastgele `APP_SECRET` kullanın. Üretim örnek alanlarıyla başlamaz.

## Üretim şablonu

Bir Linux VPS, size ait alan adı ve yapılandırılmış SMTP gerekir. Örnek dosyayı **yalnızca sunucuda** `server/.env.production` olarak kopyalayın; gerçek değerleri gizli ortamda girin. Bu dosyayı GitHub'a veya sohbete göndermeyin.

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Bu komutu sunucunuzda üç kez çalıştırarak farklı `POSTGRES_PASSWORD`, `APP_DB_PASSWORD` ve `APP_SECRET` üretin. PostgreSQL parolasında URL güvenliği için üretilen hex biçimini koruyun. API alan adının DNS A/AAAA kaydını sunucuya yönlendirin; 80/443 portları Caddy'nin HTTPS sertifikası için erişilebilir olmalı. PostgreSQL ve API portlarını internete açmayın.

```bash
docker compose --env-file server/.env.production -f server/compose.prod.yml up --build -d
```

API, PostgreSQL ve Caddy başlar. `TRUST_PROXY=1` yalnızca bu tek, güvenilen Caddy hop'u arkasındaki özel API için kullanılır. API'yi doğrudan internete açarsanız bu ayarı kullanmayın.

Mobil/EAS ortamı: `EXPO_PUBLIC_API_URL=https://API_ALAN_ADINIZ`. Web üretim uygulaması varsa aynı site altında HTTPS origin kullanın ve `WEB_ORIGINS` listesine ekleyin; wildcard kullanılmaz. HttpOnly oturum çerezi SameSite=Lax olduğundan farklı siteler arası web dağıtımı desteklenmez. Native istemci güvenli Bearer oturumu kullanır.

SMTP için doğrulanmış gönderici, TLS, SPF/DKIM/DMARC ve sağlayıcı limitlerini yapılandırın. SMTP'nin kabul etmesi Gmail gelen kutusuna teslim garantisi değildir. Sunucu ağ hatalarında kuyruk e-postaları süreleri dolana kadar tekrar dener. Şifreli kuyruk için `APP_SECRET` değişirse bekleyen kodları yeniden istemek gerekir.

## Yönetim ve moderasyon

Üretimde fotoğraflar `pending` kalır ve yükleyen kullanıcı dışında kimseye gösterilmez. [İnceleme akışı](MODERATION.md) için operatör gerekir. Yerel geliştirme `development` modu gerçek insan incelemesini atlar; üretimde bu modla başlatma reddedilir.

## Önceki Firebase verileri

Yeni sistem Firebase kullanıcılarını veya fotoğraflarını otomatik içe aktarmaz. Firebase parola hash'leri bu backend'in parolası olarak kullanılamaz. Eski proje korunur; Firebase API'lerine silme isteği gönderilmez. Gerçek veri aktarımı için ayrı envanter, kullanıcı bilgilendirmesi, sahiplik kontrolü ve testli taşıma gerekir. İki sistemin verileri karıştırılmaz.

## Yedekleme

PostgreSQL yedekleri mesaj ve fotoğrafları da içerir. Şifreli, erişimi sınırlandırılmış ayrı depoya düzenli yedek alın; geri yüklemeyi farklı bir test veritabanında doğrulayın. Örnek dump alma:

```bash
docker compose --env-file server/.env.production -f server/compose.prod.yml exec -T db pg_dump -U postgres -d bizbize -Fc > bizbize-backup.dump
```

Yedeklerin saklama/silme süresini belirleyip gizlilik metniyle eşleştirin; silinen hesap verilerinin yedek ömrünü kullanıcıya açıklayın. Dosyaları depoya yüklemeyin. `pg_restore` işlemini canlı veritabanına deneme amacıyla uygulamayın.

## E-posta gelmiyorsa

Uygulama doğrulama ekranı `queued`, `retrying`, `accepted` durumlarını kullanıcıya açıklayarak gösterir. `accepted`, SMTP sağlayıcısının mesajı kabul ettiğini ifade eder; gelen kutusuna teslim garantisi değildir. Yerel geliştirmede Mailpit'i açın. Üretimde yetkili operatör `admin -- status` ile bekleyen/yeniden denenen posta ve moderasyon sayısını görebilir; komut e-posta kodlarını veya kişisel mesajları yazdırmaz.

Üretim API’si superuser/rol yöneticisi/veritabanı oluşturma yetkili bir DB rolüyle başlamayı reddeder. Compose ilk kurulumda ayrı sınırlı `bizbize` uygulama rolünü oluşturur. Şema kurulumu ayrı, boş bir veritabanı gerektirir; mevcut ilgisiz tabloların üzerine kurulmaz.
