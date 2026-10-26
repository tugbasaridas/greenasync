# GreenAsync

Ses ve metin tabanlı asenkron ön mülakat. Yeşil Yazılım ders projesi.

## Sürüm 0.5.0 — adaydan İK'ya çalışan akış

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
- Yerel model kurulumu için Python 3.11/3.12 önerilir (64 bit; 3.10–3.13 desteklenir)
- İlk Python/model indirmesi için internet

**Ayrı PostgreSQL sunucusu veya pgAdmin zorunlu değil.** DATABASE_URL yoksa
PGlite ile aynı PostgreSQL şeması disk üzerinde çalışır. Mevcut PostgreSQL
kullanmak isteyenler DATABASE_URL tanımlayabilir.

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

Önceki `.env` dosyanızda çalışmayan DATABASE_URL varsa o satırın başına `#`
koyun. İsterseniz `.env.example` dosyasını `.env` olarak kopyalayabilirsiniz.
Backend kökteki `.env` dosyasını otomatik okur.

Birinci terminal:

```bash
npm run dev:backend
```

İkinci terminal:

```bash
npm run dev:frontend
```

Adres: http://localhost:5173

## Aday denemesi

Aday bölümünde bir demo adı yazın ve Demo mülakatını aç düğmesine basın.
Kaydı başlatın, konuşun ve Kaydı durdur düğmesine basın. Ayrı bir Gönder
adımı beklenmeden yerel metne dönüştürme ve kalıcı kayıt başlar. İşlem
bitene kadar ilerleme mesajı görünür. Model yoksa veya hata verirse ses
sekmede korunur; Yerel metne çevirmeyi tekrar dene düğmesiyle denenebilir.

Başarılı sonuç Yanıt metni ve Kaydedilmiş yanıtlarım bölümünde görünür.
Metni düzelttikten sonra Yanıtı kaydet ile güncelleyin; ses tekrar gönderilmez.
Yanıt süresi, modelin çözdüğü gerçek ses süresinden alınır. Süre ve boyut
sınırları sunucuda da denetlenir.

Başvurunun erişim anahtarı bu tarayıcının localStorage alanındadır. Tarayıcı
verileri silinirse aynı aday bağlantısına geri dönüş bu sürümde yoktur;
kayıtlar İK listesinde kalır. Kaydedilmeyen taslaklar sayfa yenilenince silinir.

## İK denemesi

Üstte **İK paneli** düğmesine basın. Varsayılan kullanıcı adı `ik`.

Backend ilk açılışta rastgele şifre üretir ve kökteki
`.data/hr-password.txt` dosyasına yazar. Bu dosyayı bilgisayarınızda açıp
şifreyi giriş formuna girin; GitHub'a yüklemeyin. Terminalde dosya yolu
belirtilir. Kendi şifrenizi kullanmak için `.env` içinde:

```dotenv
HR_USERNAME=ik
HR_PASSWORD=EN_AZ_8_KARAKTERLIK_KENDI_SIFRENIZ
```

Değişiklikten sonra backend'i yeniden başlatın. İK oturumu HttpOnly ve
SameSite=Strict çereziyle korunur, 8 saat sonra veya backend yeniden
başlatılınca sona erer. Başvuru erişim anahtarı İK yetkisi vermez.

İK aday seçince sadece metinler ve dosya bilgileri gelir. Dinle/İndir
seçilmedikçe ses istenmez. İK notu ve durum seçimi kalıcı kaydedilir.
Listeler 20 başvuru halinde sayfalanır; sürekli polling yapılmaz.

## Kalıcı veriler ve model

- `.data/postgres/`: gömülü PostgreSQL verileri
- `.data/hr-password.txt`: yerel demo İK şifresi
- `uploads/audio/`: ses dosyaları
- `.models/`: yerel konuşma modeli önbelleği
- `.venv/`: Python ortamı

Hepsi git dışındadır. Yedekleme için veritabanı ve ses alanını birlikte
koruyun. Model dosyaları yeniden indirilebilir. `.data` silinirse gömülü
veritabanı ve üretilmiş İK şifresi kaybolur.

UPLOAD_DIR ve DATA_DIR ile kalıcı mutlak dizinler seçilebilir. Tek demo
backend örneği çalıştırın; PGlite aynı veri dizinine birden çok backend
bağlanması için tasarlanmamıştır. İsteğe bağlı harici PostgreSQL için
compose.yaml veya DATABASE_URL kullanılabilir.

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
