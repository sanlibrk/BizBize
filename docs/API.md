# HTTP API sözleşmesi

Temel adres `EXPO_PUBLIC_API_URL` ile istemcide, `PUBLIC_URL` ile sunucuda belirlenir. Sunucu sırları mobil uygulamaya verilmez. Bütün yanıtlar JSON, özel veriler `Cache-Control: no-store` ile döner.

## Oturum

Web: `credentials: include`, `X-BizBize-Client: web`, JSON gövde ve allowlist içindeki Origin. Sunucu HttpOnly çerez üretir; web JSON yanıtında token yoktur. Native: `X-BizBize-Client: native`, kayıt/giriş yanıtındaki opak token SecureStore'a yazılır ve sonraki çağrılarda `Authorization: Bearer ...` başlığıyla gönderilir.

| Endpoint | Gövde / yanıt |
|---|---|
| `POST /v1/auth/register` | `email`, `password`, `terms_version: 2026-11-10`; session user ve native için token |
| `POST /v1/auth/login` | `email`, `password`; session |
| `GET /v1/auth/me` | Güncel kullanıcı; doğrulanmamış hesap da erişir |
| `POST /v1/auth/logout` | `{}`; oturumu iptal eder, paylaşımı kapatır |
| `POST /v1/auth/resend` | `{}`; yeni doğrulama kodunu kuyruğa alır |
| `GET /v1/auth/verification-status` | `queued`, `retrying`, `accepted`, `expired` veya `verified` |
| `POST /v1/auth/verify` | `code` (altı hane); tek kullanımlık doğrulama |
| `POST /v1/auth/forgot` | `email`; mevcut hesap durumunu açıklamayan genel yanıt |
| `POST /v1/auth/reset` | `email`, `code`, `password`; bütün oturumları ve paylaşımı kapatır |
| `POST /v1/auth/password` | `current_password`, `password`; oturumlar iptal edilir |

## Ortak alan

`GET /v1/shared`: doğrulanmış kullanıcının kendi çiftine ait `members`, `memories`, `messages`, `locations`. Başka çift seçmeye yarayan bir istemci parametresi yoktur. Üyelik yoksa boş diziler döner. Anı/fotoğrafta `moderation_status` bulunur; pending içerik yalnızca sahibine görünür. Mesaj ve anılar son 200 kayıtla sınırlıdır.

`GET /v1/photos/:id`: doğrulanmış aktif üye için JPEG `base64` verisi. Onaysız fotoğrafı yalnızca sahibi okuyabilir. Yetkisiz/başka çift okumaları 404 alır. Açık dosya URL'si yoktur.

## İşlemler

Hepsi `POST /v1/actions/ISLEM` JSON isteğidir. Kullanıcı/çift yetkisi sunucuda belirlenir; kullanıcı kimliği gövdeden kabul edilmez.

| İşlem | Gövde alanları |
|---|---|
| `createInvite` | `{}` |
| `joinPair` | `code` |
| `sendMessage` | UUID `id`, `kind: text/task`, `body` |
| `completeTask` | UUID `id` |
| `uploadMemoryPhoto` | UUID `id`, `photo_base64` (JPEG, en fazla 5 MB) |
| `discardUpload` | UUID `id`; yalnızca anıya bağlanmamış kendi yüklemesi |
| `addMemory` | UUID `id`, `note`, `place`, `happened_on: YYYY-MM-DD`, `latitude`, `longitude`, isteğe bağlı `task_id` |
| `deleteMemory` | UUID `id`; yalnızca yazarı |
| `setLocationSharing` | boolean `enabled`; yeni paylaşım `version` döner |
| `publishLocation` | `couple_id`, `version`, `latitude`, `longitude`, `accuracy`, ISO `captured_at`; `accepted` döner |
| `disconnectPair` | `{}`; çift içeriği iki kişi için kaldırılır |
| `blockPartner` | `{}`; ortak erişim kapanır ve iki yönlü eşleşme engellenir |
| `deleteAccount` | mevcut `password`; doğrulanmamış hesap da erişebilir |
| `reportContent` | UUID `id`, `kind: partner/message/memory`, ilgili `content_id`, `reason: harassment/inappropriate/privacy/other`, isteğe bağlı `details` |

Konum kapatma ve hesap silme dışındaki ortak işlemler doğrulanmış e-posta ister. Yeni içerik işlemleri tamamlanmış iki kişilik üyelik gerektirir. Davet oluşturma ve eşleşmeyi iptal etme tek üyeyle çalışabilir.

## Hatalar

```json
{"error":{"message":"Kullanıcıya gösterilecek açıklama"}}
```

400 geçersiz veri/kod, 401 oturum yok/geçersiz, 403 yetki/rıza/kaynak reddi, 404 bulunamadı, 409 iş kuralı çakışması, 413 boyut aşımı, 429 hız/kapasite sınırı, 500 beklenmeyen sunucu hatası. Stack trace ve SQL ayrıntıları yanıtlanmaz. UUID seçimi tek başına yetki kanıtı değildir.

## Sunucusuz pilot profili

`DEPLOYMENT_MODE=serverless` modunda JPEG raw sınırı 3 MiB, action JSON gövde sınırı 4 MiB + 16 KiB’dir; böylece base64 yükü platformun 4,5 MB sınırının altında kalır. Eski daha büyük özel fotoğraf yanıtı 413 ile reddedilir.

- `POST /v1/auth/mail-delivery` yalnızca boş JSON alır, `accepted: true` döner ve en fazla bir mevcut, süresi geçmemiş ve zamanı gelmiş iletiyi gönderme denemesini tetikler. Kullanıcı e-postası/kod/ileti sayısı döndürmez, yeni e-posta oluşturmaz; IP başına dakikada altı istek sınırı vardır.
- `GET /internal/maintenance` tam eşleşen `Authorization: Bearer CRON_SECRET` ister; süre dolmuş verileri temizler. Native oturum anahtarı bu yönetim sırrının yerine geçmez.
- Kayıt, resend, forgot ve verification-status istekleri de kuyruktaki en fazla bir uygun iletiyi işler; Vercel’de gönderim `waitUntil` ile yanıt yaşam döngüsünden ayrılır; SMTP başarısızlığı oturumu/kayıt yanıtını iptal etmez ve şifreli kuyruk tekrar denemeye kalır.

[Dağıtım ve sınırlar](FREE_PILOT_DEPLOY.md).
