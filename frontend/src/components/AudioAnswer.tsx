import { useEffect, useRef, useState } from 'react';
import useTranscript from '../hooks/useTranscript';

type Props = { questionId: number; maxSeconds: number; locked: boolean; onBusyChange: (busy: boolean) => void };
type Phase = 'idle' | 'requesting' | 'recording' | 'stopping' | 'ready';
type Recording = { url: string; bytes: number; mime: string; duration: number };
const clock = (seconds: number) => `${Math.floor(seconds / 60).toString().padStart(2, '0')}:${Math.floor(seconds % 60).toString().padStart(2, '0')}`;
function permissionMessage(error: unknown) {
  const name = error instanceof DOMException ? error.name : '';
  if (name === 'NotAllowedError' || name === 'SecurityError') return 'Mikrofon izni verilmedi. Tarayıcının site izinlerinden mikrofonu açıp tekrar deneyin.';
  if (name === 'NotFoundError') return 'Mikrofon bulunamadı. Bir mikrofon bağlayıp tekrar deneyin.';
  if (name === 'NotReadableError') return 'Mikrofona erişilemiyor. Başka bir uygulamanın kullanıp kullanmadığını kontrol edin.';
  return 'Ses kaydı başlatılamadı. Mikrofonu ve tarayıcı desteğini kontrol edip tekrar deneyin.';
}
export default function AudioAnswer({ questionId, maxSeconds, locked, onBusyChange }: Props) {
  const transcript = useTranscript();
  const [phase, setPhase] = useState<Phase>('idle');
  const [elapsed, setElapsed] = useState(0);
  const [recording, setRecording] = useState<Recording | null>(null);
  const [message, setMessage] = useState('');
  const alive = useRef(true);
  const generation = useRef(0);
  const busy = useRef(false);
  const stream = useRef<MediaStream | null>(null);
  const recorder = useRef<MediaRecorder | null>(null);
  const interval = useRef<ReturnType<typeof setInterval> | null>(null);
  const deadline = useRef<ReturnType<typeof setTimeout> | null>(null);
  const started = useRef(0);
  const elapsedRef = useRef(0);
  const url = useRef<string | null>(null);
  const audio = useRef<HTMLAudioElement | null>(null);
  const busyCallback = useRef(onBusyChange);
  busyCallback.current = onBusyChange;

  function releaseHardware() {
    if (interval.current) clearInterval(interval.current);
    if (deadline.current) clearTimeout(deadline.current);
    interval.current = null;
    deadline.current = null;
    stream.current?.getTracks().forEach(track => track.stop());
    stream.current = null;
  }
  function clearPreview() {
    audio.current?.pause();
    if (url.current) URL.revokeObjectURL(url.current);
    url.current = null;
    setRecording(null);
  }
  function finishBusy() {
    busy.current = false;
    busyCallback.current(false);
  }
  function stop(reason = 'Kayıt tamamlandı. Mikrofon kapatıldı.') {
    const current = recorder.current;
    if (!current || current.state !== 'recording') return;
    elapsedRef.current = Math.min((performance.now() - started.current) / 1000, maxSeconds);
    setElapsed(elapsedRef.current);
    setPhase('stopping');
    setMessage(reason);
    transcript.stop();
    current.stop();
    // Stopping the recorder alone does not release the microphone tracks.
    releaseHardware();
  }
  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
      generation.current++;
      const current = recorder.current;
      if (current) {
        current.ondataavailable = null;
        current.onstop = null;
        current.onerror = null;
        if (current.state !== 'inactive') current.stop();
      }
      releaseHardware();
      if (url.current) URL.revokeObjectURL(url.current);
    };
  }, []);
  useEffect(() => { if (locked) audio.current?.pause(); }, [locked]);

  async function start() {
    if (locked || busy.current) return;
    if (!window.isSecureContext || !navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === 'undefined') {
      setMessage('Bu tarayıcıda kayıt kullanılamıyor. Güncel bir tarayıcıda localhost veya HTTPS üzerinden açın.');
      return;
    }
    busy.current = true;
    busyCallback.current(true);
    const attempt = ++generation.current;
    setPhase('requesting');
    setMessage('Mikrofon izni bekleniyor…');
    audio.current?.pause();
    try {
      const input = await navigator.mediaDevices.getUserMedia({
        audio: { channelCount: { ideal: 1 }, echoCancellation: true, noiseSuppression: true }, video: false,
      });
      // Permission can resolve after cancellation or navigation.
      if (!alive.current || attempt !== generation.current) {
        input.getTracks().forEach(track => track.stop());
        return;
      }
      stream.current = input;
      const mimeType = ['audio/webm;codecs=opus', 'audio/ogg;codecs=opus', 'audio/mp4']
        .find(type => MediaRecorder.isTypeSupported(type));
      const current = new MediaRecorder(input, { ...(mimeType ? { mimeType } : {}), audioBitsPerSecond: 32000 });
      const chunks: Blob[] = [];
      let failed = false;
      recorder.current = current;
      current.ondataavailable = event => { if (event.data.size > 0) chunks.push(event.data); };
      current.onerror = () => {
        if (!alive.current || attempt !== generation.current) return;
        failed = true;
        transcript.stop();
        releaseHardware();
        if (alive.current && attempt === generation.current) {
          setMessage('Kayıt sırasında bir hata oluştu. Lütfen yeniden deneyin.');
          setPhase('idle');
          finishBusy();
        }
      };
      current.onstop = () => {
        if (!alive.current || attempt !== generation.current) return;
        transcript.stop();
        releaseHardware();
        elapsedRef.current = Math.min((performance.now() - started.current) / 1000, maxSeconds);
        setElapsed(elapsedRef.current);
        recorder.current = null;
        if (!failed) {
          const blob = new Blob(chunks, { type: current.mimeType || chunks[0]?.type || 'audio/webm' });
          if (blob.size > 0) {
            clearPreview();
            const objectUrl = URL.createObjectURL(blob);
            url.current = objectUrl;
            setRecording({ url: objectUrl, bytes: blob.size, mime: blob.type, duration: elapsedRef.current });
            setPhase('ready');
          } else {
            setMessage('Ses verisi oluşmadı. Birkaç saniye konuşup tekrar deneyin.');
            setPhase('idle');
          }
        }
        finishBusy();
      };
      input.getAudioTracks().forEach(track => {
        track.onended = () => stop('Mikrofon bağlantısı kesildi. Oluşan kayıt aşağıda kontrol edilebilir.');
      });
      current.start(1000);
      clearPreview();
      transcript.start();
      started.current = performance.now();
      elapsedRef.current = 0;
      setElapsed(0);
      setPhase('recording');
      setMessage('Kayıt sürüyor. Yalnızca mikrofon açık.');
      interval.current = setInterval(() => {
        const seconds = (performance.now() - started.current) / 1000;
        setElapsed(Math.min(seconds, maxSeconds));
        if (seconds >= maxSeconds) stop('Süre sınırına ulaşıldı. Kayıt durduruldu ve mikrofon kapatıldı.');
      }, 250);
      deadline.current = setTimeout(() => stop('Süre sınırına ulaşıldı. Kayıt durduruldu ve mikrofon kapatıldı.'), maxSeconds * 1000);
    } catch (error) {
      if (!alive.current || attempt !== generation.current) return;
      releaseHardware();
      setPhase(url.current ? 'ready' : 'idle');
      setMessage(permissionMessage(error));
      finishBusy();
    }
  }
  function cancelPermission() {
    generation.current++;
    setPhase(url.current ? 'ready' : 'idle');
    setMessage('Kayıt isteği iptal edildi. Tarayıcının açık izin penceresini kapatabilirsiniz.');
    finishBusy();
  }
  const isBusy = phase === 'requesting' || phase === 'recording' || phase === 'stopping';
  const extension = recording?.mime.includes('mp4') ? 'm4a' : recording?.mime.includes('ogg') ? 'ogg' : 'webm';
  return <div className="answer-recorder">
    <div className="transcript-option">
      <label><input type="checkbox" checked={transcript.enabled} disabled={isBusy || locked || !transcript.supported} aria-describedby={`speech-info-${questionId}`} onChange={event => transcript.setEnabled(event.target.checked)} /> Konuşmayı otomatik metne çevir (Türkçe)</label>
      <p id={`speech-info-${questionId}`}>{transcript.supported ? 'İsteğe bağlıdır. Tarayıcının tanıma hizmeti sesi harici bir servise gönderebilir; internet gerekebilir. Kayıt başlamadan önce seçin.' : 'Bu tarayıcıda otomatik metin desteklenmiyor. Ses kaydedebilir ve yanıt metnini elle yazabilirsiniz.'}</p>
    </div>
    <div className="recording-top"><span className={phase === 'recording' ? 'record-state active' : 'record-state'}>{phase === 'recording' ? '● Kayıtta' : 'Sesli yanıt'}</span><span className="timer" aria-label="Kayıt süresi">{clock(elapsed)} / {clock(maxSeconds)}</span></div>
    <progress value={elapsed} max={maxSeconds} aria-label="Yanıt süresi" />
    <div className="record-actions">
      {!isBusy && <button type="button" disabled={locked} onClick={start}>{recording ? 'Yeniden kaydet' : 'Kaydı başlat'}</button>}
      {phase === 'requesting' && <button type="button" className="secondary" onClick={cancelPermission}>İzin isteğini iptal et</button>}
      {(phase === 'recording' || phase === 'stopping') && <button type="button" className="stop-button" disabled={phase === 'stopping'} onClick={() => stop()}>{phase === 'stopping' ? 'Kayıt hazırlanıyor…' : 'Kaydı durdur'}</button>}
      {recording && !isBusy && <button type="button" className="secondary" disabled={locked} onClick={() => { clearPreview(); setPhase('idle'); setElapsed(0); setMessage('Ses kaydı silindi. Yanıt metni korundu.'); }}>Kaydı sil</button>}
    </div>
    <p className="record-message" role="status">{message || (locked ? 'Başka bir soruda kayıt açık. Önce o kaydı tamamlayın.' : 'Kayıt başlatıldığında yalnızca mikrofon izni istenir.')}</p>
    {recording && !isBusy && <div className="record-preview">
      <audio ref={audio} controls preload="none" src={recording.url} aria-label={`Soru ${questionId} sesli yanıtı`} onPlay={() => { if (locked) audio.current?.pause(); }} />
      <div className="file-info"><span>{Math.max(1, Math.round(recording.duration))} sn · {(recording.bytes / 1024).toLocaleString('tr-TR', { maximumFractionDigits: 1 })} KB · {recording.mime.split(';')[0]}</span><a href={recording.url} download={`greenasync-soru-${questionId}.${extension}`}>Kaydı indir</a></div>
    </div>}
    <div className="transcript-editor">
      <label htmlFor={`transcript-${questionId}`}>Yanıt metni {transcript.listening && <span>· Canlı taslak</span>}</label>
      <textarea id={`transcript-${questionId}`} value={transcript.text} readOnly={isBusy || locked} maxLength={12000} rows={5} placeholder="Otomatik metin burada görünür. Yanıtınızı elle de yazabilirsiniz." aria-describedby={`transcript-help-${questionId}`} onChange={event => transcript.setText(event.target.value)} />
      <p id={`transcript-help-${questionId}`}>Kayıt sırasında metin düzenlenmez. Kaydı durdurduktan sonra sesinizi dinleyip hataları düzeltin. Yeniden kayıt başlarsa mevcut metin sıfırlanır.</p>
      {transcript.notice && <p className="transcript-notice" role="status">{transcript.notice}</p>}
      <div className="text-actions"><small>{transcript.text.length.toLocaleString('tr-TR')} karakter · Bu sekmede geçici taslak</small><button type="button" className="secondary" disabled={isBusy || locked || !transcript.text} onClick={() => transcript.reset()}>Metni temizle</button></div>
    </div>
  </div>;
}
