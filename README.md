# GreenAsync

Ses ve metin tabanlı, veri tüketimi ölçülebilen asenkron ön mülakat uygulaması.
Yeşil Yazılım dersi kapsamında geliştirilmektedir.

## Hedef akış

Aday kamera kullanmadan sesli yanıt verir. Konuşma metne dönüştürülür ve
adayın kontrolünden sonra sesle birlikte kaydedilir. İK önce yalnızca metni
görür; ses yalnızca Dinle veya İndir seçilirse aktarılır. Ses sunucuda
saklanır; dinlenmemesi sunucudaki depolamayı ortadan kaldırmaz.

## Mevcut sürüm: 0.4.0 — kalıcı ses ve metin

- Soru bazında ses kaydı ve isteğe bağlı Türkçe otomatik metin.
- Kayıttan sonra metni kontrol edip “Yanıtı kaydet” ile kalıcı gönderme.
- Metin ve dosya bilgileri PostgreSQL'de, ses <repo>/uploads/audio içinde.
- Yeniden açılışta aynı tarayıcıdaki başvurunun metinlerini getirme.
- Kaydedilen sesi yalnızca Dinle/İndir isteğiyle alma.
- Yalnızca metni güncellerken sesi tekrar göndermeme.
- Yeni ses kaydedilince önceki dosyayı silme; hatada işlemi geri alma.
- Başvuruya özel rastgele erişim anahtarı; veritabanında yalnızca özeti tutulur.

**Kaydetmediğiniz taslaklar sayfa yenilenince silinir.** Erişim anahtarı bu
tarayıcının localStorage alanında tutulur; tarayıcı verileri silinirse kayıtlar
sunucuda kalır fakat bu aşamada aynı başvuruya geri dönüş yolu bulunmaz.
Anahtarı paylaşmayın. Henüz İK hesabı/rolü ve genel aday yönetimi yoktur.
Uygulama yerel demo içindir; üretim yayını henüz hazırlanmadı.

Otomatik metin seçilirse tarayıcının tanıma hizmeti sesi harici bir serviste
işleyebilir. Cihaz üstü veya çevrimdışı çalışma garanti edilmez. Henüz
tasarruf veya karbon sonucu ölçülmedi.

## Gereksinimler

- Node.js 22.12 veya üstü (Node 22 LTS önerilir), npm
- Git
- Kalıcı kayıt için çalışan PostgreSQL (veya Docker)

## Yerelde çalıştırma

```bash
git clone https://github.com/tugbasaridas/greenasync.git
cd greenasync
npm ci
```

Birinci terminal:

```bash
npm run dev:backend
```

İkinci terminal:

```bash
npm run dev:frontend
```

Tarayıcı: http://localhost:5173

“Demo mülakatını aç” düğmesi soruları getirir. Bir soruda “Kaydı başlat” ile
mikrofon izni verin; konuşup “Kaydı durdur” ile önizlemeyi açın.
Otomatik metin istiyorsanız kayıt başlamadan “Konuşmayı otomatik metne çevir”
seçeneğini işaretleyin. Tanıma bitince veya kesilince kendi kendine yeniden
başlatılmaz. Kayıt sonunda son kelimeler eksik olabilir; metni kontrol edin. Kayıt
süre sınırında otomatik durur. Yeniden kayıt başarılı başladığında önceki
yanıtın yerini alır. Mikrofon için localhost veya HTTPS gerekir.
Sağlık kontrolü: http://localhost:3000/api/health
Vite /api isteklerini yerel NestJS sunucusuna yönlendirir.

```bash
npm test
npm run typecheck
npm run build
```

Build statik ön yüzü frontend/dist, API dosyalarını backend/dist içine üretir.
Bu kurulum yerel geliştirme içindir; internete açık üretim yayını hazırlanmadı.

## PostgreSQL kurulumu

Kök dizindeki `.env.example` dosyasını `.env` adıyla kopyalayın. Backend bu
dosyayı otomatik okur. `.env` GitHub'a eklenmez.

