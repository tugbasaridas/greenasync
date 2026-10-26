# Ses kaydı doğrulaması

## Otomatik kontroller

`npm test` ile jsdom ve taklit edilmiş MediaRecorder/getUserMedia üzerinden:

1. Yalnızca ses isteme, durdurunca mikrofon izlerini kapatma ve önizleme.
2. Kaydı silerken Blob adresini serbest bırakma.
3. Mikrofon izni reddi ve tekrar deneme.
4. Süre sınırında otomatik durma.
5. İptal edilen izin daha sonra verilirse mikrofonu kapatma.
6. İptal edilen eski isteğin hatasının yeni kaydı bozmaması.
7. Bileşen kapanırken ve geciken izin yanıtında kaynakları temizleme.
8. Yeniden kayıt için izin verilmezse önceki kaydı koruma.

Bu testler gerçek ses üretmez; codec ve mikrofon kalitesini doğrulamaz.

## Gerçek tarayıcıda elle kontrol

- Backend ve frontend açıkken localhost:5173 üzerinden demo mülakatını açın.
- Mikrofonu reddedin: anlaşılır hata ve yeniden deneme görülmeli.
- İzin verin: kamera açılmamalı; diğer soruların kayıt düğmeleri kilitlenmeli.
- Konuşup durdurun: tarayıcı mikrofon kullanım göstergesi kapanmalı.
- Kaydı dinleyin: anlaşılabilir ses; indirin ve dosyayı cihazda açın.
- Yeni kayıtta eski önizleme kaldırılmalı; silince oynatıcı kaybolmalı.
- İlk sorunun 60 saniyelik sınırında kayıt kendiliğinden durmalı.
- İzin beklerken iptal edin, sonra izin verin: kayıt başlamamalı.
- Kayıt sırasında sayfayı kapatın: mikrofon kullanımı sonlanmalı.
- Sayfayı yenileyin: geçici kayıtların kaybolduğu doğrulanmalı.
- Network panelinde kaydın yüklenmediğini doğrulayın.
- Dar ekranda düğmeler, metin ve ses oynatıcı taşmamalı.
- Kullanılan tarayıcı/OS, tarih ve bulguları not edin.

Tarayıcı zamanlayıcıları arka planda gecikebilir; süre sınırı gerçek zamanlı
bir garanti değildir. Sunucu eklenince süre ve boyut ayrıca doğrulanmalıdır.

## Otomatik metin kontrolleri

Otomatik testler Türkçe tanıma ayarı, güncellenen ara sonuçların tekrar
etmeden birleştirilmesi, izin/network hatalarında sesin devamı, prefiksli
API desteği, tanıma iptali ve metin taslağının korunmasını da kapsar.
Gerçek konuşma tanıma hizmetine bağlanılmaz.

Gerçek tarayıcıda:

- Otomatik metin varsayılan kapalı olmalı; bilgi metni görülebilmeli.
- Destek varsa seçip Türkçe konuşun; canlı taslak görünmeli.
- Durdurunca tanıma da sonlanmalı ve metin düzenlenebilir olmalı.
- Metne ekleme/silme yapın; ses dosyası değişmemeli.
- Sesi silin: metin korunmalı. Metni temizleyin: ses korunmalı.
- Yeniden kayıt başarıyla başlarsa önceki metin sıfırlanmalı.
- Tanıma desteği olmayan tarayıcıda elle metin girişi çalışmalı.
- Tanıma hizmeti kesilirse ses durmamalı; eksik metin elle tamamlanabilmeli.
- Sekme kapanınca hem ses kaydı hem tanımanın mikrofon erişimi sonlanmalı.

Bu sürüm son tanıma sonucunu beklemek yerine kaydı durdurunca tanımayı
iptal eder; son kelimeler eksik kalabilir. Metin adayın kontrol edeceği taslaktır.
Kaydet seçilmeden ses ve metin uygulamanın backend'ine yüklenmez. Harici tarayıcı tanıma
hizmetinin trafiği ve işlemi ayrıca değerlendirilmelidir.

## Kalıcı kayıt

- Ayrı bir greenasync PostgreSQL veritabanı ve .env/DATABASE_URL ayarlayın.
- Ses kaydedin, metni kontrol edin, Yanıtı kaydet düğmesine basın.
- Sayfayı yenileyip mülakatı açın: metinler geri gelmeli.
- Network panelinde Dinle/İndir öncesi audio isteği olmamalı.
- Yalnızca metni güncellerken multipart istekte audio alanı olmamalı.
- Yeni ses kaydedilince uploads/audio içindeki eski dosya silinmeli.
- Backend ve PostgreSQL yeniden başlatılınca kayıtlar korunmalı.
- Gizli sekmede yeni başvuru açınca önceki başvurunun metinleri görülmemeli.
- DB yoksa açıklayıcı hata görünmeli; geçici ses/metin korunmalı.

Dosya boyutu ve kapsayıcı başlığı sunucuda kontrol edilir. Gerçek medya
içeriği/kanal türü ve süre henüz decode edilerek doğrulanmaz; süre alanı
istemci bildirimidir. Bu sürüm internete açık üretim kullanımı için hazır değildir.
