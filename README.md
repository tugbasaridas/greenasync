# GreenAsync

Ses ve metin tabanlı asenkron ön mülakat. Yeşil Yazılım ders projesi.

## Sürüm 0.5.1 — adaydan İK'ya çalışan akış

1. Aday demo mülakatını açar ve mikrofonla yanıt verir.
2. Kayıt durunca ses otomatik olarak backend'e gönderilir.
3. Backend yerel Whisper modeliyle Türkçe metin çıkarır ve ses/metni kaydeder.
4. Aday metni kontrol edebilir; düzeltirse Yanıtı kaydet ile günceller.
5. İK giriş yapıp başvuruları ve yanıt metinlerini görür.
6. Ses yalnızca İK Dinle veya İndir seçerse İK cihazına aktarılır.
7. İK notunu ve inceleme durumunu kaydeder.

Tarayıcının Web Speech API'si isteğe bağlı canlı önizlemedir. Kalıcı metnin
tek kaynağı değildir. Yerel model kurulmadan otomatik kalıcı metin çalışmaz.
Dönüştürme süresi kayıt uzunluğuna ve işlemciye bağlıdır; anlık sonuç garanti edilmez.

## Gereksinimler

- Node.js 22.12 veya üstü ve npm
- Git
- Yerel model kurulumu için Python 3.10–3.14 (64 bit)
- İlk Python/model indirmesi için internet

**Ders demosu için `npm run dev:backend` gömülü PGlite veritabanını açar.**
Ayrı PostgreSQL sunucusu veya pgAdmin kurulumu gerekmez.

## Güncelleme ve ilk kurulum

```bash
git clone https://github.com/tugbasaridas/greenasync.git
cd greenasync
npm ci
npm run setup:speech
```

Repo zaten varsa git clone yerine `git pull` kullanın. `setup:speech`, proje
kökünde `.venv` oluşturur, Python bağımlılıklarını ve çok dilli Whisper tiny
modelini indirir. İndirme/kurulum başarısızsa komut hata verir; son mesajda
“Yerel konuşma modeli hazır” görülmeden kurulmuş kabul etmeyin. Model
çalışırken dosyalar yalnızca yerel önbellekten açılır.

Birinci terminal:

```bash
npm run dev:backend
```

İkinci terminal:

```bash
npm run dev:frontend
```

Adres: http://localhost:5173

Backend komutu derleyip 3000 portunda çalıştırır. Windows'ta demo verileri
`%LOCALAPPDATA%\GreenAsync\class-demo-v2`, diğer sistemlerde
`~/.greenasync/class-demo-v2` altında tutulur. 0.5.1 sürümünde bu klasör ilk
çalıştırmada boş başlar ve sonraki açılışlarda aynı kayıtlar kullanılır.
Önceki demo klasörleri kendi konumlarında kalır.
Sağlık kontrolü: http://127.0.0.1:3000/api/health

## Aday denemesi

Aday bölümünde bir demo adı yazın ve **Mülakatı başlat** düğmesine basın.
Açık bir başvurudan yeni bir adaya geçmek için önce **Yeni aday** düğmesini
kullanın. Önceki başvuru ve kaydedilmiş yanıtları İK panelinde kalır.
Kaydı başlatın, konuşun ve Kaydı durdur düğmesine basın. Ayrı bir Gönder
adımı beklenmeden yerel metne dönüştürme ve kalıcı kayıt başlar. İşlem
bitene kadar ilerleme mesajı görünür. Model yoksa veya hata verirse ses
sekmede korunur; Yerel metne çevirmeyi tekrar dene düğmesiyle denenebilir.
Sorular arasında **Önceki soru**, **Sonraki soru** veya soru listesiyle geçin.

Başarılı sonuç Yanıt metni ve Kaydedilmiş yanıtlarım bölümünde görünür.
Metni düzelttikten sonra Yanıtı kaydet ile güncelleyin; ses tekrar gönderilmez.
Yanıt süresi, modelin çözdüğü gerçek ses süresinden alınır. Süre ve boyut
sınırları sunucuda da denetlenir.

