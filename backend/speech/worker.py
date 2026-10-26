"""Local Turkish transcription; JSON lines protocol, no audio sent to a service."""
import argparse
import json
import os
from pathlib import Path
import sys


def output(value):
    print(json.dumps(value, ensure_ascii=False), flush=True)


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--download', action='store_true')
    args = parser.parse_args()
    try:
        from faster_whisper import WhisperModel
        from faster_whisper.audio import decode_audio
        root = Path(__file__).resolve().parents[2]
        model_name = os.environ.get('WHISPER_MODEL', 'tiny')
        options = dict(device='cpu', compute_type='int8', cpu_threads=2,
                       num_workers=1, download_root=str(root / '.models'))
        try:
            model = WhisperModel(model_name, local_files_only=True, **options)
        except Exception:
            if not args.download:
                raise
            model = WhisperModel(model_name, local_files_only=False, **options)
    except Exception as error:
        output({'event': 'setup_error', 'message': str(error)[:500]})
        return 1
    if args.download:
        output({'event': 'downloaded', 'model': model_name})
        return 0
    output({'event': 'ready'})
    for line in sys.stdin:
        job = {}
        try:
            job = json.loads(line)
            audio = decode_audio(job['path'], sampling_rate=16000)
            if len(audio) / 16000 > 91:
                output({'id': job['id'], 'error': 'Ses dosyası izin verilen süreyi aşıyor.'})
                continue
            segments, info = model.transcribe(audio, language='tr', beam_size=1,
                                               vad_filter=True, condition_on_previous_text=False)
            text = ' '.join(segment.text.strip() for segment in segments).strip()
            output({'id': job['id'], 'text': text[:12000], 'duration': info.duration})
        except Exception:
            output({'id': job.get('id'), 'error': 'Ses çözümlenemedi. Kayıt biçimini ve mikrofonu kontrol edin.'})
    return 0


if __name__ == '__main__':
    raise SystemExit(main())
