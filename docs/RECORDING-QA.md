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
