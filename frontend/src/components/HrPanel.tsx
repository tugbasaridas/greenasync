import { useEffect, useState } from 'react';
import { api, type SavedAnswer } from '../api';
import SavedAnswers from './SavedAnswers';
type Application = { id: string; displayName: string; createdAt: string; answerCount?: number; status: string; note?: string };
type Page = { items: Application[]; hasNext: boolean; page: number };
const labels: Record<string, string> = { new: 'Yeni', reviewing: 'İnceleniyor', shortlisted: 'Kısa liste', rejected: 'Uygun bulunmadı' };
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
  async function list(index = 0) {
    const result = await api<Page>(`/hr/applications?page=${index}`);
    setPage(result);
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
  async function open(id: string) {
    setBusy(true); setStatus('');
    try {
      const detail = await api<{ application: Application; answers: SavedAnswer[] }>(`/hr/applications/${id}`);
      setSelected(detail.application); setAnswers(detail.answers); setReviewStatus(detail.application.status); setNote(detail.application.note || '');
    } catch (error) { setStatus(error instanceof Error ? error.message : 'Başvuru açılamadı.'); }
    finally { setBusy(false); }
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
  if (checking) return <p role="status">İK oturumu kontrol ediliyor…</p>;
  if (!authenticated) return <section className="hr-login"><p className="eyebrow">İNSAN KAYNAKLARI</p><h1>Önce metni incele.</h1><p>Ses dosyasını açmadan aday yanıtlarını okuyun ve değerlendirmenizi kaydedin.</p>
    <form onSubmit={login}><label htmlFor="hr-user">Kullanıcı adı</label><input id="hr-user" value={username} onChange={event => setUsername(event.target.value)} autoComplete="username" required maxLength={80} />
      <label htmlFor="hr-pass">Şifre</label><input id="hr-pass" type="password" value={password} onChange={event => setPassword(event.target.value)} autoComplete="current-password" required maxLength={200} />
      <button disabled={busy}>{busy ? 'Giriş yapılıyor…' : 'İK girişi'}</button></form><p className="note">Demo yöneticisi için şifre ilk backend açılışında oluşturulur. Kurulum açıklamasında şifrenin nerede olduğu belirtilir.</p><p role="status">{status}</p></section>;
  return <section className="hr-panel"><div className="section-title"><div><p className="eyebrow">İNSAN KAYNAKLARI</p><h1>Başvurular</h1></div><button className="secondary" onClick={async () => { await api('/hr/logout', { method: 'POST' }); setAuthenticated(false); setSelected(null); setAnswers([]); }} disabled={busy}>Çıkış yap</button></div>
    <p>Önce metinleri okuyun. Dinle/İndir'e basmadığınız sürece ses dosyası cihazınıza aktarılmaz.</p>
    <p role="status">{status}</p><div className="hr-layout"><aside><div className="section-title"><h2>Aday listesi</h2><button className="secondary" disabled={busy} onClick={() => navigate(page.page)}>Yenile</button></div>
      {!page.items.length && <p>Henüz başvuru yok. Aday bölümünden bir kayıt gönderin.</p>}
      {page.items.map(item => <button className={`application-item ${selected?.id === item.id ? 'selected' : ''}`} key={item.id} onClick={() => open(item.id)} disabled={busy}><strong>{item.displayName}</strong><small>{item.id.slice(0, 8)} · {item.answerCount}/3 yanıt · {labels[item.status]}</small><small>{new Date(item.createdAt).toLocaleString('tr-TR')}</small></button>)}
      <div className="record-actions"><button className="secondary" disabled={busy || page.page === 0} onClick={() => navigate(page.page - 1)}>Önceki</button><button className="secondary" disabled={busy || !page.hasNext} onClick={() => navigate(page.page + 1)}>Sonraki</button></div>
    </aside><div>{selected ? <><h2>{selected.displayName}</h2><SavedAnswers title="Adayın yanıtları" answers={answers} audioBase={`/api/hr/applications/${selected.id}/answers`} />
      <section className="review-form"><h2>Değerlendirme</h2><label htmlFor="review-status">Başvuru durumu</label><select id="review-status" value={reviewStatus} onChange={event => setReviewStatus(event.target.value)} disabled={busy}>{Object.entries(labels).map(([value, label]) => <option value={value} key={value}>{label}</option>)}</select><label htmlFor="review-note">İK notu</label><textarea id="review-note" rows={5} value={note} maxLength={4000} onChange={event => setNote(event.target.value)} disabled={busy} /><button disabled={busy} onClick={saveReview}>Değerlendirmeyi kaydet</button></section></> : <div className="hr-empty"><h2>İncelemek için bir aday seçin</h2><p>Başvurunun metin dökümleri burada görünecek. Sesleri indirmek zorunda değilsiniz.</p></div>}</div></div>
  </section>;
}
