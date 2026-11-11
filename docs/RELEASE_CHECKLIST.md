# Yayın hazırlığı · Kendi backend’imiz

## Kaynakta hazırlananlar

- [x] Firebase'siz hesap, eşleşme, mesaj, görev, anı ve konum API'si.
- [x] PostgreSQL şeması, parametreli SQL, transaction ve üyelik kısıtları.
- [x] Güvenli parola/oturum saklama, süreli kodlar, şifreli posta kuyruğu ve hız sınırları.
- [x] Özel fotoğraf erişimi, decoder/metadata temizliği, üretimde manuel onay.
- [x] Bildirim, engelleme, mevcut şifreyle hesap silme.
- [x] Yerel Docker + Mailpit kurulumu ve üretim HTTPS şablonu.
- [x] Gizlilik/koşullar/destek, mağaza metni ve inceleme notları.
- [x] CI'da gerçek PostgreSQL ve istemci doğrulamaları.

Ücretsiz kişisel ilk sürüm için [Vercel/Neon pilot yolu](FREE_PILOT_DEPLOY.md) hazırlanmıştır; hesaplar ve gerçek dağıtım ayrıca doğrulanmalıdır. Bu yol seçilirse aşağıdaki sunucu/alan adı maddesi, sağlayıcının verdiği HTTPS adresi ve sunucusuz API/DB kurulumu olarak değerlendirilir.

## Canlı yayın öncesi tamamlanacaklar

- [ ] Kullanıcıya ait sunucu ve alan adı sağlandı; API/DB/HTTPS dağıtıldı.
- [ ] SMTP göndericisi, SPF/DKIM/DMARC, teslim ve kuyruk hata testleri tamamlandı.
- [ ] Üretim fotoğraf inceleme kuyruğu ve destek e-postası için sorumlu belirlendi.
- [ ] Yedekleme, geri yükleme, saklama politikası ve sır rotasyonu doğrulandı.
- [ ] Host erişimleri, API/DB portları, alarm/izleme ve bağımsız güvenlik incelemesi tamamlandı.
- [ ] EAS gerçek API adresi, bundle identifier ve proje kimliği bağlandı.
- [ ] İki fiziksel iPhone’da ön plan/arka plan konum ve diğer kabul testleri geçti.
- [ ] İmzalı native pakette privacy manifest ve SDK raporu incelendi.
- [ ] App Store Connect gizlilik, yaş derecelendirmesi ve şifreleme yanıtları doğrulandı.
- [ ] Gerçek iPhone ekran görüntüleri ve içerik hakları hazırlandı.
- [ ] İnceleme hesapları ve özel iletişim bilgileri App Store Connect'e girildi.
- [ ] TestFlight ve App Review tamamlandı.

Bu liste kaynak hazırlığını canlı hizmetten ayırır; güvenlik açığı bulunmadığı veya Apple kabulü garanti edilmez. Önceki Firebase hesapları otomatik taşınmaz. [Kurulum](BACKEND_SETUP.md) · [Güvenlik](SECURITY.md) · [Moderasyon](MODERATION.md)
