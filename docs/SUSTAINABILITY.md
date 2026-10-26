# Yeşil yazılım tasarım kararları

Teknoloji seçimi tek başına enerji verimliliği kanıtı değildir. React ve NestJS
ile veri, istek ve işlem miktarını azaltmaya odaklanıyoruz. Bu proje etkileşimli
kayıt ve İK ekranları gerektirdiği için React kullanır; statik sayfalara gereksiz
ek kütüphaneler eklenmez. TypeScript JavaScript olarak derlenir.

## Başlangıçta uygulananlar

- Sistem fontları; harici font isteği yok.
- Görsel/video arka planı, otomatik oynatma ve animasyon kütüphanesi yok.
- Arayüz için ek bileşen veya ikon paketi yok.
- Polling yok; sorular yalnızca kullanıcı düğmeye bastığında getirilir.
- Tek NestJS uygulaması; gereksiz mikroservis ve sürekli bağlantı yok.
- Takip ve analiz betiği yok.
- Video izni istenmeden ses kaydı; 32 kbps ve mono hedeflenir.
- Kayıt durunca mikrofon izleri kapatılır; zamanlayıcılar temizlenir.
- Silme ve yeniden kayıtta geçersiz Blob adresleri serbest bırakılır.
- Yanıtlar yalnızca kullanıcı Kaydet dediğinde aktarılır.
- Metin listesi ses içermez; ses Dinle/İndir ile istenir.
- Metin güncellemesi mevcut sesi tekrar göndermez.
- Aynı sekmede indirilen ses Blob adresi yeniden kullanılır.
- Ses değiştirilince eski dosya temizlenir; DB hatasında yeni dosya geri alınır.
- Otomatik metin isteğe bağlıdır; harici tanıma servisi kullanabilir.
- Tanıma hizmeti hata verir veya biterse sürekli yeniden başlatılmaz.
- Kayıt durduğunda konuşma tanıma da iptal edilir. Oluşan taslak korunur.

## Geliştirme hedefleri

- İlk sayfa için JS + CSS sıkıştırılmış toplamı 100 KB altında hedeflenir.
  Bu bir performans bütçesidir, ölçülmüş enerji sonucu değildir.
- İK metin ekranında ses istek sayısı 0 olmalı.
- Ses yalnızca Dinle/İndir ile getirilmeli; mikrofon yalnızca kayıtta açık olmalı.
- Sorgular yalnızca gerekli alanları almalı; listeleme sayfalanmalı.
- Sürüm hashli statik dosyalar uygun önbellek başlıklarıyla sunulmalı.
  Özel başvuru ve sesler herkese açık önbelleğe alınmamalı.
- Gereksiz tekrar render ve zamanlayıcılar önlenmeli.
- Saklama süresi sonunda sesler temizlenmeli; gerçek kayıtlar git dışında kalmalı.
- Küçük ve ihtiyaca uygun sunucu kullanılmalı; yayın kararı ölçümlerle verilmeli.

## Doğrulama

Üretim build boyutu, Network paneli, Lighthouse ve Ecograder sonuçları
kaydedilecek. Veri azalması, enerji azalması ve model tabanlı CO2 tahmini
birbirinden ayrı ifade edilecek. Koyu/yeşil renk kullanmak tek başına tasarruf
kanıtı sayılmayacak.

Rehber: https://www.w3.org/TR/web-sustainability-guidelines/
