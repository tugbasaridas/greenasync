# Türkçe sentetik mülakat örneği

`yanit.mp4`, GreenAsync ölçüm aracını denemek için üretilmiş bir test girdisidir.
Gerçek kişi görüntüsü veya gerçek aday başvurusu içermez. Videoda bu etiket
görünür; konuşmanın başında da yapay örnek olduğu söylenir.

- İçerik: kurgusal aday Deniz'in ekip projesinde gereksiz ağ isteklerini azaltması.
- Türkçe ses: `tr-TR-EmelNeural`, edge-tts 7.3.1, hız +%12; sentetik ses.
- Görüntü: özgün metin kartları ve ses dalga biçimi, 1280×720, 24 fps.
- Codec: H.264 / CRF 28 ve AAC / 96 kbps hedefi; MP4 faststart.
- Süre: yaklaşık 77 saniye. Kesin süre/boyut rapor komutuyla ölçülür.
- `reference.txt`: seslendirilen özgün metin; modelin tanıdığı çıktı değildir.
- `yanit.webm`: aynı kaydın yalnızca ses içeren Opus kopyası. Yerel sınıf
  demosu, bu sesi ve referans metni Deniz'in ikinci yanıtı olarak ekler.
- Ses üretimi harici TTS hizmetiyle yalnızca örneği hazırlarken yapılmıştır.
  Uygulamanın yerel Whisper çalışma akışı bundan ayrıdır.

## Çalıştır

```powershell
git pull
npm run setup:speech
npm run measure:demo
```

Komut aynı videodan ses çıkarır, gerçek yerel worker ile üç kez metne
çevirir, yeni bir `measurements/private/synthetic-...` klasörüne rapor yazar.
Dosya ve süre ölçümü gerçektir; girdi sentetiktir. Hazır `reference.txt`
tanıma çıktısı yerine kullanılmaz. Bu komut İK'ya başvuru eklemez ve Network
aktarımı ölçmez. İK akışını ayrıca [deney kılavuzuyla](../../docs/measurements/README.md) ölç.

**Sınır:** Metin kartları ve dalga biçimi, kamera çekimine göre farklı sıkışır.
Bu dosyadan çıkan oran gerçek mülakat videolarına genellenemez. Tipik kamera
çekimine karşı tasarruf kanıtı olarak sunma; “sentetik test girdisiyle teknik
gösterim” olarak sun. Gerçek kamera deneyi ve EcoGrader hâlâ ayrı aşamalardır.
