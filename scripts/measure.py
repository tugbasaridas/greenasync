"""Repeatable media/HAR measurements. No estimated energy or invented results."""
import argparse
import csv
from datetime import datetime, timezone
import hashlib
import json
import os
from pathlib import Path
import platform
import queue
import statistics
import subprocess
import sys
import threading
import time
from urllib.parse import urlsplit

ROOT = Path(__file__).resolve().parents[1]


def reduction(baseline, current):
    if baseline <= 0:
        raise ValueError('Karşılaştırma tabanı sıfır olamaz.')
    return round((baseline - current) / baseline * 100, 3)


def file_info(path):
    digest = hashlib.sha256()
    with path.open('rb') as source:
        for block in iter(lambda: source.read(1024 * 1024), b''):
            digest.update(block)
    return {'bytes': path.stat().st_size, 'sha256': digest.hexdigest()}


def media_info(path, require_video=False):
    import av
    with av.open(str(path)) as container:
        if not container.streams.audio:
            raise ValueError('Dosyada ses akışı yok.')
        if require_video and not container.streams.video:
            raise ValueError('Karşılaştırma tabanı görüntü içermeli.')
        audio = container.streams.audio[0]
        duration = float(audio.duration * audio.time_base) if audio.duration is not None else (
            container.duration / av.time_base if container.duration is not None else None)
        if duration is None or duration <= 0:
            raise ValueError('Dosya süresi belirlenemedi.')
        video = container.streams.video[0] if container.streams.video else None
        return {**file_info(path), 'duration_seconds': round(duration, 3),
                'audio_codec': audio.codec_context.name,
                'video_codec': video.codec_context.name if video else None,
                'width': video.width if video else None, 'height': video.height if video else None}


def extract_audio(video, target):
    """Controlled Opus target; not a claim about browser encoder output."""
    import av
    with av.open(str(video)) as source, av.open(str(target), 'w', format='webm') as output:
        if not source.streams.audio:
            raise ValueError('Videoda ses akışı yok.')
        stream = output.add_stream('libopus', rate=48000)
        stream.layout = 'mono'
        stream.bit_rate = 32000
        resampler = av.AudioResampler(format='s16', layout='mono', rate=48000)
        samples = 0
        def encode(frame):
            nonlocal samples
            frame.pts = samples
            samples += frame.samples
            for packet in stream.encode(frame):
                output.mux(packet)
        for frame in source.decode(audio=0):
            for converted in resampler.resample(frame):
                encode(converted)
        for converted in resampler.resample(None):
            encode(converted)
        for packet in stream.encode(None):
            output.mux(packet)


def transcribe(audio, runs):
    """Time the actual application worker, including decode/VAD and IPC per request."""
    env = {**os.environ, 'PYTHONUTF8': '1', 'PYTHONUNBUFFERED': '1'}
    child = subprocess.Popen([sys.executable, str(ROOT / 'backend/speech/worker.py')],
                             stdin=subprocess.PIPE, stdout=subprocess.PIPE,
                             stderr=subprocess.DEVNULL, text=True, encoding='utf-8', env=env, cwd=ROOT)
    messages = queue.Queue()
    def reader():
        for line in child.stdout:
            try:
                messages.put(json.loads(line))
            except ValueError:
                pass
        messages.put({'error': 'Konuşma süreci kapandı.'})
    threading.Thread(target=reader, daemon=True).start()
    def receive():
        try:
            value = messages.get(timeout=180)
        except queue.Empty:
            raise ValueError('Konuşma ölçümü 180 saniyede tamamlanmadı.') from None
        if value.get('error') or value.get('event') == 'setup_error':
            raise ValueError(value.get('error') or 'Model hazır değil: npm run setup:speech')
        return value
    try:
        started = time.perf_counter()
        if receive().get('event') != 'ready':
            raise ValueError('Model hazır mesajı alınamadı.')
        startup = time.perf_counter() - started
        times, texts = [], []
        for i in range(runs):
            started = time.perf_counter()
            child.stdin.write(json.dumps({'id': str(i), 'path': str(audio.resolve())}) + '\n')
            child.stdin.flush()
            result = receive()
            elapsed = time.perf_counter() - started
            if result.get('id') != str(i) or not result.get('text', '').strip():
                raise ValueError('Kayıtta anlaşılır konuşma yok; rapor üretilmedi.')
            times.append(round(elapsed, 4))
            texts.append(result['text'])
        return texts[0], {'model': env.get('WHISPER_MODEL', 'tiny'),
                         'worker_startup_seconds': round(startup, 4),
                         'request_seconds': times, 'first_request_seconds': times[0],
                         'warm_median_seconds': statistics.median(times[1:]) if len(times) > 1 else None,
                         'identical_transcripts': len(set(texts)) == 1,
                         'energy_kwh': None, 'co2_grams': None}
    finally:
        child.kill()
        child.wait()
        child.stdin.close()
        child.stdout.close()


