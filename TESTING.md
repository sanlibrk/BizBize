# Doğrulama kaydı · 2 Kasım 2026

## Bu oturumda geçti

- `npm run typecheck`: uygulama, web haritası ve test dosyaları; hata yok.
- `npm test`: 12 test, 0 hata. PostgreSQL/RLS testleri aşağıdaki durumları kapsar:
  - Üyelik satırına istemciden doğrudan yazılamaması.
  - İki hesabın davetle eşleşmesi, kodun üçüncü hesaba tekrar kapalı olması.
  - Görev ve anının tek SQL işleminde bağlanması.
  - Partnerin fotoğrafı/anıyı görebilmesi; yazar olmayan kişinin anıyı silememesi.
  - Başka hesabın fotoğraf, mesaj, anı ve konumu okuyamaması/yazamaması.
  - Başkasının klasörüne fotoğraf yükleyememe.
  - Konumun rıza olmadan yayımlanamaması; kapattıktan sonraki callback'in paylaşımı açamaması.
  - Yanlış kod denemesi sınırı ve eşleşme sonlandırılınca erişimin kapanması.
- Alan testleri: geçersiz/geçmiş konum zamanları, boş başlangıç, uzak/yakın anı kümelemesi, anı formunda fotoğraf/tarih/koordinat doğrulaması.
- Telefon boyutunda (390 × 844) tarayıcı kontrolü: karşılama, harita, sohbet, görev oluşturma, görevden fotoğraflı anı, albümde aynı kaydı görme, yeniden açılışta önizleme kaydını koruma.
- Web üretim paketi ve iOS Hermes JavaScript paketi üretildi. iOS paketi bir IPA/native uygulama değildir.
- Expo yapılandırmasında iOS `location` arka plan modu ile Türkçe ön plan/arka plan/fotoğraf izin metinleri kontrol edildi.

## Canlı backend bağlandıktan sonra zorunlu cihaz kabulü

1. A ve B hesaplarını iki fiziksel iPhone'da oluştur ve e-postalarını doğrula. A kod oluştursun, B girsin. Her iki cihazın da boş ortak alanla başladığını gör.
2. C hesabında A/B verilerine erişemediğini REST, Storage ve Realtime üzerinden ayrıca kontrol et. Yerel RLS testi bunu destekler; dağıtım hatalarını tek başına dışlamaz.
3. A ve B birer mesaj ve görev göndersin. B görevi tamamlasın; A'nın kartı yenilensin. Görevden anı ekleyip her iki harita ve albümde aynı kaydı doğrula.
4. A konum iznini reddetsin: mesaj/album çalışmalı, A işareti görünmemeli. Sonra yalnızca kullanım sırasında izin verip gerçek ölçümü, doğruluğu ve partnerdeki zaman damgasını doğrula.
5. A ve B paylaşımı açsın. Uzak konumlardaysa harita ilk açılışta ikisini ve anıları kapsamalı. Yakınlaştırınca küçük resimler; anıya dokununca fotoğraf, tarih, not görünmeli.
6. Geliştirme derlemesinde “Her Zaman” izni ver. Ekranı kilitleyip yürüyüşle gerçek arka plan ölçümü al. Diğer cihazda ölçüm zamanını izle; ağ ve pil koşullarına göre davranışı kaydet.
7. A'nın internetini kes / izinlerini kaldır / uygulamasını zorla kapat. İki dakika sonra B, A konumunu **eski** görmeli; yeni ölçüm yokken güncel görünmemeli.
8. A paylaşımı kapatsın. B'nin işareti kalkmalı. Devam eden callback/yeni ağ isteği paylaşımı açmamalı. Ağ yokken durdurma uyarısı doğru gösterilmeli; tekrar bağlanınca kapatma denenmeli.
9. E-posta onayı ve şifre yenileme bağlantısını aynı iPhone'da, uygulama açıkken ve kapalıyken dene. Süresi dolmuş bağlantıların hata verdiğini doğrula.
10. 10 MB sınırı, yükleme hatası, bozuk tarih, fotoğraf izni reddi, uygulama arka plandayken tekrar açma ve uzun metinleri dene.
11. B eşleşmeyi bitirsin. A ortak içeriği kaybetmeli, paylaşım kapalı olmalı. Önceden açılmış fotoğraf URL'lerinin en fazla 5 dakikalık süresini doğrula. Operatör temizliğini yalnızca test projesinde doğrula.
12. Hesap silmeyi hem eşleşme öncesi hem sonrası dene. İşlevi yetkisiz token ile çağırınca 401, geçerli hesapla çağırınca Auth/DB/Storage silinmesi beklenir. Yapay bir Storage hatası sonrası tekrar denemeyi test et.

## Henüz yapılmayanlar

Gerçek Supabase hizmetine bağlantı, Deno Edge Function dağıtımı/çalıştırılması, native iOS/Android derlemesi, gerçek GPS/arka plan batarya ölçümü, TestFlight ve mağaza gönderimi. Hesap/anahtar, Apple imzalama ve fiziksel cihaz sağlanmadı. Arka plan konumunun gerçek cihaz kabulü tamamlanmadan ürünün kesintisiz takip sunduğu söylenmemeli.
