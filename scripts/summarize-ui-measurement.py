"""Summarize a manually observed synthetic UI experiment, not fabricated traffic."""
import argparse
import csv
from datetime import datetime, timezone
import json
from pathlib import Path
import statistics
import unicodedata


def words(text):
    text=unicodedata.normalize('NFC',text).replace('I','ı').replace('İ','i').lower()
    return ''.join(c if c.isalnum() or c.isspace() else ' ' for c in text).split()


def wer(reference, hypothesis):
    a,b=words(reference),words(hypothesis)
    if not a: raise ValueError('Reference is empty')
    previous=list(range(len(b)+1))
    for i,x in enumerate(a,1):
        row=[i]
        for j,y in enumerate(b,1): row.append(min(previous[j]+1,row[j-1]+1,previous[j-1]+(x!=y)))
        previous=row
    return {'reference_words':len(a),'hypothesis_words':len(b),'word_edits':previous[-1],
            'wer_percent':round(100*previous[-1]/len(a),2),
            'normalization':'NFC, Turkish lowercase, punctuation replaced by spaces; word Levenshtein'}


def summarize(rows):
    runs=[]
    for index in range(1,4):
        def select(phase,route):return [r for r in rows if r['phase']==f'{phase}-{index}' and r['route']==route]
        detail='/api/hr/applications/:id'
        audio=detail+'/answers/2/audio'
        text_rows=select('text',detail)
        audio_rows=select('audio',audio)
        video_rows=select('video','/benchmark/video.mp4')
        if any(len(group)!=1 or group[0]['status']!=200 for group in [text_rows,audio_rows,video_rows]):
            raise ValueError('Each run needs one successful text, audio and video response')
        if select('text',audio) or select('replay',audio):raise ValueError('Unexpected audio request')
        runs.append({'run':index,'text_response_body_bytes':text_rows[0]['responseBodyBytes'],
                     'additional_audio_body_bytes':audio_rows[0]['responseBodyBytes'],
                     'additional_replay_audio_bytes':0,'video_response_body_bytes':video_rows[0]['responseBodyBytes'],
                     'text_audio_requests':0,'first_audio_requests':1,'replay_audio_requests':0})
    return runs


def main():
    parser=argparse.ArgumentParser()
    parser.add_argument('--input',type=Path,required=True)
    parser.add_argument('--reference',type=Path,required=True)
    parser.add_argument('--out',type=Path,required=True)
    parser.add_argument('--commit',required=True)
    args=parser.parse_args()
    rows=[json.loads(line) for line in (args.input/'responses.jsonl').read_text(encoding='utf-8-sig').splitlines()]
    runs=summarize(rows)
    med={key:statistics.median([r[key] for r in runs]) for key in runs[0] if key!='run'}
    med['text_plus_audio_body_bytes']=med['text_response_body_bytes']+med['additional_audio_body_bytes']
    baseline=med['video_response_body_bytes']
    med['text_vs_video_payload_reduction_percent']=round(100*(baseline-med['text_response_body_bytes'])/baseline,4)
    med['text_audio_vs_video_payload_reduction_percent']=round(100*(baseline-med['text_plus_audio_body_bytes'])/baseline,4)
    result={'created_at':datetime.now(timezone.utc).isoformat(),'application_commit':args.commit,
            'input_type':'synthetic Turkish speech with text-card video, not camera footage',
            'driver':'real browser UI actions, three repetitions; source server response-body counting',
            'metric_scope':'selected endpoint response body bytes; excludes headers, TLS/TCP, initial assets, login, list, upload and server computation',
            'runs':runs,'medians':med,
            'transcribe_and_save':json.loads((args.input/'seed.json').read_text(encoding='utf-8-sig')),
            'accuracy_single_sample':wer(args.reference.read_text(encoding='utf-8-sig'),(args.input/'transcript.txt').read_text(encoding='utf-8-sig')),
            'energy_kwh':None,'actual_co2_grams':None,
            'ecograder':{'status':'not_run','reason':'No publicly accessible deployment URL available'},
            'lighthouse':{'status':'blocked','version':'13.6.0','reason':'Chromium process singleton socket() Operation not permitted in audit runtime; no score produced'}}
    args.out.mkdir(parents=True,exist_ok=True)
    (args.out/'ui-results.json').write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
    with (args.out/'ui-results.csv').open('w',encoding='utf-8-sig',newline='') as target:
        writer=csv.DictWriter(target,fieldnames=runs[0].keys());writer.writeheader();writer.writerows(runs)
    measured=[r for r in rows if r['phase'].startswith(('text-','audio-','replay-','video-'))
              and (r['route'].startswith('/api/hr/applications/') or r['route']=='/benchmark/video.mp4')]
    (args.out/'response-evidence.json').write_text(json.dumps(measured,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
    print(json.dumps({'medians':med,'accuracy':result['accuracy_single_sample']},ensure_ascii=False))


if __name__=='__main__':main()