Bu tarayıcıdaki son başvuruya **Kayıtlı başvuruyu aç** ile dönebilirsiniz.
Tarayıcı verileri silinirse başvuruya aday ekranından geri dönülemez;
kayıtlar veritabanında ve İK listesinde kalır. Backend eski erişim anahtarını
reddederse yeni başvuru açılır. Kaydedilmeyen taslaklar sayfa yenilenince silinir.

## İK denemesi

`npm run dev:backend` ile başlatılan yerel sınıf demosunda **İK paneli**
düğmesine basıp kullanıcı adı olarak `ik`, şifre olarak `1234` girin.
Listede **Deniz (sentetik demo)** ve **Ada Demir (sentetik demo)** görünür.
Deniz'in ikinci soruda, Ada'nın üç soruda da hazır yanıtı vardır. Metinleri
okuyabilir ve **Dinle** ile Türkçe sentetik sesleri açabilirsiniz.
Yeni başvuruları görmek için **Yenile** düğmesine basın. Bir aday seçtikten
sonra **Önceki aday** ve **Sonraki aday** ile başvurular arasında geçin.
Listede 20'den fazla başvuru varsa sayfa düğmeleri de görünür.
Bu örneklerde seslendirme için yazılan metinler gösterilir. Canlı transkripsiyonu
göstermek için **Aday** bölümünden yeni bir kayıt yapın.

Backend'i `npm run start:dev --workspace backend` ile başlatıyorsanız
`.env` dosyasında kendi giriş bilgilerinizi ayarlayabilirsiniz.

```dotenv
HR_USERNAME=ik
HR_PASSWORD=EN_AZ_8_KARAKTERLIK_KENDI_SIFRENIZ
```

Bu başlatma biçiminde şifre ayarlanmadıysa backend `hr-password.txt` dosyasında
bir şifre oluşturur ve dosyanın yolunu terminale yazar.
Değişiklikten sonra backend'i yeniden başlatın. İK oturumu HttpOnly ve
SameSite=Strict çereziyle korunur, 8 saat sonra veya backend yeniden
başlatılınca sona erer. Başvuru erişim anahtarı İK yetkisi vermez.

İK aday seçince sadece metinler ve dosya bilgileri gelir. Dinle/İndir
seçilmedikçe ses istenmez. İK notu ve durum seçimi kalıcı kaydedilir.
Listeler 20 başvuru halinde sayfalanır; sürekli polling yapılmaz.

## Kalıcı veriler ve model

Demo veri klasörü `postgres/` ve `audio/` içerir. Yedekleme
için bu klasörü birlikte koruyun. Model önbelleği `.models/`, Python ortamı
`.venv/` proje kökünde kalır.

Kendi PostgreSQL ve dizin ayarlarını kullanmak için `.env` dosyasında
`DATABASE_URL`, `DATA_DIR` veya `UPLOAD_DIR` ayarlayıp
`npm run start:dev --workspace backend` çalıştırabilirsiniz. Standart ders
demosu için üstteki `npm run dev:backend` yeterlidir.

## Yeşil yazılım kararları

- Kamera açılmadan sıkıştırılmış ses kaydı; 32 kbps ve mono hedefi.
- Yerel model CPU/int8 ve iki iş parçacığıyla çalışır; modele aynı anda tek iş verilir.
- Model istekler arasında yeniden kullanılır; iki dakika boşta kalınca süreç kapanır.
- Model indirmesi yalnızca kurulumda yapılır; işletimde ses harici ASR servisine gitmez.
- İK metin öncelikli inceler; ses isteğe bağlı alınır ve aynı sekmede tekrar kullanılır.
- Metin düzeltmesi sesi tekrar yüklemez; yeni ses eski dosyanın yerini alır.
- Harici font, video arka planı, animasyon paketi ve takip betiği kullanılmaz.
- Kaydı durdurunca mikrofon, seviye analiz kaynağı ve zamanlayıcılar kapatılır.

