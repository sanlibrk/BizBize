# Bağımlılık taraması · 10 Kasım 2026

Bu belge bilinen npm bildirimlerini kaydeder; güvenlik açığı bulunmadığının kanıtı değildir. Kaynak, dağıtım, işletim sistemi ve iş kuralları için bağımsız inceleme gerekir.

## Backend üretim bağımlılıkları

`npm --prefix server audit --omit=dev`: **0 bildirim**. İlk taramada e-posta ve görüntü işleme kütüphanelerinde bulunan iki yüksek önem dereceli bildirim için Nodemailer 10.5.0 ve Sharp 0.35.5 sürümlerine geçildi. Kilit dosyası güncellendi. CI, backend üretim bağımlılıklarında orta veya üstü bildirim olduğunda başarısız olur.

## Mobil / Expo araç zinciri

Expo SDK 58'in uyumlu yama sürümü ve önerilen dört paket güncellemesi uygulandı. Tarama sekizden **beş orta önem dereceli bildirime** indi; yüksek/kritik bildirim yok.

Kalan zincir: `glob` / `minimatch` üzerinden `@expo/cli`, `@expo/fingerprint` ve `expo`. npm'in otomatik önerisi Expo SDK 52'ye büyük sürüm geri dönüşü olduğundan uygulanmadı. Bu araçlar geliştirme/paketleme zincirindedir; kendi API sunucusunun çalışma zamanı bağımlılıkları değildir. Derleme zincirini güvenli saymak için bu ayrım tek başına yeterli değildir: güvenilen kaynaklar kullanın ve SDK 58 için uyumlu upstream düzeltmeyi izleyin. Sırf sayacı sıfırlamak için test edilmemiş major bağımlılık override'ı yapılmadı.

Güncel durumu tekrar kontrol etmek için:

```bash
npm audit --omit=dev
npm --prefix server audit --omit=dev
```

`npm audit fix --force` sürüm uyumunu bozabilir; otomatik uygulanmamalıdır. Nihai imzalı native paketin SDK/privacy manifest incelemesi ve gerçek cihaz kabulü ayrıca gereklidir.

## 11 Kasım 2026 · Sunucusuz profil

Resmî `@vercel/functions` yaşam döngüsü yardımcıları eklendikten sonra backend üretim bağımlılıkları yeniden tarandı: **0 bildirim**. Bu sonuç Vercel’de gerçek dağıtım veya bağımsız güvenlik incelemesi anlamına gelmez.
