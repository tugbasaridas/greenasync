import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';

const root = fileURLToPath(new URL('../', import.meta.url));
if (existsSync(join(root, '.env'))) process.loadEnvFile(join(root, '.env'));
const python = process.env.WHISPER_PYTHON || join(root, '.venv', process.platform === 'win32' ? 'Scripts/python.exe' : 'bin/python');
const result = spawnSync(python, [join(root, 'scripts/measure.py'), ...process.argv.slice(2)], {
  cwd: root, stdio: 'inherit', env: { ...process.env, PYTHONUTF8: '1' },
});
if (result.error) console.error('Python ortamı açılamadı. Önce npm run setup:speech çalıştırın.');
process.exit(result.status ?? 1);
