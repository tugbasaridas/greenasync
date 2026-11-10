# GreenAsync — gerçek Lighthouse ölçümü

Tarih (UTC): 2026-11-10T16:33:31.850Z
Kaynak sürüm: `cb1878f03087e5a6d10150d99b125aa9cb6c6537`
Lighthouse 13.6.0 · Google Chrome 156.0.8078.79 · Node v22.23.4

Üretim derlemesinin ilk aday sayfası, GitHub Actions Ubuntu 24.04 üzerinde
mobil ve masaüstü profilleriyle üçer kez denetlendi. Tablo medyan değerlerdir.
Bu sonuçlar yerel sunum sunucusuna aittir; kamuya açık bir hosting veya
Whisper/İK oturumu/enerji tüketimi ölçümü değildir.

| Ölçüt | Mobil medyan | Masaüstü medyan |
|---|---:|---:|
| Performans /100 | 100 | 100 |
| Erişilebilirlik /100 | 100 | 100 |
| İyi uygulamalar /100 | 100 | 100 |
| SEO /100 | 100 | 100 |
| LCP (sn) | 0,753 | 0,208 |
| FCP (sn) | 0,753 | 0,208 |
| TBT (ms) | 0 | 0 |
| CLS | 0 | 0 |
| Kaynak transfer ağırlığı (bayt) | 84.141 | 84.141 |

## Altı koşu

| Profil | Koşu | Performans | Erişilebilirlik | İyi uygulamalar | SEO | LCP (ms) | TBT (ms) | CLS |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| mobile | 1 | 100 | 100 | 100 | 100 | 752,72 | 0 | 0 |
| mobile | 2 | 100 | 100 | 100 | 100 | 753,4 | 0 | 0 |
| mobile | 3 | 100 | 100 | 100 | 100 | 753,02 | 0 | 0 |
| desktop | 1 | 100 | 100 | 100 | 100 | 202,95 | 0 | 0 |
| desktop | 2 | 100 | 100 | 100 | 100 | 209,31 | 0 | 0 |
| desktop | 3 | 100 | 100 | 100 | 100 | 208,44 | 0 | 0 |

## Koşullar ve yorum

- Lighthouse varsayılan mobil ayarları ve `--preset=desktop` kullanıldı. Ekran, ağ ve CPU kısıtlama ayarlarının tamamı `summary.json` içinde saklandı.
- Her koşuda yeni Chrome süreci kullanıldı. Sayfa gzip ile sunuldu. Testler aynı sanal makinede sırayla çalıştı.
- Puanlar makine yüküne, tarayıcı sürümüne, profile ve sunucuya göre değişebilir. Üç tekrardan tüm ziyaretçiler için başarı oranı çıkarılamaz.
- Yüksek Lighthouse puanı doğrudan enerji/karbon tasarrufu kanıtı değildir. EcoGrader puanı olarak etiketlenemez.
- Yerel kısıtlı ortamda önceki başarısız deneme korunmuştur; bu rapor GitHub test makinesindeki yeni başarılı deneyi gösterir.
- İlk sayfa dışında ses kaydı, model kurulum indirmesi, dönüşüm hesaplaması, DB ve saklama ömrü kapsam dışındadır.

## Düşük puanlı denetimler

- `unused-javascript`: Reduce unused JavaScript
- `bf-cache`: Page prevented back/forward cache restoration
- `network-dependency-tree-insight`: Network dependency tree
- `render-blocking-insight`: Render-blocking requests

Ham ayarlar ve metrikler: [summary.json](summary.json).
Resmi yöntem: https://developer.chrome.com/docs/lighthouse/overview/
