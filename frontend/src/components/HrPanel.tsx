import { useEffect, useState } from 'react';
import { api, type SavedAnswer } from '../api';
import SavedAnswers from './SavedAnswers';
type Application = { id: string; displayName: string; createdAt: string; answerCount?: number; status: string; note?: string };
type Page = { items: Application[]; hasNext: boolean; page: number };
const labels: Record<string, string> = { new: 'Yeni', reviewing: 'İnceleniyor', shortlisted: 'Kısa liste', rejected: 'Uygun bulunmadı' };
const fetchPage = (index: number) => api<Page>(`/hr/applications?page=${index}`);
const initials = (name: string) => name.trim().split(/\s+/).slice(0, 2).map(word => word[0]).join('').toLocaleUpperCase('tr-TR');
export default function HrPanel() {
  const [authenticated, setAuthenticated] = useState(false);
  const [checking, setChecking] = useState(true);
  const [username, setUsername] = useState('ik');
  const [password, setPassword] = useState('');
  const [status, setStatus] = useState('');
  const [busy, setBusy] = useState(false);
  const [page, setPage] = useState<Page>({ items: [], hasNext: false, page: 0 });
  const [selected, setSelected] = useState<Application | null>(null);
  const [answers, setAnswers] = useState<SavedAnswer[]>([]);
  const [reviewStatus, setReviewStatus] = useState('new');
  const [note, setNote] = useState('');
  const selectedIndex = page.items.findIndex(item => item.id === selected?.id);
  async function list(index = 0) {
    const result = await fetchPage(index);
    setPage(result);
    if (selected && !result.items.some(item => item.id === selected.id)) {
      setSelected(null);
      setAnswers([]);
    }
  }
  useEffect(() => {
    let alive = true;
    void api('/hr/me').then(async () => {
      if (!alive) return;
      setAuthenticated(true);
      try { await list(); } catch { if (alive) setStatus('Başvurular alınamadı. Yenile düğmesini deneyin.'); }
    }).catch(() => {}).finally(() => { if (alive) setChecking(false); });
    return () => { alive = false; };
  }, []);
  async function login(event: React.FormEvent) {
    event.preventDefault(); setBusy(true); setStatus('');
    try {
      await api('/hr/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ username, password }) });
      setPassword(''); setAuthenticated(true); await list();
    } catch (error) { setStatus(error instanceof Error ? error.message : 'Giriş yapılamadı.'); }
    finally { setBusy(false); }
  }
  async function open(target: { id: string } | { pageIndex: number; last: boolean }) {
    setBusy(true); setStatus('');
    try {
      let nextPage: Page | undefined;
      let id: string;
      if ('id' in target) {
        id = target.id;
      } else {
        nextPage = await fetchPage(target.pageIndex);
        const candidate = target.last ? nextPage.items.at(-1) : nextPage.items[0];
        if (!candidate) throw new Error('Bu sayfada başvuru yok. Listeyi yenileyin.');
        id = candidate.id;
      }
      const detail = await api<{ application: Application; answers: SavedAnswer[] }>(`/hr/applications/${id}`);
      if (nextPage) setPage(nextPage);
      setSelected(detail.application); setAnswers(detail.answers); setReviewStatus(detail.application.status); setNote(detail.application.note || '');
    } catch (error) { setStatus(error instanceof Error ? error.message : 'Başvuru açılamadı.'); }
    finally { setBusy(false); }
  }
  function moveCandidate(direction: -1 | 1) {
    const neighbor = page.items[selectedIndex + direction];
    if (neighbor) void open({ id: neighbor.id });
    else void open({ pageIndex: page.page + direction, last: direction === -1 });
  }
  async function saveReview() {
    if (!selected) return;
    setBusy(true); setStatus('');
    try {
      const result = await api<Application>(`/hr/applications/${selected.id}/review`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status: reviewStatus, note }) });
      setSelected(result); await list(page.page); setStatus('Değerlendirme kaydedildi.');
    } catch (error) { setStatus(error instanceof Error ? error.message : 'Kaydedilemedi.'); }
    finally { setBusy(false); }
  }
  async function navigate(index: number) {
    setBusy(true); setStatus('');
    try { await list(index); } catch (error) { setStatus(error instanceof Error ? error.message : 'Liste alınamadı.'); }
    finally { setBusy(false); }
  }
  if (checking) return <p className="session-check" role="status">İK oturumu kontrol ediliyor…</p>;
  if (!authenticated) return <section className="hr-login surface"><p className="eyebrow">İnsan kaynakları</p><h1>İK paneline giriş</h1><p>Başvurulara erişmek için oturum açın.</p>
    <form onSubmit={login}><label htmlFor="hr-user">Kullanıcı adı</label><input id="hr-user" value={username} onChange={event => setUsername(event.target.value)} autoComplete="username" required maxLength={80} />
      <label htmlFor="hr-pass">Şifre</label><input id="hr-pass" type="password" value={password} onChange={event => setPassword(event.target.value)} autoComplete="current-password" required maxLength={200} />
      <button disabled={busy}>{busy ? 'Giriş yapılıyor…' : 'İK girişi'}</button></form><p className="form-status" role="status">{status}</p></section>;
  return <section className="hr-panel">
    <div className="page-heading section-title"><div><p className="eyebrow">İnsan kaynakları</p><h1>Başvurular</h1><p>Aday yanıtlarını inceleyin ve değerlendirmenizi kaydedin.</p></div><button className="secondary" onClick={async () => { await api('/hr/logout', { method: 'POST' }); setAuthenticated(false); setSelected(null); setAnswers([]); }} disabled={busy}>Çıkış yap</button></div>
    <p className="form-status" role="status">{status}</p>
    <div className="hr-layout">
      <aside className="surface applicant-list" aria-labelledby="applicant-title">
        <div className="section-title"><h2 id="applicant-title">Aday listesi</h2><button className="secondary" disabled={busy} onClick={() => navigate(0)}>Yenile</button></div>
        {!page.items.length && <p>Henüz başvuru yok.</p>}
        {page.items.map(item => <button className={`application-item ${selected?.id === item.id ? 'selected' : ''}`} key={item.id} aria-pressed={selected?.id === item.id} onClick={() => open({ id: item.id })} disabled={busy}>
          <span className="avatar" aria-hidden="true">{initials(item.displayName)}</span>
          <span className="application-summary"><strong>{item.displayName}</strong><small>{item.answerCount}/3 yanıt · {labels[item.status]}</small></span>
        </button>)}
        {(page.page > 0 || page.hasNext) && <div className="page-controls"><p>Sayfa {page.page + 1}</p><div className="record-actions"><button className="secondary" disabled={busy || page.page === 0} onClick={() => navigate(page.page - 1)}>Önceki sayfa</button><button className="secondary" disabled={busy || !page.hasNext} onClick={() => navigate(page.page + 1)}>Sonraki sayfa</button></div></div>}
      </aside>
      <div className="applicant-detail">{selected ? <>
      <div className="surface applicant-heading">
        <div className="applicant-identity"><span className="avatar" aria-hidden="true">{initials(selected.displayName)}</span><div><h2>{selected.displayName}</h2><p>{labels[selected.status]} · {new Date(selected.createdAt).toLocaleDateString('tr-TR')}</p></div></div>
        <div className="record-actions" aria-label="Adaylar arasında gezinme"><button className="secondary" disabled={busy || selectedIndex < 0 || (selectedIndex === 0 && page.page === 0)} onClick={() => moveCandidate(-1)}>Önceki aday</button><button className="secondary" disabled={busy || selectedIndex < 0 || (selectedIndex === page.items.length - 1 && !page.hasNext)} onClick={() => moveCandidate(1)}>Sonraki aday</button></div>
      </div>
      <SavedAnswers key={selected.id} title="Adayın yanıtları" answers={answers} audioBase={`/api/hr/applications/${selected.id}/answers`} />
      <section className="review-form surface"><h2>Değerlendirme</h2><label htmlFor="review-status">Başvuru durumu</label><select id="review-status" value={reviewStatus} onChange={event => setReviewStatus(event.target.value)} disabled={busy}>{Object.entries(labels).map(([value, label]) => <option value={value} key={value}>{label}</option>)}</select><label htmlFor="review-note">İK notu</label><textarea id="review-note" rows={4} value={note} maxLength={4000} onChange={event => setNote(event.target.value)} disabled={busy} /><button disabled={busy} onClick={saveReview}>Değerlendirmeyi kaydet</button></section></> : <div className="hr-empty surface"><h2>İncelemek için bir aday seçin</h2><p>Yanıt metinleri burada görünür. Ses kayıtlarını gerektiğinde açabilirsiniz.</p></div>}</div></div>
  </section>;
}
