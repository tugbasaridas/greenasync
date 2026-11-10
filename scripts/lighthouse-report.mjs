import { readFile,writeFile,mkdir } from 'node:fs/promises';
import { dirname,resolve } from 'node:path';
const input=resolve(process.argv[2] || 'measurements/private/lighthouse/summary.json');
const out=resolve(process.argv[3] || dirname(input));
const data=JSON.parse(await readFile(input,'utf8'));
if(data.reports?.length!==6 || !data.medians?.mobile || !data.medians?.desktop)throw Error('Six completed audits required.');
for(const row of data.reports)for(const score of Object.values(row.scores))if(score===null)throw Error('Missing category score; inspect raw report.');
await mkdir(out,{recursive:true});
const format=(value,digits=2)=>value===null?'Ölçülmedi':Number(value).toLocaleString('tr-TR',{maximumFractionDigits:digits});
const lines=['# GreenAsync — gerçek Lighthouse ölçümü','',
  `Tarih (UTC): ${data.createdAt}`,`Kaynak sürüm: \`${data.sourceCommit}\``,
  `Lighthouse ${data.lighthouseVersion} · ${data.chromeVersion} · Node ${data.nodeVersion}`,'',
  'Üretim derlemesinin ilk aday sayfası, GitHub Actions Ubuntu 24.04 üzerinde',
  'mobil ve masaüstü profilleriyle üçer kez denetlendi. Tablo medyan değerlerdir.',
  'Bu sonuçlar yerel sunum sunucusuna aittir; kamuya açık bir hosting veya',
  'Whisper/İK oturumu/enerji tüketimi ölçümü değildir.','',
  '| Ölçüt | Mobil medyan | Masaüstü medyan |','|---|---:|---:|'];
for(const [key,title] of [['performance','Performans /100'],['accessibility','Erişilebilirlik /100'],['best-practices','İyi uygulamalar /100'],['seo','SEO /100']])lines.push(`| ${title} | ${format(data.medians.mobile.scores[key],0)} | ${format(data.medians.desktop.scores[key],0)} |`);
for(const [key,title,divisor] of [['largest-contentful-paint','LCP (sn)',1000],['first-contentful-paint','FCP (sn)',1000],['total-blocking-time','TBT (ms)',1],['cumulative-layout-shift','CLS',1],['total-byte-weight','Kaynak transfer ağırlığı (bayt)',1]])lines.push(`| ${title} | ${format(data.medians.mobile.metrics[key]/divisor,3)} | ${format(data.medians.desktop.metrics[key]/divisor,3)} |`);
lines.push('','## Altı koşu','','| Profil | Koşu | Performans | Erişilebilirlik | İyi uygulamalar | SEO | LCP (ms) | TBT (ms) | CLS |','|---|---:|---:|---:|---:|---:|---:|---:|---:|');
for(const r of data.reports)lines.push(`| ${r.profile} | ${r.run} | ${r.scores.performance} | ${r.scores.accessibility} | ${r.scores['best-practices']} | ${r.scores.seo} | ${format(r.metrics['largest-contentful-paint'])} | ${format(r.metrics['total-blocking-time'])} | ${format(r.metrics['cumulative-layout-shift'],4)} |`);
lines.push('','## Koşullar ve yorum','',
  '- Lighthouse varsayılan mobil ayarları ve `--preset=desktop` kullanıldı. Ekran, ağ ve CPU kısıtlama ayarlarının tamamı `summary.json` içinde saklandı.',
  '- Her koşuda yeni Chrome süreci kullanıldı. Sayfa gzip ile sunuldu. Testler aynı sanal makinede sırayla çalıştı.',
  '- Puanlar makine yüküne, tarayıcı sürümüne, profile ve sunucuya göre değişebilir. Üç tekrardan tüm ziyaretçiler için başarı oranı çıkarılamaz.',
  '- Yüksek Lighthouse puanı doğrudan enerji/karbon tasarrufu kanıtı değildir. EcoGrader puanı olarak etiketlenemez.',
  '- Yerel kısıtlı ortamda önceki başarısız deneme korunmuştur; bu rapor GitHub test makinesindeki yeni başarılı deneyi gösterir.',
  '- İlk sayfa dışında ses kaydı, model kurulum indirmesi, dönüşüm hesaplaması, DB ve saklama ömrü kapsam dışındadır.','',
  '## Düşük puanlı denetimler','');
const findings=new Map();
for(const r of data.reports)for(const f of r.failures)findings.set(f.id,f.title);
for(const [id,title] of findings)lines.push(`- \`${id}\`: ${title}`);
if(!findings.size)lines.push('Kayıtlı düşük puanlı denetim yok.');
const warnings=[...new Set(data.reports.flatMap(r=>r.warnings || []))];
if(warnings.length){lines.push('','## Aracın uyarıları','');for(const w of warnings)lines.push('- '+w);}
lines.push('','Ham ayarlar ve metrikler: [summary.json](summary.json).',
  'Resmi yöntem: https://developer.chrome.com/docs/lighthouse/overview/','');
await writeFile(resolve(out,'README.md'),lines.join('\n'));
const keys=['profile','run','performance','accessibility','best-practices','seo','lcp_ms','tbt_ms','cls'];
const csv=[keys.join(','),...data.reports.map(r=>[r.profile,r.run,r.scores.performance,r.scores.accessibility,r.scores['best-practices'],r.scores.seo,r.metrics['largest-contentful-paint'],r.metrics['total-blocking-time'],r.metrics['cumulative-layout-shift']].join(','))].join('\n')+'\n';
await writeFile(resolve(out,'results.csv'),'\ufeff'+csv);
console.log('Lighthouse presentation tables generated.');