**Mevcut PostgreSQL kullanıyorsanız:** pgAdmin üzerinden boş bir `greenasync`
veritabanı oluşturun. `.env` içinde kendi kullanıcı, parola ve portunuzu yazın:

```dotenv
DATABASE_URL=postgresql://postgres:KENDI_PAROLANIZ@127.0.0.1:5432/greenasync
```

Paroladaki `@`, `#`, `:` gibi özel karakterleri URL biçiminde kodlayın.

**Docker kullanıyorsanız:** `.env` içindeki POSTGRES_PASSWORD ve DATABASE_URL
parolasını aynı olacak şekilde değiştirin, sonra:

```bash
docker compose up -d
```

Backend'i yeniden başlatın. İlk bağlantıda idempotent başlangıç şeması otomatik
oluşturulur; bu aşamada uygulama ve yanıt tabloları açılır. DATABASE_URL yoksa
soru ve yerel kayıt denemesi çalışır, kalıcı işlemler açıklayıcı 503 yanıtı verir.
Yanlış bağlantı tanımlanırsa backend başlangıcı başarısız olur.

Varsayılan ses alanı repo kökündeki `uploads/audio/` dizinidir ve git dışındadır.
`UPLOAD_DIR` ile kalıcı bir mutlak dizin seçilebilir. PostgreSQL verisi ve ses
klasörü birlikte korunmalıdır; Docker volume yalnızca veritabanını tutar.
`docker compose down -v` veritabanı verilerini siler.

Kaydın kalıcılığını denemek için: yanıt kaydedin, sayfayı yenileyin, demo
mülakatını açın. “Kaydedilmiş yanıtlarım” bölümünde önce metin gelmeli;
Dinle/İndir'e basılmadan ses isteği yapılmamalı.

## Yeşil yazılım kararları

- Kamera açılmadan ses kaydı; mono ve 32 kbps hedefi (tarayıcı gerçek ayarları değiştirebilir).
- İsteğe bağlı otomatik metin; hata durumunda ses kaydı devam eder.
- Kayıt durunca tanıma iptal edilerek kendi mikrofon erişimi de sonlandırılır.
- Sunucuda ses ve PostgreSQL'de metin saklama.
- Adayın kayıtlı yanıtlarında metin öncelikli listeleme ve isteğe bağlı ses aktarımı.
- İK hesabı ve değerlendirme ekranı (uygulanacak).
- Sınırlı kayıt süresi ve durdurunca mikrofonu kapatma.
- Sunucudaki eski kayıtları silme (uygulanacak).
- Ana sayfada harici font, video, görsel paketi ve takip betiği kullanılmaması.
- Polling yerine kullanıcının isteğiyle soru getirme.
- Ölçümle doğrulanmayan tasarruf yüzdesi sunulmaması.

Konuşma tanıma tarayıcıya göre uzak servis kullanabilir; cihaz üstü veya
çevrimdışı çalışma varsayılmaz. Aday otomatik metni kontrol edip düzeltebilir.

## Dosyalar

- frontend/: React + TypeScript + Vite
- backend/: NestJS API
- docs/ROADMAP.md: geliştirme sırası
- docs/measurements/: ölçüm yöntemi ve ileride gerçek raporlar

Gerçek aday bilgileri, ses dosyaları ve .env GitHub'a yüklenmemelidir.
GitHub kodu saklar; kalıcı ses depolama ve HTTPS uygulama yayını ayrıca kurulacak.

## Doğrulama

`npm test` kayıt/tanıma akışını taklit medya API'leriyle; kayıt API'sini yerel
PostgreSQL WASM motoru (PGlite) ile sınar. TEST_DATABASE_URL varsa testler o
**ayrı test veritabanında** çalışır; kendi başvuru veritabanınızı vermeyin.
GitHub Actions, PostgreSQL 17 servisiyle aynı HTTP testlerini çalıştırır.
Gerçek mikrofon ve konuşma tanıma doğruluğu otomatik olarak sınanmaz.
Gerçek mikrofon, codec, ses kalitesi ve tarayıcı uyumluluğu için
[elle kontrol listesi](docs/RECORDING-QA.md) uygulanmalıdır.
