# GreenAsync — Lighthouse önce/sonra

10 Kasım 2026. Gerçek üretim derlemesi GitHub Actions Ubuntu 24.04 test
makinesinde Chrome ile ölçüldü. İlk aday sayfası için **önce 6, sonra 6 koşu**
yapıldı; her grupta mobil ve masaüstü üçer kez denetlendi. Bu rapor manuel
puan tahmini değildir. Tüm ham HTML/JSON raporları ZIP olarak saklandı.

## Sonuçlar (üçer koşunun medyanı)

| Lighthouse kategorisi | Önce mobil | Sonra mobil | Önce masaüstü | Sonra masaüstü |
|---|---:|---:|---:|---:|
| Performans | 100 | 100 | 100 | 100 |
| Erişilebilirlik | 96 | **100** | 96 | **100** |
| İyi uygulamalar | 100 | 100 | 100 | 100 |
| SEO | 91 | **100** | 91 | **100** |

Sonraki altı koşunun **her birinde** dört kategori de 100 oldu.
Önceki grubun ilk mobil performans puanı **74**, diğer ikisi 100 idi.
Araç o koşuda test cihazının beklenenden yavaş CPU'ya sahip göründüğü uyarısı
verdi. Bu koşu dışlanmadı; [önceki altı koşu](before/README.md) içinde saklandı.
Medyanın yanında tüm koşuların verilmesinin nedeni bu değişkenliği göstermektir.

| Sonraki koşuların medyan metriği | Mobil | Masaüstü |
|---|---:|---:|
| LCP | 0,753 sn | 0,208 sn |
| FCP | 0,753 sn | 0,208 sn |
| TBT | 0 ms | 0 ms |
| CLS | 0 | 0 |
| Sayfanın kaynak transfer ağırlığı | 84.141 bayt | 84.141 bayt |

## Ne düzeldi?

- Kartların 01/02/03 yazılarında renk kontrastı 4,43:1 bulundu. `.number`
  rengi `#668044` → `#5c733c` olarak koyulaştırıldı; yeni denetimde kontrast
  hatası kalmadı. Bu otomatik kontrol bütün erişilebilirlik ihtiyaçlarının
  elle incelendiği anlamına gelmez.
- `robots.txt` yokken ölçüm sunucusu SPA HTML'ini döndürüyordu; Lighthouse
  bunu geçersiz robots dosyası olarak raporluyordu. Gerçek bir
  `frontend/public/robots.txt` eklendi ve metin türüyle sunuldu.
  `/api/` yolu tarama dışında bırakıldı; bu erişim kontrolünün yerine geçmez.
- İlk sayfa aktarım ağırlığı 84.139 → 84.141 bayt oldu. Bu iki küçük
  düzeltme için dosya boyutu/karbon azalması iddia edilmiyor; ölçülen iyileşme
  okunabilirlik ve robots denetimindedir.

## Deney kapsamı

- Lighthouse **13.6.0**, Chrome **156.0.8078.79**, Node **22.23.4** kullanıldı.
- Mobil varsayılan profil ve masaüstü `--preset=desktop`; tüm ekran/ağ/CPU
  kısıtlama ayarları ilgili `summary.json` dosyalarında kayıtlıdır.
- Sayfa yerel HTTP üzerinden gzip ile sunuldu; her koşu ayrı Chrome sürecidir.
- İlk aday sayfası ölçüldü. Mikrofon, model kurulumu, ses dönüşümü, İK oturumu,
  veritabanı, saklama ömrü ve kamuya açık sunucu/hosting ölçülmedi.
- Yüksek Lighthouse puanı, doğrudan elektrik veya CO₂ tasarrufu ölçümü değildir.
  Puan makineye, tarayıcıya, profile ve yayın ortamına göre değişebilir.
- `unused-javascript` ve diğer tanılama önerileri ham raporlarda tutuldu.
  Kategori puanının 100 olması bütün önerilerin veya bütün kullanıcı akışlarının
  kusursuz olduğu anlamına gelmez.

## Kanıtlar

| Grup | Kaynak sürüm | Çalıştırma |
|---|---|---|
| Önce | `aecc1dcb3740f5ae33759746afe15686ce9c811a` | [Başarılı GitHub koşusu](https://github.com/tugbasaridas/greenasync/actions/runs/42854650073) |
| Sonra | `cb1878f03087e5a6d10150d99b125aa9cb6c6537` | [Başarılı GitHub koşusu](https://github.com/tugbasaridas/greenasync/actions/runs/42855467622) |

- [Önceki tablo ve ayarlar](before/README.md) · [Önce CSV](before/results.csv)
- [Sonraki tablo ve ayarlar](after/README.md) · [Sonra CSV](after/results.csv)
- [Önceki altı ham HTML/JSON raporu](before/raw-reports.zip)
- [Sonraki altı ham HTML/JSON raporu](after/raw-reports.zip)

ZIP dosyalarının SHA-256 değerleri:

```text
before/raw-reports.zip 971d05d27d8c2e4ce515b4a904c64eca8d41500cd4f6f4ed4611825c132a2ced
after/raw-reports.zip  247eec7a4db84c5fde21946509fcbbe893a47796c9e32fd7bd6408091c36cef6
```

Ham raporlar üretim sayfasının varlıkları değildir; GitHub'da deney kanıtı
olarak tutulur. GitHub Actions artifact süresi dolsa da bu kopyalar depoda kalır.

## Sunumda söyleyebileceğin

“Lighthouse ile üretim ana sayfasını mobil ve masaüstünde üçer kez ölçtük.
Kontrast ve robots dosyası sorunlarını giderdik. Tekrarlanan son altı koşuda
performans, erişilebilirlik, iyi uygulamalar ve SEO puanlarının tamamı 100 oldu.
Bunlar ilk sayfanın otomatik denetim sonuçlarıdır. İK'nın metin ve ses
aktarımını ayrı deneyde, karbon tahminini ise ayrı bir modelle raporladık.”

## Eksik kalan EcoGrader

EcoGrader için dışarıdan erişilebilen bir **yayın adresi** gerekiyor. Depoda
henüz bir yayın adresi yok; GitHub Pages etkin değil. `localhost` veya bu
Lighthouse test sunucusu, EcoGrader için kamuya açık adres sayılmaz. Bu
rapor EcoGrader puanı olarak etiketlenmemeli. Site yayınlandığında ayrı
EcoGrader raporu, tarih ve test URL'si eklenmeli.

Resmi yöntem: https://developer.chrome.com/docs/lighthouse/overview/

## Yeniden ölçmek

GitHub → Actions → **Lighthouse measurement** → **Run workflow**.
Ana sayfa, ölçüm sunucusu veya araç değiştiğinde uygun push'larda da çalışır;
sadece rapor metnini değiştirmek yeni bir ölçüm başlatmaz.

Yerelde Chrome ve Node 22.19+ olan bir ortamda:

```powershell
npm ci
npm run build
npm install --prefix measurements/private/audit-tools --no-audit --no-fund lighthouse@13.6.0
npm run measure:audit
node scripts/lighthouse-report.mjs
```

Bu çalışma ortamının yerel Chromium soket kısıtlaması nedeniyle buradaki
doğrulama GitHub test makinesine taşındı; önceki başarısız deneme silinmedi.
