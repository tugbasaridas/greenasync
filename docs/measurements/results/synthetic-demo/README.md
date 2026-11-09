# Sentetik örnekle teknik doğrulama

Bu klasördeki sonuçlar `samples/synthetic-interview/yanit.mp4` dosyasıyla,
`npm run measure:demo` çalıştırılarak üretilmiştir. Örnek gerçek aday veya
kamera çekimi içermez: Türkçe sentetik ses, metin kartları ve dalga biçimidir.

JSON/CSV/Markdown içindeki dosya boyutları ve süreler gerçek çalıştırma
ölçümleridir. `transcript_utf8_bytes`, referans metinden alınmaz; yerel
Whisper worker'ının gerçek tanıma çıktısının UTF-8 boyutudur. Modelin üç
çalıştırmada aynı metni üretip üretmediği JSON'da belirtilir; bu doğruluk
ölçütü değildir. Sözcük hata oranı (WER) ölçülmedi.

Bu gösterimin sınırları:

- Görüntü kamera çekimi gibi sıkışmaz; elde edilen oran gerçek aday videolarına genellenemez.
- Zamanlar Linux test makinesine aittir; kullanıcının Windows bilgisayarındaki süre farklı olabilir.
- Model yükleme, ilk dönüşüm ve ısınmış dönüşüm ayrı verilmiştir; enerji ölçülmemiştir.
- Ses+metin dosya yükü hesaplanır; DB/yedek/model/HTTP ek yükleri dahil değildir.
- Bu ölçümde İK Network kaydı, EcoGrader veya Lighthouse raporu yoktur.

Teknik doğrulama girdisi olarak kullanılabilir. Daha geniş tasarruf iddiası
için gerçek kamera kayıtları ve eşdeğer kullanım senaryoları ayrıca ölçülmeli.
