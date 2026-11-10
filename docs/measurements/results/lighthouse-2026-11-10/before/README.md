# GreenAsync — gerçek Lighthouse ölçümü

Tarih (UTC): 2026-11-10T16:29:05.785Z
Kaynak sürüm: `aecc1dcb3740f5ae33759746afe15686ce9c811a`
Lighthouse 13.6.0 · Google Chrome 156.0.8078.79 · Node v22.23.4

Üretim derlemesinin ilk aday sayfası, GitHub Actions Ubuntu 24.04 üzerinde
mobil ve masaüstü profilleriyle üçer kez denetlendi. Tablo medyan değerlerdir.
Bu sonuçlar yerel sunum sunucusuna aittir; kamuya açık bir hosting veya
Whisper/İK oturumu/enerji tüketimi ölçümü değildir.

| Ölçüt | Mobil medyan | Masaüstü medyan |
|---|---:|---:|
| Performans /100 | 100 | 100 |
| Erişilebilirlik /100 | 96 | 96 |
| İyi uygulamalar /100 | 100 | 100 |
| SEO /100 | 91 | 91 |
| LCP (sn) | 0,753 | 0,203 |
| FCP (sn) | 0,753 | 0,203 |
| TBT (ms) | 0 | 0 |
| CLS | 0 | 0 |
| Kaynak transfer ağırlığı (bayt) | 84.139 | 84.139 |

## Altı koşu

| Profil | Koşu | Performans | Erişilebilirlik | İyi uygulamalar | SEO | LCP (ms) | TBT (ms) | CLS |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| mobile | 1 | 74 | 96 | 100 | 91 | 753,06 | 1.545,97 | 0 |
| mobile | 2 | 100 | 96 | 100 | 91 | 754,34 | 0 | 0 |
| mobile | 3 | 100 | 96 | 100 | 91 | 752,09 | 0 | 0 |
| desktop | 1 | 100 | 96 | 100 | 91 | 203,39 | 0 | 0 |
| desktop | 2 | 100 | 96 | 100 | 91 | 203,91 | 0 | 0 |
| desktop | 3 | 100 | 96 | 100 | 91 | 202,75 | 0 | 0 |

## Koşullar ve yorum

- Lighthouse varsayılan mobil ayarları ve `--preset=desktop` kullanıldı. Ekran, ağ ve CPU kısıtlama ayarlarının tamamı `summary.json` içinde saklandı.
- Her koşuda yeni Chrome süreci kullanıldı. Sayfa gzip ile sunuldu. Testler aynı sanal makinede sırayla çalıştı.
- Puanlar makine yüküne, tarayıcı sürümüne, profile ve sunucuya göre değişebilir. Üç tekrardan tüm ziyaretçiler için başarı oranı çıkarılamaz.
- Yüksek Lighthouse puanı doğrudan enerji/karbon tasarrufu kanıtı değildir. EcoGrader puanı olarak etiketlenemez.
- Yerel kısıtlı ortamda önceki başarısız deneme korunmuştur; bu rapor GitHub test makinesindeki yeni başarılı deneyi gösterir.
- İlk sayfa dışında ses kaydı, model kurulum indirmesi, dönüşüm hesaplaması, DB ve saklama ömrü kapsam dışındadır.

## Düşük puanlı denetimler

- `total-blocking-time`: Total Blocking Time
- `max-potential-fid`: Max Potential First Input Delay
- `interactive`: Time to Interactive
- `mainthread-work-breakdown`: Minimize main-thread work
- `color-contrast`: Background and foreground colors do not have a sufficient contrast ratio.
- `unused-javascript`: Reduce unused JavaScript
- `robots-txt`: robots.txt is not valid
- `bf-cache`: Page prevented back/forward cache restoration
- `network-dependency-tree-insight`: Network dependency tree
- `render-blocking-insight`: Render-blocking requests

## Aracın uyarıları

- The tested device appears to have a slower CPU than  Lighthouse expects. This can negatively affect your performance score. Learn more about [calibrating an appropriate CPU slowdown multiplier](https://github.com/GoogleChrome/lighthouse/blob/main/docs/throttling.md#cpu-throttling).

Ham ayarlar ve metrikler: [summary.json](summary.json).
Resmi yöntem: https://developer.chrome.com/docs/lighthouse/overview/
