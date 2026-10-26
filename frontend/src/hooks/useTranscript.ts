import { useEffect, useRef, useState } from 'react';

export type SpeechResultEvent = {
  results: ArrayLike<{ isFinal: boolean; [index: number]: { transcript: string } }>;
};
export type SpeechEngine = {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  maxAlternatives: number;
  onresult: ((event: SpeechResultEvent) => void) | null;
  onerror: ((event: { error: string }) => void) | null;
  onend: (() => void) | null;
  onstart?: (() => void) | null;
  start: (track?: MediaStreamTrack) => void;
  abort: () => void;
};
type SpeechConstructor = new () => SpeechEngine;
type State = 'ready' | 'starting' | 'listening' | 'stopped' | 'error';
function constructor() {
  const browser = window as Window & { SpeechRecognition?: SpeechConstructor; webkitSpeechRecognition?: SpeechConstructor };
  return browser.SpeechRecognition ?? browser.webkitSpeechRecognition;
}
function errorMessage(code: string) {
  if (code === 'not-allowed' || code === 'service-not-allowed') return 'Tanıma hatası: ' + code + '. Otomatik metin için izin verilmedi. Ses kaydı devam eder; Chrome mikrofon izinlerini kontrol edin.';
  if (code === 'network') return 'Tanıma hatası: network. Chrome konuşma tanıma hizmetine bağlanamadı. İnternet bağlantısını kontrol edin. Oluşan metin korundu; ses kaydı devam eder.';
  if (code === 'no-speech') return 'Tanıma hatası: no-speech. Konuşma algılanamadı. Ses kaydı devam eder; tekrar başlat düğmesiyle yeniden deneyebilirsiniz.';
  if (code === 'language-not-supported') return 'Tanıma hatası: language-not-supported. Bu tarayıcının tanıma hizmeti Türkçeyi desteklemiyor. Metni elle yazabilirsiniz.';
  return `Otomatik metin durdu (hata: ${code}). Ses kaydı devam eder; metni sonrasında kontrol edip tamamlayabilirsiniz.`;
}
export default function useTranscript() {
  const [enabled, setEnabledState] = useState(false);
  const [text, setTextState] = useState('');
  const [notice, setNotice] = useState('');
  const [state, setState] = useState<State>('ready');
  const textRef = useRef('');
  const engine = useRef<SpeechEngine | null>(null);
  const generation = useRef(0);
  const startupTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const supported = Boolean(constructor());

  function setText(value: string) { textRef.current = value.slice(0, 12000); setTextState(textRef.current); }
  function setEnabled(value: boolean) {
    setEnabledState(value);
    setNotice(value ? 'Otomatik metin seçildi. Kaydı başlatınca tanıma denenecek.' : 'Otomatik metin kapalı. Açmak için yukarıdaki kutuyu işaretleyin.');
  }
  function clearStartupTimer() {
    if (startupTimer.current) clearTimeout(startupTimer.current);
    startupTimer.current = null;
  }
  function dispose() {
    generation.current++;
    clearStartupTimer();
    const current = engine.current;
    engine.current = null;
    if (current) {
      current.onstart = null;
      current.onresult = null;
      current.onerror = null;
      current.onend = null;
      try { current.abort(); } catch { /* Already stopped by the browser. */ }
    }
  }
  function stop() {
    const wasActive = Boolean(engine.current);
    dispose();
    if (wasActive) {
      setState('stopped');
      setNotice(textRef.current ? 'Otomatik metin taslağı hazır. Son kelimeler eksik olabilir; sesinizi dinleyip metni kontrol edin.' : 'Tanıma durduruldu ancak metin alınamadı. Yeniden kayıt sırasında Metne çevirmeyi tekrar başlat düğmesini deneyin.');
    }
  }
  function reset() {
    dispose();
    setState('ready');
    setText('');
    setNotice('');
  }
  function begin(track: MediaStreamTrack | undefined, preserveText: boolean) {
    const prefix = preserveText ? textRef.current : '';
    dispose();
    if (!preserveText) setText('');
    setState('ready');
    if (!enabled) { setNotice('Otomatik metin kapalı. Yazıya dönüşmesi için kayıttan önce yukarıdaki kutuyu işaretleyip yeniden kaydedin.'); return; }
    const Recognition = constructor();
    if (!Recognition) {
      setState('error');
      setNotice('Bu tarayıcı otomatik metni desteklemiyor. Yanıtınızı aşağıya yazabilirsiniz.');
      return;
    }
    const attempt = generation.current;
    try {
      const current = new Recognition();
      engine.current = current;
      current.lang = 'tr-TR';
      current.continuous = true;
      current.interimResults = true;
      current.maxAlternatives = 1;
      current.onstart = () => {
        if (attempt !== generation.current) return;
        clearStartupTimer();
        setState('listening');
        setNotice('Konuşma tanıma başladı. Türkçe konuşabilirsiniz; metin henüz taslak.');
      };
      current.onresult = event => {
        if (attempt !== generation.current) return;
        clearStartupTimer();
        setState('listening');
        const segments = Array.from(event.results, result => result[0]?.transcript.trim() ?? '');
        setText([prefix, ...segments].filter(Boolean).join(' '));
        setNotice('Konuşma metni alındı. Konuşmaya devam edebilirsiniz.');
      };
      current.onerror = event => {
        if (attempt !== generation.current) return;
        setNotice(errorMessage(event.error));
        dispose();
        setState('error');
      };
      current.onend = () => {
        if (attempt !== generation.current) return;
        dispose();
        setState('stopped');
        setNotice('Otomatik metin sona erdi. Ses kaydı devam edebilir; yeniden denemek için tekrar başlat düğmesini kullanabilirsiniz.');
      };
      setState('starting');
      setNotice('Konuşma tanıma hizmeti başlatılıyor…');
      startupTimer.current = setTimeout(() => {
        if (attempt !== generation.current) return;
        dispose();
        setState('error');
        setNotice('Tanıma hizmeti 8 saniye içinde başlamadı. Ses kaydı devam ediyor. Metne çevirmeyi tekrar başlat düğmesine basıp yeniden konuşun.');
      }, 8000);
      try {
        if (track) current.start(track);
        else current.start();
      } catch (error) {
        if (track && (error instanceof TypeError || (error instanceof DOMException && error.name === 'NotSupportedError'))) current.start();
        else throw error;
      }
    } catch {
      dispose();
      setState('error');
      setNotice('Otomatik metin başlatılamadı. Ses kaydı devam eder; Metne çevirmeyi tekrar başlat düğmesiyle yeniden deneyin.');
    }
  }
  function start(track?: MediaStreamTrack) { begin(track, false); }
  // Called directly by a user click, using the browser's default microphone.
  // Keeps existing text and avoids silently restarting the service in a loop.
  function retry() { begin(undefined, true); }
  useEffect(() => () => dispose(), []);
  const statusLabel = !supported ? 'Desteklenmiyor' : !enabled ? 'Kapalı' : ({ ready: 'Hazır', starting: 'Başlatılıyor', listening: 'Dinliyor', stopped: 'Durduruldu', error: 'Hata' } as const)[state];
  const statusMessage = notice || (!supported ? 'Bu tarayıcı otomatik metni desteklemiyor.' : enabled ? 'Kaydı başlatınca Türkçe konuşma tanıma denenecek.' : 'Otomatik metin kapalı. Açmak için kutuyu işaretleyin.');
  return { enabled, setEnabled, supported, text, setText, notice: statusMessage, statusLabel, listening: state === 'listening', start, retry, stop, reset };
}
