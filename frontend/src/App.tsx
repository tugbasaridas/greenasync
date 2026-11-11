import { useEffect, useRef, useState } from 'react';
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
  const [displayName, setDisplayName] = useState('');
  const [questions, setQuestions] = useState<Question[]>([]);
  const [status, setStatus] = useState('');
  const [loading, setLoading] = useState(false);
  const [activeQuestion, setActiveQuestion] = useState<number | null>(null);
  const [questionIndex, setQuestionIndex] = useState(0);
  const questionHeading = useRef<HTMLHeadingElement>(null);
  const focusQuestion = useRef(false);
  const [sessionToken, setSessionToken] = useState('');
  const [hasStoredSession, setHasStoredSession] = useState(() => Boolean(storedCandidateValue(candidateSessionKey)));
  const [answers, setAnswers] = useState<SavedAnswer[]>([]);
  useEffect(() => {
    if (focusQuestion.current) questionHeading.current?.focus();
    focusQuestion.current = false;
  }, [questionIndex, questions, sessionToken]);
  function goToQuestion(index: number) {
    if (index === questionIndex) {
      questionHeading.current?.focus();
      return;
    }
    focusQuestion.current = true;
    setQuestionIndex(index);
  }
  function startNewCandidate() {
    setSessionToken('');
    setDisplayName('');
    setQuestions([]);
    setAnswers([]);
    setStatus('');
    setQuestionIndex(0);
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
      setQuestionIndex(index => Math.min(index, Math.max(0, data.length - 1)));
      demoLoaded = true;
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
      if (!sessionToken) {
        const next = data.findIndex(question => !stored.some(answer => answer.questionId === question.id));
        focusQuestion.current = true;
        setQuestionIndex(next < 0 ? 0 : next);
      }
      setStatus(canRestore ? 'Başvurunuz hazır.' : 'Başvurunuz hazır. Bu tarayıcı oturumu saklayamadığı için sekmeyi açık tutun.');
    } catch (error) {
      setStatus((demoLoaded ? 'Başvuru kaydı açılamadı. ' : '') + (error instanceof ApiError ? error.message : 'Sunucuya ulaşılamadı. Biraz sonra tekrar deneyin.'));
    } finally { setLoading(false); }
  }
  const interviewOpen = questions.length > 0;
  const interviewComplete = interviewOpen && questions.every(question => answers.some(answer => answer.questionId === question.id));
  const navigationLocked = loading || activeQuestion !== null;
  return <>
    <header className="site-header">
      <div className="site-width header-content">
        <a className="brand" href="/"><span className="brand-mark" aria-hidden="true">G</span>GreenAsync</a>
        <nav className="view-tabs" aria-label="Uygulama bölümü">
          <button aria-pressed={view === 'candidate'} disabled={navigationLocked} onClick={() => setView('candidate')}>Aday</button>
          <button aria-pressed={view === 'hr'} disabled={navigationLocked} onClick={() => setView('hr')}>İK paneli</button>
        </nav>
      </div>
    </header>
    <main className="site-width">
    {view === 'hr' ? <HrPanel /> : <>
    <section className="page-heading">
      <p className="eyebrow">Sesli ön mülakat</p>
      <h1>Yazılım Geliştirici</h1>
      <p>Soruları kendi hızınızda, sesli olarak yanıtlayın.</p>
    </section>
    <div className={interviewOpen ? 'interview-layout interview-layout-open' : 'interview-layout'}>
      <div className="interview-content">
        <section className={sessionToken ? 'candidate-card surface candidate-card-open' : 'candidate-card surface'} aria-labelledby="candidate-title">
          <h2 id="candidate-title">{sessionToken ? 'Başvurunuz' : 'Mülakata başlayın'}</h2>
          <form onSubmit={event => { event.preventDefault(); void loadDemo(); }}>
            <div className="candidate-field">
              <label htmlFor="candidate-name">Adınız ve soyadınız</label>
              <input id="candidate-name" value={displayName} placeholder="Örn. Ece Kaya" autoComplete="name" maxLength={80} disabled={loading || Boolean(sessionToken)} onChange={event => setDisplayName(event.target.value)} />
            </div>
            <div className="record-actions">
              <button type="submit" disabled={navigationLocked || !displayName.trim()}>{loading ? 'Bağlanılıyor…' : sessionToken ? 'Soruları yenile' : 'Mülakatı başlat'}</button>
              {sessionToken ? <button type="button" className="secondary" onClick={startNewCandidate} disabled={navigationLocked}>Yeni aday</button>
                : hasStoredSession && <button type="button" className="secondary" onClick={() => loadDemo(true)} disabled={navigationLocked}>Kayıtlı başvuruyu aç</button>}
            </div>
          </form>
          <p className="form-status" role="status">{status}</p>
        </section>
        {interviewOpen && <ol className="question-list" aria-label="Mülakat soruları">{questions.map((q, index) => <li className="surface question-card" key={q.id} hidden={index !== questionIndex}>
          <div className="question-meta"><span>Soru {index + 1} / {questions.length}</span><span>En fazla {q.maxSeconds} sn</span></div>
          <h2 ref={index === questionIndex ? questionHeading : undefined} tabIndex={-1}>{q.text}</h2>
          <AudioAnswer questionId={q.id} maxSeconds={q.maxSeconds} locked={index !== questionIndex || (activeQuestion !== null && activeQuestion !== q.id)} autoTranscribe sessionToken={sessionToken} savedAnswer={answers.find(a => a.questionId === q.id)} onSaved={answer => setAnswers(current => [...current.filter(a => a.questionId !== answer.questionId), answer].sort((a, b) => a.questionId - b.questionId))} onBusyChange={busy => setActiveQuestion(current => busy ? q.id : current === q.id ? null : current)} />
          <div className="question-navigation">
            <button className="secondary" disabled={navigationLocked || index === 0} onClick={() => goToQuestion(index - 1)}>Önceki soru</button>
            {index < questions.length - 1
              ? <button className="secondary" disabled={navigationLocked} onClick={() => goToQuestion(index + 1)}>Sonraki soru</button>
              : sessionToken && <a href="#saved-title">Kaydedilen yanıtlar</a>}
          </div>
        </li>)}</ol>}
        {sessionToken && <SavedAnswers answers={answers} token={sessionToken} />}
      </div>
      <aside className="interview-guide" aria-labelledby="guide-title">
        <h2 id="guide-title">{interviewOpen ? 'Sorular' : 'Mülakat bilgileri'}</h2>
        {interviewOpen ? <>
          <p className="guide-progress" role="status">{interviewComplete ? 'Tüm yanıtlar kaydedildi' : `${answers.length} / ${questions.length} yanıt kaydedildi`}</p>
          <progress value={answers.length} max={questions.length} aria-label="Kaydedilen yanıtlar" />
          <ol className="question-links">{questions.map((question, index) => <li key={question.id}>
            <button type="button" aria-current={questionIndex === index ? 'step' : undefined} disabled={navigationLocked} onClick={() => goToQuestion(index)}>
              <span>Soru {index + 1}</span><small>{answers.some(answer => answer.questionId === question.id) ? 'Kaydedildi' : 'Yanıt bekliyor'}</small>
            </button>
          </li>)}</ol>
        </> : <>
          <dl className="interview-facts">
            <div><dt>Soru sayısı</dt><dd>3</dd></div>
            <div><dt>Toplam yanıt süresi</dt><dd>En fazla 4 dk</dd></div>
            <div><dt>Kayıt türü</dt><dd>Yalnızca ses</dd></div>
          </dl>
          <p className="guide-note">Sessiz bir ortam seçin. Kayıt bittiğinde yanıtınız metne çevrilir. Gönderilen metni sonradan düzeltebilirsiniz.</p>
        </>}
      </aside>
    </div>
    </>}
    </main>
    <footer className="site-width site-footer"><span>GreenAsync</span><a href="https://github.com/tugbasaridas/greenasync">Proje ve ölçüm raporları</a></footer>
  </>;
}
