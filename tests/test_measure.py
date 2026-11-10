import importlib.util
import json
from pathlib import Path
import tempfile
import unittest

spec = importlib.util.spec_from_file_location('measure', Path(__file__).resolve().parents[1] / 'scripts/measure.py')
measure = importlib.util.module_from_spec(spec)
spec.loader.exec_module(measure)
audit_spec = importlib.util.spec_from_file_location('ui_audit', Path(__file__).resolve().parents[1] / 'scripts/summarize-ui-measurement.py')
ui_audit = importlib.util.module_from_spec(audit_spec)
audit_spec.loader.exec_module(ui_audit)


class MeasurementTests(unittest.TestCase):
    def test_wer_normalization_and_word_edits(self):
        result = ui_audit.wer('İyi, bir ekip işi.', 'iyi bir işi')
        self.assertEqual(result['word_edits'], 1)
        self.assertEqual(result['wer_percent'], 25)
        self.assertEqual(ui_audit.wer('IŞIK', 'ışık')['word_edits'], 0)

    def test_ui_report_requires_complete_successful_runs(self):
        with self.assertRaises(ValueError):
            ui_audit.summarize([])
        rows = []
        for i in range(1, 4):
            for phase, route in [('text', '/api/hr/applications/:id'), ('audio', '/api/hr/applications/:id/answers/2/audio'), ('video', '/benchmark/video.mp4')]:
                rows.append({'phase':f'{phase}-{i}', 'route':route, 'status':200, 'responseBodyBytes':100})
        self.assertEqual(len(ui_audit.summarize(rows)), 3)
        rows.append({'phase':'text-1', 'route':'/api/hr/applications/:id/answers/2/audio', 'status':200, 'responseBodyBytes':100})
        with self.assertRaises(ValueError):
            ui_audit.summarize(rows)

    def har(self, entries):
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / 'capture.har'
            path.write_text(json.dumps({'log': {'entries': entries}}))
            return measure.summarize_har(path)

    def entry(self, size=100, url='https://local/api/hr/applications/abc', mime='application/json'):
        return {'request': {'url': url, 'headers': [{'name': 'Cookie', 'value': 'secret'}]},
                'response': {'status': 200, '_transferSize': size, 'content': {'mimeType': mime, 'text': 'private'}}}

    def test_storage_includes_audio_and_text_and_can_increase(self):
        self.assertEqual(measure.reduction(1000, 200 + 100), 70)
        self.assertEqual(measure.reduction(100, 200), -100)
        with self.assertRaises(ValueError):
            measure.reduction(0, 200)

    def test_missing_transfer_is_unknown_not_zero(self):
        result = self.har([self.entry(100), self.entry(-1)])
        self.assertEqual(result['known_response_transfer_bytes'], 100)
        self.assertIsNone(result['complete_response_transfer_bytes'])
        self.assertEqual(result['unknown_transfer_entries'], 1)

    def test_cached_zero_is_valid_and_private_fields_not_exported(self):
        result = self.har([self.entry(0)])
        self.assertEqual(result['complete_response_transfer_bytes'], 0)
        self.assertNotIn('secret', json.dumps(result))
        self.assertNotIn('private', json.dumps(result))
        self.assertNotIn('https://', json.dumps(result))

    def test_audio_routes_and_mime_are_counted(self):
        result = self.har([self.entry(url='https://local/api/hr/abc/audio?token=secret'),
                           self.entry(mime='audio/webm'), self.entry()])
        self.assertEqual(result['audio_requests'], 2)

    def test_empty_har_rejected(self):
        with self.assertRaises(ValueError):
            self.har([])

    def test_report_outputs_no_carbon_estimate(self):
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory)
            measure.write_report(path, {'created_at': 'test', 'co2_grams': None}, [('test', None, 'bytes')])
            self.assertIsNone(json.loads((path / 'report.json').read_text())['co2_grams'])
            self.assertIn('Ölçülmedi', (path / 'report.md').read_text())
            self.assertTrue((path / 'results.csv').read_bytes().startswith(b'\xef\xbb\xbf'))


if __name__ == '__main__':
    unittest.main()
