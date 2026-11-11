# Katkı

[README](README.md), [mimari](docs/ARCHITECTURE.md) ve [güvenlik modeli](docs/SECURITY.md) ile başlayın. [AGENTS.md](AGENTS.md) Expo kuralları geçerlidir.

Kullanıcıya görünen marka **Biz Bize**'dir. Ekranlar `src/screens`, rotalar `src/app`, API `server/src` altındadır. Yeni iş kurallarını sunucuda doğrulayın; istemcinin çift kimliğini veya kullanıcı kimliğini yetki kanıtı saymayın. SQL değerlerini parametreleyin.

PR öncesi istemci typecheck/lint/test, backend build/gerçek PostgreSQL entegrasyonu ve ilgili export kontrollerini çalıştırın. Davranış, veri modeli veya kurulum değiştiğinde belgeleri ve testleri güncelleyin. Kontrol edilemeyen cihaz/dağıtım adımlarını geçmiş saymayın.

Parola, token, .env, doğrulama kodu, özel içerik ve tam koordinatları depoya veya issue'lara koymayın. Yerel teknik konum/depo anahtarlarını veri geçişi düşünmeden yeniden adlandırmayın.

## İki sürümün dokümantasyonu

Aktif geliştirme `main` üzerindeki kendi backend sürümünde yapılır. `archive/firebase` tarihsel inceleme dalıdır; Firebase kodunu güncel kaynak ağacına yeniden eklemeyin. Mimari karşılaştırma veya tarihsel düzeltmeler için [sürüm rehberini](docs/VERSIONS.md) ve [vaka çalışmasını](docs/CASE_STUDY.md) esas alın. Test sonucu, dağıtım ve akademik değerlendirme iddialarını kanıt kapsamıyla birlikte yazın.
