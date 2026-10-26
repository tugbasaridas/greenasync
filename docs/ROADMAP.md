# Geliştirme sırası

- [x] React + TypeScript + Vite ve NestJS başlangıcı
- [x] API sağlık kontrolü ve üç örnek soru
- [x] Responsive ana sayfa ve API bağlantısı
- [x] Mikrofonla kayıt, süre sınırı, önizleme ve mikrofonu kapatma
- [x] Türkçe konuşmayı metne dönüştürme, destek kontrolü ve elle düzeltme
- [x] PostgreSQL tabloları, idempotent başlangıç şeması ve bağlantı
- [x] Kalıcı dosya alanı, ses/metin gönderimi, eski dosya temizliği ve hata geri alma
- [ ] İK girişi ve aday bağlantıları için erişim kontrolü
- [ ] Metin öncelikli İK ekranı, isteğe bağlı dinleme/indirme
- [ ] Kayıt silme ve saklama süresi
- [ ] Ölçüm ekranı ve CSV çıktısı
- [ ] Kontrollü video karşılaştırması, Ecograder/Lighthouse raporları
- [ ] HTTPS yayınlama ve sunum

Ses dinlenene kadar frontend audio src atamayacak; yalnızca preload=none
kullanımına güvenilmeyecek. Ses uçları yetkilendirme kontrolünden geçecek.
Web Speech API uzaktaki servisleri kullanabilir; yerel/çevrimdışı işlem
kullanılan ortamda doğrulanmadan iddia edilmeyecek.
