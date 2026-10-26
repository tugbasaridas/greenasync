# Gerçek yerel modelle uçtan uca kontrol

Bu, genel doğruluk veya enerji benchmark'ı değildir.

- Model: faster-whisper 1.2.1, Whisper tiny, CPU/int8, iki iş parçacığı.
- Ses: Ahenk projesinin yayımladığı sentetik Türkçe örnek; gerçek aday verisi değil.
- Kaynak: https://github.com/ozguradmin/ahenk-turkish-tts
- Örnek: https://huggingface.co/ozgurguler/ahenk-tts-tr/resolve/main/samples/big_01_plain_ozel04.wav
- Referans cümle: Eskişehir'den İzmir'e otobüsle gittik.
- Model çıktısı: Eski şehirden izmire otobüsle gittik.
- Örnek, Opus/WebM 32 kbps biçimine dönüştürüldü.
- Backend gerçek model işlemini tamamladı; HTTP 201 döndü.
- Çözümlenen ses süresi: 2.56 saniye. Dosya: 11455 bayt.
- Bu tek denemede backend isteği yaklaşık 0.9 saniyede tamamlandı.
  Bu sayı farklı cihaz/kayıtlar için süre vaadi değildir.
- Metin gömülü PostgreSQL'e, ses dosya alanına kaydedildi.
- İK girişinden sonra metin detay uç noktasından aynı yanıt okundu.
- Bu kontrolde İK ses uç noktasına istek atılmadı.
- İK değerlendirme notu ve durumu kaydedildi.

Özel adların yazımında hata görüldü. Adayın düzeltme alanı korunur.
Ses tanımanın enerji/CPU maliyeti ve gerçek aday konuşmasındaki doğruluk
bu kontrolle ölçülmüş sayılmaz. Örnek ses repo içine eklenmedi.

## Python 3.14 uyumluluk kontrolü

Aynı uçtan uca akış CPython 3.14.8 / Linux x86-64, PyAV 16.1.0 ile
çalıştırıldı: HTTP 201, aynı Türkçe metin, İK metin detayı ve not kaydı başarılı.
Windows x86-64 / CPython 3.14 için tüm bağımlılıklar yalnızca hazır binary
paketler kullanılarak çözümlendi. Windows üzerinde gerçek çalıştırma bu
ortamda yapılmadı. Python 3.10–3.13 için önceden sınanan PyAV 15.1.0 korunur.