def summarize_har(path):
    """Export aggregate counts only; never copy URLs, headers, bodies or tokens."""
    entries = json.loads(path.read_text(encoding='utf-8-sig'))['log']['entries']
    if not entries:
        raise ValueError('HAR boş; sıfır veri aktarımı kanıtı sayılmaz.')
    known, unknown, failed, audio = 0, 0, 0, 0
    for entry in entries:
        response = entry['response']
        value = response.get('_transferSize')
        if isinstance(value, (int, float)) and not isinstance(value, bool) and value >= 0:
            known += value
        else:
            unknown += 1
        failed += int(response.get('status', 0) == 0 or response.get('status', 0) >= 400)
        route = urlsplit(entry['request']['url']).path.rstrip('/')
        mime = response.get('content', {}).get('mimeType', '')
        audio += int(route.endswith('/audio') or mime.startswith('audio/'))
    return {'requests': len(entries), 'known_response_transfer_bytes': known,
            'unknown_transfer_entries': unknown,
            'complete_response_transfer_bytes': known if not unknown else None,
            'failed_requests': failed, 'audio_requests': audio,
            'scope': 'HAR response _transferSize; upload/TLS/transport overhead excluded'}


def write_report(out, report, rows):
    out.mkdir(parents=True, exist_ok=True)
    (out / 'report.json').write_text(json.dumps(report, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    with (out / 'results.csv').open('w', newline='', encoding='utf-8-sig') as target:
        writer = csv.writer(target)
        writer.writerow(['metric', 'value', 'unit'])
        writer.writerows(rows)
    lines = ['# GreenAsync ölçüm raporu', '', f"UTC: {report['created_at']}",
             f"Tür: {report.get('kind', '')}; senaryo: {report.get('scenario', 'media')}", '',
             '| Ölçüt | Değer | Birim |', '|---|---:|---|']
    lines += [f'| {key} | {value if value is not None else "Ölçülmedi"} | {unit} |' for key, value, unit in rows]
    lines += ['', 'Dosya boyutları ağ ölçümü değildir. Saklama hesabı dosya yüküdür; DB, indeks,',
              'yedek ve dosya sistemi ek yüklerini içermez. Enerji/CO₂ ölçülmedi.',
              'Video+sese karşı ses+metin aynı süre/içerik koşulunda yorumlanmalı.',
              'Türetilmiş Opus dosyası gerçek tarayıcı çıktısı olarak sunulmamalı.',
              'Network raporları yalnızca kayıt kapsamındaki yanıt aktarımını gösterir.', '']
    (out / 'report.md').write_text('\n'.join(lines), encoding='utf-8')


def main():
    parser = argparse.ArgumentParser(description='GreenAsync: gerçek dosya ve Network ölçümleri')
    commands = parser.add_subparsers(dest='command', required=True)
    media = commands.add_parser('media')
    media.add_argument('--video', type=Path, required=True)
    media.add_argument('--audio', type=Path, help='Yoksa videodan mono Opus/32 kbps hedefiyle çıkarılır')
    text = media.add_mutually_exclusive_group(required=True)
    text.add_argument('--transcribe', action='store_true')
    text.add_argument('--transcript', type=Path, help='Önceden üretilmiş gerçek UTF-8 döküm')
    media.add_argument('--runs', type=int, default=3)
    media.add_argument('--out', type=Path, required=True)
    har = commands.add_parser('network')
    har.add_argument('--har', type=Path, required=True)
    har.add_argument('--scenario', choices=['text', 'audio', 'video'], required=True)
    har.add_argument('--out', type=Path, required=True)
    args = parser.parse_args()
    # Separate directory per measurement avoids accidentally overwriting evidence.
    if args.out.exists():
        parser.error('--out için henüz var olmayan bir klasör seçin.')
    report = {'created_at': datetime.now(timezone.utc).isoformat(),
              'python': platform.python_version(), 'platform': platform.platform(),
              'energy_kwh': None, 'co2_grams': None}
    if args.command == 'network':
        summary = summarize_har(args.har)
        report.update({'kind': 'network', 'scenario': args.scenario, **summary})
        rows = [(key, value, 'bytes' if 'bytes' in key else 'count')
                for key, value in summary.items() if key != 'scope']
    else:
        if not 1 <= args.runs <= 10:
            parser.error('--runs 1 ile 10 arasında olmalı.')
        video = media_info(args.video, require_video=True)
        args.out.mkdir(parents=True)
        audio_path = args.audio or args.out / 'derived-audio.webm'
        if args.audio is None:
            extract_audio(args.video, audio_path)
        audio = media_info(audio_path)
        if audio['video_codec']:
            raise ValueError('--audio dosyası görüntü içermemeli.')
        if abs(video['duration_seconds'] - audio['duration_seconds']) > .5:
            raise ValueError('Video/ses süreleri uyuşmuyor (>0.5 saniye).')
        if args.transcribe:
            if audio['duration_seconds'] > 91:
                raise ValueError('Uygulama modeli için kayıt en fazla 91 saniye olmalı.')
            transcript, timing = transcribe(audio_path, args.runs)
        else:
            transcript = args.transcript.read_text(encoding='utf-8-sig').strip()
            timing = None
        if not transcript:
            raise ValueError('Boş metinle karşılaştırma yapılamaz.')
        text_bytes = len(transcript.encode('utf-8'))
        stored = audio['bytes'] + text_bytes
        report.update({'kind': 'media', 'video': video, 'audio': audio,
                       'audio_source': 'provided; same content must be verified manually' if args.audio else 'derived from video; Opus mono 32 kbps target',
                       'transcript_utf8_bytes': text_bytes, 'greenasync_payload_bytes': stored,
                       'payload_reduction_percent': reduction(video['bytes'], stored),
                       'transcription': timing})
        rows = [('video_duration', video['duration_seconds'], 'seconds'),
                ('audio_duration', audio['duration_seconds'], 'seconds'),
                ('video_payload', video['bytes'], 'bytes'), ('audio_payload', audio['bytes'], 'bytes'),
                ('transcript_utf8', text_bytes, 'bytes'), ('greenasync_payload', stored, 'bytes'),
                ('storage_payload_reduction', report['payload_reduction_percent'], '%')]
        if timing:
            rows += [('worker_startup', timing['worker_startup_seconds'], 'seconds'),
                     ('first_request', timing['first_request_seconds'], 'seconds'),
                     ('warm_median', timing['warm_median_seconds'], 'seconds')]
        # Deliberately omit transcript content and original paths from shareable reports.
    write_report(args.out, report, rows)
    print(f'Rapor hazır: {args.out / "report.md"}')
    return 0


if __name__ == '__main__':
    try:
        raise SystemExit(main())
    except (ValueError, OSError, KeyError, ImportError) as error:
        print(f'Ölçüm başarısız: {error}', file=sys.stderr)
        raise SystemExit(1)