Yerel modelin CPU/bellek maliyeti vardır. Bu seçim tek başına enerji tasarrufu
kanıtı değildir. Kontrollü karşılaştırma ve Ecograder ölçümleri henüz yapılmadı.
Kayıt saklama süresi, toplu silme ve üretim yayını sonraki aşamalardır.

## Kontroller

```bash
npm test
npm run typecheck
npm run build
```

Otomatik testler kayıt/tanıma akışını taklit medya API'leriyle, kayıt/İK
API'sini PostgreSQL motoruyla sınar. TEST_DATABASE_URL verilirse yalnızca
ayrı test veritabanı kullanın. CI PostgreSQL 17 servisini kullanır.
Gerçek yerel modelle ayrıca Türkçe sentetik bir ses örneği sınandı;
sonuç ve sınırlar docs/measurements/local-speech-e2e.md dosyasındadır.

Bu bir yerel ders prototipidir. İnternete açık üretim yayını hazırlanmadı.

## Tekrarlanabilir karşılaştırma ölçümleri

Ölçüm aracı ve adımlar: [deney kılavuzu](docs/measurements/README.md).
Mevcut Python ortamıyla çalışır; ayrı FFmpeg kurulumu gerektirmez.

```bash
npm run measure -- --help
npm run measure -- media --video measurements/private/yanit.mp4 --transcribe --runs 3 --out measurements/private/deney-01
```

Video içindeki aynı konuşmadan Opus ses çıkarır; ses+metin dosya yükünü,
model açılışını ve ilk/ısınmış dönüşüm sürelerini JSON/CSV/Markdown olarak
raporlar. Network HAR ölçümü ayrı alt komuttur. Gerçek aday verileri ve ham
HAR dosyaları git dışında tutulur. Enerji/karbon sonucu üretilmez. Kontrollü
kamera kaydı deneyi ve yayın adresinde EcoGrader ölçümü hâlâ bekliyor.
Lighthouse deneyi aşağıdaki ayrı raporda tamamlandı.


## Hazır sentetik video ile dene

Kendi video kaydın olmadan ölçüm akışını denemek için Türkçe sesli, açıkça
etiketlenmiş bir [sentetik örnek](samples/synthetic-interview/README.md) eklendi:

```bash
npm run measure:demo
```

Önce `npm run setup:speech` tamamlanmış olmalı. Bu örnek gerçek aday veya
kamera çekimi değildir; çıkan dosya boyutu oranı gerçek mülakatlara genellenmez.

## 10 Kasım 2026 gerçek İK ekranı ölçümleri

[Üç koşulu rapor, JSON/CSV ve ekran kanıtı](docs/measurements/results/ui-2026-11-10/README.md) eklendi.
Sentetik girdinin gerçek uygulama akışı ölçüldü: metin açılınca ses istenmiyor,
ses ilk istekte aktarılıyor ve aynı kartta tekrar kullanılabiliyor. CO2.js
model tahmini ayrıca etiketlendi. EcoGrader ve doğrudan enerji ölçümü henüz yok; nedenleri ve deney sınırları
raporda açıklandı. Lighthouse deneyi aşağıda ayrıca tamamlandı.

## Lighthouse ölçümü tamamlandı

[10 Kasım 2026 önce/sonra raporu ve ham HTML/JSON dosyaları](docs/measurements/results/lighthouse-2026-11-10/README.md).
Kontrast ve robots.txt sorunları giderildikten sonra mobil/masaüstü altı koşunun
her birinde performans, erişilebilirlik, iyi uygulamalar ve SEO puanları 100 oldu.
Bu, üretim ilk sayfa denetimidir; toplam enerji/karbon veya EcoGrader sonucu değildir.
