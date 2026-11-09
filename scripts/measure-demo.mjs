import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
const root = fileURLToPath(new URL('../', import.meta.url));
const out = `measurements/private/synthetic-${Date.now()}`;
const result = spawnSync(process.execPath, ['scripts/measure.mjs', 'media',
  '--video', 'samples/synthetic-interview/yanit.mp4', '--transcribe', '--runs', '3', '--out', out],
  { cwd: root, stdio: 'inherit', env: process.env });
process.exit(result.status ?? 1);
