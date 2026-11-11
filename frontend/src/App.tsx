import { useState } from 'react';
import AudioAnswer from './components/AudioAnswer';
import SavedAnswers from './components/SavedAnswers';
import HrPanel from './components/HrPanel';
import { api, ApiError, type SavedAnswer } from './api';
const candidateSessionKey = 'greenasync-session';
const candidateNameKey = 'greenasync-session-name';
function storedCandidateValue(key: string) {
  try { return window.localStorage.getItem(key) || ''; } catch { return ''; }
}
type Question = { id: number; text: string; maxSeconds: number };
export default function App() {
  const [view, setView] = useState<'candidate' | 'hr'>('candidate');
  const [displayName, setDisplayName] = useState('Demo aday');
  const [questions, setQuestions] = useState<Question[]>([]);
  const [status, setStatus] = useState('');
  const [loading, setLoading] = useState(false);
  const [activeQuestion, setActiveQuestion] = useState<number | null>(null);
  const [sessionToken, setSessionToken] = useState('');
  const [hasStoredSession, setHasStoredSession] = useState(() => Boolean(storedCandidateValue(candidateSessionKey)));
  const [answers, setAnswers] = useState<SavedAnswer[]>([]);
  function startNewCandidate() {
    setSessionToken('');
    setDisplayName('');
    setQuestions([]);
    setAnswers([]);
    setStatus('');
  }
  async function loadDemo(resume = false) {
    setLoading(true);
    setStatus('Sunucuya bağlanılıyor…');
    let demoLoaded = false;
    try {
      const response = await fetch('/api/questions');
      if (!response.ok) throw new Error('API response failed');
      const data = await response.json() as Question[];
      setQuestions(data);
      demoLoaded = true;
      setStatus('Sorular hazır. Kalıcı kayıt bağlantısı kontrol ediliyor…');
      let token = sessionToken || (resume ? storedCandidateValue(candidateSessionKey) : '');
      let name = resume ? storedCandidateValue(candidateNameKey) : displayName.trim();
      let canRestore = true;
      let stored: SavedAnswer[] = [];
      if (token) {
        try {
          stored = await api<SavedAnswer[]>('/answers', {}, token);
        } catch (error) {
          if (!(error instanceof ApiError) || error.status !== 401) throw error;
          try {
            if (window.localStorage.getItem(candidateSessionKey) === token) {
              window.localStorage.removeItem(candidateSessionKey);
              window.localStorage.removeItem(candidateNameKey);
              setHasStoredSession(false);
            }
          } catch { canRestore = false; }
          token = '';
          setSessionToken('');
          setAnswers([]);
        }
      }
      if (!token) {
        name ||= 'Demo aday';
        const session = await api<{ token: string }>('/applications', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ displayName: name }) });
        token = session.token;
        try {
          window.localStorage.setItem(candidateSessionKey, token);
          setHasStoredSession(true);
          window.localStorage.setItem(candidateNameKey, name);
        } catch { canRestore = false; }
      }
      setSessionToken(token);
      setDisplayName(name || 'Kayıtlı aday');
      setAnswers(stored);
      setStatus(canRestore ? 'Başvurunuz hazır. Kaydedilen yanıtlar sayfa yenilense de aynı tarayıcıdan açılabilir.' : 'Başvurunuz hazır ancak tarayıcı erişim anahtarını saklayamıyor. Sekme kapanırsa başvuruya tekrar erişemeyebilirsiniz.');
    } catch (error) {
      setStatus((demoLoaded ? 'Sorular hazır; ses ve metin denemesini yapabilirsiniz. Kalıcı kayıt bağlantısı kurulamadı: ' : '') + (error instanceof Error ? error.message : 'Backend bağlantısını kontrol edin.'));
    } finally { setLoading(false); }
  }
  return <main>
    <header><a className="brand" href="/">GreenAsync<span>●</span></a><span className="badge">Geliştirme sürümü · 0.5.1</span></header>
    <nav className="view-tabs" aria-label="Uygulama bölümü"><button className={view === 'candidate' ? '' : 'secondary'} disabled={loading || activeQuestion !== null} onClick={() => setView('candidate')}>Aday</button><button className={view === 'hr' ? '' : 'secondary'} disabled={loading || activeQuestion !== null} onClick={() => setView('hr')}>İK paneli</button></nav>
    {view === 'hr' ? <HrPanel /> : <>
    <section className="hero">
      <p className="eyebrow">DAHA YEŞİL İŞE ALIM</p>
      <h1>Yanıta odaklan.<br /><span>Veri yükünü azalt.</span></h1>
      <p className="intro">Ses ve metin tabanlı ön mülakat. Adayın yanıtı metin olarak incelenir; ses, ihtiyaç olduğunda açılır.</p>
      <label className="candidate-name" htmlFor="candidate-name">Aday adı (demo)</label><input id="candidate-name" value={displayName} maxLength={80} disabled={loading || Boolean(sessionToken)} onChange={event => setDisplayName(event.target.value)} />
      <div className="record-actions">
        <button onClick={() => loadDemo()} disabled={loading || activeQuestion !== null || !displayName.trim()}>{loading ? 'Bağlanılıyor…' : sessionToken ? 'Soruları yenile' : 'Yeni aday oluştur'}</button>
        {sessionToken ? <button className="secondary" onClick={startNewCandidate} disabled={loading || activeQuestion !== null}>Yeni aday</button>
          : hasStoredSession && <button className="secondary" onClick={() => loadDemo(true)} disabled={loading || activeQuestion !== null}>Kayıtlı başvuruyu aç</button>}
      </div>
      <p className="note">Kayıt durunca ses yerel konuşma modeline gönderilir; metne çevrilip otomatik kaydedilir. Modelin kurulmuş olması gerekir. İşlem birkaç saniye veya daha uzun sürebilir.</p>
    </section>
    <section className="cards" aria-label="Planlanan mülakat akışı">
      <article><span className="number">01</span><h2>Aday yanıtlar</h2><p>Kamera yerine mikrofon. Yanıtın sesi ve adayın kontrol ettiği metni birlikte kaydedilir.</p></article>
      <article><span className="number">02</span><h2>İK önce okur</h2><p>Başvuru açıldığında metin gelir. Ses yalnızca dinleme veya indirme isteğiyle yüklenir.</p></article>
      <article><span className="number">03</span><h2>Ölçüm raporları</h2><p>Dosya boyutu, veri aktarımı ve sayfa performansı deneylerini <a href="https://github.com/tugbasaridas/greenasync/tree/main/docs/measurements/results">GitHub’da inceleyin</a>.</p></article>
    </section>
    <section className="demo" aria-labelledby="demo-title">
      <div className="section-title"><h2 id="demo-title">Demo mülakatı</h2><span>Örnek pozisyon · Yazılım geliştirici</span></div>
      <p role="status">{status || 'Soruları görmek ve API bağlantısını denemek için yukarıdaki düğmeye basın.'}</p>
      {questions.length > 0 && <>
        <p className="local-notice">Kaydı durdurduğunuzda ses backend’e gönderilir, yerel model metni çıkarır ve İK için kaydeder. İsterseniz metni sonrasında düzeltip güncelleyebilirsiniz. Tarayıcıyla canlı önizleme seçeneği ayrı ve isteğe bağlıdır.</p>
        <ol className="question-list">{questions.map(q => <li key={q.id}>
          <h3>{q.text}</h3><small>Yanıt süresi: en fazla {q.maxSeconds} saniye</small>
          <AudioAnswer questionId={q.id} maxSeconds={q.maxSeconds} locked={activeQuestion !== null && activeQuestion !== q.id} autoTranscribe sessionToken={sessionToken} savedAnswer={answers.find(a => a.questionId === q.id)} onSaved={answer => setAnswers(current => [...current.filter(a => a.questionId !== answer.questionId), answer].sort((a, b) => a.questionId - b.questionId))} onBusyChange={busy => setActiveQuestion(current => busy ? q.id : current === q.id ? null : current)} />
        </li>)}</ol>
      </>}
    </section>
    {sessionToken && <SavedAnswers answers={answers} token={sessionToken} />}
    </>}
    <footer>GreenAsync · Yeşil Yazılım ders projesi</footer>
  </main>;
}
