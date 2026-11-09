# GreenAsync karşılaştırma deneyi

Durum: ölçüm aracı hazır; gerçek mülakat karşılaştırma sonuçları henüz yok.
Amaç: aynı konuşmanın video dosyası ile ses+metin yükünü karşılaştırmak,
ardından İK ekranındaki gerçek yanıt aktarımını ayrı ölçmek. Dosya boyutu,
duvar saati süresi, enerji ve karbon birbirinin yerine kullanılmaz.

## 1. Güncelle ve örnek hazırla (Windows / VS Code)

```powershell
git pull
npm run setup:speech
npm run measure -- --help
```

Python 3.14 desteklenir. Mevcut konuşma ortamındaki PyAV kullanılır;
ayrı FFmpeg programı indirmen gerekmez. İlk model indirmesi için internet gerekir.

Proje kökünde `measurements/private` klasörü aç. Windows Kamera uygulamasıyla
yaklaşık 60 saniyelik bir örnek yanıt kaydet; dosyayı bu klasöre `yanit.mp4`
adıyla kopyala. Gerçek aday yerine kendi hazırladığın bir demo kullan.
Kayıt çözünürlüğünü, kare hızını, cihazı ve tarihini deney notlarına yaz.

Örnek soru: “Bir ekip projesinde karşılaştığın sorunu nasıl çözdün?”
Aynı deneyi üç farklı yanıtla tekrarla. Videonun çözünürlüğünü yüksek seçerek
sonucu büyütmeye çalışma; seçilen koşulu açıkça raporla. Sonuçlar yalnızca
bu kayıt koşulları için geçerlidir.

## 2. Aynı videodan ses çıkar, gerçek modelle ölç

```powershell
npm run measure -- media --video measurements/private/yanit.mp4 --transcribe --runs 3 --out measurements/private/deney-01
```

Komut videonun sesini mono Opus / 32 kbps hedefiyle çıkarır. Aynı uygulama
worker'ını çalıştırır: model açılış süresi, ilk dönüşüm ve sonraki iki
dönüşümün sürelerini ayrı kaydeder. Isınmış sürelerin medyanını hesaplar.
Model indirmenin süresi bu deneyin dışında kalır. Birden çok çalıştırmada
işletim sistemi dosya önbelleği sıcak olabilir; açılış süresine “tam soğuk
başlangıç” denmez. Zaman aşımı 180 saniyedir. Arka planda backend dönüşüm
yaparken bu deneyi çalıştırma. Güç modu, donanım ve çalışan programları not et.

Çıktılar:

- `report.md`: sunuma aktarılabilecek tablo ve sınırlar.
- `results.csv`: Excel'de açılabilen UTF-8 tablo.
- `report.json`: ham sayılar, dosya SHA-256'ları, codec ve çözünürlük.
- `derived-audio.webm`: aynı konuşmadan türetilmiş ses.

Her denemede yeni bir `--out` klasörü kullan; araç eski kanıtları ezmez.
Boş konuşma, süresi uyuşmayan kayıt veya eksik model varsa başarılı rapor
üretilmez. Başarısız denemenin çıktı klasörünü kontrol edip yeni klasörle dene.

Bu ses kontrollü bir kodlayıcı çıktısıdır; tarayıcının MediaRecorder çıktısı
olarak sunulamaz. Gerçek uygulama sesini de ölçmek için aday ekranında bir
yanıt kaydet, kaydedilmiş sesi indir ve metni UTF-8 `metin.txt` dosyasına koy:

```powershell
npm run measure -- media --video measurements/private/ayni-konusma.mp4 --audio measurements/private/uygulama-sesi.webm --transcript measurements/private/metin.txt --out measurements/private/uygulama-01
```

İki kaydın aynı konuşmayı kapsadığını sen doğrulamalısın. Araç yalnızca
süreleri kontrol eder (en fazla 0,5 saniye fark); içerik eşitliğini doğrulamaz.
Farklı konuşmaları doğrudan aynı içerik deneyi diye karşılaştırma.
Metni önceden sağladığında dönüşüm süresi ölçülmüş sayılmaz.

### Hesap sınırı

`GreenAsync dosya yükü = ses baytı + metnin UTF-8 baytı`

`Dosya yükü azalması (%) = (video baytı - GreenAsync dosya yükü) / video baytı × 100`

Ses, İK tarafından açılmasa da depolanır ve ilk gönderimde backend'e aktarılır.
Bu yük hesaptan düşülmez. DB satırları, indeksler, yedekler, dosya sistemi,
model dosyaları, ilk model indirmesi ve HTTP ek yükleri bu dosya hesabının
dışındadır. Uzun vadeli toplam sistem maliyeti için bunlar ayrıca incelenmeli.
Negatif sonuç da geçerlidir; sonuç saklanmamalı. Boyutlar bayt cinsindendir;
MB gösterilecekse 1 MB = 1.000.000 bayt kullan.

## 3. İK ekranında gerçek ağ aktarımı

