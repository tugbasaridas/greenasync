import { useEffect, useRef, useState } from 'react';

// The prefixed Web Speech API is absent from TypeScript's standard DOM types.
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
function constructor() {
  const browser = window as Window & { SpeechRecognition?: SpeechConstructor; webkitSpeechRecognition?: SpeechConstructor };
  return browser.SpeechRecognition ?? browser.webkitSpeechRecognition;
}
function errorMessage(code: string) {
  if (code === 'not-allowed' || code === 'service-not-allowed') return 'Otomatik metin için izin verilmedi. Ses kaydı devam eder; metni sonrasında yazabilirsiniz.';
  if (code === 'network') return 'Tanıma hatası: network. Chrome konuşma tanıma hizmetine bağlanamadı. İnternet bağlantısını kontrol edin. Oluşan metin korundu; ses kaydı devam eder.';
  if (code === 'no-speech') return 'Konuşma algılanamadı. Ses kaydı devam eder; metni sonrasında yazabilirsiniz.';
  if (code === 'language-not-supported') return 'Bu tarayıcının tanıma hizmeti Türkçeyi desteklemiyor. Metni elle yazabilirsiniz.';
  return `Otomatik metin durdu (hata: ${code}). Ses kaydı devam eder; metni sonrasında kontrol edip tamamlayabilirsiniz.`;
}
export default function useTranscript() {
  const [enabled, setEnabled] = useState(false);
  const [text, setText] = useState('');
  const [notice, setNotice] = useState('');
  const [listening, setListening] = useState(false);
  const engine = useRef<SpeechEngine | null>(null);
  const generation = useRef(0);
  const supported = Boolean(constructor());

  function dispose() {
    generation.current++;
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
    setListening(false);
    if (wasActive) setNotice('Otomatik metin taslağı hazır. Son kelimeler eksik olabilir; sesinizi dinleyip metni kontrol edin.');
  }
  function reset() {
    dispose();
    setListening(false);
    setText('');
    setNotice('');
  }
  function start(track?: MediaStreamTrack) {
    reset();
    if (!enabled) { setNotice('Otomatik metin kapalı. Yazıya dönüşmesi için kayıttan önce yukarıdaki kutuyu işaretleyip yeniden kaydedin.'); return; }
    const Recognition = constructor();
    if (!Recognition) {
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
        setListening(true);
        setNotice('Konuşma tanıma başladı. Türkçe konuşabilirsiniz; metin henüz taslak.');
      };
      current.onresult = event => {
        if (attempt !== generation.current) return;
        // Rebuild from the session's full result list: revised interim results
        // must replace prior text rather than duplicate it.
        const segments = Array.from(event.results, result => result[0]?.transcript.trim() ?? '');
        setText(segments.filter(Boolean).join(' ').slice(0, 12000));
      };
      current.onerror = event => {
        if (attempt !== generation.current) return;
        setNotice(errorMessage(event.error));
        dispose();
        setListening(false);
      };
      current.onend = () => {
        if (attempt !== generation.current) return;
        dispose();
        setListening(false);
        setNotice('Otomatik metin sona erdi. Ses kaydı devam edebilir; eksik kısmı kayıttan sonra tamamlayın.');
      };
      setNotice('Konuşma tanıma hizmeti başlatılıyor…');
      try {
        // Modern Chromium can transcribe the exact track used for recording.
        current.start(track);
      } catch (error) {
        if (track && (error instanceof TypeError || (error instanceof DOMException && error.name === 'NotSupportedError'))) {
          current.start();
        } else { throw error; }
      }
    } catch {
      dispose();
      setListening(false);
      setNotice('Otomatik metin başlatılamadı. Ses kaydı devam eder; metni elle yazabilirsiniz.');
    }
  }
  useEffect(() => () => dispose(), []);
  return { enabled, setEnabled, supported, text, setText, notice, listening, start, stop, reset };
}
