# Biz Bize'ye katkı

Önce [README](README.md), [Firebase kurulumu](docs/FIREBASE_SETUP.md) ve [mimariyi](docs/ARCHITECTURE.md) inceleyin. Kaynak değişikliklerinde [AGENTS.md](AGENTS.md) kuralları geçerlidir.

## Geliştirme akışı

1. Güncel ana daldan konuya özel bir dal açın.
2. Değişikliği ilgili alanla sınırlı tutun; kullanıcıya görünen marka adını **Biz Bize** olarak yazın.
3. Yeni davranış veya kurulum değişiyorsa ilgili belgeleri güncelleyin.
4. PR öncesinde `npm run typecheck`, `npm run lint` ve `npm test` çalıştırın. Backend değişiyorsa Functions derlemesini ve [emülatör testlerini](TESTING.md) de çalıştırın.
5. PR açıklamasında değişen davranışı, doğrulama sonucunu ve çalıştırılmayan kontrolleri belirtin.

Expo bağımlılıkları için projenin SDK sürümüne uygun `npx expo install` kullanın. Native klasörleri elle üretmeyin; yapılandırmayı `app.json` ve config plugin üzerinden yönetin.

## Hata raporu

Beklenen ve gerçekleşen davranışı, yeniden üretme adımlarını, platform/işletim sistemi sürümünü, uygulama commit veya build kimliğini ve çalışma biçimini (önizleme/emülatör/bulut) ekleyin.

Konum hatalarında ön plan/arka plan durumu, izin ve yaklaşık bekleme süresi faydalıdır. Gerçek koordinat, mesaj, fotoğraf, e-posta, UDID, token veya anahtar paylaşmayın. Ekran görüntülerindeki kişisel bilgileri kaldırın.

## Teknik adlandırma

`BizBize` depo adı, `biz-bize` npm paketi ve `bizbize` scheme mevcut teknik kimliklerdir. `demo-yanyana`, codebase ve yerel depolama anahtarlarını değiştirmek için veri/görev/dağıtım etkisini ayrıca değerlendirin.
