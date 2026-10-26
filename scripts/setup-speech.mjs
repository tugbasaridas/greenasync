import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
const root = dirname(dirname(fileURLToPath(import.meta.url)));
if (existsSync(join(root, '.env'))) process.loadEnvFile(join(root, '.env'));
const windows = process.platform === 'win32';
const candidates = windows ? [['py', ['-3.14']], ['py', ['-3']], ['python', []]] : [['python3', []], ['python', []]];
const installed = candidates.find(([command, args]) => spawnSync(command, [...args, '-c', 'import sys; sys.exit(0 if (3,10) <= sys.version_info[:2] < (3,15) else 1)'], { stdio: 'ignore' }).status === 0);
if (!installed) { console.error('Python 3.10–3.14 (64 bit) kurun, sonra npm run setup:speech komutunu tekrar çalıştırın.'); process.exit(1); }
function run(command, args) {
  const result = spawnSync(command, args, { cwd: root, stdio: 'inherit', shell: false });
  if (result.status !== 0) { console.error('Kurulum tamamlanamadı. Yukarıdaki hatayı kontrol edin.'); process.exit(1); }
}
const python = join(root, '.venv', windows ? 'Scripts/python.exe' : 'bin/python');
if (!existsSync(python)) run(installed[0], [...installed[1], '-m', 'venv', join(root, '.venv')]);
run(python, ['-m', 'pip', 'install', '-r', join(root, 'backend/speech/requirements.txt')]);
run(python, [join(root, 'backend/speech/worker.py'), '--download']);
console.log('Yerel konuşma modeli hazır. Backend açık ise yeniden başlatın.');
