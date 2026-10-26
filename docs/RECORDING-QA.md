# Sürüm 0.5.0 doğrulama listesi

## Kurulum

- Node/npm kurulumu ve npm ci tamamlanmış olmalı.
- Python 3.10–3.14 ile npm run setup:speech başarıyla bitmeli.
- DATABASE_URL verilmezse backend embedded modda ve disk tabanlı açılmalı.
- Backend başlatılınca İK şifre dosyasının yolu belirtilmeli.
- Kullanıcı verileri, sesler ve model dosyaları GitHub'da olmamalı.

## Aday

- Demo açılınca sorular ve başvuru erişim anahtarı hazırlanmalı.
- Kaydı başlatınca kamera açılmadan mikrofon izni istenmeli.
- Başka sorularda kayıt ve sekme değiştirme kilitlenmeli.
- Konuşurken giriş seviyesi hareket etmeli; fiziksel cihazda ayrıca sınanmalı.
- Durdurma veya süre sınırı mikrofonu ve analiz kaynağını kapatmalı.
- Durdurunca /answers/:questionId/transcribe isteği otomatik gönderilmeli.
- Dönüştürme sırasında ilerleme bilgisi görünmeli.
- Model yoksa açıklayıcı kurulum hatası ve yeniden deneme olmalı; ses korunmalı.
- Başarılı işlemden sonra metin ve kayıtlı yanıt görünmeli.
- Yalnızca metni güncellerken ses tekrar yüklenmemeli.
- Aynı tarayıcıda sayfa yenilenince kalıcı yanıtlar tekrar açılmalı.

## İK

- İK oturumu olmadan liste, detay, not ve ses uçları 401 vermeli.
- İK parolasıyla giriş yapılmalı; başvuru erişim anahtarı bu yetkiyi vermemeli.
- Aday seçilince metinler gelmeli; audio isteği yapılmamalı.
- Dinle/İndir seçilince yalnızca ilgili kayıt istenmeli.
- Aynı sekmede indirilen ses yeniden kullanılmalı.
- Not ve durum kaydedilip yeniden açılınca korunmalı.
- Çıkıştan sonra önceki oturum başvuruları okuyamamalı.

## Otomatik test sınırları

Medya yaşam döngüsü tarayıcı API taklitleriyle; kalıcı kayıt ve İK API'si
PostgreSQL motoruyla sınanır. Gömülü motor ayrıca diskten tekrar açılır ve
transaction sırasında diğer sorguların beklediği doğrulanır. Gerçek yerel
model kontrolü docs/measurements/local-speech-e2e.md içinde belirtilir.
Bu kontroller gerçek aday konuşmasındaki doğruluk veya enerji tasarrufu
benchmark'ı değildir. Chrome'un isteğe bağlı canlı tanıması ayrı bir hizmettir.
