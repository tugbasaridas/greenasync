# GreenAsync

Ses ve metin tabanlı, veri tüketimi ölçülebilen asenkron ön mülakat uygulaması.
Yeşil Yazılım dersi kapsamında geliştirilmektedir.

## Hedef akış

Aday kamera kullanmadan sesli yanıt verir. Konuşma metne dönüştürülür ve
adayın kontrolünden sonra sesle birlikte kaydedilir. İK önce yalnızca metni
görür; ses yalnızca Dinle veya İndir seçilirse aktarılır. Ses sunucuda
saklanır; dinlenmemesi sunucudaki depolamayı ortadan kaldırmaz.

## Mevcut sürüm: 0.3.0 — ses ve düzenlenebilir metin

Çalışanlar: React ana sayfası, NestJS API üzerinden üç demo sorusu, her soru
için mikrofonla kayıt, otomatik süre sınırı, durdurma, dinleme, indirme ve silme.
Aynı anda tek soruda kayıt yapılır. Kayıt durduğunda mikrofon izleri kapatılır.
İzin reddi, izin isteğini iptal etme ve tarayıcı destek kontrolü bulunur.
Desteklenen tarayıcılarda isteğe bağlı Türkçe otomatik metin taslağı oluşur.
Kayıttan sonra metin düzenlenebilir; otomatik tanıma yoksa elle yazılabilir.
Sesi silmek metni silmez; yeniden kayıt başlatmak mevcut metni sıfırlar.

**Bu aşamada ses ve metin taslakları açık sekmenin belleğinde tutulur. Sayfa
yenilenirse kaybolur; uygulamanın backend'ine gönderilmez.** Otomatik metin
seçilirse tarayıcının tanıma hizmeti sesi harici bir sunucuda işleyebilir;
cihaz üstü veya çevrimdışı çalışma garanti edilmez. Başvuru gönderimi,
İK girişi ve veritabanı bağlantısı henüz uygulanmadı. PostgreSQL
için yalnızca yerel Docker hazırlığı bulunuyor. Henüz tasarruf veya karbon
sonucu ölçülmedi.

## Gereksinimler

- Node.js 22.12 veya üstü (Node 22 LTS önerilir), npm
- Git
- Sonraki veritabanı aşaması için PostgreSQL veya Docker

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

## PostgreSQL hazırlığı (şimdilik isteğe bağlı)

Kök dizindeki .env.example dosyasını .env adıyla kopyalayın ve parolayı değiştirin.
Ardından `docker compose up -d` çalıştırın. Kalıcı veriler Docker volume içinde
kalır. Bu aşamada API henüz veritabanına bağlanmaz.

## Yeşil yazılım kararları

- Kamera açılmadan ses kaydı; mono ve 32 kbps hedefi (tarayıcı gerçek ayarları değiştirebilir).
- İsteğe bağlı otomatik metin; hata durumunda ses kaydı devam eder.
- Kayıt durunca tanıma iptal edilerek kendi mikrofon erişimi de sonlandırılır.
- Sunucuda ses ve metin saklama (uygulanacak).
- Metin öncelikli inceleme ve isteğe bağlı ses aktarımı (uygulanacak).
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

`npm test` kayıt ve konuşma tanıma yaşam döngüsünü taklit edilmiş medya
API'leriyle sınar. Gerçek konuşma tanıma doğruluğunu sınamaz.
Gerçek mikrofon, codec, ses kalitesi ve tarayıcı uyumluluğu için
[elle kontrol listesi](docs/RECORDING-QA.md) uygulanmalıdır.
