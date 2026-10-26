import { useEffect, useRef, useState } from 'react';
import type { SavedAnswer } from '../api';
export default function SavedAnswers({ answers, token }: { answers: SavedAnswer[]; token: string }) {
  return <section className="saved-answers" aria-labelledby="saved-title"><h2 id="saved-title">Kaydedilmiş yanıtlarım</h2>
    <p>Bu başvurunun metinleri PostgreSQL'de saklanıyor. Sesler yalnızca aşağıdaki düğmelere basınca aktarılır.</p>
    {answers.length ? answers.map(answer => <SavedCard key={`${answer.questionId}-${answer.updatedAt}`} answer={answer} token={token} />) : <p>Henüz kaydedilmiş yanıt yok.</p>}
  </section>;
}
function SavedCard({ answer, token }: { answer: SavedAnswer; token: string }) {
  const [url, setUrl] = useState('');
  const [status, setStatus] = useState('');
  const [loading, setLoading] = useState(false);
  const blobUrl = useRef('');
  const mounted = useRef(true);
  const pending = useRef(false);
  const audio = useRef<HTMLAudioElement | null>(null);
  const extension = answer.audioMime.includes('mp4') ? 'm4a' : answer.audioMime.includes('ogg') ? 'ogg' : 'webm';
  useEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; if (blobUrl.current) URL.revokeObjectURL(blobUrl.current); };
  }, []);
  async function open(download: boolean) {
    if (pending.current) return;
    pending.current = true;
    setLoading(true); setStatus('');
    try {
      let source = blobUrl.current;
      if (!source) {
        const response = await fetch(`/api/answers/${answer.questionId}/audio`, { headers: { Authorization: `Bearer ${token}` }, cache: 'no-store' });
        if (!response.ok) throw new Error('Ses alınamadı. Başvuru erişimini ve dosyayı kontrol edin.');
        const blob = await response.blob();
        if (!mounted.current) return;
        source = URL.createObjectURL(blob);
        blobUrl.current = source;
        setUrl(source);
      }
      if (!mounted.current) return;
      if (download) {
        const link = document.createElement('a');
        link.href = source; link.download = `greenasync-soru-${answer.questionId}.${extension}`;
        link.click();
        setStatus('Ses dosyası indirme için hazırlandı.');
      } else { setStatus('Ses yüklendi. Oynatıcıdaki düğmeyle dinleyebilirsiniz.'); }
    } catch (error) { if (mounted.current) setStatus(error instanceof Error ? error.message : 'Ses yüklenemedi.'); }
    finally { pending.current = false; if (mounted.current) setLoading(false); }
  }
  return <article className="saved-card"><h3>Soru {answer.questionId}</h3><p className="saved-text">{answer.transcript}</p>
    <small>{(answer.audioBytes / 1024).toLocaleString('tr-TR', { maximumFractionDigits: 1 })} KB · {Math.round(answer.duration)} sn · {new Date(answer.updatedAt).toLocaleString('tr-TR')}</small>
    <div className="record-actions"><button className="secondary" disabled={loading} onClick={() => open(false)}>{loading ? 'Ses alınıyor…' : 'Sesi dinle'}</button><button className="secondary" disabled={loading} onClick={() => open(true)}>Sesi indir</button></div>
    {url && <audio ref={audio} controls preload="none" src={url} aria-label={`Kaydedilmiş soru ${answer.questionId} yanıtı`} />}
    {status && <p role="status">{status}</p>}
  </article>;
}
