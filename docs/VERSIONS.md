# Sürümler ve kaynak erişimi

Biz Bize tek ürünün iki backend uygulamasını içerir. Ana geliştirme sürümü ve inceleme arşivi şu şekilde ayrılır:

| Sürüm | Kaynak | Kullanım amacı |
|---|---|---|
| **Kendi backend’i · aktif** | [`main`](https://github.com/sanlibrk/BizBize/tree/main) | Yeni geliştirme, düzeltmeler ve yayın hazırlığı |
| **Firebase · tarihsel** | [`archive/firebase`](https://github.com/sanlibrk/BizBize/tree/archive/firebase) | Önceki uygulamanın kod incelemesi ve mimari karşılaştırma |
| Firebase’in değişmez temel görüntüsü | [`0692aaa`](https://github.com/sanlibrk/BizBize/tree/0692aaa4a6a62ad3efbd6d29e54a9e24a2dc73a7) | Rapordaki tarihsel iddiaları aynı kod üzerinde yeniden kontrol etme |

Arşiv dalındaki açıklayıcı README notları değişebilse de bu raporun Firebase kaynak referansı yukarıdaki değişmez commit’tir. Arşivlenmiş olması kaynak kodu silmez ve uygulamayı bulutta otomatik dağıtmaz. Firebase projesi, kullanıcıları ve dosyaları bu düzenleme kapsamında değiştirilmez.

## Aktif sürümü ayrı klasörde açmak

```bash
git clone --branch main https://github.com/sanlibrk/BizBize.git BizBize-Backend
cd BizBize-Backend
npm ci
npm run backend:up
npm run web
```

Node.js 22.18+ ve çalışan Docker Desktop gerekir. Doğrulama kodları yerel [Mailpit kutusunda](http://localhost:8025) görünür. [Güncel kurulum](BACKEND_SETUP.md).

## Firebase sürümünü ayrı klasörde incelemek

```bash
git clone --branch archive/firebase --single-branch https://github.com/sanlibrk/BizBize.git BizBize-Firebase
cd BizBize-Firebase
```

[Firebase teknik raporunu](FIREBASE_EDITION.md) okuyun; ardından arşiv klasöründeki `docs/FIREBASE_SETUP.md` ve `TESTING.md` adımlarını izleyin. Firebase’in `.env` değişkenleri, emülatörleri ve bulut servisleri güncel backend’in ayarlarıyla aynı değildir. İki sürümün `.env` dosyalarını ve veritabanı verilerini birbirine kopyalamayın.

## Sürüm politikası

- Varsayılan ve devam eden ürün geliştirme dalı **`main`** olarak kalır.
- Yeni özellikler önce güncel backend ve onun testleri üzerinde geliştirilir.
- Firebase arşivinin işlevsel kodu tarihsel inceleme amacıyla korunur; aynı anda ikinci aktif yayın hattı taahhüt edilmez.
- Mimari raporlar davranış farklarını açıklar; iki sürümün performans, güvenlik veya maliyet açısından eşdeğer olduğu varsayılmaz.
- Firebase hesabı ile güncel backend hesabı farklı kimlik sistemleridir. Otomatik hesap, parola veya içerik taşıma uygulanmamıştır.
- İki sürüm aynı kullanıcının canlı verilerine birlikte yazan hibrit bir sistem değildir.

[Karşılaştırmalı vaka çalışması](CASE_STUDY.md) · [Firebase raporu](FIREBASE_EDITION.md) · [Kendi backend raporu](BACKEND_EDITION.md) · [Ana sayfa](../README.md)