Backend ve frontend'i normal komutlarla başlat. İK girişi yap; kaydedilmiş
demo başvurusu listede olsun. Chrome DevTools > Network panelinde
Disable cache'i aç. Her senaryoya yeni sayfa yüklemesiyle başla; uygulamanın
bellekte tuttuğu ses de böyle sıfırlanır. Giriş ve liste yüklemesini bekle,
Network kaydını temizle ve aşağıdaki tek işi yap. Başarısız istek varsa
koşuyu geçerli ölçüm sayma. Her senaryoyu üç kez tekrarla.

| Senaryo | Kayıt temizlendikten sonra yapılacak iş | Beklenen gözlem |
|---|---|---|
| text | Adaya tıkla; metinleri aç; sese dokunma | Yanıt metinleri gelir, `/audio` isteği gelmez |
| audio | Adaya tıkla; aynı yanıtta Dinle'ye bas; indirme bitsin | Metin istekleri ve `/audio` isteği gelir |
| video | Aynı videoyu yerel HTTP üzerinden aç ve sonuna kadar oynat | Video yanıtlarının gerçek aktarımı görülür |

Her senaryoda Export HAR (sanitized) ile kaydı `measurements/private` altında
sakla. Hassas başlıklar ayıklansa bile yanıt gövdeleri kişisel veri içerebilir;
ham HAR'ı GitHub'a koyma. Araç raporlara URL, çerez, token veya metin gövdesi
kopyalamaz; yalnızca sayıları dışarı verir.

```powershell
npm run measure -- network --har measurements/private/text-01.har --scenario text --out measurements/private/text-01
npm run measure -- network --har measurements/private/audio-01.har --scenario audio --out measurements/private/audio-01
npm run measure -- network --har measurements/private/video-01.har --scenario video --out measurements/private/video-01
```

Video örneğini HTTP üzerinden açmak için ayrı terminalde:

```powershell
py -m http.server 8080 --bind 127.0.0.1 --directory measurements/private
```

Tarayıcı adresi `http://127.0.0.1:8080/yanit.mp4`. Yalnızca yerel bilgisayarda
çalışır. Video ve uygulama farklı arayüzlerdir; bu bir ticari video mülakat
platformu ölçümü değildir. Tam uygulama performansını eşdeğer sayma.
Video ile text/audio senaryolarının istek kapsamını raporda açıkla.
Video kısmi istek yapıyorsa tüm oynatma bitmeden HAR dışarı verme.

Network ölçütü HAR içindeki `_transferSize` alanlarının toplamıdır: tarayıcının
raporladığı yanıt aktarımı. Yükleme yönü, TLS/TCP ek yükleri ve tüm internet
trafiği ölçülmez. Alan yoksa toplam `null` (bilinmiyor) olur; eksik ölçüme sıfır
denmez. Dosya boyutuyla Network baytlarını tek yüzde hesabında karıştırma.
`audio_requests=0` gözlemini metin senaryosu için ayrıca göster. Gerekirse
Network ekran görüntüsüyle destekle. Üç koşunun medyanını sonuç tablosuna yaz.

## 4. EcoGrader ve Lighthouse

Bu kısım henüz yapılmadı. EcoGrader için erişilebilir yayın adresi gerekir;
localhost adresini dış servis test edemez. Yayın ortamını ayrıca hazırlamak
gerekir. Yerel geliştirme sunucusu ile üretim sürümünü aynı sonuç gibi sunma.

- EcoGrader'a yayın adresini gir; tarih, tam test URL'si, rapor bağlantısı ve
  aracın bildirdiği puan/tahminleri kaydet. Bunlar sayfa değerlendirmesidir;
  yerel Whisper'ın enerji ölçümü değildir.
- Chrome Lighthouse ile production sürümünü ölç; mobil/masaüstü ve kısıtlama
  ayarlarını kaydet. Aynı ayarla üç koşu yap, HTML/JSON raporlarını sakla.
- Giriş gerektiren İK akışının EcoGrader tarafından ölçüldüğünü varsayma;
  onun veri aktarımını Network yöntemiyle ayrı raporla.

Birincil kaynaklar:
https://ecograder.com/how-it-works
https://developer.chrome.com/docs/devtools/network/reference/
https://developer.chrome.com/docs/lighthouse/overview/

## 5. Teslim ve sunum

Ham video/ses/metin, model ve HAR dosyaları git dışında tutulur. İncelediğin
anonim toplu raporları `docs/measurements/results/` içine kopyalayabilirsin.
Gerçek kayıt yokken örnek sayılar sonuç olarak yazılmaz.

Sunum sırası: problem → aday kaydı → otomatik metin → İK'nın yalnızca metni
açması → isteğe bağlı ses → boyut ve süre tablosu → Network kanıtı → site
raporları → sınırlılıklar. “Bu koşullarda %X daha az dosya yükü/yanıt aktarımı”
de; enerji/karbon ölçmeden “%X daha az enerji/karbon” deme.

Saklama süresi ve otomatik silme, toplam ömür maliyetini azaltmak için
gelecek geliştirmedir; mevcut sürümde uygulanmış gibi sunma.
