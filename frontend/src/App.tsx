import { useState } from 'react';
type Question = { id: number; text: string; maxSeconds: number };
export default function App() {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [status, setStatus] = useState('');
  const [loading, setLoading] = useState(false);
  async function loadDemo() {
    setLoading(true);
    setStatus('Sunucuya bağlanılıyor…');
    try {
      const response = await fetch('/api/questions');
      if (!response.ok) throw new Error('API response failed');
      const data = await response.json() as Question[];
      setQuestions(data);
      setStatus('Backend bağlantısı başarılı. Demo soruları hazır.');
    } catch {
      setStatus('Backend bağlantısı kurulamadı. İkinci terminalde npm run dev:backend komutunu çalıştırın.');
    } finally { setLoading(false); }
  }
  return <main>
    <header><a className="brand" href="/">GreenAsync<span>●</span></a><span className="badge">Geliştirme sürümü · 0.1</span></header>
    <section className="hero">
      <p className="eyebrow">DAHA YEŞİL İŞE ALIM</p>
      <h1>Yanıta odaklan.<br /><span>Veri yükünü azalt.</span></h1>
      <p className="intro">Ses ve metin tabanlı ön mülakat. Adayın yanıtı metin olarak incelenir; ses, ihtiyaç olduğunda açılır.</p>
      <button onClick={loadDemo} disabled={loading}>{loading ? 'Bağlanılıyor…' : 'Demo sorularını getir'} <span aria-hidden="true">↗</span></button>
      <p className="note">Başlangıç kurulumu hazır. Ses kaydı ve başvuru gönderimi sonraki aşamada eklenecek.</p>
    </section>
    <section className="cards" aria-label="Planlanan mülakat akışı">
      <article><span className="number">01</span><h2>Aday yanıtlar</h2><p>Kamera yerine mikrofon. Yanıtın sesi ve adayın kontrol ettiği metni birlikte kaydedilir.</p></article>
      <article><span className="number">02</span><h2>İK önce okur</h2><p>Başvuru açıldığında metin gelir. Ses yalnızca dinleme veya indirme isteğiyle yüklenir.</p></article>
      <article><span className="number">03</span><h2>Etki ölçülür</h2><p>Dosya boyutu, veri aktarımı ve sayfa performansı raporlanır. Sonuçlar deneylerle belirlenecek.</p></article>
    </section>
    <section className="demo" aria-labelledby="demo-title">
      <div className="section-title"><h2 id="demo-title">Demo mülakatı</h2><span>Örnek pozisyon · Yazılım geliştirici</span></div>
      <p role="status">{status || 'Soruları görmek ve API bağlantısını denemek için yukarıdaki düğmeye basın.'}</p>
      {questions.length > 0 && <ol>{questions.map(q => <li key={q.id}><p>{q.text}</p><small>Yanıt süresi: en fazla {q.maxSeconds} saniye</small></li>)}</ol>}
    </section>
    <footer>GreenAsync · Yeşil Yazılım ders projesi<span>Ölçülmüş tasarruf sonucu henüz yok.</span></footer>
  </main>;
}
